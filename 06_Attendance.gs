/**
 * ═══════════════════════════════════════════════════════════════
 *  CAS · ระบบงานธุรการชั้นเรียน (Classroom Administration System)
 *  File:        06_Attendance.gs — โมดูลเช็กชื่อ / การมาเรียน (รายวัน รายชั้น)
 *  Version:     0.0.1
 *  Last Update: 2026-05-30
 *  Developer:   ครูที
 *  License:     Proprietary · © 2026
 * ═══════════════════════════════════════════════════════════════
 */

// โหลดสมุดเช็กชื่อของชั้น+วัน → รายชื่อนักเรียน + สถานะที่บันทึกไว้ (ถ้ามี)
function Att_sheet(user, p) {
  Auth_require_(user, 'attendance.view');
  var classId = p.class_id, date = cfg_d10_(p.date || cfg_dateOnly_(new Date()));
  if (!classId) throw new Error('กรุณาเลือกชั้นเรียน');

  var classIdx = DB_index(SHEETS.CLASSES);
  var students = DB_readAll(SHEETS.STUDENTS)
    .filter(function (s) { return s.class_id === classId && s.status === 'active'; })
    .map(function (s) { return Student_enrich_(s, classIdx); })
    .sort(function (a, b) { return (Number(a.number) || 999) - (Number(b.number) || 999); });

  var existing = {};
  DB_readAll(SHEETS.ATTENDANCE).forEach(function (a) {
    if (a.class_id === classId && cfg_d10_(a.date) === date) existing[a.student_id] = a;
  });

  return {
    date: date, class_id: classId,
    class_label: classIdx[classId] ? (classIdx[classId].level + '/' + classIdx[classId].room) : '',
    students: students.map(function (s) {
      var rec = existing[s.id];
      return {
        student_id: s.id, student_code: s.student_code, number: s.number,
        full_name: s.full_name, nickname: s.nickname, photo_url: s.photo_url,
        gender: s.gender,
        status: rec ? rec.status : '', note: rec ? rec.note : '',
        att_id: rec ? rec.id : '', check_in: rec ? rec.check_in : ''
      };
    })
  };
}

// บันทึก/อัปเดตเช็กชื่อทั้งห้อง (upsert แบบ bulk)
function Att_save(user, p) {
  Auth_require_(user, 'attendance.record');
  var classId = p.class_id, date = cfg_d10_(p.date), records = p.records || [];
  if (!classId || !date) throw new Error('ข้อมูลไม่ครบถ้วน');

  var all = DB_readAll(SHEETS.ATTENDANCE);
  var existing = {};
  all.forEach(function (a) { if (a.class_id === classId && cfg_d10_(a.date) === date) existing[a.student_id] = a; });

  var now = cfg_now_();
  var toInsert = [], updated = 0;
  records.forEach(function (r) {
    if (!r.status) return;
    var ex = existing[r.student_id];
    if (ex) {
      // อัปเดตเฉพาะที่เปลี่ยนจริง · note อัปเดตเฉพาะเมื่อ client ส่งมา (กันลบ note เดิม เช่นบันทึกลาออนไลน์)
      var patch = {};
      if (ex.status !== r.status) patch.status = r.status;
      if (r.note != null && String(ex.note || '') !== String(r.note)) patch.note = r.note;
      if (Object.keys(patch).length) {
        patch.recorded_by = user.id;
        DB_update(SHEETS.ATTENDANCE, ex.id, patch);
        updated++;
      }
    } else {
      toInsert.push({
        date: date, class_id: classId, student_id: r.student_id,
        status: r.status, check_in: now, note: r.note || '',
        recorded_by: user.id, source: 'manual', created_at: now, updated_at: now
      });
    }
  });
  if (toInsert.length) DB_bulkInsert(SHEETS.ATTENDANCE, toInsert);
  Audit_log(user, 'attendance', 'class', classId, 'เช็กชื่อ ' + date + ' (+' + toInsert.length + '/~' + updated + ')');
  return { inserted: toInsert.length, updated: updated };
}

// สรุปสถิติการมาเรียนช่วงวันที่ (สำหรับ KPI/รายงาน)
function Att_summary(user, p) {
  Auth_require_(user, 'attendance.view');
  var scope = Auth_classScope_(user);
  var from = cfg_d10_(p.from || cfg_dateOnly_(new Date(Date.now() - 29 * 864e5)));
  var to = cfg_d10_(p.to || cfg_dateOnly_(new Date()));
  var rows = DB_readAll(SHEETS.ATTENDANCE).filter(function (a) {
    var d = cfg_d10_(a.date);
    if (d < from || d > to) return false;
    if (p.class_id) return a.class_id === p.class_id;
    if (scope) return scope.indexOf(a.class_id) >= 0;
    return true;
  });

  var byStatus = {}; Object.keys(ATT_STATUS).forEach(function (k) { byStatus[k] = 0; });
  var byDay = {};
  rows.forEach(function (a) {
    var d = cfg_d10_(a.date);
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    if (!byDay[d]) byDay[d] = { present: 0, total: 0 };
    byDay[d].total++;
    if (a.status === 'present' || a.status === 'late') byDay[d].present++;
  });
  var total = rows.length;
  var presentRate = total ? Math.round(((byStatus.present + byStatus.late) / total) * 100) : 0;
  var trend = Object.keys(byDay).sort().slice(-14).map(function (d) {
    return { date: d, rate: byDay[d].total ? Math.round((byDay[d].present / byDay[d].total) * 100) : 0 };
  });
  return { from: from, to: to, total: total, byStatus: byStatus, presentRate: presentRate, trend: trend };
}

// ประวัติการมาเรียนรายคน (สำหรับ student self + รายงานรายบุคคล)
function Att_history(user, p) {
  var sid = p.student_id;
  if (!sid) throw new Error('ไม่พบนักเรียน');
  var rows = DB_readAll(SHEETS.ATTENDANCE).filter(function (a) { return a.student_id === sid; });
  rows.sort(function (a, b) { return b.date.localeCompare(a.date); });
  var stat = {}; Object.keys(ATT_STATUS).forEach(function (k) { stat[k] = 0; });
  rows.forEach(function (a) { stat[a.status] = (stat[a.status] || 0) + 1; });
  return { items: rows.slice(0, p.limit || 60), stat: stat, total: rows.length };
}

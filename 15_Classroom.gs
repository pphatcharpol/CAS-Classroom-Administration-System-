/**
 * ═══════════════════════════════════════════════════════════════
 *  SAS · ระบบบริหารจัดการสถานศึกษา (School Administration System)
 *  File:        15_Classroom.gs — บริหารห้องเรียน: เวรประจำวัน · คณะกรรมการห้อง · ผังที่นั่ง · ตารางเรียน
 *  Version:     1.4.0
 *  Last Update: 2026-05-31
 *  Developer:   ครูที
 *  License:     Proprietary · © 2026
 * ═══════════════════════════════════════════════════════════════
 */

var WEEKDAYS5 = [
  { v: 1, label: 'จันทร์', short: 'จ', color: '#F4C430' },
  { v: 2, label: 'อังคาร', short: 'อ', color: '#E8A0BF' },
  { v: 3, label: 'พุธ', short: 'พ', color: '#2E7D32' },
  { v: 4, label: 'พฤหัสบดี', short: 'พฤ', color: '#D98E04' },
  { v: 5, label: 'ศุกร์', short: 'ศ', color: '#1565C0' }
];
var PERIODS = [
  { p: 1, time: '08:30-09:20' }, { p: 2, time: '09:20-10:10' }, { p: 3, time: '10:10-11:00' }, { p: 4, time: '11:00-11:50' },
  { p: 5, time: '12:40-13:30' }, { p: 6, time: '13:30-14:20' }, { p: 7, time: '14:20-15:10' }, { p: 8, time: '15:10-16:00' }
];
var LUNCH_AFTER = 4;


function Classroom_meta() {
  return { weekdays: WEEKDAYS5, periods: PERIODS, lunch_after: LUNCH_AFTER };
}

// ตรวจสิทธิ์ + ระบุ class_id ตามบทบาท (นักเรียน = ห้องตนเอง)
function _classroomScope_(user, p) {
  if (user.role === 'student') {
    if (!user.class_id) throw new Error('บัญชีนี้ยังไม่ได้กำหนดชั้นเรียน');
    return user.class_id;
  }
  Auth_require_(user, 'classroom.view');
  if (!p.class_id) throw new Error('กรุณาเลือกชั้นเรียน');
  // เปลี่ยนจาก homeroom เป็น teacher
  if (user.role === 'teacher') {
    var scope = Auth_classScope_(user);
    if (scope && scope.indexOf(p.class_id) < 0) throw new Error('PERMISSION_DENIED');
  }
  return p.class_id;
}

function _clearWhere_(name, pred) {
  var rows = DB_readAll(name).filter(pred);
  rows.forEach(function (r) { DB_delete(name, r.id); });
  return rows.length;
}

function _classStudents_(classId) {
  var classIdx = DB_index(SHEETS.CLASSES);
  return DB_readAll(SHEETS.STUDENTS).filter(function (s) { return s.class_id === classId && s.status === 'active'; })
    .map(function (s) { return Student_enrich_(s, classIdx); })
    .sort(function (a, b) { return (Number(a.number) || 999) - (Number(b.number) || 999); });
}


/* ════════ ตารางเรียน (Timetable) ════════════════════════════════ */
function Timetable_get(user, p) {
  Auth_require_(user, '*'); // ทุกคนที่มีสิทธิ์เข้าถึงระบบสามารถดูตารางเรียนได้
  
  if (!p.class_id) throw new Error('กรุณาระบุรหัสชั้นเรียน');

  // ดึงข้อมูลตารางเรียนเฉพาะห้องที่ระบุ และตัดรายการที่ถูกลบออก
  var rows = DB_readAll(SHEETS.TIMETABLE).filter(function(t) { 
    return t.class_id === p.class_id && t.status !== 'deleted'; 
  });

  // ส่งข้อมูลดิบกลับไปให้ UI แสดงผลได้เลย
  return { items: rows };
}

function Timetable_save(user, p) {
  var classId = p.class_id; _classroomScope_(user, p); Auth_require_(user, 'classroom.manage');
  var year = p.year || cfg_academicYear_(), term = p.term || '1';
  _clearWhere_(SHEETS.TIMETABLE, function (t) { return t.class_id === classId && String(t.academic_year) === String(year) && String(t.term) === String(term); });
  var rows = [];
  (p.cells || []).forEach(function (c) {
    if (c.subject_text || c.subject_id) rows.push({ class_id: classId, academic_year: year, term: term, weekday: c.weekday, period: c.period, subject_id: c.subject_id || '', subject_text: c.subject_text || '', teacher_text: c.teacher_text || '', room: c.room || '', recorded_by: user.id });
  });
  if (rows.length) DB_bulkInsert(SHEETS.TIMETABLE, rows);
  Audit_log(user, 'timetable', 'class', classId, 'ตารางเรียน ' + year + '/' + term + ' (' + rows.length + ' คาบ)');
  return { count: rows.length };
}

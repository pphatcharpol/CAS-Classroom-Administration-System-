/**
 * ═══════════════════════════════════════════════════════════════
 *  CAS · ระบบงานธุรการชั้นเรียน (Classroom Administration System)
 *  File:        07_Conduct.gs — โมดูลคะแนนความประพฤติ (ตัด/เพิ่มคะแนน · เริ่มต้น 100)
 *  Version:     1.0.0
 *  Last Update: 2026-05-30
 *  Developer:   ครูวิรัตน์  หาดคำ · www.kruwirat.com
 *  License:     Proprietary · © 2026
 * ═══════════════════════════════════════════════════════════════
 */

var CONDUCT_CATS = {
  deduct: [
    { key: 'late',      label: 'มาสาย',              points: 5 },
    { key: 'uniform',   label: 'แต่งกายผิดระเบียบ',   points: 5 },
    { key: 'absent',    label: 'หนีเรียน',           points: 10 },
    { key: 'fight',     label: 'ทะเลาะวิวาท',         points: 20 },
    { key: 'phone',     label: 'ใช้โทรศัพท์ในคาบ',   points: 5 },
    { key: 'other_neg', label: 'อื่น ๆ (ตัดคะแนน)',  points: 5 }
  ],
  add: [
    { key: 'volunteer', label: 'จิตอาสา/บำเพ็ญฯ',    points: 5 },
    { key: 'award',     label: 'ได้รับรางวัล/ชนะเลิศ', points: 10 },
    { key: 'help',      label: 'ช่วยเหลือกิจกรรม',    points: 5 },
    { key: 'honesty',   label: 'ความซื่อสัตย์',       points: 5 },
    { key: 'other_pos', label: 'อื่น ๆ (เพิ่มคะแนน)', points: 5 }
  ]
};

function Conduct_meta() { return CONDUCT_CATS; }

// บันทึกคะแนน (เพิ่ม/ตัด) + อัปเดตคะแนนสะสมของนักเรียน
function Conduct_record(user, p) {
  Auth_require_(user, 'conduct.record');
  var s = DB_get(SHEETS.STUDENTS, p.student_id);
  if (!s) throw new Error('ไม่พบนักเรียน');
  var type = p.type === 'add' ? 'add' : 'deduct';
  var pts = Math.abs(Number(p.points || 0));
  if (!pts) throw new Error('กรุณาระบุคะแนน');
  if (!p.reason) throw new Error('กรุณาระบุเหตุผล');

  var evidence = '';
  if (p.photo) evidence = Files_uploadImage(p.photo, 'conduct', 'cd-' + s.student_code).url;

  var rec = DB_insert(SHEETS.CONDUCT, {
    date: p.date || cfg_dateOnly_(new Date()),
    student_id: s.id, class_id: s.class_id, type: type, points: pts,
    category: p.category || '', reason: p.reason, evidence_url: evidence,
    recorded_by: user.id
  });

  var cur = (s.conduct_score === '' || s.conduct_score == null) ? CONDUCT_BASE : Number(s.conduct_score);
  var next = Math.max(0, Math.min(100, cur + (type === 'add' ? pts : -pts)));
  DB_update(SHEETS.STUDENTS, s.id, { conduct_score: next });
  Audit_log(user, 'conduct', 'student', s.id, (type === 'add' ? '+' : '-') + pts + ' (' + p.reason + ')');
  return { record: rec, conduct_score: next };
}

// ประวัติคะแนนรายคน + timeline
function Conduct_history(user, p) {
  var sid = p.student_id;
  if (user.role === 'student') sid = user.student_id;
  if (!sid) throw new Error('ไม่พบนักเรียน');
  var s = DB_get(SHEETS.STUDENTS, sid);
  var userIdx = DB_index(SHEETS.USERS);
  var rows = DB_readAll(SHEETS.CONDUCT).filter(function (c) { return c.student_id === sid; });
  rows.sort(function (a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });
  var added = 0, deducted = 0;
  rows.forEach(function (r) { if (r.type === 'add') added += Number(r.points); else deducted += Number(r.points); });
  return {
    student: s ? Student_enrich_(s, DB_index(SHEETS.CLASSES)) : null,
    score: s ? ((s.conduct_score === '' || s.conduct_score == null) ? CONDUCT_BASE : Number(s.conduct_score)) : CONDUCT_BASE,
    added: added, deducted: deducted,
    items: rows.map(function (r) {
      var by = userIdx[r.recorded_by];
      return Object.assign({}, r, { recorder_name: by ? by.full_name : '-' });
    })
  };
}

// ภาพรวมความประพฤติตามขอบเขตสิทธิ์ (สำหรับ KPI dashboard)
function Conduct_overview(user, p) {
  Auth_require_(user, 'conduct.view');
  var scope = Auth_classScope_(user);
  var students = DB_readAll(SHEETS.STUDENTS).filter(function (s) {
    if (s.status !== 'active') return false;
    if (p.class_id) return s.class_id === p.class_id;
    if (scope) return scope.indexOf(s.class_id) >= 0;
    return true;
  });
  var bands = { excellent: 0, good: 0, watch: 0, risk: 0 };
  var avg = 0;
  students.forEach(function (s) {
    var sc = (s.conduct_score === '' || s.conduct_score == null) ? CONDUCT_BASE : Number(s.conduct_score);
    avg += sc;
    if (sc >= 90) bands.excellent++;
    else if (sc >= 80) bands.good++;
    else if (sc >= 60) bands.watch++;
    else bands.risk++;
  });
  var classIdx = DB_index(SHEETS.CLASSES);
  var atRisk = students.filter(function (s) {
    return ((s.conduct_score === '' ? CONDUCT_BASE : Number(s.conduct_score)) < 60);
  }).map(function (s) { return Student_enrich_(s, classIdx); });

  return {
    total: students.length,
    avg: students.length ? Math.round((avg / students.length) * 10) / 10 : CONDUCT_BASE,
    bands: bands, atRisk: atRisk
  };
}

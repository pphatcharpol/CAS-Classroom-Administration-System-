/**
 * ═══════════════════════════════════════════════════════════════
 *  CAS · ระบบงานธุรการชั้นเรียน (Classroom Administration System)
 *  File:        15_Classroom.gs — บริหารห้องเรียน: เวรประจำวัน · คณะกรรมการห้อง · ผังที่นั่ง · ตารางเรียน
 *  Version:     1.4.0
 *  Last Update: 2026-05-31
 *  Developer:   ครูวิรัตน์  หาดคำ · www.kruwirat.com
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
var COMMITTEE_POSITIONS = [
  'หัวหน้าห้อง', 'รองหัวหน้าห้อง คนที่ 1', 'รองหัวหน้าห้อง คนที่ 2', 'เลขานุการ', 'เหรัญญิก',
  'หัวหน้าฝ่ายวิชาการ', 'หัวหน้าฝ่ายกิจกรรม', 'หัวหน้าฝ่ายความสะอาด', 'หัวหน้าฝ่ายประชาสัมพันธ์', 'หัวหน้าฝ่ายปฏิคม/สวัสดิการ'
];

function Classroom_meta() {
  return { weekdays: WEEKDAYS5, periods: PERIODS, lunch_after: LUNCH_AFTER, positions: COMMITTEE_POSITIONS };
}

// ตรวจสิทธิ์ + ระบุ class_id ตามบทบาท (นักเรียน = ห้องตนเอง)
function _classroomScope_(user, p) {
  if (user.role === 'student') {
    if (!user.class_id) throw new Error('บัญชีนี้ยังไม่ได้กำหนดชั้นเรียน');
    return user.class_id;
  }
  Auth_require_(user, 'classroom.view');
  if (!p.class_id) throw new Error('กรุณาเลือกชั้นเรียน');
  if (user.role === 'homeroom') {
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

/* ════════ เวรประจำวัน (Duty roster) ═════════════════════════════ */
function Duty_get(user, p) {
  var classId = _classroomScope_(user, p);
  var year = p.year || cfg_academicYear_(), term = p.term || '1';
  var stdIdx = DB_index(SHEETS.STUDENTS);
  var rows = DB_readAll(SHEETS.DUTY).filter(function (d) { return d.class_id === classId && String(d.academic_year) === String(year) && String(d.term) === String(term); });
  var byDay = {};
  WEEKDAYS5.forEach(function (w) { byDay[w.v] = []; });
  rows.forEach(function (d) {
    var s = stdIdx[d.student_id];
    if (byDay[d.weekday]) byDay[d.weekday].push({ student_id: d.student_id, full_name: s ? ((s.title || '') + s.first_name + ' ' + s.last_name) : '-', number: s ? s.number : '', task: d.task || '' });
  });
  Object.keys(byDay).forEach(function (k) { byDay[k].sort(function (a, b) { return (Number(a.number) || 999) - (Number(b.number) || 999); }); });
  return { class_id: classId, year: year, term: term, byDay: byDay, students: _classStudents_(classId) };
}

function Duty_save(user, p) {
  var classId = p.class_id; _classroomScope_(user, p); Auth_require_(user, 'classroom.manage');
  var year = p.year || cfg_academicYear_(), term = p.term || '1';
  _clearWhere_(SHEETS.DUTY, function (d) { return d.class_id === classId && String(d.academic_year) === String(year) && String(d.term) === String(term); });
  var rows = [];
  (p.assignments || []).forEach(function (a) {
    if (a.student_id && a.weekday) rows.push({ class_id: classId, academic_year: year, term: term, weekday: a.weekday, student_id: a.student_id, task: a.task || '', recorded_by: user.id });
  });
  if (rows.length) DB_bulkInsert(SHEETS.DUTY, rows);
  Audit_log(user, 'duty', 'class', classId, 'จัดเวร ' + year + '/' + term + ' (' + rows.length + ' รายการ)');
  return { count: rows.length };
}

// จัดเวรอัตโนมัติ — กระจายนักเรียนลง 5 วันแบบวนรอบ
function Duty_auto(user, p) {
  var classId = p.class_id; _classroomScope_(user, p); Auth_require_(user, 'classroom.manage');
  var students = _classStudents_(classId);
  var assignments = students.map(function (s, i) { return { student_id: s.id, weekday: (i % 5) + 1 }; });
  return Duty_save(user, { class_id: classId, year: p.year, term: p.term, assignments: assignments });
}

/* ════════ คณะกรรมการห้อง (Committee) ════════════════════════════ */
function Committee_get(user, p) {
  var classId = _classroomScope_(user, p);
  var year = p.year || cfg_academicYear_();
  var stdIdx = DB_index(SHEETS.STUDENTS);
  var rows = DB_readAll(SHEETS.COMMITTEE).filter(function (c) { return c.class_id === classId && String(c.academic_year) === String(year); });
  rows.sort(function (a, b) { return (Number(a.position_order) || 99) - (Number(b.position_order) || 99); });
  return {
    class_id: classId, year: year, students: _classStudents_(classId),
    members: rows.map(function (c) {
      var s = stdIdx[c.student_id];
      return { student_id: c.student_id, position: c.position, position_order: Number(c.position_order || 0), note: c.note || '', full_name: s ? ((s.title || '') + s.first_name + ' ' + s.last_name) : '-', number: s ? s.number : '', photo_url: s ? s.photo_url : '' };
    })
  };
}

function Committee_save(user, p) {
  var classId = p.class_id; _classroomScope_(user, p); Auth_require_(user, 'classroom.manage');
  var year = p.year || cfg_academicYear_();
  _clearWhere_(SHEETS.COMMITTEE, function (c) { return c.class_id === classId && String(c.academic_year) === String(year); });
  var rows = [];
  (p.members || []).forEach(function (m, i) {
    if (m.student_id && m.position) rows.push({ class_id: classId, academic_year: year, student_id: m.student_id, position: m.position, position_order: m.position_order != null ? m.position_order : i, note: m.note || '', recorded_by: user.id });
  });
  if (rows.length) DB_bulkInsert(SHEETS.COMMITTEE, rows);
  Audit_log(user, 'committee', 'class', classId, 'คณะกรรมการห้อง ' + year + ' (' + rows.length + ')');
  return { count: rows.length };
}

/* ════════ ผังที่นั่ง (Seating chart) ════════════════════════════ */
function Seating_get(user, p) {
  var classId = _classroomScope_(user, p);
  var year = p.year || cfg_academicYear_();
  var rec = DB_readAll(SHEETS.SEATING).filter(function (s) { return s.class_id === classId && String(s.academic_year) === String(year); })[0];
  var seats = [];
  if (rec) { try { seats = JSON.parse(rec.seats || '[]'); } catch (e) { seats = []; } }
  return {
    class_id: classId, year: year,
    rows: rec ? Number(rec.rows) : 5, cols: rec ? Number(rec.cols) : 6,
    seats: seats, students: _classStudents_(classId)
  };
}

function Seating_save(user, p) {
  var classId = p.class_id; _classroomScope_(user, p); Auth_require_(user, 'classroom.manage');
  var year = p.year || cfg_academicYear_();
  var existing = DB_readAll(SHEETS.SEATING).filter(function (s) { return s.class_id === classId && String(s.academic_year) === String(year); })[0];
  var data = { class_id: classId, academic_year: year, rows: Number(p.rows || 5), cols: Number(p.cols || 6), seats: JSON.stringify(p.seats || []), updated_by: user.id };
  var saved;
  if (existing) saved = DB_update(SHEETS.SEATING, existing.id, data);
  else saved = DB_insert(SHEETS.SEATING, data);
  Audit_log(user, 'seating', 'class', classId, 'ผังที่นั่ง ' + year);
  return saved;
}

/* ════════ ตารางเรียน (Timetable) ════════════════════════════════ */
function Timetable_get(user, p) {
  var classId = _classroomScope_(user, p);
  var year = p.year || cfg_academicYear_(), term = p.term || '1';
  var subjIdx = DB_index(SHEETS.SUBJECTS), userIdx = DB_index(SHEETS.USERS);
  var rows = DB_readAll(SHEETS.TIMETABLE).filter(function (t) { return t.class_id === classId && String(t.academic_year) === String(year) && String(t.term) === String(term); });
  var grid = {}; // key weekday-period → cell
  rows.forEach(function (t) {
    var su = subjIdx[t.subject_id];
    grid[t.weekday + '-' + t.period] = {
      weekday: Number(t.weekday), period: Number(t.period),
      subject_id: t.subject_id, subject_text: t.subject_text || (su ? su.name : ''),
      subject_code: su ? su.code : '', teacher_text: t.teacher_text || '', room: t.room || ''
    };
  });
  return { class_id: classId, year: year, term: term, grid: grid, weekdays: WEEKDAYS5, periods: PERIODS, lunch_after: LUNCH_AFTER };
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

// รวมข้อมูลห้องเรียนของนักเรียน (สำหรับหน้า me-classroom)
function Classroom_mine(user) {
  if (user.role !== 'student') throw new Error('PERMISSION_DENIED');
  return {
    timetable: Timetable_get(user, {}),
    duty: Duty_get(user, {}),
    committee: Committee_get(user, {}),
    seating: Seating_get(user, {})
  };
}

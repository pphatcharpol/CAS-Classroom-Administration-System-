/**
 * ═══════════════════════════════════════════════════════════════
 *  CAS · ระบบงานธุรการชั้นเรียน (Classroom Administration System)
 *  File:        14_Grade.gs — งานวัดผล & เอกสารทะเบียน ปพ. (หลักสูตรแกนกลาง 2551 · สพฐ.)
 *  Version:     1.3.0
 *  Last Update: 2026-05-31
 *  Developer:   ครูวิรัตน์  หาดคำ · www.kruwirat.com
 *  License:     Proprietary · © 2026
 * ═══════════════════════════════════════════════════════════════
 *  รายวิชา 8 กลุ่มสาระ · ผลการเรียน + GPA/GPAX · คุณลักษณะอันพึงประสงค์ 8 ประการ
 *  · อ่านคิดวิเคราะห์เขียน · สมุดพก ปพ.6 · ระเบียนผลการเรียน ปพ.1
 */

/* ════════ ค่าคงที่ตามหลักสูตรแกนกลาง 2551 ════════════════════════ */
var LEARNING_AREAS = [
  'ภาษาไทย', 'คณิตศาสตร์', 'วิทยาศาสตร์และเทคโนโลยี', 'สังคมศึกษา ศาสนาและวัฒนธรรม',
  'สุขศึกษาและพลศึกษา', 'ศิลปะ', 'การงานอาชีพ', 'ภาษาต่างประเทศ'
];
var SUBJECT_TYPE = { core: 'รายวิชาพื้นฐาน', additional: 'รายวิชาเพิ่มเติม', activity: 'กิจกรรมพัฒนาผู้เรียน' };

// ระดับผลการเรียน — numeric = ค่าที่ใช้คำนวณ GPA (null = ไม่นับ: ร/มส/มผ/ผ)
var GRADE_VALUES = { '4': 4, '3.5': 3.5, '3': 3, '2.5': 2.5, '2': 2, '1.5': 1.5, '1': 1, '0': 0, 'ร': null, 'มส': null, 'มผ': null, 'ผ': null };
var GRADE_ORDER = ['4', '3.5', '3', '2.5', '2', '1.5', '1', '0', 'ร', 'มส', 'ผ', 'มผ'];
var GRADE_NOTE = { 'ร': 'รอการตัดสิน (ไม่สมบูรณ์)', 'มส': 'ไม่มีสิทธิ์สอบ (เวลาเรียนไม่พอ)', 'ผ': 'ผ่านเกณฑ์', 'มผ': 'ไม่ผ่านเกณฑ์' };

// 8 คุณลักษณะอันพึงประสงค์
var DESIRABLE_CHARS = [
  'รักชาติ ศาสน์ กษัตริย์', 'ซื่อสัตย์สุจริต', 'มีวินัย', 'ใฝ่เรียนรู้',
  'อยู่อย่างพอเพียง', 'มุ่งมั่นในการทำงาน', 'รักความเป็นไทย', 'มีจิตสาธารณะ'
];
var EVAL_LEVEL_LABEL = { 3: 'ดีเยี่ยม', 2: 'ดี', 1: 'ผ่าน', 0: 'ไม่ผ่าน' };

// แปลงคะแนนดิบ (0-100) → ระดับผลการเรียน (เกณฑ์มาตรฐาน)
function Grade_fromScore_(score) {
  var s = Number(score);
  if (isNaN(s)) return '';
  if (s >= 80) return '4'; if (s >= 75) return '3.5'; if (s >= 70) return '3';
  if (s >= 65) return '2.5'; if (s >= 60) return '2'; if (s >= 55) return '1.5';
  if (s >= 50) return '1'; return '0';
}

function Grade_meta() {
  return {
    areas: LEARNING_AREAS, subject_type: SUBJECT_TYPE, grade_order: GRADE_ORDER,
    grade_values: GRADE_VALUES, grade_note: GRADE_NOTE,
    desirable: DESIRABLE_CHARS, eval_level: EVAL_LEVEL_LABEL
  };
}

// คำนวณ GPA จากรายการเกรด (ถ่วงน้ำหนักด้วยหน่วยกิต เฉพาะเกรดที่เป็นตัวเลข)
function _gpa_(grades) {
  var totCredit = 0, totPoint = 0;
  grades.forEach(function (g) {
    var v = GRADE_VALUES[String(g.grade)];
    var cr = Number(g.credit || 0);
    if (v !== null && v !== undefined && cr > 0) { totCredit += cr; totPoint += v * cr; }
  });
  return { credit: totCredit, gpa: totCredit ? Math.round((totPoint / totCredit) * 100) / 100 : 0 };
}

/* ════════ SUBJECTS (รายวิชา) ════════════════════════════════════ */
function Subject_list(user, p) {
  Auth_require_(user, 'grade.view');
  p = p || {};
  var userIdx = DB_index(SHEETS.USERS);
  var rows = DB_readAll(SHEETS.SUBJECTS).filter(function (s) { return s.status !== 'deleted'; });
  if (p.year) rows = rows.filter(function (s) { return String(s.academic_year) === String(p.year); });
  if (p.term) rows = rows.filter(function (s) { return String(s.term) === String(p.term); });
  if (p.level) rows = rows.filter(function (s) { return s.level === p.level; });
  if (p.area) rows = rows.filter(function (s) { return s.learning_area === p.area; });
  if (p.q) { var q = String(p.q).toLowerCase(); rows = rows.filter(function (s) { return (s.code + ' ' + s.name).toLowerCase().indexOf(q) >= 0; }); }
  rows.sort(function (a, b) { return String(a.code).localeCompare(String(b.code), 'th'); });
  return {
    items: rows.map(function (s) {
      var t = userIdx[s.teacher_id];
      return Object.assign({}, s, { credit: Number(s.credit), area_label: s.learning_area, type_label: SUBJECT_TYPE[s.type] || s.type, teacher_name: t ? t.full_name : '-' });
    })
  };
}

function Subject_save(user, p) {
  Auth_require_(user, 'subject.manage');
  var data = {
    code: String(p.code || '').trim(), name: String(p.name || '').trim(),
    learning_area: p.learning_area || LEARNING_AREAS[0], credit: Number(p.credit || 0),
    type: p.type || 'core', level: p.level || '',
    academic_year: p.academic_year || cfg_academicYear_(), term: p.term || '1',
    teacher_id: p.teacher_id || '', status: p.status || 'active'
  };
  if (!data.code || !data.name) throw new Error('กรุณาระบุรหัสวิชาและชื่อวิชา');
  var saved;
  if (p.id) { saved = DB_update(SHEETS.SUBJECTS, p.id, data); Audit_log(user, 'update', 'subject', p.id, data.code); }
  else { saved = DB_insert(SHEETS.SUBJECTS, data); Audit_log(user, 'create', 'subject', saved.id, data.code + ' ' + data.name); }
  return saved;
}

function Subject_delete(user, p) {
  Auth_require_(user, 'subject.manage');
  DB_softDelete(SHEETS.SUBJECTS, p.id);
  Audit_log(user, 'delete', 'subject', p.id, '');
  return true;
}

/* ════════ GRADES (ผลการเรียนรายวิชา) ════════════════════════════ */
// สมุดบันทึกผลการเรียนของวิชา → รายชื่อ + เกรดที่บันทึกไว้ (กรอกแบบกลุ่ม)
function Grade_sheet(user, p) {
  Auth_require_(user, 'grade.view');
  if (!p.subject_id || !p.class_id) throw new Error('กรุณาเลือกชั้นเรียนและรายวิชา');
  var subj = DB_get(SHEETS.SUBJECTS, p.subject_id);
  var classIdx = DB_index(SHEETS.CLASSES);
  var students = DB_readAll(SHEETS.STUDENTS)
    .filter(function (s) { return s.class_id === p.class_id && s.status === 'active'; })
    .map(function (s) { return Student_enrich_(s, classIdx); })
    .sort(function (a, b) { return (Number(a.number) || 999) - (Number(b.number) || 999); });

  var year = p.year || (subj ? subj.academic_year : cfg_academicYear_());
  var term = p.term || (subj ? subj.term : '1');
  var existing = {};
  DB_readAll(SHEETS.GRADES).forEach(function (g) {
    if (g.subject_id === p.subject_id && String(g.academic_year) === String(year) && String(g.term) === String(term)) existing[g.student_id] = g;
  });
  return {
    subject: subj, year: year, term: term,
    students: students.map(function (s) {
      var g = existing[s.id];
      return { student_id: s.id, student_code: s.student_code, number: s.number, full_name: s.full_name, photo_url: s.photo_url, score: g ? g.score : '', grade: g ? g.grade : '', grade_id: g ? g.id : '' };
    })
  };
}

function Grade_saveBulk(user, p) {
  Auth_require_(user, 'grade.manage');
  var subj = DB_get(SHEETS.SUBJECTS, p.subject_id);
  if (!subj) throw new Error('ไม่พบรายวิชา');
  var year = p.year || subj.academic_year, term = p.term || subj.term;
  var all = DB_readAll(SHEETS.GRADES);
  var existing = {};
  all.forEach(function (g) { if (g.subject_id === p.subject_id && String(g.academic_year) === String(year) && String(g.term) === String(term)) existing[g.student_id] = g; });

  var toInsert = [], updated = 0;
  (p.records || []).forEach(function (r) {
    var grade = r.grade;
    if ((grade === '' || grade == null) && (r.score === '' || r.score == null)) return; // ข้ามที่ยังไม่กรอก
    if ((grade === '' || grade == null) && r.score !== '') grade = Grade_fromScore_(r.score);
    var ex = existing[r.student_id];
    if (ex) {
      if (ex.grade !== grade || String(ex.score) !== String(r.score || '')) {
        DB_update(SHEETS.GRADES, ex.id, { grade: grade, score: r.score || '', credit: subj.credit, recorded_by: user.id }); updated++;
      }
    } else {
      toInsert.push({ student_id: r.student_id, class_id: p.class_id, subject_id: p.subject_id, academic_year: year, term: term, score: r.score || '', grade: grade, credit: subj.credit, recorded_by: user.id });
    }
  });
  if (toInsert.length) DB_bulkInsert(SHEETS.GRADES, toInsert);
  Audit_log(user, 'grade', 'subject', p.subject_id, subj.code + ' ' + year + '/' + term + ' (+' + toInsert.length + '/~' + updated + ')');
  return { inserted: toInsert.length, updated: updated };
}

// ผลการเรียนของนักเรียนในภาคเรียนหนึ่ง + GPA
function Grade_studentTerm(user, p) {
  var sid = p.student_id;
  if (user.role === 'student') sid = user.student_id;
  else Auth_require_(user, 'grade.view');
  var year = p.year, term = p.term;
  var subjIdx = DB_index(SHEETS.SUBJECTS);
  var rows = DB_readAll(SHEETS.GRADES).filter(function (g) {
    return g.student_id === sid && (!year || String(g.academic_year) === String(year)) && (!term || String(g.term) === String(term));
  });
  var items = rows.map(function (g) {
    var s = subjIdx[g.subject_id] || {};
    return Object.assign({}, g, { credit: Number(g.credit), subject_code: s.code, subject_name: s.name, learning_area: s.learning_area, type: s.type });
  }).sort(function (a, b) { return String(a.subject_code || '').localeCompare(String(b.subject_code || ''), 'th'); });
  return Object.assign({ items: items }, _gpa_(items));
}

/* ════════ คุณลักษณะ + อ่านคิดวิเคราะห์เขียน (LearnerEvals) ════════ */
function Eval_sheet(user, p) {
  Auth_require_(user, 'grade.view');
  if (!p.class_id) throw new Error('กรุณาเลือกชั้นเรียน');
  var year = p.year || cfg_academicYear_(), term = p.term || '1';
  var classIdx = DB_index(SHEETS.CLASSES);
  var students = DB_readAll(SHEETS.STUDENTS).filter(function (s) { return s.class_id === p.class_id && s.status === 'active'; })
    .map(function (s) { return Student_enrich_(s, classIdx); })
    .sort(function (a, b) { return (Number(a.number) || 999) - (Number(b.number) || 999); });
  var existing = {};
  DB_readAll(SHEETS.EVALS).forEach(function (e) {
    if (e.class_id === p.class_id && String(e.academic_year) === String(year) && String(e.term) === String(term)) existing[e.student_id] = e;
  });
  return {
    year: year, term: term,
    students: students.map(function (s) { return { student_id: s.id, number: s.number, full_name: s.full_name, photo_url: s.photo_url, eval: existing[s.id] || null }; })
  };
}

function Eval_save(user, p) {
  Auth_require_(user, 'eval.manage');
  var s = DB_get(SHEETS.STUDENTS, p.student_id);
  if (!s) throw new Error('ไม่พบนักเรียน');
  var year = p.year || cfg_academicYear_(), term = p.term || '1';
  var data = { student_id: s.id, class_id: s.class_id, academic_year: year, term: term, reading: p.reading == null ? '' : p.reading, activity: p.activity || 'pass', comment: p.comment || '', evaluated_by: user.id };
  for (var i = 1; i <= 8; i++) data['dq' + i] = p['dq' + i] == null ? '' : p['dq' + i];
  var existing = DB_readAll(SHEETS.EVALS).filter(function (e) { return e.student_id === s.id && String(e.academic_year) === String(year) && String(e.term) === String(term); })[0];
  var saved;
  if (existing) saved = DB_update(SHEETS.EVALS, existing.id, data);
  else saved = DB_insert(SHEETS.EVALS, data);
  Audit_log(user, 'eval', 'student', s.id, 'ประเมินคุณลักษณะ ' + year + '/' + term);
  return saved;
}

function _evalSummary_(ev) {
  if (!ev) return null;
  var sum = 0, n = 0;
  for (var i = 1; i <= 8; i++) { var v = ev['dq' + i]; if (v !== '' && v != null) { sum += Number(v); n++; } }
  var avg = n ? sum / n : null;
  var desirableLevel = avg == null ? '' : (avg >= 2.5 ? 3 : avg >= 1.5 ? 2 : avg >= 0.5 ? 1 : 0);
  return { avg: avg, desirable_level: desirableLevel, reading: ev.reading, activity: ev.activity };
}

/* ════════ เอกสาร ปพ.6 (สมุดพก) + ปพ.1 (ระเบียนผลการเรียน) ════════ */
function ReportCard_data(user, p) {
  var sid = p.student_id;
  if (user.role === 'student') sid = user.student_id;
  else Auth_require_(user, 'grade.view');
  var s = DB_get(SHEETS.STUDENTS, sid);
  if (!s) throw new Error('ไม่พบนักเรียน');
  var year = p.year || cfg_academicYear_(), term = p.term || '1';
  var classIdx = DB_index(SHEETS.CLASSES), userIdx = DB_index(SHEETS.USERS);
  var cls = classIdx[s.class_id] || {};

  var gradeData = Grade_studentTerm(user, { student_id: sid, year: year, term: term });
  // GPAX สะสมทุกภาค
  var allGrades = DB_readAll(SHEETS.GRADES).filter(function (g) { return g.student_id === sid; }).map(function (g) { return { grade: g.grade, credit: Number(g.credit) }; });
  var gpax = _gpa_(allGrades);

  var ev = DB_readAll(SHEETS.EVALS).filter(function (e) { return e.student_id === sid && String(e.academic_year) === String(year) && String(e.term) === String(term); })[0] || null;

  // มาเรียนในภาค (นับคร่าว ๆ จากทั้งหมด — ระบบเก็บรายวัน)
  var att = { present: 0, late: 0, leave: 0, sick: 0, absent: 0, total: 0 };
  DB_readAll(SHEETS.ATTENDANCE).forEach(function (a) { if (a.student_id === sid && att[a.status] != null) { att[a.status]++; att.total++; } });

  var health = null;
  DB_readAll(SHEETS.HEALTH).forEach(function (h) { if (h.student_id === sid) { if (!health || (h.record_date || '') > (health.record_date || '')) health = h; } });

  var hr = userIdx[cls.homeroom_teacher_id];
  return {
    student: Student_enrich_(s, classIdx),
    class_label: cls.level ? (cls.level + '/' + cls.room) : '-',
    homeroom_name: hr ? hr.full_name : '-',
    academic_year: year, term: term,
    grades: gradeData.items, gpa: gradeData.gpa, credit: gradeData.credit, gpax: gpax.gpa, total_credit: gpax.credit,
    eval: ev, eval_summary: _evalSummary_(ev),
    desirable_chars: DESIRABLE_CHARS, eval_level: EVAL_LEVEL_LABEL,
    attendance: att, present_rate: att.total ? Math.round(((att.present + att.late) / att.total) * 100) : 100,
    conduct_score: (s.conduct_score === '' || s.conduct_score == null) ? CONDUCT_BASE : Number(s.conduct_score),
    health: health,
    comment: ev ? ev.comment : ''
  };
}

// ปพ.1 — ระเบียนแสดงผลการเรียน (ทุกภาคเรียนสะสม)
function Transcript_data(user, p) {
  var sid = p.student_id;
  if (user.role === 'student') sid = user.student_id;
  else Auth_require_(user, 'grade.view');
  var s = DB_get(SHEETS.STUDENTS, sid);
  if (!s) throw new Error('ไม่พบนักเรียน');
  var classIdx = DB_index(SHEETS.CLASSES), subjIdx = DB_index(SHEETS.SUBJECTS);
  var grades = DB_readAll(SHEETS.GRADES).filter(function (g) { return g.student_id === sid; });
  // จัดกลุ่มตามปี/ภาค
  var terms = {};
  grades.forEach(function (g) {
    var key = g.academic_year + '/' + g.term;
    if (!terms[key]) terms[key] = { year: g.academic_year, term: g.term, items: [] };
    var su = subjIdx[g.subject_id] || {};
    terms[key].items.push({ subject_code: su.code, subject_name: su.name, credit: Number(g.credit), grade: g.grade });
  });
  var termList = Object.keys(terms).sort().map(function (k) {
    var t = terms[k]; var gp = _gpa_(t.items); t.gpa = gp.gpa; t.credit = gp.credit; return t;
  });
  var gpax = _gpa_(grades.map(function (g) { return { grade: g.grade, credit: Number(g.credit) }; }));
  return { student: Student_enrich_(s, classIdx), terms: termList, gpax: gpax.gpa, total_credit: gpax.credit };
}

// รายชื่อนักเรียน + GPA ภาคล่าสุด (สำหรับหน้าเอกสาร/สมุดพก)
function Grade_classRoster(user, p) {
  Auth_require_(user, 'grade.view');
  p = p || {};
  var scope = Auth_classScope_(user);
  var classIdx = DB_index(SHEETS.CLASSES);
  var year = p.year || cfg_academicYear_(), term = p.term || '1';
  var gradesByStudent = {};
  DB_readAll(SHEETS.GRADES).forEach(function (g) {
    if (String(g.academic_year) === String(year) && String(g.term) === String(term)) {
      (gradesByStudent[g.student_id] = gradesByStudent[g.student_id] || []).push({ grade: g.grade, credit: Number(g.credit) });
    }
  });
  var rows = DB_readAll(SHEETS.STUDENTS).filter(function (s) {
    if (s.status !== 'active') return false;
    if (p.class_id) return s.class_id === p.class_id;
    if (scope) return scope.indexOf(s.class_id) >= 0;
    return true;
  });
  if (p.q) { var q = String(p.q).toLowerCase(); rows = rows.filter(function (s) { return (s.student_code + ' ' + s.first_name + ' ' + s.last_name).toLowerCase().indexOf(q) >= 0; }); }
  rows = rows.map(function (s) {
    var gp = _gpa_(gradesByStudent[s.id] || []);
    return Object.assign(Student_enrich_(s, classIdx), { gpa: gp.gpa, subj_count: (gradesByStudent[s.id] || []).length });
  });
  rows.sort(function (a, b) { if (a.class_id !== b.class_id) return a.class_label.localeCompare(b.class_label, 'th'); return (Number(a.number) || 999) - (Number(b.number) || 999); });
  return { items: rows, year: year, term: term };
}

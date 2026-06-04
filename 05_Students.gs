/**
 * ═══════════════════════════════════════════════════════════════
 *  CAS · ระบบงานธุรการชั้นเรียน (Classroom Administration System)
 *  File:        05_Students.gs — โมดูลชั้นเรียน · นักเรียน · บัญชีผู้ใช้
 *  Version:     1.0.0
 *  Last Update: 2026-05-30
 *  Developer:   ครูวิรัตน์  หาดคำ · www.kruwirat.com
 *  License:     Proprietary · © 2026
 * ═══════════════════════════════════════════════════════════════
 */

/* ════════ CLASSES (ชั้นเรียน) ════════════════════════════════════ */
function Class_enrich_(c, teacherIdx, counts) {
  var ht = teacherIdx[c.homeroom_teacher_id];
  return Object.assign({}, c, {
    grade_band_label: GRADE_BAND_LABEL[c.grade_band] || c.grade_band,
    homeroom_name: ht ? ht.full_name : '-',
    student_count: counts[c.id] || 0
  });
}

function Class_list(user, p) {
  p = p || {};
  var scope = Auth_classScope_(user);
  var teacherIdx = DB_index(SHEETS.USERS);
  var students = DB_readAll(SHEETS.STUDENTS).filter(function (s) { return s.status === 'active'; });
  var counts = {};
  students.forEach(function (s) { counts[s.class_id] = (counts[s.class_id] || 0) + 1; });

  var rows = DB_readAll(SHEETS.CLASSES).filter(function (c) { return c.status !== 'deleted'; });
  if (scope) rows = rows.filter(function (c) { return scope.indexOf(c.id) >= 0; });
  if (p.year) rows = rows.filter(function (c) { return String(c.academic_year) === String(p.year); });
  if (p.band) rows = rows.filter(function (c) { return c.grade_band === p.band; });
  if (p.q) {
    var q = String(p.q).toLowerCase();
    rows = rows.filter(function (c) {
      return (c.level + ' ' + c.room).toLowerCase().indexOf(q) >= 0;
    });
  }
  rows.sort(function (a, b) { return (a.level + a.room).localeCompare(b.level + b.room, 'th'); });
  return { items: rows.map(function (c) { return Class_enrich_(c, teacherIdx, counts); }) };
}

function Class_save(user, p) {
  Auth_require_(user, user.role === 'admin' ? 'class.manage_own' : 'class.manage_own');
  if (user.role !== 'admin' && user.role !== 'homeroom') Auth_require_(user, '*');
  var data = {
    academic_year: p.academic_year || cfg_academicYear_(),
    level: String(p.level || '').trim(),
    room: String(p.room || '').trim(),
    grade_band: cfg_gradeBand_(p.level),
    homeroom_teacher_id: p.homeroom_teacher_id || '',
    co_teacher_id: p.co_teacher_id || '',
    capacity: Number(p.capacity || 40),
    color: p.color || '#C9A227',
    note: p.note || '',
    status: p.status || 'active'
  };
  if (!data.level || !data.room) throw new Error('กรุณาระบุระดับชั้นและห้อง');
  var saved;
  if (p.id) { saved = DB_update(SHEETS.CLASSES, p.id, data); Audit_log(user, 'update', 'class', p.id, data.level + '/' + data.room); }
  else { saved = DB_insert(SHEETS.CLASSES, data); Audit_log(user, 'create', 'class', saved.id, data.level + '/' + data.room); }
  return saved;
}

function Class_delete(user, p) {
  Auth_require_(user, '*');
  var has = DB_readAll(SHEETS.STUDENTS).some(function (s) { return s.class_id === p.id && s.status === 'active'; });
  if (has) throw new Error('ไม่สามารถลบได้ — ยังมีนักเรียนในชั้นเรียนนี้');
  DB_softDelete(SHEETS.CLASSES, p.id);
  Audit_log(user, 'delete', 'class', p.id, '');
  return true;
}

/* ════════ STUDENTS (นักเรียน) ════════════════════════════════════ */
function Student_enrich_(s, classIdx) {
  var c = classIdx[s.class_id];
  return Object.assign({}, s, {
    full_name: ((s.title || '') + s.first_name + ' ' + s.last_name).trim(),
    class_label: c ? (c.level + '/' + c.room) : '-',
    grade_band: c ? c.grade_band : '',
    conduct_score: s.conduct_score === '' || s.conduct_score == null ? CONDUCT_BASE : Number(s.conduct_score)
  });
}

function Student_list(user, p) {
  p = p || {};
  var scope = Auth_classScope_(user);
  var classIdx = DB_index(SHEETS.CLASSES);
  var rows = DB_readAll(SHEETS.STUDENTS).filter(function (s) { return s.status !== 'deleted'; });

  if (user.role === 'student') {
    rows = rows.filter(function (s) { return s.id === user.student_id; });
  } else if (scope) {
    rows = rows.filter(function (s) { return scope.indexOf(s.class_id) >= 0; });
  }
  if (p.class_id) rows = rows.filter(function (s) { return s.class_id === p.class_id; });
  if (p.status) rows = rows.filter(function (s) { return s.status === p.status; });
  if (p.gender) rows = rows.filter(function (s) { return s.gender === p.gender; });
  if (p.q) {
    var q = String(p.q).toLowerCase();
    rows = rows.filter(function (s) {
      return (s.student_code + ' ' + s.first_name + ' ' + s.last_name + ' ' + s.nickname).toLowerCase().indexOf(q) >= 0;
    });
  }
  rows = rows.map(function (s) { return Student_enrich_(s, classIdx); });
  rows.sort(function (a, b) {
    if (a.class_id !== b.class_id) return a.class_label.localeCompare(b.class_label, 'th');
    return (Number(a.number) || 999) - (Number(b.number) || 999);
  });

  var total = rows.length;
  var page = p.page || 1, size = p.size || 60;
  return { items: rows.slice((page - 1) * size, page * size), total: total, page: page, size: size };
}

function Student_get(user, p) {
  var s = DB_get(SHEETS.STUDENTS, p.id);
  if (!s) throw new Error('ไม่พบข้อมูลนักเรียน');
  if (user.role === 'student' && s.id !== user.student_id) throw new Error('PERMISSION_DENIED');
  return Student_enrich_(s, DB_index(SHEETS.CLASSES));
}

function Student_save(user, p) {
  Auth_require_(user, 'student.manage');
  var data = {
    student_code: String(p.student_code || '').trim(),
    title: p.title || '', first_name: String(p.first_name || '').trim(),
    last_name: String(p.last_name || '').trim(), nickname: p.nickname || '',
    class_id: p.class_id || '', number: Number(p.number || 0),
    gender: p.gender || '', birthdate: p.birthdate || '',
    id_card: p.id_card || '', blood_type: p.blood_type || '',
    address: p.address || '', phone: p.phone || '',
    parent_name: p.parent_name || '', parent_relation: p.parent_relation || '',
    parent_phone: p.parent_phone || '', health_note: p.health_note || '',
    status: p.status || 'active'
  };
  if (!data.first_name || !data.last_name) throw new Error('กรุณาระบุชื่อและนามสกุล');
  if (!data.student_code) throw new Error('กรุณาระบุเลขประจำตัวนักเรียน');

  if (p.photo) {
    var up = Files_uploadImage(p.photo, 'students', 'std-' + data.student_code);
    data.photo_url = up.url;
  } else if (p.photo_url != null) data.photo_url = p.photo_url;

  var saved;
  if (p.id) {
    saved = DB_update(SHEETS.STUDENTS, p.id, data);
    Audit_log(user, 'update', 'student', p.id, data.first_name);
  } else {
    data.conduct_score = CONDUCT_BASE;
    saved = DB_insert(SHEETS.STUDENTS, data);
    Audit_log(user, 'create', 'student', saved.id, data.first_name);
    // สร้างบัญชีนักเรียนอัตโนมัติ (username = เลขประจำตัว, รหัสเริ่มต้น = เลขประจำตัว)
    if (p.create_account !== false) Student_makeAccount_(saved);
  }
  return saved;
}

function Student_makeAccount_(s) {
  var exists = DB_readAll(SHEETS.USERS).some(function (u) {
    return String(u.username).toLowerCase() === String(s.student_code).toLowerCase();
  });
  if (exists) return null;
  var salt = Auth_salt_();
  return DB_insert(SHEETS.USERS, {
    username: String(s.student_code).toLowerCase(),
    password_hash: Auth_hash_(s.student_code, salt), salt: salt,
    role: 'student', full_name: (s.title || '') + s.first_name + ' ' + s.last_name,
    photo_url: s.photo_url || '', email: '', phone: s.phone || '',
    student_id: s.id, class_id: s.class_id, title: s.title || '',
    must_change_pw: true, status: 'active'
  });
}

function Student_delete(user, p) {
  Auth_require_(user, 'student.manage');
  DB_softDelete(SHEETS.STUDENTS, p.id);
  Audit_log(user, 'delete', 'student', p.id, '');
  return true;
}

// นำเข้านักเรียนแบบกลุ่มจาก Excel/CSV — สร้างบัญชีอัตโนมัติ + ข้ามรายการซ้ำ
function Student_bulkImport(user, p) {
  Auth_require_(user, 'student.manage');
  var rows = p.rows || [];
  if (!rows.length) throw new Error('ไม่มีข้อมูลให้นำเข้า');
  if (rows.length > 2000) throw new Error('นำเข้าได้สูงสุด 2,000 รายการต่อครั้ง');

  var classByLabel = {};
  DB_readAll(SHEETS.CLASSES).forEach(function (c) {
    if (c.status === 'deleted') return;
    classByLabel[(c.level + '/' + c.room).replace(/\s/g, '')] = c.id;
    classByLabel[c.id] = c.id;
  });
  var existingCodes = {}; DB_readAll(SHEETS.STUDENTS).forEach(function (s) { if (s.student_code) existingCodes[String(s.student_code).trim()] = true; });
  var existingUser = {}; DB_readAll(SHEETS.USERS).forEach(function (u) { existingUser[String(u.username).toLowerCase()] = true; });

  var stRows = [], userRows = [], errors = [], created = 0, skipped = 0;
  rows.forEach(function (r, i) {
    var line = Number(r.__line || (i + 1));
    var code = String(r.student_code || '').trim();
    var fn = String(r.first_name || '').trim(), ln = String(r.last_name || '').trim();
    if (!code || !fn || !ln) { errors.push({ line: line, msg: 'ขาดข้อมูลจำเป็น (เลขประจำตัว/ชื่อ/นามสกุล)' }); return; }
    if (existingCodes[code]) { skipped++; errors.push({ line: line, msg: 'เลขประจำตัว ' + code + ' มีอยู่แล้ว (ข้าม)' }); return; }
    var clsKey = String(r.class || r.class_label || '').replace(/\s/g, '');
    var classId = classByLabel[clsKey] || '';
    if (!classId) { errors.push({ line: line, msg: 'ไม่พบชั้นเรียน "' + (r.class || r.class_label || '-') + '"' }); return; }
    var gender = /หญิง|female|^f/i.test(r.gender || '') ? 'female' : (/ชาย|male|^m/i.test(r.gender || '') ? 'male' : '');
    var title = String(r.title || '').trim() || (gender === 'female' ? 'ด.ญ.' : 'ด.ช.');
    var sid = cfg_uid_('STU');
    existingCodes[code] = true;
    stRows.push({
      id: sid, student_code: code, title: title, first_name: fn, last_name: ln, nickname: r.nickname || '',
      class_id: classId, number: Number(r.number || 0), gender: gender, birthdate: r.birthdate || '',
      id_card: String(r.id_card || ''), blood_type: r.blood_type || '', address: r.address || '', phone: String(r.phone || ''),
      parent_name: r.parent_name || '', parent_relation: r.parent_relation || '', parent_phone: String(r.parent_phone || ''),
      health_note: '', conduct_score: CONDUCT_BASE, status: 'active'
    });
    var uname = code.toLowerCase();
    if (!existingUser[uname]) {
      var salt = Auth_salt_();
      userRows.push({ username: uname, password_hash: Auth_hash_(code, salt), salt: salt, role: 'student', full_name: title + fn + ' ' + ln, photo_url: '', email: '', phone: String(r.phone || ''), student_id: sid, class_id: classId, title: title, must_change_pw: true, status: 'active' });
      existingUser[uname] = true;
    }
    created++;
  });
  if (stRows.length) DB_bulkInsert(SHEETS.STUDENTS, stRows);
  if (userRows.length) DB_bulkInsert(SHEETS.USERS, userRows);
  Audit_log(user, 'import', 'student', '', 'นำเข้า ' + created + ' · ข้าม ' + skipped + ' · ผิดพลาด ' + (errors.length - skipped));
  return { created: created, skipped: skipped, errors: errors };
}

// ย้ายชั้น / เลื่อนชั้น แบบกลุ่ม (bulk)
function Student_moveClass(user, p) {
  Auth_require_(user, 'student.manage');
  var ids = p.ids || [];
  ids.forEach(function (id) { DB_update(SHEETS.STUDENTS, id, { class_id: p.class_id }); });
  Audit_log(user, 'move_class', 'student', ids.join(','), 'ย้าย ' + ids.length + ' คน → ' + p.class_id);
  return ids.length;
}

/* ════════ USERS (บัญชีผู้ใช้ครู/แอดมิน) ══════════════════════════ */
function User_list(user, p) {
  Auth_require_(user, '*');
  p = p || {};
  var rows = DB_readAll(SHEETS.USERS).filter(function (u) { return u.status !== 'deleted'; });
  if (p.role) rows = rows.filter(function (u) { return u.role === p.role; });
  if (p.q) {
    var q = String(p.q).toLowerCase();
    rows = rows.filter(function (u) { return (u.username + ' ' + u.full_name).toLowerCase().indexOf(q) >= 0; });
  }
  rows.sort(function (a, b) { return ROLES.indexOf(a.role) - ROLES.indexOf(b.role); });
  return { items: rows.map(Auth_publicUser_) };
}

function User_save(user, p) {
  Auth_require_(user, '*');
  var data = {
    username: String(p.username || '').trim().toLowerCase(),
    role: p.role || 'teacher', full_name: String(p.full_name || '').trim(),
    email: p.email || '', phone: p.phone || '', title: p.title || '',
    class_id: p.class_id || '', status: p.status || 'active'
  };
  if (!data.username || !data.full_name) throw new Error('กรุณาระบุชื่อผู้ใช้และชื่อ-นามสกุล');
  if (ROLES.indexOf(data.role) < 0) throw new Error('บทบาทไม่ถูกต้อง');

  if (p.photo) data.photo_url = Files_uploadImage(p.photo, 'users', 'u-' + data.username).url;

  var saved;
  if (p.id) {
    saved = DB_update(SHEETS.USERS, p.id, data);
    Audit_log(user, 'update', 'user', p.id, data.username);
  } else {
    var dup = DB_readAll(SHEETS.USERS).some(function (u) { return String(u.username).toLowerCase() === data.username; });
    if (dup) throw new Error('ชื่อผู้ใช้นี้ถูกใช้แล้ว');
    var salt = Auth_salt_();
    data.salt = salt;
    data.password_hash = Auth_hash_(p.password || '123456', salt);
    data.must_change_pw = true;
    saved = DB_insert(SHEETS.USERS, data);
    Audit_log(user, 'create', 'user', saved.id, data.username);
  }
  return Auth_publicUser_(saved);
}

function User_delete(user, p) {
  Auth_require_(user, '*');
  if (p.id === user.id) throw new Error('ไม่สามารถลบบัญชีของตนเองได้');
  DB_softDelete(SHEETS.USERS, p.id);
  Audit_log(user, 'delete', 'user', p.id, '');
  return true;
}

/* ── Profile (ทุกบทบาทแก้ไขข้อมูลตนเองได้ + อัปโหลดรูป) ──────────── */
function Profile_update(user, p) {
  Auth_require_(user, 'profile.edit');
  var data = {};
  ['full_name', 'email', 'phone', 'title'].forEach(function (k) { if (p[k] != null) data[k] = p[k]; });
  if (p.photo) data.photo_url = Files_uploadImage(p.photo, 'users', 'u-' + user.username).url;
  var saved = DB_update(SHEETS.USERS, user.id, data);
  // ซิงก์รูป/ชื่อกลับไปที่ record นักเรียนด้วย ถ้าเป็นบทบาทนักเรียน
  if (user.role === 'student' && user.student_id) {
    var sp = {};
    if (data.photo_url) sp.photo_url = data.photo_url;
    if (data.phone) sp.phone = data.phone;
    if (Object.keys(sp).length) DB_update(SHEETS.STUDENTS, user.student_id, sp);
  }
  Audit_log(user, 'update', 'profile', user.id, '');
  return Auth_publicUser_(saved);
}

/**
 * ═══════════════════════════════════════════════════════════════
 *  CAS · ระบบงานธุรการชั้นเรียน (Classroom Administration System)
 *  File:        10_Seed.gs — ข้อมูลตัวอย่างเสมือนจริง (ครู · ชั้นเรียน · นักเรียน · เช็กชื่อ ฯลฯ)
 *  Version:     0.0.1
 *  Last Update: 2026-05-30
 *  Developer:   ครูที
 *  License:     Proprietary · © 2026
 * ═══════════════════════════════════════════════════════════════
 */

var SEED = {
  maleFirst: ['ธนภัทร', 'ภูริพัฒน์', 'ศุภวิชญ์', 'กิตติพงศ์', 'ปุณณวิช', 'จิรายุ', 'ธีรภัทร', 'ณัฐวุฒิ', 'พีรพัฒน์', 'อนุชิต', 'รัชชานนท์', 'ภานุพงศ์', 'วรเมธ', 'ก้องภพ', 'ธนกฤต'],
  femaleFirst: ['พิมพ์ชนก', 'ณัฐธิดา', 'กัญญาณัฐ', 'ชนัญชิดา', 'ปาริชาติ', 'สุพิชญา', 'ธัญชนก', 'พิชญาภา', 'อรไพลิน', 'กชกร', 'ศิรประภา', 'วรัทยา', 'เปมิกา', 'ญาดา', 'พรนภัส'],
  last: ['ใจดีงาม', 'รักเรียน', 'ศรีสุข', 'ทองคำ', 'แสงทอง', 'บุญมี', 'พงษ์ไพร', 'วัฒนกุล', 'จันทร์เพ็ญ', 'สมบูรณ์', 'ก้าวหน้า', 'มงคลชัย', 'เพชรน้ำหนึ่ง', 'ไกรสร', 'อุดมทรัพย์'],
  nick: ['ปลื้ม', 'ข้าวฟ่าง', 'มะปราง', 'ภูมิ', 'ใบเตย', 'ปอนด์', 'น้ำหวาน', 'ตะวัน', 'มิ้นต์', 'กัน', 'ฟ้า', 'เพชร', 'อิง', 'แทน', 'พลอย'],
  blood: ['A', 'B', 'O', 'AB'],
  villages: ['บางกระทุ่ม', 'วังน้ำคู้', 'บ้านใหม่', 'แสนสุข']
};

function _rand_(a) { return a[Math.floor(Math.random() * a.length)]; }
function _randInt_(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

function Seed_run() {
  DB_ensureAll();
  DB_beginBatch();   // ★ batch mode — flush + version bump ครั้งเดียวตอนจบ (กัน timeout)
  try {
  Seed_clear_(false);

  // ── Settings ──
  Settings_set('school_name', APP.ORG);
  Settings_set('school_motto', APP.MOTTO);
  Settings_set('academic_year', cfg_academicYear_());

  var year = cfg_academicYear_();

  // ── Admin ── (เก็บ object ที่ return ไว้ใช้แทนการ DB_readAll กลาง batch)
  var adminUser = Seed_user_('admin', 'admin', 'admin', 'นายผู้ดูแล ระบบ', 'นาย');

  // ── ครู ──
  var classDefs = [
    { level: 'ม.1', room: '1', color: '#A67C00' },
    { level: 'ม.2', room: '1', color: '#C99700' },
    { level: 'ม.3', room: '1', color: '#9A7B1E' }
  ];

  var teacherIds = [];
  classDefs.forEach(function (c, i) {
    var t = Seed_user_('teacher' + (i + 1), 'teacher' + (i + 1), 'teacher',
      'ครู' + _rand_(SEED.maleFirst.concat(SEED.femaleFirst)) + ' ' + _rand_(SEED.last), 'นาย/นาง');
    teacherIds.push(t.id);
  });

  // ── Classes ──
  var classes = classDefs.map(function (c, i) {
    return DB_insert(SHEETS.CLASSES, {
      academic_year: year, level: c.level, room: c.room,
      grade_band: cfg_gradeBand_(c.level), homeroom_teacher_id: teacherIds[i],
      capacity: 40, color: c.color, note: '', status: 'active'
    });
  });

  // ── Students (ไม่มี User Accounts สำหรับเด็กแล้ว) ──
  var studentRows = [];
  var seq = 1;
  classes.forEach(function (cls) {
    var n = _randInt_(18, 26);
    for (var k = 1; k <= n; k++) {
      var male = Math.random() < 0.5;
      var first = male ? _rand_(SEED.maleFirst) : _rand_(SEED.femaleFirst);
      var last = _rand_(SEED.last);
      var code = String(year - 543) + ('000' + seq).slice(-4);
      var sid = cfg_uid_('STU');
      studentRows.push({
        id: sid, student_code: code, title: male ? 'ด.ช.' : 'ด.ญ.',
        first_name: first, last_name: last, nickname: _rand_(SEED.nick),
        class_id: cls.id, number: k, gender: male ? 'male' : 'female',
        birthdate: (year - 543 - _randInt_(13, 16)) + '-' + ('0' + _randInt_(1, 12)).slice(-2) + '-' + ('0' + _randInt_(1, 28)).slice(-2),
        id_card: '1' + _randInt_(1000000000, 9999999999), blood_type: _rand_(SEED.blood),
        address: _randInt_(1, 199) + ' หมู่ ' + _randInt_(1, 12) + ' ' + _rand_(SEED.villages), phone: '08' + _randInt_(10000000, 99999999),
        parent_name: 'นาย/นาง ' + _rand_(SEED.last) + ' ' + last, parent_relation: _rand_(['บิดา', 'มารดา', 'ผู้ปกครอง']), parent_phone: '09' + _randInt_(10000000, 99999999),
      });
      seq++;
    }
  });
  DB_bulkInsert(SHEETS.STUDENTS, studentRows);


  // ── Home visits ──
  var visitRows = [];
  studentRows.forEach(function (s) {
    if (Math.random() < 0.4) {
      var risk = Math.random() < 0.15 ? 'high' : (Math.random() < 0.3 ? 'medium' : 'low');
      var size = _randInt_(3, 6), income = _randInt_(3, 30) * 1000;
      var _o1 = function (k) { var o = {}; o[k] = true; return o; }; // multi-select → object {key:true}
      var survey = { dependency: { elderly: Math.random() < 0.4, single_parent: Math.random() < 0.25, unemployed: Math.random() < 0.2 }, house_own: _rand_(['own', 'rent', 'free']), floor: _o1(_rand_(['tile', 'cement', 'plank', 'soil'])), wall: _o1(_rand_(['cement_plaster', 'plank', 'zinc'])), roof: _o1(_rand_(['metal', 'tile'])), toilet: true, farmland: _rand_(['none', 'lt1', 'r1to5']), water: _o1(_rand_(['tap', 'bottle', 'well'])), electric: 'meter', vehicles: { motorcycle: Math.random() < 0.6 }, appliances: { fridge: Math.random() < 0.7, tv: Math.random() < 0.6 } };
      var pv = _poverty_(income, size, survey);
      visitRows.push({
        student_id: s.id, class_id: s.class_id,
        visit_date: cfg_dateOnly_(new Date(Date.now() - _randInt_(5, 60) * 864e5)),
        address: s.address, gps_lat: (13 + Math.random()).toFixed(6), gps_lng: (100 + Math.random()).toFixed(6),
        photo_url: '', family_status: _rand_(['together', 'separated', 'divorced', 'father_dead']),
        economic_status: _rand_(['good', 'moderate', 'moderate', 'poor']),
        risk_level: risk, findings: 'สภาพแวดล้อมเหมาะสมต่อการเรียนรู้',
        recommendation: 'ติดตามผลการเรียนอย่างต่อเนื่อง', visited_by: 'system', status: 'active',
        academic_term: 'ภาคเรียนที่ 1/' + year, live_with: _rand_(['parents', 'relatives', 'guardian']),
        guardian_name: s.parent_name, guardian_relation: s.parent_relation, guardian_occupation: _rand_(['เกษตรกร', 'รับจ้างทั่วไป', 'ค้าขาย', 'พนักงาน']),
        guardian_phone: s.parent_phone, guardian_idcard: '', state_welfare: Math.random() < 0.4,
        household_size: size, household_income: income, income_per_capita: pv.per_capita, poverty_status: pv.status,
        members_json: JSON.stringify([{ name: s.parent_name, relation: s.parent_relation, age: _randInt_(35, 55), income: income, disabled: false, chronic: false }]),
        survey_json: JSON.stringify(survey), travel_json: JSON.stringify({ method: _rand_(['walk', 'bicycle', 'school_bus', 'own_motorcycle']), distance: _randInt_(1, 15), cost: _randInt_(0, 40) }),
        addr_json: JSON.stringify({ house_no: _randInt_(1, 199), moo: _randInt_(1, 12), province: 'จังหวัดตัวอย่าง' }),
        photos_json: JSON.stringify({}), consent: true, cct_request: true
      });
    }
  });
  DB_bulkInsert(SHEETS.HOMEVISIT, visitRows);

  // ── Announcements ──
  var adminU = adminUser;  // ใช้ค่าที่ return จาก Seed_user_ (ไม่ DB_readAll กลาง batch — จะได้ cache เก่า)
  var anns = [
    { title: 'เปิดภาคเรียนที่ 1 ปีการศึกษา ' + (year - 543), category: 'general', pinned: true, body: 'ขอต้อนรับนักเรียนทุกคนเข้าสู่ภาคเรียนใหม่ พบกันที่โรงเรียนวันจันทร์ เวลา 08.00 น. แต่งกายชุดนักเรียนให้เรียบร้อย' },
    { title: 'กำหนดสอบกลางภาค', category: 'exam', pinned: false, body: 'การสอบกลางภาคจะจัดขึ้นในสัปดาห์ที่ 9 ของภาคเรียน ขอให้นักเรียนเตรียมตัวอ่านหนังสือล่วงหน้า' },
    { title: 'กิจกรรมวันไหว้ครู', category: 'activity', pinned: false, body: 'โรงเรียนจัดพิธีไหว้ครูประจำปี ขอเชิญนักเรียนทุกระดับชั้นเข้าร่วม ณ หอประชุมโรงเรียน' },

  ];
  var annRows = anns.map(function (a) {
    return {
      title: a.title, body: a.body, category: a.category, target_role: 'all', target_class: '',
      pinned: a.pinned, cover_url: '', author_id: adminU ? adminU.id : '',
      publish_at: cfg_now_(), status: 'published', views: _randInt_(10, 250)
    };
  });
  DB_bulkInsert(SHEETS.ANNOUNCE, annRows);

  // ── ปฏิทินกิจกรรม ──
  var evDefs = [
    { d: 3, t: 'ประชุมผู้ปกครอง', type: 'meeting' }, { d: 7, t: 'กิจกรรมวันไหว้ครู', type: 'activity' },
    { d: 14, t: 'สอบกลางภาค', type: 'exam' }, { d: 20, t: 'กีฬาสีภายใน', type: 'sport' },
    { d: 30, t: 'ทัศนศึกษา', type: 'activity' }, { d: -2, t: 'กิจกรรมเข้าแถวเคารพธงชาติ', type: 'general' }
  ];
  var evRows = evDefs.map(function (e) {
    return { title: e.t, event_type: e.type, event_date: cfg_dateOnly_(new Date(Date.now() + e.d * 864e5)), end_date: '', time: '08:30', location: 'โรงเรียน', target_role: 'all', target_class: '', description: '', color: '', created_by: adminU ? adminU.id : '', status: 'active' };
  });
  DB_bulkInsert(SHEETS.EVENTS, evRows);

  return 'เพิ่มข้อมูลตัวอย่างสำเร็จ: ' + studentRows.length + ' นักเรียน · ' + classes.length + ' ชั้นเรียน · '
    + attRows.length + ' รายการเช็กชื่อ · ' + annRows.length + ' ประกาศ';
  } finally { DB_endBatch(); }   // ★ flush + bump version ทั้งหมดครั้งเดียว (เสมอ แม้ error)
}

function Seed_user_(username, pw, role, fullName, title) {
  var salt = Auth_salt_();
  return DB_insert(SHEETS.USERS, {
    username: username, password_hash: Auth_hash_(pw, salt), salt: salt,
    role: role, full_name: fullName, photo_url: '', email: username + '@school.ac.th',
    phone: '08' + _randInt_(10000000, 99999999), student_id: '', class_id: '',
    title: title || '', must_change_pw: false, status: 'active'
  });
}

// ล้างข้อมูลทั้งหมด (clearContents เหลือ header) — full=true จะถามยืนยันใน Menu
function Seed_clear_(includeSettings) {
  Object.keys(SHEETS).forEach(function (k) {
    var name = SHEETS[k];
    if (!includeSettings && name === SHEETS.SETTINGS) return;
    var sh = cfg_ss_().getSheetByName(name);
    if (sh && sh.getLastRow() > 1) {
      sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
    }
    _bumpVer_('sheet:' + name);
  });
  _bumpVer_('public');
  return true;
}

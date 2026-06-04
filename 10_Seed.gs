/**
 * ═══════════════════════════════════════════════════════════════
 *  CAS · ระบบงานธุรการชั้นเรียน (Classroom Administration System)
 *  File:        10_Seed.gs — ข้อมูลตัวอย่างเสมือนจริง (ครู · ชั้นเรียน · นักเรียน · เช็กชื่อ ฯลฯ)
 *  Version:     1.0.0
 *  Last Update: 2026-05-30
 *  Developer:   ครูวิรัตน์  หาดคำ · www.kruwirat.com
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

  // ── ครูประจำชั้น + ครูผู้สอน ──
  var classDefs = [
    { level: 'ม.1', room: '1', color: '#A67C00' },
    { level: 'ม.2', room: '2', color: '#C99700' },
    { level: 'ม.3', room: '1', color: '#9A7B1E' }
  ];

  var homeroomIds = [];
  classDefs.forEach(function (c, i) {
    var hr = Seed_user_('kru' + (i + 1), 'kru' + (i + 1), 'homeroom',
      'ครู' + _rand_(SEED.maleFirst.concat(SEED.femaleFirst)) + ' ' + _rand_(SEED.last), 'นาง');
    homeroomIds.push(hr.id);
  });
  // ครูผู้สอน 2 คน
  Seed_user_('teacher1', 'teacher1', 'teacher', 'ครูที ปราถนา', 'นาย');
  Seed_user_('teacher2', 'teacher2', 'teacher', 'ครูแจน วาสนา', 'นาง');

  // ── Classes ──
  var classes = classDefs.map(function (c, i) {
    return DB_insert(SHEETS.CLASSES, {
      academic_year: year, level: c.level, room: c.room,
      grade_band: cfg_gradeBand_(c.level), homeroom_teacher_id: homeroomIds[i],
      capacity: 40, color: c.color, note: '', status: 'active'
    });
  });

  // ── Students + accounts + bulk ──
  var studentRows = [], userRows = [];
  var seq = 1;
  classes.forEach(function (cls) {
    var n = _randInt_(18, 26);
    for (var k = 1; k <= n; k++) {
      var male = Math.random() < 0.5;
      var first = male ? _rand_(SEED.maleFirst) : _rand_(SEED.femaleFirst);
      var last = _rand_(SEED.last);
      var code = String(year - 543) + ('000' + seq).slice(-4);
      var conduct = Math.random() < 0.12 ? _randInt_(45, 78) : _randInt_(82, 100);
      var sid = cfg_uid_('STU');
      studentRows.push({
        id: sid, student_code: code, title: male ? 'ด.ช.' : 'ด.ญ.',
        first_name: first, last_name: last, nickname: _rand_(SEED.nick),
        class_id: cls.id, number: k, gender: male ? 'male' : 'female',
        birthdate: (year - 543 - _randInt_(8, 16)) + '-' + ('0' + _randInt_(1, 12)).slice(-2) + '-' + ('0' + _randInt_(1, 28)).slice(-2),
        id_card: '1' + _randInt_(1000000000, 9999999999),
        blood_type: _rand_(SEED.blood),
        address: _randInt_(1, 199) + ' หมู่ ' + _randInt_(1, 12) + ' ' + _rand_(SEED.villages),
        phone: '08' + _randInt_(10000000, 99999999),
        parent_name: 'นาย/นาง ' + _rand_(SEED.last) + ' ' + last,
        parent_relation: _rand_(['บิดา', 'มารดา', 'ผู้ปกครอง']),
        parent_phone: '09' + _randInt_(10000000, 99999999),
        health_note: '', conduct_score: conduct, status: 'active'
      });
      var salt = Auth_salt_();
      userRows.push({
        username: code.toLowerCase(), password_hash: Auth_hash_(code, salt), salt: salt,
        role: 'student', full_name: (male ? 'ด.ช.' : 'ด.ญ.') + first + ' ' + last,
        photo_url: '', email: '', phone: '', student_id: sid, class_id: cls.id,
        title: male ? 'ด.ช.' : 'ด.ญ.', must_change_pw: true, status: 'active'
      });
      seq++;
    }
  });
  DB_bulkInsert(SHEETS.STUDENTS, studentRows);
  DB_bulkInsert(SHEETS.USERS, userRows);

  // บัญชีนักเรียนสาธิต (student/student) ผูกกับนักเรียนจริงคนแรก — ไว้สำหรับปุ่ม demo บนหน้า login
  var demoStu = studentRows[0];
  if (demoStu) {
    var dsalt = Auth_salt_();
    DB_insert(SHEETS.USERS, {
      username: 'student', password_hash: Auth_hash_('student', dsalt), salt: dsalt,
      role: 'student', full_name: (demoStu.title || '') + demoStu.first_name + ' ' + demoStu.last_name,
      photo_url: '', email: '', phone: '', student_id: demoStu.id, class_id: demoStu.class_id,
      title: demoStu.title, must_change_pw: false, status: 'active'
    });
  }

  // ── Attendance (3 วันล่าสุด) ──
  var attRows = [];
  var statuses = ['present', 'present', 'present', 'present', 'present', 'late', 'sick', 'leave', 'absent'];
  for (var d = 0; d < 3; d++) {
    var date = cfg_dateOnly_(new Date(Date.now() - (d + 1) * 864e5));
    studentRows.forEach(function (s) {
      attRows.push({
        date: date, class_id: s.class_id, student_id: s.id,
        status: _rand_(statuses), check_in: '', note: '',
        recorded_by: 'system', source: 'seed'
      });
    });
  }
  DB_bulkInsert(SHEETS.ATTENDANCE, attRows);

  // ── Conduct (สุ่มบางคน) ──
  var conductRows = [];
  studentRows.forEach(function (s) {
    if (Math.random() < 0.35) {
      var add = Math.random() < 0.5;
      var cat = add ? _rand_(CONDUCT_CATS.add) : _rand_(CONDUCT_CATS.deduct);
      conductRows.push({
        date: cfg_dateOnly_(new Date(Date.now() - _randInt_(1, 20) * 864e5)),
        student_id: s.id, class_id: s.class_id, type: add ? 'add' : 'deduct',
        points: cat.points, category: cat.key, reason: cat.label,
        evidence_url: '', recorded_by: 'system'
      });
    }
  });
  DB_bulkInsert(SHEETS.CONDUCT, conductRows);

  // ── Home visits + Health (ตัวอย่างบางส่วน) ──
  var visitRows = [], healthRows = [];
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
    if (Math.random() < 0.6) {
      var w = _randInt_(28, 65), h = _randInt_(125, 175);
      var b = cfg_bmi_(w, h);
      healthRows.push({
        student_id: s.id, class_id: s.class_id,
        record_date: cfg_dateOnly_(new Date(Date.now() - _randInt_(1, 90) * 864e5)),
        term: 'ภาคเรียนที่ 1/' + year, weight: w, height: h, bmi: b.bmi, bmi_level: b.level,
        vision_l: _rand_(['20/20', '20/30', '20/40']), vision_r: _rand_(['20/20', '20/30', '20/40']),
        blood_pressure: '', note: '', recorded_by: 'system'
      });
    }
  });
  DB_bulkInsert(SHEETS.HOMEVISIT, visitRows);
  DB_bulkInsert(SHEETS.HEALTH, healthRows);

  // ── Announcements ──
  var adminU = adminUser;  // ใช้ค่าที่ return จาก Seed_user_ (ไม่ DB_readAll กลาง batch — จะได้ cache เก่า)
  var anns = [
    { title: 'เปิดภาคเรียนที่ 1 ปีการศึกษา ' + (year - 543), category: 'general', pinned: true, body: 'ขอต้อนรับนักเรียนทุกคนเข้าสู่ภาคเรียนใหม่ พบกันที่โรงเรียนวันจันทร์ เวลา 08.00 น. แต่งกายชุดนักเรียนให้เรียบร้อย' },
    { title: 'กำหนดสอบกลางภาค', category: 'exam', pinned: false, body: 'การสอบกลางภาคจะจัดขึ้นในสัปดาห์ที่ 9 ของภาคเรียน ขอให้นักเรียนเตรียมตัวอ่านหนังสือล่วงหน้า' },
    { title: 'กิจกรรมวันไหว้ครู', category: 'activity', pinned: false, body: 'โรงเรียนจัดพิธีไหว้ครูประจำปี ขอเชิญนักเรียนทุกระดับชั้นเข้าร่วม ณ หอประชุมโรงเรียน' },
    { title: 'ตรวจสุขภาพนักเรียนประจำปี', category: 'health', pinned: false, body: 'งานอนามัยโรงเรียนจะดำเนินการตรวจสุขภาพ ชั่งน้ำหนัก วัดส่วนสูง นักเรียนทุกคนตามตารางที่กำหนด' }
  ];
  var annRows = anns.map(function (a) {
    return {
      title: a.title, body: a.body, category: a.category, target_role: 'all', target_class: '',
      pinned: a.pinned, cover_url: '', author_id: adminU ? adminU.id : '',
      publish_at: cfg_now_(), status: 'published', views: _randInt_(10, 250)
    };
  });
  DB_bulkInsert(SHEETS.ANNOUNCE, annRows);

  // ── Savings (ออมเงิน) — เดินบัญชีรายคน คำนวณ running balance ──
  var savRows = [];
  studentRows.forEach(function (s) {
    if (Math.random() < 0.7) {
      var n = _randInt_(2, 8), bal = 0, base = Date.now() - _randInt_(40, 90) * 864e5, ref = 0;
      for (var i = 0; i < n; i++) {
        var withdraw = i > 1 && Math.random() < 0.2 && bal > 50;
        var amt = withdraw ? _randInt_(1, Math.min(5, Math.floor(bal / 20))) * 20 : _randInt_(1, 10) * 10;
        if (withdraw && amt > bal) amt = bal;
        bal += withdraw ? -amt : amt;
        ref++;
        var when = base + i * _randInt_(3, 9) * 864e5;
        savRows.push({
          tx_date: cfg_dateOnly_(new Date(when)),
          student_id: s.id, class_id: s.class_id,
          type: withdraw ? 'withdraw' : 'deposit', amount: amt, balance: bal,
          note: withdraw ? 'ถอนเงินออม' : 'ฝากเงินออมประจำสัปดาห์',
          ref_no: (withdraw ? 'WD' : 'DEP') + '-seed-' + ref, recorded_by: 'system',
          created_at: cfg_iso_(new Date(when))
        });
      }
    }
  });
  DB_bulkInsert(SHEETS.SAVINGS, savRows);

  // ── SDQ + คัดกรอง 4 กลุ่ม (ประมาณ 40% ของนักเรียน) ──
  var sdqRows = [], screenRows = [], term = '1/' + (year - 543);
  var levels = ['normal', 'normal', 'normal', 'risk', 'problem'];
  studentRows.forEach(function (s) {
    if (Math.random() < 0.45) {
      var ans = [];
      for (var i = 0; i < 25; i++) ans.push(Math.random() < 0.7 ? 0 : _randInt_(0, 2));
      var r = _sdqScore_(ans);
      sdqRows.push({
        student_id: s.id, class_id: s.class_id,
        assess_date: cfg_dateOnly_(new Date(Date.now() - _randInt_(5, 40) * 864e5)), term: term, rater: 'teacher',
        e_score: r.sum.e, c_score: r.sum.c, h_score: r.sum.h, p_score: r.sum.p, pro_score: r.sum.pro,
        total: r.total, band_e: r.bands.e, band_c: r.bands.c, band_h: r.bands.h,
        band_p: r.bands.p, band_pro: r.bands.pro, band_total: r.bands.total, overall: r.bands.total,
        answers: JSON.stringify(ans), note: '', assessed_by: 'system'
      });
    }
    if (Math.random() < 0.5) {
      var sc = { learning: _rand_(levels), health: _rand_(['normal', 'normal', 'risk']), economic: _rand_(['normal', 'risk', 'problem']), family: _rand_(['normal', 'normal', 'risk']), behavior: _rand_(['normal', 'normal', 'normal', 'risk']), protection: 'normal', special_type: '', screened_by: 'system' };
      var g = _autoGroup_(sc);
      screenRows.push(Object.assign(sc, {
        student_id: s.id, class_id: s.class_id, term: term,
        screen_date: cfg_dateOnly_(new Date(Date.now() - _randInt_(5, 30) * 864e5)),
        group: g, summary: g === 'normal' ? 'อยู่ในเกณฑ์ปกติ' : 'ควรติดตามดูแลอย่างใกล้ชิด',
        help_action: g === 'normal' ? '' : 'ติดตาม ให้คำปรึกษา ประสานผู้ปกครอง', helped: g !== 'normal'
      }));
    }
  });
  DB_bulkInsert(SHEETS.SDQ, sdqRows);
  DB_bulkInsert(SHEETS.SCREENING, screenRows);

  // ── คำขอลา (ตัวอย่าง) ──
  var leaveRows = [], pickSt = studentRows.slice(0, Math.min(12, studentRows.length));
  pickSt.forEach(function (s, i) {
    var sick = Math.random() < 0.5, from = new Date(Date.now() - _randInt_(1, 8) * 864e5);
    var to = new Date(from.getTime() + _randInt_(0, 2) * 864e5);
    var st = i < 4 ? 'pending' : (Math.random() < 0.8 ? 'approved' : 'rejected');
    leaveRows.push({
      student_id: s.id, class_id: s.class_id, leave_type: sick ? 'sick' : 'personal',
      date_from: cfg_dateOnly_(from), date_to: cfg_dateOnly_(to),
      days: Math.round((to - from) / 864e5) + 1,
      reason: sick ? 'มีไข้ ไม่สบาย พักรักษาตัว' : 'มีธุระกับผู้ปกครอง', attachment_url: '',
      status: st, review_note: '', requested_by: 'system', reviewed_by: st === 'pending' ? '' : 'system'
    });
  });
  DB_bulkInsert(SHEETS.LEAVE, leaveRows);

  // ── รายวิชา + ผลการเรียน + คุณลักษณะ (ภาคเรียนที่ 1) ──
  var subjDefs = [
    { area: 'ภาษาไทย', name: 'ภาษาไทย', credit: 1.0, abbr: 'ท' },
    { area: 'คณิตศาสตร์', name: 'คณิตศาสตร์', credit: 1.0, abbr: 'ค' },
    { area: 'วิทยาศาสตร์และเทคโนโลยี', name: 'วิทยาศาสตร์', credit: 1.5, abbr: 'ว' },
    { area: 'สังคมศึกษา ศาสนาและวัฒนธรรม', name: 'สังคมศึกษา', credit: 1.0, abbr: 'ส' },
    { area: 'สุขศึกษาและพลศึกษา', name: 'สุขศึกษาและพลศึกษา', credit: 0.5, abbr: 'พ' },
    { area: 'ภาษาต่างประเทศ', name: 'ภาษาอังกฤษ', credit: 1.0, abbr: 'อ' }
  ];
  var subjRows = [], subjByClass = {};
  classes.forEach(function (cls) {
    var lvlNum = (String(cls.level).match(/\d+/) || ['1'])[0];
    subjByClass[cls.id] = [];
    subjDefs.forEach(function (d, i) {
      var sid = cfg_uid_('SUB');
      subjRows.push({ id: sid, code: d.abbr + lvlNum + '1010' + (i + 1), name: d.name, learning_area: d.area, credit: d.credit, type: 'core', level: cls.level, academic_year: year, term: '1', teacher_id: cls.homeroom_teacher_id, status: 'active' });
      subjByClass[cls.id].push({ id: sid, credit: d.credit });
    });
  });
  DB_bulkInsert(SHEETS.SUBJECTS, subjRows);

  var gradeRows = [], gradeVals = ['4', '4', '3.5', '3', '3', '2.5', '2', '2', '1.5', '1'];
  studentRows.forEach(function (s) {
    (subjByClass[s.class_id] || []).forEach(function (su) {
      gradeRows.push({ student_id: s.id, class_id: s.class_id, subject_id: su.id, academic_year: year, term: '1', score: '', grade: _rand_(gradeVals), credit: su.credit, recorded_by: 'system' });
    });
  });
  DB_bulkInsert(SHEETS.GRADES, gradeRows);

  var evalRows = [];
  studentRows.forEach(function (s) {
    if (Math.random() < 0.6) {
      var e = { student_id: s.id, class_id: s.class_id, academic_year: year, term: '1', reading: _randInt_(2, 3), activity: 'pass', comment: 'มีความตั้งใจเรียนดี ปรับตัวเข้ากับเพื่อนได้', evaluated_by: 'system' };
      for (var i = 1; i <= 8; i++) e['dq' + i] = _randInt_(2, 3);
      evalRows.push(e);
    }
  });
  DB_bulkInsert(SHEETS.EVALS, evalRows);

  // ── บริหารห้องเรียน: เวร · กรรมการ · ผังที่นั่ง · ตารางเรียน ──
  var dutyRows = [], commRows = [], seatRows = [], ttRows = [];
  classes.forEach(function (cls) {
    var sts = studentRows.filter(function (s) { return s.class_id === cls.id; }).sort(function (a, b) { return a.number - b.number; });
    // เวร — วนรอบ 5 วัน
    sts.forEach(function (s, i) { dutyRows.push({ class_id: cls.id, academic_year: year, term: '1', weekday: (i % 5) + 1, student_id: s.id, task: 'ทำความสะอาดห้องเรียน', recorded_by: 'system' }); });
    // คณะกรรมการห้อง
    COMMITTEE_POSITIONS.forEach(function (pos, i) { if (sts[i]) commRows.push({ class_id: cls.id, academic_year: year, student_id: sts[i].id, position: pos, position_order: i, note: '', recorded_by: 'system' }); });
    // ผังที่นั่ง 5×6
    var rws = 5, cls_ = 6, seats = [], k = 0;
    for (var r = 0; r < rws; r++) for (var c = 0; c < cls_; c++) { if (sts[k]) { seats.push({ r: r, c: c, student_id: sts[k].id }); k++; } }
    seatRows.push({ class_id: cls.id, academic_year: year, rows: rws, cols: cls_, seats: JSON.stringify(seats), updated_by: 'system' });
    // ตารางเรียน — วนรายวิชาของชั้น
    var subs = subjByClass[cls.id] || [], idx = 0;
    WEEKDAYS5.forEach(function (w) {
      PERIODS.forEach(function (per) {
        var su = subs.length ? subs[idx % subs.length] : null;
        if (su) ttRows.push({ class_id: cls.id, academic_year: year, term: '1', weekday: w.v, period: per.p, subject_id: su.id, subject_text: '', teacher_text: '', room: cls.level + '/' + cls.room, recorded_by: 'system' });
        idx++;
      });
    });
  });
  DB_bulkInsert(SHEETS.DUTY, dutyRows);
  DB_bulkInsert(SHEETS.COMMITTEE, commRows);
  DB_bulkInsert(SHEETS.SEATING, seatRows);
  DB_bulkInsert(SHEETS.TIMETABLE, ttRows);

  // ── เงินกิจกรรม + การชำระ ──
  var fundDefs = [
    { title: 'ค่ากิจกรรมทัศนศึกษา', amount: 250, category: 'trip' },
    { title: 'ค่าอุปกรณ์การเรียน', amount: 120, category: 'material' },
    { title: 'กองทุนห้องเรียน', amount: 50, category: 'fund' }
  ];
  var fundRows = [], fundItemsByClass = {};
  classes.forEach(function (cls) {
    fundItemsByClass[cls.id] = [];
    fundDefs.forEach(function (f) {
      var fid = cfg_uid_('FND');
      fundRows.push({ id: fid, class_id: cls.id, academic_year: year, term: '1', title: f.title, amount: f.amount, due_date: cfg_dateOnly_(new Date(Date.now() + 14 * 864e5)), category: f.category, note: '', created_by: 'system', status: 'active' });
      fundItemsByClass[cls.id].push({ id: fid, amount: f.amount });
    });
  });
  DB_bulkInsert(SHEETS.FUND_ITEMS, fundRows);
  var payRows = [], rcSeq = 1;
  studentRows.forEach(function (s) {
    (fundItemsByClass[s.class_id] || []).forEach(function (fi) {
      if (Math.random() < 0.65) payRows.push({ item_id: fi.id, student_id: s.id, class_id: s.class_id, paid: true, paid_amount: fi.amount, paid_date: cfg_dateOnly_(new Date(Date.now() - _randInt_(1, 12) * 864e5)), method: 'cash', receipt_no: 'RC' + (year - 543) + ('0000' + (rcSeq++)).slice(-5), note: '', recorded_by: 'system' });
    });
  });
  DB_bulkInsert(SHEETS.FUND_PAY, payRows);

  // ── กิจกรรมพัฒนาผู้เรียน/จิตอาสา ──
  var actDefs = [
    { type: 'social', title: 'บำเพ็ญประโยชน์ทำความสะอาดชุมชน' }, { type: 'social', title: 'อาสาปลูกป่า' },
    { type: 'scout', title: 'เข้าค่ายลูกเสือ-เนตรนารี' }, { type: 'club', title: 'กิจกรรมชุมนุม' }, { type: 'guidance', title: 'กิจกรรมแนะแนวอาชีพ' }
  ];
  var actRows = [];
  studentRows.forEach(function (s) {
    var n = _randInt_(0, 3);
    for (var i = 0; i < n; i++) { var a = _rand_(actDefs); actRows.push({ student_id: s.id, class_id: s.class_id, academic_year: year, activity_type: a.type, title: a.title, hours: _randInt_(1, 6), activity_date: cfg_dateOnly_(new Date(Date.now() - _randInt_(5, 60) * 864e5)), location: 'โรงเรียน/ชุมชน', note: '', recorded_by: 'system' }); }
  });
  DB_bulkInsert(SHEETS.ACTIVITY, actRows);

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

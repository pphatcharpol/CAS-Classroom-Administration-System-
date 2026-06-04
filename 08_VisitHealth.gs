/**
 * ═══════════════════════════════════════════════════════════════
 *  CAS · ระบบงานธุรการชั้นเรียน (Classroom Administration System)
 *  File:        08_VisitHealth.gs — โมดูลเยี่ยมบ้าน (GPS+ภาพ) · บันทึกสุขภาพ (BMI)
 *  Version:     1.0.0
 *  Last Update: 2026-05-30
 *  Developer:   ครูวิรัตน์  หาดคำ · www.kruwirat.com
 *  License:     Proprietary · © 2026
 * ═══════════════════════════════════════════════════════════════
 */

var RISK_LABEL = { low: 'ปกติ', medium: 'ควรเฝ้าระวัง', high: 'เสี่ยงสูง' };
var ECON_LABEL = { good: 'ดี', moderate: 'ปานกลาง', poor: 'ยากจน', very_poor: 'ยากจนพิเศษ' };

/* ════════ ค่าคงที่ตามแบบ นร./กสศ.01 (แบบขอรับเงินอุดหนุนนักเรียนยากจน) ════════ */
var POVERTY_LABEL = { normal: 'ไม่ผ่านเกณฑ์ยากจน', poor: 'ยากจน', extreme_poor: 'ยากจนพิเศษ' };
var CCT_CRITERIA = { poor: 3000, extreme: 1000 }; // รายได้เฉลี่ย/คน/เดือน (บาท)
var KS_META = {
  family_status: { together: 'พ่อแม่อยู่ด้วยกัน', separated: 'พ่อแม่แยกกันอยู่', divorced: 'พ่อแม่หย่าร้าง', father_dead: 'พ่อเสียชีวิต/สาบสูญ', mother_dead: 'แม่เสียชีวิต/สาบสูญ', both_dead: 'เสียชีวิตทั้งคู่/สาบสูญ', abandoned: 'พ่อ/แม่ทอดทิ้ง' },
  live_with: { parents: 'พ่อ/แม่', relatives: 'ญาติ', alone: 'อยู่ลำพัง', guardian: 'ผู้อุปการะ/นายจ้าง', institution: 'ครัวเรือนสถาบัน' },
  dependency: { disabled: 'มีความพิการทางร่างกาย/สติปัญญา', chronic: 'มีโรคเรื้อรัง (ยกเว้นความดัน/เบาหวาน)', elderly: 'ผู้สูงอายุตั้งแต่ 60 ปีขึ้นไป', single_parent: 'เป็นพ่อ/แม่เลี้ยงเดี่ยว', unemployed: 'มีคนอายุ 15-65 ปีที่ว่างงาน (ไม่ใช่นักเรียน)' },
  house_own: { own: 'อยู่บ้านตนเอง/เจ้าของบ้าน', rent: 'อยู่บ้านเช่า', free: 'อยู่กับผู้อื่น/อยู่ฟรี', dorm: 'หอพัก' },
  floor: { tile: 'กระเบื้อง/เซรามิค', parquet: 'ปาเก้/ไม้ขัดเงา', cement: 'ซีเมนต์เปลือย', plank: 'ไม้กระดาน', vinyl: 'ไวนิล/กระเบื้องยาง/เสื่อน้ำมัน', bamboo: 'ไม้ไผ่', soil: 'ดิน/ทราย', other: 'อื่น ๆ' },
  wall: { cement_plaster: 'ฉาบซีเมนต์', brick: 'อิฐ/ก้อนปูน/อิฐบล็อก', zinc: 'สังกะสี', plank: 'ไม้กระดาน', plywood: 'ไม้อัด', smartboard: 'สมาร์ทบอร์ด/ไฟเบอร์ซีเมนต์', bamboo: 'ไม้ไผ่/ท่อนไม้/เศษไม้', other: 'ดิน/ไวนิล/อื่น ๆ' },
  roof: { metal: 'โลหะ (สังกะสี/เหล็ก)', tile: 'กระเบื้อง/เซรามิค', plank: 'ไม้กระดาน', natural: 'ใบไม้/วัสดุธรรมชาติ', plastic: 'ไวนิล/กระดาษ/แผ่นพลาสติก', other: 'อื่น ๆ' },
  water: { bottle: 'น้ำดื่มบรรจุขวด/ตู้หยอดน้ำ', tap: 'น้ำประปา', well: 'น้ำบ่อ/น้ำบาดาล', rain: 'น้ำฝน/ประปาภูเขา/ลำธาร' },
  electric: { none: 'ไม่มีไฟฟ้า', generator: 'เครื่องปั่นไฟ/โซลาเซลล์', shared: 'ไฟต่อพ่วง/แบตเตอรี่', meter: 'ไฟบ้าน/มิเตอร์' },
  farmland: { none: 'ไม่ทำเกษตร', lt1: 'มีที่ดินน้อยกว่า 1 ไร่', r1to5: 'มีที่ดิน 1-5 ไร่', gt5: 'มีที่ดินมากกว่า 5 ไร่' },
  vehicles: { car: 'รถยนต์นั่งส่วนบุคคล', pickup: 'รถปิกอัพ/บรรทุกเล็ก/ตู้', tractor: 'รถไถ/รถเกี่ยวข้าว', motorcycle: 'รถมอเตอร์ไซค์/เรือประมงเล็ก' },
  appliances: { computer: 'คอมพิวเตอร์', aircon: 'แอร์', tv: 'ทีวีจอแบน', washer: 'เครื่องซักผ้า', fridge: 'ตู้เย็น' },
  travel: { walk: 'เดิน', bicycle: 'จักรยาน', school_bus: 'รถโรงเรียน', own_motorcycle: 'จักรยานยนต์ส่วนตัว', own_car: 'รถส่วนตัว', boat: 'เรือส่วนตัว', motorcycle_taxi: 'จักรยานยนต์รับจ้าง', bus: 'รถโดยสารประจำทาง/รับจ้าง', ferry: 'เรือโดยสาร/รับจ้าง' },
  photo_source: { teacher: 'คุณครูลงเยี่ยมบ้านด้วยตนเอง', student: 'ให้นักเรียนถ่ายภาพมาให้' }
};

function Visit_meta() { return Object.assign({ poverty_label: POVERTY_LABEL, risk_label: RISK_LABEL, econ_label: ECON_LABEL, criteria: CCT_CRITERIA }, KS_META); }

// ทำให้ภาคเรียนเป็นข้อความ ไม่ถูก Sheet coerce เป็นวันที่ (เช่น "1/2569" → ขึ้นต้นด้วยข้อความ)
function _termText_(v) {
  var s = String(v == null ? '' : v).trim();
  if (!s) return 'ภาคเรียนที่ 1/' + cfg_academicYear_();
  if (/^\d+\s*\/\s*\d+$/.test(s)) return 'ภาคเรียนที่ ' + s.replace(/\s/g, ''); // "1/2569" → "ภาคเรียนที่ 1/2569"
  return s;
}

// คำนวณรายได้เฉลี่ย/คน + จัดระดับความยากจนตามเกณฑ์ กสศ. (ปรับด้วยภาระพึ่งพิง)
function _poverty_(income, size, survey) {
  var inc = Number(income || 0), n = Number(size || 0) || 1;
  var perCapita = Math.round((inc / n) * 100) / 100;
  var dep = (survey && survey.dependency) ? Object.keys(survey.dependency).filter(function (k) { return survey.dependency[k]; }).length : 0;
  var status = 'normal';
  if (perCapita <= CCT_CRITERIA.extreme) status = 'extreme_poor';
  else if (perCapita <= CCT_CRITERIA.poor) status = (dep >= 2 ? 'extreme_poor' : 'poor');
  return { per_capita: perCapita, status: status };
}

/* ════════ HOME VISITS (เยี่ยมบ้าน) ══════════════════════════════ */
function Visit_list(user, p) {
  Auth_require_(user, 'visit.view');
  p = p || {};
  var scope = Auth_classScope_(user);
  var stdIdx = DB_index(SHEETS.STUDENTS);
  var classIdx = DB_index(SHEETS.CLASSES);
  var rows = DB_readAll(SHEETS.HOMEVISIT).filter(function (v) {
    if (v.status === 'deleted') return false;
    if (p.student_id) return v.student_id === p.student_id;
    if (p.class_id) return v.class_id === p.class_id;
    if (scope) return scope.indexOf(v.class_id) >= 0;
    return true;
  });
  if (p.risk) rows = rows.filter(function (v) { return v.risk_level === p.risk; });
  if (p.poverty) rows = rows.filter(function (v) { return v.poverty_status === p.poverty; });
  rows.sort(function (a, b) { return (b.visit_date || '').localeCompare(a.visit_date || ''); });
  return {
    items: rows.map(function (v) {
      var s = stdIdx[v.student_id];
      return Object.assign({}, v, {
        student_name: s ? ((s.title || '') + s.first_name + ' ' + s.last_name) : '-',
        student_code: s ? s.student_code : '',
        class_label: s && classIdx[s.class_id] ? (classIdx[s.class_id].level + '/' + classIdx[s.class_id].room) : '',
        risk_label: RISK_LABEL[v.risk_level] || '-',
        econ_label: ECON_LABEL[v.economic_status] || '-',
        poverty_label: POVERTY_LABEL[v.poverty_status] || '-',
        income_per_capita: Number(v.income_per_capita || 0)
      });
    })
  };
}

function Visit_save(user, p) {
  Auth_require_(user, 'visit.record');
  var s = DB_get(SHEETS.STUDENTS, p.student_id);
  if (!s) throw new Error('ไม่พบนักเรียน');

  // คำนวณรายได้ครัวเรือนจากสมาชิก (ถ้าส่ง members มา) มิฉะนั้นใช้ค่าที่กรอก
  var members = p.members || [];
  var income = (p.household_income != null && p.household_income !== '') ? Number(p.household_income)
    : members.reduce(function (sum, m) { return sum + Number(m.income || 0); }, 0);
  var size = Number(p.household_size || members.length || 1);
  var survey = p.survey || {};
  var pv = _poverty_(income, size, survey);

  var data = {
    student_id: s.id, class_id: s.class_id,
    visit_date: cfg_d10_(p.visit_date || cfg_dateOnly_(new Date())),
    address: p.address || s.address || '',
    gps_lat: p.gps_lat || '', gps_lng: p.gps_lng || '',
    family_status: p.family_status || '', economic_status: p.economic_status || 'moderate',
    risk_level: p.risk_level || 'low', findings: p.findings || '',
    recommendation: p.recommendation || '', visited_by: user.id, status: 'active',
    // ── กสศ.01 ──
    academic_term: _termText_(p.academic_term),
    live_with: p.live_with || '', guardian_name: p.guardian_name || s.parent_name || '',
    guardian_relation: p.guardian_relation || s.parent_relation || '', guardian_education: p.guardian_education || '',
    guardian_occupation: p.guardian_occupation || '', guardian_phone: p.guardian_phone || s.parent_phone || '',
    guardian_idcard: p.guardian_idcard || '', state_welfare: p.state_welfare === true || p.state_welfare === 'true',
    household_size: size, household_income: income, income_per_capita: pv.per_capita,
    poverty_status: p.poverty_status || pv.status,  // อนุญาต override
    members_json: JSON.stringify(members), survey_json: JSON.stringify(survey),
    travel_json: JSON.stringify(p.travel || {}), addr_json: JSON.stringify(p.addr || {}),
    photos_json: JSON.stringify(p.photos || {}),
    consent: p.consent === true || p.consent === 'true', cct_request: p.cct_request !== false
  };
  if (p.photo) data.photo_url = Files_uploadImage(p.photo, 'visits', 'visit-' + s.student_code).url;
  else if (p.photo_url != null) data.photo_url = p.photo_url;

  var saved;
  if (p.id) { saved = DB_update(SHEETS.HOMEVISIT, p.id, data); Audit_log(user, 'update', 'visit', p.id, s.first_name + ' · ' + (POVERTY_LABEL[data.poverty_status] || '')); }
  else { saved = DB_insert(SHEETS.HOMEVISIT, data); Audit_log(user, 'create', 'visit', saved.id, s.first_name + ' · ' + (POVERTY_LABEL[data.poverty_status] || '')); }
  return saved;
}

// แปลง record → object ที่ parse JSON แล้ว (สำหรับ detail/print)
function Visit_get(user, p) {
  Auth_require_(user, 'visit.view');
  var v = DB_get(SHEETS.HOMEVISIT, p.id);
  if (!v) throw new Error('ไม่พบบันทึกการเยี่ยมบ้าน');
  var stdIdx = DB_index(SHEETS.STUDENTS), classIdx = DB_index(SHEETS.CLASSES), userIdx = DB_index(SHEETS.USERS);
  var s = stdIdx[v.student_id];
  function pj(x) { try { return JSON.parse(x || '{}'); } catch (e) { return {}; } }
  var by = userIdx[v.visited_by];
  var en = s ? Student_enrich_(s, classIdx) : {};
  return Object.assign({}, v, {
    student: s ? en : null,
    student_name: en.full_name || (s ? ((s.title || '') + s.first_name + ' ' + s.last_name) : '-'),
    student_code: s ? s.student_code : '',
    class_label: en.class_label || '-', number: s ? s.number : '',
    members: (function () { try { return JSON.parse(v.members_json || '[]'); } catch (e) { return []; } })(),
    survey: pj(v.survey_json), travel: pj(v.travel_json), addr: pj(v.addr_json), photos: pj(v.photos_json),
    poverty_label: POVERTY_LABEL[v.poverty_status] || '-', risk_label: RISK_LABEL[v.risk_level] || '-',
    visitor_name: by ? by.full_name : '-'
  });
}

function Visit_delete(user, p) {
  Auth_require_(user, 'visit.record');
  DB_softDelete(SHEETS.HOMEVISIT, p.id);
  Audit_log(user, 'delete', 'visit', p.id, '');
  return true;
}

function Visit_overview(user, p) {
  Auth_require_(user, 'visit.view');
  var scope = Auth_classScope_(user);
  var visits = DB_readAll(SHEETS.HOMEVISIT).filter(function (v) {
    if (v.status === 'deleted') return false;
    if (scope) return scope.indexOf(v.class_id) >= 0;
    return true;
  });
  var students = DB_readAll(SHEETS.STUDENTS).filter(function (s) {
    if (s.status !== 'active') return false;
    if (scope) return scope.indexOf(s.class_id) >= 0;
    return true;
  });
  var visitedIds = {}; visits.forEach(function (v) { visitedIds[v.student_id] = true; });
  var risk = { low: 0, medium: 0, high: 0 };
  var poverty = { normal: 0, poor: 0, extreme_poor: 0 };
  // ใช้ผลล่าสุดต่อนักเรียนสำหรับสถานะยากจน
  var latest = {};
  visits.forEach(function (v) {
    risk[v.risk_level] = (risk[v.risk_level] || 0) + 1;
    var cur = latest[v.student_id];
    if (!cur || (v.created_at || '') > (cur.created_at || '')) latest[v.student_id] = v;
  });
  Object.keys(latest).forEach(function (k) { var ps = latest[k].poverty_status; if (poverty[ps] != null) poverty[ps]++; });
  var visitedCount = Object.keys(visitedIds).length;
  return {
    totalStudents: students.length, visited: visitedCount,
    pending: students.length - visitedCount,
    coverage: students.length ? Math.round((visitedCount / students.length) * 100) : 0,
    risk: risk, poverty: poverty, totalVisits: visits.length
  };
}

/* ════════ HEALTH RECORDS (สุขภาพ) ═══════════════════════════════ */
function Health_list(user, p) {
  if (user.role !== 'student') Auth_require_(user, 'health.view');
  p = p || {};
  var sid = p.student_id;
  if (user.role === 'student') sid = user.student_id;
  var scope = Auth_classScope_(user);
  var stdIdx = DB_index(SHEETS.STUDENTS);
  var rows = DB_readAll(SHEETS.HEALTH).filter(function (h) {
    if (sid) return h.student_id === sid;
    if (p.class_id) return h.class_id === p.class_id;
    if (scope) return scope.indexOf(h.class_id) >= 0;
    return true;
  });
  rows.sort(function (a, b) { return (b.record_date || '').localeCompare(a.record_date || ''); });
  return {
    items: rows.map(function (h) {
      var s = stdIdx[h.student_id];
      return Object.assign({}, h, {
        student_name: s ? ((s.title || '') + s.first_name + ' ' + s.last_name) : '-',
        student_code: s ? s.student_code : '',
        bmi_label: BMI_LABEL[h.bmi_level] || ''
      });
    })
  };
}

function Health_save(user, p) {
  Auth_require_(user, 'health.record');
  var s = DB_get(SHEETS.STUDENTS, p.student_id);
  if (!s) throw new Error('ไม่พบนักเรียน');
  var b = cfg_bmi_(p.weight, p.height);
  var data = {
    student_id: s.id, class_id: s.class_id,
    record_date: p.record_date || cfg_dateOnly_(new Date()),
    term: p.term || '', weight: Number(p.weight || 0), height: Number(p.height || 0),
    bmi: b.bmi, bmi_level: b.level,
    vision_l: p.vision_l || '', vision_r: p.vision_r || '',
    blood_pressure: p.blood_pressure || '', note: p.note || '', recorded_by: user.id
  };
  var saved;
  if (p.id) { saved = DB_update(SHEETS.HEALTH, p.id, data); Audit_log(user, 'update', 'health', p.id, s.first_name); }
  else { saved = DB_insert(SHEETS.HEALTH, data); Audit_log(user, 'create', 'health', saved.id, s.first_name); }
  return saved;
}

function Health_delete(user, p) {
  Auth_require_(user, 'health.record');
  DB_delete(SHEETS.HEALTH, p.id);
  Audit_log(user, 'delete', 'health', p.id, '');
  return true;
}

function Health_overview(user, p) {
  if (user.role !== 'student') Auth_require_(user, 'health.view');
  var scope = Auth_classScope_(user);
  var latest = {};
  DB_readAll(SHEETS.HEALTH).forEach(function (h) {
    if (scope && scope.indexOf(h.class_id) < 0) return;
    var cur = latest[h.student_id];
    if (!cur || (h.record_date || '') > (cur.record_date || '')) latest[h.student_id] = h;
  });
  var bmi = { underweight: 0, normal: 0, overweight: 0, obese: 0 };
  var n = 0;
  Object.keys(latest).forEach(function (k) {
    var lv = latest[k].bmi_level;
    if (bmi[lv] != null) { bmi[lv]++; n++; }
  });
  return { recorded: n, bmi: bmi };
}

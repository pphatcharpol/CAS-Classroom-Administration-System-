/**
 * ═══════════════════════════════════════════════════════════════
 *  CAS · ระบบงานธุรการชั้นเรียน (Classroom Administration System)
 *  File:        13_Care.gs — ระบบดูแลช่วยเหลือนักเรียน: SDQ · คัดกรอง 4 กลุ่ม · ขอลาออนไลน์
 *  Version:     1.2.0
 *  Last Update: 2026-05-31
 *  Developer:   ครูวิรัตน์  หาดคำ · www.kruwirat.com
 *  License:     Proprietary · © 2026
 * ═══════════════════════════════════════════════════════════════
 *  SDQ: แบบประเมินจุดแข็งจุดอ่อน 25 ข้อ (ฉบับครู) เกณฑ์ตามกรมสุขภาพจิต
 */

/* ════════ SDQ — Strengths & Difficulties Questionnaire (25 ข้อ) ════ */
// scale: e=อารมณ์ c=ความประพฤติ h=สมาธิ p=เพื่อน pro=สัมพันธภาพ(จุดแข็ง); rev=ให้คะแนนกลับ
var SDQ_ITEMS = [
  { t: 'ห่วงใยความรู้สึกของผู้อื่น', s: 'pro' },
  { t: 'อยู่ไม่นิ่ง นั่งเฉย ๆ ไม่ได้นาน', s: 'h' },
  { t: 'มักบ่นปวดศีรษะ ปวดท้อง หรือไม่สบาย', s: 'e' },
  { t: 'เต็มใจแบ่งปันสิ่งของให้เพื่อน (ขนม ของเล่น ดินสอ)', s: 'pro' },
  { t: 'มักอาละวาด โมโหร้าย', s: 'c' },
  { t: 'ค่อนข้างแยกตัว ชอบเล่นคนเดียว', s: 'p' },
  { t: 'เชื่อฟัง มักทำตามที่ผู้ใหญ่บอก', s: 'c', rev: true },
  { t: 'กังวลใจหลายเรื่อง ดูวิตกกังวลเสมอ', s: 'e' },
  { t: 'เป็นที่พึ่งได้เมื่อมีใครเสียใจหรือเจ็บป่วย', s: 'pro' },
  { t: 'อยู่ไม่สุข ดิ้นไปมาตลอดเวลา', s: 'h' },
  { t: 'มีเพื่อนสนิทอย่างน้อย 1 คน', s: 'p', rev: true },
  { t: 'มักทะเลาะวิวาทหรือรังแกเด็กอื่น', s: 'c' },
  { t: 'ดูไม่มีความสุข ท้อแท้ ร้องไห้บ่อย', s: 'e' },
  { t: 'เป็นที่ชื่นชอบของเพื่อน ๆ', s: 'p', rev: true },
  { t: 'วอกแวกง่าย สมาธิสั้น ใจลอย', s: 'h' },
  { t: 'เครียดเมื่อต้องห่างจากพ่อแม่ ขาดความมั่นใจ', s: 'e' },
  { t: 'ใจดีต่อเด็กที่เล็กกว่า', s: 'pro' },
  { t: 'ชอบโกหกหรือขี้โกง', s: 'c' },
  { t: 'ถูกเด็กอื่นล้อเลียนหรือรังแก', s: 'p' },
  { t: 'ชอบอาสาช่วยเหลือผู้อื่น (พ่อแม่ ครู เด็กอื่น)', s: 'pro' },
  { t: 'คิดไตร่ตรองก่อนทำ', s: 'h', rev: true },
  { t: 'ขโมยของที่บ้าน ที่โรงเรียน หรือที่อื่น', s: 'c' },
  { t: 'เข้ากับผู้ใหญ่ได้ดีกว่าเด็กวัยเดียวกัน', s: 'p' },
  { t: 'ขี้กลัว หวาดกลัวง่าย', s: 'e' },
  { t: 'ทำงานได้สำเร็จ มีความตั้งใจจดจ่อนานพอ', s: 'h', rev: true }
];
var SDQ_OPTIONS = [{ v: 0, t: 'ไม่จริง' }, { v: 1, t: 'ค่อนข้างจริง' }, { v: 2, t: 'จริงแน่นอน' }];
// เกณฑ์ (ฉบับครู) — [normalMax, riskMax] : ≤normalMax=ปกติ, ≤riskMax=เสี่ยง, มากกว่า=มีปัญหา
var SDQ_CUT = {
  e:     { normal: 4, risk: 5 },   // อารมณ์
  c:     { normal: 2, risk: 3 },   // ความประพฤติ
  h:     { normal: 5, risk: 6 },   // สมาธิสั้น
  p:     { normal: 3, risk: 4 },   // เพื่อน
  total: { normal: 11, risk: 15 }  // รวมพฤติกรรม 4 ด้าน
};
var SDQ_SCALE_LABEL = { e: 'ด้านอารมณ์', c: 'ด้านความประพฤติ', h: 'ด้านสมาธิ/พฤติกรรมอยู่ไม่นิ่ง', p: 'ด้านความสัมพันธ์กับเพื่อน', pro: 'ด้านสัมพันธภาพทางสังคม (จุดแข็ง)' };
var BAND_LABEL = { normal: 'ปกติ', risk: 'เสี่ยง', problem: 'มีปัญหา', strength_low: 'ควรส่งเสริม' };

function _sdqBand_(scale, score) {
  if (scale === 'pro') { // จุดแข็ง: สูง=ดี
    if (score >= 6) return 'normal';
    if (score === 5) return 'risk';
    return 'strength_low';
  }
  var c = SDQ_CUT[scale];
  if (score <= c.normal) return 'normal';
  if (score <= c.risk) return 'risk';
  return 'problem';
}

function Care_sdqMeta() {
  return { items: SDQ_ITEMS, options: SDQ_OPTIONS, scale_label: SDQ_SCALE_LABEL, band_label: BAND_LABEL, cut: SDQ_CUT };
}

function _sdqScore_(answers) {
  var sum = { e: 0, c: 0, h: 0, p: 0, pro: 0 };
  for (var i = 0; i < SDQ_ITEMS.length; i++) {
    var it = SDQ_ITEMS[i];
    var raw = Number(answers[i] || 0);
    var v = it.rev ? (2 - raw) : raw;
    sum[it.s] += v;
  }
  var total = sum.e + sum.c + sum.h + sum.p;
  var bands = {
    e: _sdqBand_('e', sum.e), c: _sdqBand_('c', sum.c), h: _sdqBand_('h', sum.h),
    p: _sdqBand_('p', sum.p), pro: _sdqBand_('pro', sum.pro), total: _sdqBand_('total', total)
  };
  return { sum: sum, total: total, bands: bands };
}

function Care_sdqSave(user, p) {
  Auth_require_(user, 'care.manage');
  var s = DB_get(SHEETS.STUDENTS, p.student_id);
  if (!s) throw new Error('ไม่พบนักเรียน');
  var answers = p.answers || [];
  if (answers.length !== SDQ_ITEMS.length) throw new Error('กรุณาตอบแบบประเมินให้ครบ ' + SDQ_ITEMS.length + ' ข้อ');
  var r = _sdqScore_(answers);
  var rec = DB_insert(SHEETS.SDQ, {
    student_id: s.id, class_id: s.class_id,
    assess_date: p.assess_date || cfg_dateOnly_(new Date()),
    term: p.term || '', rater: p.rater || 'teacher',
    e_score: r.sum.e, c_score: r.sum.c, h_score: r.sum.h, p_score: r.sum.p, pro_score: r.sum.pro,
    total: r.total, band_e: r.bands.e, band_c: r.bands.c, band_h: r.bands.h,
    band_p: r.bands.p, band_pro: r.bands.pro, band_total: r.bands.total, overall: r.bands.total,
    answers: JSON.stringify(answers), note: p.note || '', assessed_by: user.id
  });
  Audit_log(user, 'sdq', 'student', s.id, 'SDQ รวม ' + r.total + ' (' + BAND_LABEL[r.bands.total] + ')');
  return { record: rec, score: r };
}

function Care_sdqHistory(user, p) {
  var sid = p.student_id;
  if (user.role === 'student') sid = user.student_id;
  else Auth_require_(user, 'care.view');
  var rows = DB_readAll(SHEETS.SDQ).filter(function (a) { return a.student_id === sid; });
  rows.sort(function (a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });
  return { items: rows, student: Student_enrich_(DB_get(SHEETS.STUDENTS, sid) || {}, DB_index(SHEETS.CLASSES)) };
}

function Care_sdqList(user, p) {
  Auth_require_(user, 'care.view');
  p = p || {};
  var scope = Auth_classScope_(user);
  var classIdx = DB_index(SHEETS.CLASSES);
  // latest SDQ per student
  var latest = {};
  DB_readAll(SHEETS.SDQ).forEach(function (a) {
    var cur = latest[a.student_id];
    if (!cur || (a.created_at || '') > (cur.created_at || '')) latest[a.student_id] = a;
  });
  var rows = DB_readAll(SHEETS.STUDENTS).filter(function (s) {
    if (s.status !== 'active') return false;
    if (p.class_id) return s.class_id === p.class_id;
    if (scope) return scope.indexOf(s.class_id) >= 0;
    return true;
  });
  if (p.q) { var q = String(p.q).toLowerCase(); rows = rows.filter(function (s) { return (s.student_code + ' ' + s.first_name + ' ' + s.last_name).toLowerCase().indexOf(q) >= 0; }); }
  rows = rows.map(function (s) {
    var l = latest[s.id];
    return Object.assign(Student_enrich_(s, classIdx), {
      sdq_total: l ? Number(l.total) : null, sdq_band: l ? l.band_total : '', sdq_date: l ? l.assess_date : ''
    });
  });
  rows.sort(function (a, b) { if (a.class_id !== b.class_id) return a.class_label.localeCompare(b.class_label, 'th'); return (Number(a.number) || 999) - (Number(b.number) || 999); });
  return { items: rows };
}

/* ════════ คัดกรอง 4 กลุ่ม (ระบบดูแลช่วยเหลือนักเรียน) ════════════ */
var SCREEN_ASPECTS = [
  { key: 'learning',   label: 'ด้านการเรียน',        icon: 'book' },
  { key: 'health',     label: 'ด้านสุขภาพ',          icon: 'heart-pulse' },
  { key: 'economic',   label: 'ด้านเศรษฐกิจ',        icon: 'cash-coin' },
  { key: 'family',     label: 'ด้านครอบครัว',        icon: 'people' },
  { key: 'behavior',   label: 'ด้านพฤติกรรม/ยาเสพติด', icon: 'exclamation-triangle' },
  { key: 'protection', label: 'ด้านสวัสดิภาพ/ความปลอดภัย', icon: 'shield-check' }
];
var GROUP_LABEL = { normal: 'กลุ่มปกติ', risk: 'กลุ่มเสี่ยง', problem: 'กลุ่มมีปัญหา', special: 'กลุ่มพิเศษ' };
var ASPECT_LEVEL = { normal: 'ปกติ', risk: 'เสี่ยง', problem: 'มีปัญหา' };

function Care_screenMeta() { return { aspects: SCREEN_ASPECTS, group_label: GROUP_LABEL, aspect_level: ASPECT_LEVEL }; }

function _autoGroup_(p) {
  var lv = SCREEN_ASPECTS.map(function (a) { return p[a.key]; });
  if (p.special_type) return 'special';
  if (lv.indexOf('problem') >= 0) return 'problem';
  if (lv.indexOf('risk') >= 0) return 'risk';
  return 'normal';
}

function Care_screenSave(user, p) {
  Auth_require_(user, 'care.manage');
  var s = DB_get(SHEETS.STUDENTS, p.student_id);
  if (!s) throw new Error('ไม่พบนักเรียน');
  var data = {
    student_id: s.id, class_id: s.class_id, term: p.term || '',
    screen_date: p.screen_date || cfg_dateOnly_(new Date()),
    learning: p.learning || 'normal', health: p.health || 'normal',
    economic: p.economic || 'normal', family: p.family || 'normal',
    behavior: p.behavior || 'normal', protection: p.protection || 'normal',
    special_type: p.special_type || '', summary: p.summary || '',
    help_action: p.help_action || '', helped: p.helped === true || p.helped === 'true',
    screened_by: user.id
  };
  data.group = p.group || _autoGroup_(data);
  var saved;
  if (p.id) { saved = DB_update(SHEETS.SCREENING, p.id, data); Audit_log(user, 'update', 'screening', p.id, s.first_name); }
  else { saved = DB_insert(SHEETS.SCREENING, data); Audit_log(user, 'create', 'screening', saved.id, s.first_name + ' → ' + GROUP_LABEL[data.group]); }
  return saved;
}

// latest screening ต่อ student + overview
function Care_screenList(user, p) {
  Auth_require_(user, 'care.view');
  p = p || {};
  var scope = Auth_classScope_(user);
  var classIdx = DB_index(SHEETS.CLASSES);
  var latest = {};
  DB_readAll(SHEETS.SCREENING).forEach(function (r) {
    if (r.status === 'deleted') return;
    var cur = latest[r.student_id];
    if (!cur || (r.created_at || '') > (cur.created_at || '')) latest[r.student_id] = r;
  });
  var students = DB_readAll(SHEETS.STUDENTS).filter(function (s) {
    if (s.status !== 'active') return false;
    if (p.class_id) return s.class_id === p.class_id;
    if (scope) return scope.indexOf(s.class_id) >= 0;
    return true;
  });
  var counts = { normal: 0, risk: 0, problem: 0, special: 0, unscreened: 0 };
  var rows = students.map(function (s) {
    var l = latest[s.id];
    var g = l ? l.group : '';
    if (l) counts[g] = (counts[g] || 0) + 1; else counts.unscreened++;
    return Object.assign(Student_enrich_(s, classIdx), { screening: l || null, group: g });
  });
  if (p.group) rows = rows.filter(function (r) { return r.group === p.group; });
  rows.sort(function (a, b) {
    var order = { problem: 0, special: 1, risk: 2, normal: 3, '': 4 };
    if (order[a.group] !== order[b.group]) return order[a.group] - order[b.group];
    return a.class_label.localeCompare(b.class_label, 'th');
  });
  return { items: rows, counts: counts, total: students.length };
}

/* ════════ ระบบขอลาออนไลน์ (อนุมัติ → ลงเช็กชื่ออัตโนมัติ) ════════ */
var LEAVE_TYPE = { sick: 'ลาป่วย', personal: 'ลากิจ' };
var LEAVE_STATUS = { pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ไม่อนุมัติ' };

function _daysBetween_(from, to) {
  var a = new Date(from), b = new Date(to);
  return Math.max(1, Math.round((b - a) / 864e5) + 1);
}

function Leave_request(user, p) {
  var sid = p.student_id;
  if (user.role === 'student') sid = user.student_id;
  else Auth_require_(user, 'leave.view'); // ครูยื่นแทนได้
  var s = DB_get(SHEETS.STUDENTS, sid);
  if (!s) throw new Error('ไม่พบนักเรียน');
  var from = p.date_from, to = p.date_to || p.date_from;
  if (!from) throw new Error('กรุณาระบุวันที่ลา');
  if (to < from) throw new Error('วันที่สิ้นสุดต้องไม่ก่อนวันเริ่ม');
  if (!p.reason) throw new Error('กรุณาระบุเหตุผลการลา');
  var data = {
    student_id: sid, class_id: s.class_id,
    leave_type: p.leave_type === 'sick' ? 'sick' : 'personal',
    date_from: from, date_to: to, days: _daysBetween_(from, to),
    reason: p.reason, attachment_url: '', status: 'pending',
    requested_by: user.id
  };
  if (p.attachment) data.attachment_url = Files_uploadImage(p.attachment, 'leave', 'leave-' + s.student_code).url;
  var rec = DB_insert(SHEETS.LEAVE, data);
  Audit_log(user, 'leave_request', 'student', sid, LEAVE_TYPE[data.leave_type] + ' ' + from + '–' + to);
  return rec;
}

function Leave_list(user, p) {
  p = p || {};
  var stdIdx = DB_index(SHEETS.STUDENTS);
  var classIdx = DB_index(SHEETS.CLASSES);
  var rows = DB_readAll(SHEETS.LEAVE);
  if (user.role === 'student') {
    rows = rows.filter(function (r) { return r.student_id === user.student_id; });
  } else {
    Auth_require_(user, 'leave.view');
    var scope = Auth_classScope_(user);
    if (scope) rows = rows.filter(function (r) { return scope.indexOf(r.class_id) >= 0; });
    if (p.class_id) rows = rows.filter(function (r) { return r.class_id === p.class_id; });
  }
  if (p.status) rows = rows.filter(function (r) { return r.status === p.status; });
  rows.sort(function (a, b) {
    var pa = a.status === 'pending' ? 0 : 1, pb = b.status === 'pending' ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return (b.created_at || '').localeCompare(a.created_at || '');
  });
  var pending = DB_readAll(SHEETS.LEAVE).filter(function (r) {
    if (user.role === 'student') return false;
    var sc = Auth_classScope_(user);
    return r.status === 'pending' && (!sc || sc.indexOf(r.class_id) >= 0);
  }).length;
  return {
    items: rows.map(function (r) {
      var s = stdIdx[r.student_id];
      return Object.assign({}, r, {
        student_name: s ? ((s.title || '') + s.first_name + ' ' + s.last_name) : '-',
        student_photo: s ? s.photo_url : '',
        class_label: s && classIdx[s.class_id] ? (classIdx[s.class_id].level + '/' + classIdx[s.class_id].room) : '',
        type_label: LEAVE_TYPE[r.leave_type] || r.leave_type,
        status_label: LEAVE_STATUS[r.status] || r.status
      });
    }),
    pending: pending
  };
}

function Leave_review(user, p) {
  Auth_require_(user, 'leave.approve');
  var lv = DB_get(SHEETS.LEAVE, p.id);
  if (!lv) throw new Error('ไม่พบคำขอลา');
  var status = p.status === 'approved' ? 'approved' : 'rejected';
  DB_update(SHEETS.LEAVE, p.id, { status: status, review_note: p.review_note || '', reviewed_by: user.id });

  // อนุมัติ → ลงเช็กชื่อให้อัตโนมัติ (sick→ลาป่วย, personal→ลากิจ) ทุกวันในช่วง
  var marked = 0;
  if (status === 'approved') {
    var att = DB_readAll(SHEETS.ATTENDANCE);
    var existing = {};
    att.forEach(function (a) { if (a.student_id === lv.student_id) existing[cfg_d10_(a.date)] = a; });
    var attStatus = lv.leave_type === 'sick' ? 'sick' : 'leave';
    var toInsert = [];
    var d = new Date(lv.date_from), end = new Date(lv.date_to), now = cfg_now_();
    var guard = 0;
    while (d <= end && guard < 120) {
      var ds = cfg_dateOnly_(d);
      if (existing[ds]) { DB_update(SHEETS.ATTENDANCE, existing[ds].id, { status: attStatus, note: 'ลาออนไลน์: ' + lv.reason }); }
      else { toInsert.push({ date: ds, class_id: lv.class_id, student_id: lv.student_id, status: attStatus, note: 'ลาออนไลน์: ' + lv.reason, recorded_by: user.id, source: 'leave', created_at: now, updated_at: now }); }
      marked++; d.setDate(d.getDate() + 1); guard++;
    }
    if (toInsert.length) DB_bulkInsert(SHEETS.ATTENDANCE, toInsert);
  }
  Audit_log(user, 'leave_review', 'leave', p.id, LEAVE_STATUS[status] + (status === 'approved' ? ' · ลงเช็กชื่อ ' + marked + ' วัน' : ''));
  return { status: status, marked: marked };
}

function Leave_meta() { return { type: LEAVE_TYPE, status: LEAVE_STATUS }; }

/**
 * ═══════════════════════════════════════════════════════════════
 *  CAS · ระบบงานธุรการชั้นเรียน (Classroom Administration System)
 *  File:        00_Config.gs — ค่าคงที่ · Schemas · RBAC · Helpers (Single Source of Truth)
 *  Version:     1.0.0
 *  Last Update: 2026-05-30
 *  Developer:   ครูวิรัตน์  หาดคำ · www.kruwirat.com
 *  License:     Proprietary · © 2026
 * ═══════════════════════════════════════════════════════════════
 */

/** ───────────────────────────────────────────────────────────────
 *  APP — Single source of truth ของชื่อระบบ/เวอร์ชัน/ผู้พัฒนา
 *  ใช้ร่วมกันทั้ง doGet · Sheet Menu · About · Footer · Client boot
 *  ─────────────────────────────────────────────────────────────── */
var APP = {
  SHORT:        'CAS',
  NAME:         'CAS · ระบบงานธุรการชั้นเรียน',
  TITLE:        'ระบบงานธุรการชั้นเรียน',
  DESCRIPTION:  'ระบบบริหารงานธุรการชั้นเรียนครบวงจร — ข้อมูลนักเรียน · เช็กชื่อ · คะแนนความประพฤติ · เยี่ยมบ้าน · สุขภาพ · ประกาศและรายงาน สำหรับโรงเรียนประถมและมัธยมศึกษา',
  VERSION:      '1.0.0',
  LAST_UPDATED: '2026-05-30',
  ORG:          'โรงเรียนวังน้ำคู้ศึกษา',
  LOGO_ICON:    'mortarboard-fill',
  TIMEZONE:     'Asia/Bangkok',
  MOTTO:     'ปัญญา เป็นแสงสว่างแห่งโลก',

  DEV: {
    NAME:  'ครูที  พชรพล',
    URL:   'https://www.kruwirat.com',
    EMAIL: 'phatcharapol.ch@nu.ac.th',
    LOGO:  'https://lh3.googleusercontent.com/d/1m1Q-kruwirat-avatar'  // fallback hidden onerror
  }
};

/** ───────────────────────────────────────────────────────────────
 *  SHEETS — ชื่อชีต (tab) ทั้งหมดที่ใช้เป็นตารางฐานข้อมูล
 *  ─────────────────────────────────────────────────────────────── */
var SHEETS = {
  USERS:      'Users',
  CLASSES:    'Classes',
  STUDENTS:   'Students',
  ATTENDANCE: 'Attendance',
  HOMEVISIT:  'HomeVisits',
  ANNOUNCE:   'Announcements',
  SDQ:        'SdqAssessments',
  TIMETABLE:  'Timetable',
  ACTIVITY:   'ActivityLogs',
  EVENTS:     'Events',
  AUDIT:      'AuditLog',
  SESSIONS:   'Sessions',
  SETTINGS:   'Settings'
};

/** ───────────────────────────────────────────────────────────────
 *  SCHEMAS — คอลัมน์ของแต่ละชีต (ลำดับสำคัญ = ลำดับคอลัมน์จริง)
 *  ค่าวันเวลาเก็บเป็น ISO เสมอ (Client แปลงเป็นไทยตอน render ด้วย TH module)
 *  ─────────────────────────────────────────────────────────────── */
var SCHEMAS = {
  Users: [
    'id','username','password_hash','salt','role','full_name','photo_url',
    'email','phone','student_id','class_id','title','must_change_pw',
    'last_login','status','created_at','updated_at'
  ],
  Classes: [
    'id','academic_year','level','room','grade_band','homeroom_teacher_id',
    'co_teacher_id','capacity','color','note','status','created_at','updated_at'
  ],
  Students: [
    'id','student_code','title','first_name','last_name','nickname','class_id',
    'number','gender','birthdate','id_card','blood_type','address','phone',
    'parent_name','parent_relation','parent_phone','photo_url','health_note',
    'status','created_at','updated_at'
  ],
  Attendance: [
    'id','date','class_id','student_id','status','check_in','note',
    'recorded_by','source','created_at','updated_at'
  ],

  HomeVisits: [
    'id','student_id','class_id','visit_date','address','gps_lat','gps_lng',
    'photo_url','family_status','economic_status','risk_level','findings',
    'recommendation','visited_by','created_at','updated_at',
    // ── แบบ นร./กสศ.01 — แบบขอรับเงินอุดหนุนนักเรียนยากจน ──
    'academic_term','live_with','guardian_name','guardian_relation','guardian_education',
    'guardian_occupation','guardian_phone','guardian_idcard','state_welfare',
    'household_size','household_income','income_per_capita','poverty_status',
    'members_json','survey_json','travel_json','addr_json','photos_json',
    'consent','cct_request'
  ],

  Announcements: [
    'id','title','body','category','target_role','target_class','pinned',
    'cover_url','author_id','publish_at','status','views','created_at','updated_at'
  ],

  SdqAssessments: [
    'id','student_id','class_id','assess_date','term','rater',
    'e_score','c_score','h_score','p_score','pro_score','total',
    'band_e','band_c','band_h','band_p','band_pro','band_total','overall',
    'answers','note','assessed_by','created_at'
  ],

  Timetable: [
    'id','class_id','academic_year','term','weekday','period','subject_id',
    'subject_text','teacher_text','room','recorded_by','created_at'
  ],
  ActivityLogs: [
    'id','student_id','class_id','academic_year','activity_type','title','hours',
    'activity_date','location','note','recorded_by','created_at'
  ],
  Events: [
    'id','title','event_type','event_date','end_date','time','location',
    'target_role','target_class','description','color','created_by','status','created_at','updated_at'
  ],
  AuditLog: [
    'id','user_id','username','role','action','entity','entity_id',
    'detail','user_agent','created_at'
  ],
  Sessions: [
    'token','user_id','username','role','user_agent','created_at','expires_at'
  ],
  Settings: [ 'key','value','updated_at' ]
};

/** ───────────────────────────────────────────────────────────────
 *  RBAC — บทบาท · ป้ายกำกับ · ความสามารถ (capabilities)
 *  capability = action string ที่ API ตรวจก่อนทำงานทุกครั้ง
 *  ─────────────────────────────────────────────────────────────── */
var ROLES = ['admin', 'homeroom', 'teacher'];

var ROLE_LABEL = {
  admin:    'ผู้ดูแลระบบ',
  homeroom: 'ครูประจำชั้น',
  teacher:  'ครูผู้สอน',
};

var ROLE_ICON = {
  admin:    'shield-lock-fill',
  homeroom: 'person-badge-fill',
  teacher:  'easel2-fill',
};

// ความสามารถระดับโมดูล — '*' = ทุกสิทธิ์ (admin)
var CAPS = {
  admin: ['*'],
  homeroom: [
    'student.view','student.manage',
    'class.view','class.manage_own',
    'attendance.view','attendance.record',
    'visit.view','visit.record',
    'classroom.view','classroom.manage',
    'activity.view','activity.manage','event.view','event.manage',
    'announce.view','announce.manage',
    'report.view','report.class',
    'user.view_class','profile.edit'
  ],
  teacher: [
    'student.view','class.view',
    'attendance.view','attendance.record',
    'classroom.view',
    'activity.view','activity.manage','event.view',
    'announce.view',
    'report.view',
    'profile.edit'
  ]
};

var STATUS_LABEL = {
  active: 'ใช้งาน', inactive: 'ปิดใช้งาน', graduated: 'จบการศึกษา',
  transferred: 'ย้ายออก', suspended: 'พักการเรียน', deleted: 'ลบแล้ว',
  draft: 'ฉบับร่าง', published: 'เผยแพร่', archived: 'จัดเก็บ'
};

// สถานะการมาเรียน (Attendance)
var ATT_STATUS = {
  present: { label: 'มาเรียน',  icon: 'check-circle-fill', color: '#2E7D32' },
  late:    { label: 'มาสาย',    icon: 'clock-history',     color: '#C9A227' },
  leave:   { label: 'ลากิจ',    icon: 'envelope-paper',    color: '#1565C0' },
  sick:    { label: 'ลาป่วย',   icon: 'bandaid',           color: '#6A1B9A' },
  absent:  { label: 'ขาดเรียน', icon: 'x-circle-fill',     color: '#C62828' },
  activity:{ label: 'กิจกรรม',  icon: 'flag',              color: '#00838F' }
};

/** ───────────────────────────────────────────────────────────────
 *  Spreadsheet & helpers — ใช้ Active Spreadsheet (ไม่ผูก ID)
 *  ─────────────────────────────────────────────────────────────── */
function cfg_ss_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function cfg_now_() {
  return cfg_iso_(new Date());
}

// ISO datetime ตาม timezone ไทย (server เก็บ ISO เสมอ)
function cfg_iso_(d) {
  if (!(d instanceof Date)) d = new Date(d);
  return Utilities.formatDate(d, APP.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function cfg_dateOnly_(d) {
  if (!(d instanceof Date)) d = new Date(d);
  return Utilities.formatDate(d, APP.TIMEZONE, 'yyyy-MM-dd');
}

function cfg_period_(d) {
  if (!(d instanceof Date)) d = new Date(d);
  return Utilities.formatDate(d, APP.TIMEZONE, 'yyyy-MM');
}

// Normalize เป็นวันที่ล้วน 'yyyy-MM-dd' — กัน Sheet auto-coerce สตริงวันที่เป็น Date
// (อ่านกลับมาเป็น ISO datetime เต็ม ทำให้เทียบ === กับ 'yyyy-MM-dd' ไม่ตรง)
function cfg_d10_(v) {
  if (v instanceof Date) return cfg_dateOnly_(v);
  return String(v == null ? '' : v).substring(0, 10);
}

// Unique id: prefix + base36 timestamp + random — sortable พอประมาณ
function cfg_uid_(prefix) {
  var t = Date.now().toString(36).toUpperCase();
  var r = Math.floor(Math.random() * 1296).toString(36).toUpperCase();
  return (prefix || 'ID') + '-' + t + (r.length < 2 ? '0' + r : r);
}

// ปีการศึกษา (พ.ศ.) — ก่อน เม.ย. = ปีก่อน
function cfg_academicYear_() {
  var d = new Date();
  var y = d.getFullYear() + 543;
  return (d.getMonth() + 1) < 4 ? (y - 1) : y; // ก.พ./มี.ค. นับเป็นปีการศึกษาก่อน
}

// ระดับชั้น → ช่วงชั้น (สำหรับ filter ประถม/มัธยม)
function cfg_gradeBand_(level) {
  var s = String(level || '');
  if (/^ป\./.test(s) || /^ป /.test(s)) return 'primary';
  if (/^ม\.[123]\b/.test(s) || /^ม\.[123]$/.test(s)) return 'lower-secondary';
  if (/^ม\.[456]\b/.test(s) || /^ม\.[456]$/.test(s)) return 'upper-secondary';
  if (/^ม\./.test(s)) return 'secondary';
  if (/^อ\./.test(s)) return 'kindergarten';
  return 'other';
}

var GRADE_BAND_LABEL = {
  'kindergarten': 'อนุบาล',
  'primary': 'ประถมศึกษา',
  'lower-secondary': 'มัธยมศึกษาตอนต้น',
  'upper-secondary': 'มัธยมศึกษาตอนปลาย',
  'secondary': 'มัธยมศึกษา',
  'other': 'อื่น ๆ'
};

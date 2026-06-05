/**
 * ═══════════════════════════════════════════════════════════════
 *  CAS · ระบบงานธุรการชั้นเรียน (Classroom Administration System)
 *  File:        00_Config.gs — ค่าคงที่ · Schemas · RBAC · Helpers (Single Source of Truth)
 *  Version:     0.0.1
 *  Last Update: 2026-05-30
 *  Developer:   ครูที  พชรพล
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
  DESCRIPTION:  'ระบบบริหารงานธุรการชั้นเรียน — ข้อมูลนักเรียน · เช็กชื่อ · เยี่ยมบ้าน · ตารางเรียน · ประกาศและรายงาน สำหรับโรงเรียนมัธยมศึกษา',
  VERSION:      '1.1.0',
  LAST_UPDATED: '2026-06-01',
  ORG:          'โรงเรียนวังน้ำคู้ศึกษา',
  LOGO_ICON:    'mortarboard-fill',
  TIMEZONE:     'Asia/Bangkok',
  MOTTO:        'ปัญญา เป็นแสงสว่างแห่งโลก',

  DEV: {
    NAME:  'ครูที  พชรพล',
    URL:   'https://www.kruwirat.com',
    EMAIL: 'phatcharapol.ch@nu.ac.th',
    LOGO:  'https://lh3.googleusercontent.com/d/1m1Q-kruwirat-avatar'
  }
};

var SHEETS = {
  USERS:      'Users',
  CLASSES:    'Classes',
  STUDENTS:   'Students',
  ATTENDANCE: 'Attendance',
  HOMEVISIT:  'HomeVisits',
  ANNOUNCE:   'Announcements',
  TIMETABLE:  'Timetable',
  EVENTS:     'Events',
  AUDIT:      'AuditLog',
  SESSIONS:   'Sessions',
  SETTINGS:   'Settings'
};

var SCHEMAS = {
  Users: [
    'id','username','password_hash','salt','role','full_name','photo_url',
    'email','phone','class_id','title','must_change_pw',
    'last_login','status','created_at','updated_at'
  ],
  Classes: [
    'id','academic_year','level','room','grade_band','homeroom_teacher_id',
    'co_teacher_id','capacity','color','note','status','created_at','updated_at'
  ],
  Students: [
    'id','student_code','title','first_name','last_name','nickname','class_id',
    'number','gender','birthdate','id_card','blood_type','address','phone',
    'parent_name','parent_relation','parent_phone','photo_url',
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
  Timetable: [
    'id','class_id','academic_year','term','weekday','period','subject_id',
    'subject_text','teacher_text','room','recorded_by','created_at'
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

var ROLES = ['admin', 'teacher'];

var ROLE_LABEL = {
  admin:    'ผู้ดูแลระบบ',
  teacher:  'ครู',
};

var ROLE_ICON = {
  admin:    'shield-lock-fill',
  teacher:  'person-badge-fill',
};

var CAPS = {
  admin: ['*'],
  teacher: [
    'student.view','student.manage',
    'class.view','class.manage_own',
    'attendance.view','attendance.record',
    'visit.view','visit.record',
    'classroom.view','classroom.manage',
    'event.view','event.manage',
    'announce.view','announce.manage',
    'report.view','report.class',
    'user.view_class','profile.edit'
  ]
};

var STATUS_LABEL = { active: 'ใช้งาน', inactive: 'ปิดใช้งาน', graduated: 'จบการศึกษา', transferred: 'ย้ายออก', deleted: 'ลบแล้ว', draft: 'ฉบับร่าง', published: 'เผยแพร่' };

var ATT_STATUS = {
  present: { label: 'มาเรียน',  icon: 'check-circle-fill', color: '#2E7D32' },
  late:    { label: 'มาสาย',    icon: 'clock-history',     color: '#C9A227' },
  leave:   { label: 'ลากิจ',    icon: 'envelope-paper',    color: '#1565C0' },
  sick:    { label: 'ลาป่วย',   icon: 'bandaid',           color: '#6A1B9A' },
  absent:  { label: 'ขาดเรียน', icon: 'x-circle-fill',     color: '#C62828' },
  activity:{ label: 'กิจกรรม',  icon: 'flag',              color: '#00838F' }
};

function cfg_ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function cfg_now_() { return cfg_iso_(new Date()); }
function cfg_iso_(d) { if (!(d instanceof Date)) d = new Date(d); return Utilities.formatDate(d, APP.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX"); }
function cfg_dateOnly_(d) { if (!(d instanceof Date)) d = new Date(d); return Utilities.formatDate(d, APP.TIMEZONE, 'yyyy-MM-dd'); }
function cfg_period_(d) { if (!(d instanceof Date)) d = new Date(d); return Utilities.formatDate(d, APP.TIMEZONE, 'yyyy-MM'); }
function cfg_d10_(v) { if (v instanceof Date) return cfg_dateOnly_(v); return String(v == null ? '' : v).substring(0, 10); }

function cfg_uid_(prefix) {
  var t = Date.now().toString(36).toUpperCase();
  var r = Math.floor(Math.random() * 1296).toString(36).toUpperCase();
  return (prefix || 'ID') + '-' + t + (r.length < 2 ? '0' + r : r);
}

function cfg_academicYear_() {
  var d = new Date(); var y = d.getFullYear() + 543;
  return (d.getMonth() + 1) < 4 ? (y - 1) : y;
}

function cfg_gradeBand_(level) {
  var s = String(level || '');
  if (/^ม\.[123]\b/.test(s) || /^ม\.[123]$/.test(s)) return 'lower-secondary';
  if (/^ม\.[456]\b/.test(s) || /^ม\.[456]$/.test(s)) return 'upper-secondary';
  if (/^ม\./.test(s)) return 'secondary';
  return 'other';
}

var GRADE_BAND_LABEL = {
  'lower-secondary': 'มัธยมศึกษาตอนต้น',
  'upper-secondary': 'มัธยมศึกษาตอนปลาย',
  'secondary': 'มัธยมศึกษา',
  'other': 'อื่น ๆ'
};

var ANNOUNCE_CATS = { 'general': 'ทั่วไป', 'academic': 'วิชาการ', 'urgent': 'ด่วน' };
var RISK_LABEL = { 'low': 'กลุ่มปกติ', 'medium': 'กลุ่มเสี่ยง', 'high': 'กลุ่มมีปัญหา' };
var ECON_LABEL = { 'normal': 'ปกติ', 'poor': 'ยากจน', 'extreme_poor': 'ยากจนพิเศษ' };

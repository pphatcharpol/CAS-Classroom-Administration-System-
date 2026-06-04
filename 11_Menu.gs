/**
 * ═══════════════════════════════════════════════════════════════
 *  CAS · ระบบงานธุรการชั้นเรียน (Classroom Administration System)
 *  File:        11_Menu.gs — Sheet Menu UI · Initialize · Seed · Warm trigger · About
 *  Version:     1.0.0
 *  Last Update: 2026-05-30
 *  Developer:   ครูวิรัตน์  หาดคำ · www.kruwirat.com
 *  License:     Proprietary · © 2026
 * ═══════════════════════════════════════════════════════════════
 */

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🎯 ' + APP.SHORT)
      .addItem('🚀 เริ่มใช้งานระบบ (Initialize)', 'menu_initSystem')
      .addItem('🔐 ขออนุญาตสิทธิ์ (Grant)', 'menu_grantPermissions')
      .addItem('🔍 ตรวจสถานะระบบ (Diagnostic)', 'menu_diagnostic')
      .addSeparator()
      .addItem('🌱 เพิ่มข้อมูลตัวอย่าง', 'menu_seedDemo')
      .addItem('🧹 ล้างข้อมูลทั้งหมด', 'menu_clearAll')
      .addSeparator()
      .addItem('🔥 ติดตั้ง Warm Trigger', 'menu_installWarm')
      .addItem('❄️ ถอด Warm Trigger', 'menu_uninstallWarm')
      .addSeparator()
      .addItem('🔗 เปิด Web App URL', 'menu_openWebApp')
      .addItem('📋 คัดลอก Web App URL', 'menu_copyWebAppUrl')
      .addSeparator()
      .addItem('ℹ️ เกี่ยวกับระบบ (About)', 'menu_about')
      .addToUi();
  } catch (e) {}
}

function menu_initSystem() {
  var ui = SpreadsheetApp.getUi();
  DB_ensureAll();
  // สร้างแอดมินถ้ายังไม่มี
  var hasAdmin = DB_readAll(SHEETS.USERS).some(function (u) { return u.role === 'admin' && u.status === 'active'; });
  if (!hasAdmin) {
    Seed_user_('admin', 'admin', 'admin', 'ผู้ดูแลระบบ', 'นาย');
  }
  Settings_set('school_name', Settings_get('school_name', APP.ORG));
  Settings_set('academic_year', Settings_get('academic_year', cfg_academicYear_()));
  try { Files_rootFolder_(); } catch (e) {}
  ui.alert('✅ เริ่มใช้งานระบบสำเร็จ',
    'สร้างชีตฐานข้อมูลครบ ' + Object.keys(SHEETS).length + ' ตาราง\n\n' +
    (hasAdmin ? 'พบบัญชีผู้ดูแลระบบเดิม' : 'สร้างบัญชีผู้ดูแลระบบ:\n  • ชื่อผู้ใช้: admin\n  • รหัสผ่าน: admin') +
    '\n\nขั้นต่อไป: กด "เพิ่มข้อมูลตัวอย่าง" แล้ว Deploy เป็น Web App',
    ui.ButtonSet.OK);
}

function menu_grantPermissions() {
  // เรียก service ที่ต้องใช้ scope เพื่อ trigger OAuth consent
  DriveApp.getRootFolder(); CacheService.getScriptCache(); PropertiesService.getScriptProperties();
  ScriptApp.getProjectTriggers();
  SpreadsheetApp.getUi().alert('✅ อนุญาตสิทธิ์ครบถ้วนแล้ว', 'ระบบพร้อมเข้าถึง Sheets · Drive · Cache · Triggers', SpreadsheetApp.getUi().ButtonSet.OK);
}

function menu_diagnostic() {
  var lines = [];
  Object.keys(SHEETS).forEach(function (k) {
    var sh = cfg_ss_().getSheetByName(SHEETS[k]);
    lines.push((sh ? '✔' : '✘') + ' ' + SHEETS[k] + ' — ' + (sh ? (Math.max(0, sh.getLastRow() - 1) + ' แถว') : 'ยังไม่สร้าง'));
  });
  var warm = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === '_warm_'; });
  lines.push('');
  lines.push('Warm trigger: ' + (warm ? 'ทำงาน 🔥' : 'ยังไม่ติดตั้ง'));
  try { lines.push('โฟลเดอร์ไฟล์: ' + Files_rootFolder_().getName()); } catch (e) { lines.push('โฟลเดอร์ไฟล์: (ยังไม่สร้าง)'); }
  SpreadsheetApp.getUi().alert('🔍 สถานะระบบ', lines.join('\n'), SpreadsheetApp.getUi().ButtonSet.OK);
}

function menu_seedDemo() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.alert('🌱 เพิ่มข้อมูลตัวอย่าง', 'จะล้างข้อมูลเดิม (ยกเว้นการตั้งค่า) แล้วสร้างข้อมูลตัวอย่างใหม่\n\nดำเนินการต่อหรือไม่?', ui.ButtonSet.YES_NO);
  if (res !== ui.Button.YES) return;
  var msg = Seed_run();
  ui.alert('✅ สำเร็จ', msg + '\n\nบัญชีทดสอบ:\n  • admin / admin (ผู้ดูแลระบบ)\n  • kru1 / kru1 (ครูประจำชั้น)\n  • teacher1 / teacher1 (ครูผู้สอน)\n  • student / student (นักเรียนสาธิต)\n  • นักเรียนอื่น: ใช้เลขประจำตัวเป็นทั้ง user/pass', ui.ButtonSet.OK);
}

function menu_clearAll() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.alert('🧹 ล้างข้อมูลทั้งหมด', 'ลบข้อมูลทุกตาราง (รวมการตั้งค่า) — ไม่สามารถย้อนกลับได้\n\nยืนยันหรือไม่?', ui.ButtonSet.YES_NO);
  if (res !== ui.Button.YES) return;
  Seed_clear_(true);
  ui.alert('✅ ล้างข้อมูลเรียบร้อย', 'กด "เริ่มใช้งานระบบ" เพื่อสร้างบัญชีผู้ดูแลใหม่', ui.ButtonSet.OK);
}

/* ── Warm trigger (กัน cold start) ───────────────────────────────── */
function _warm_() {
  try {
    _resetReq_();
    DB_readAll(SHEETS.SETTINGS);
    DB_readAll(SHEETS.CLASSES);
    DB_readAll(SHEETS.STUDENTS);   // ชีตใหญ่/ใช้บ่อยสุด — อุ่น cache ไว้ก่อน
    DB_readAll(SHEETS.SUBJECTS);
    App_bootAll('', {});           // อุ่น public bundle ใน CacheService
  } catch (e) {}
  return new Date().toISOString();
}
function menu_installWarm() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === '_warm_') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('_warm_').timeBased().everyMinutes(5).create();
  SpreadsheetApp.getUi().alert('🔥 ติดตั้ง Warm Trigger สำเร็จ', 'ระบบจะอุ่นเครื่องทุก 5 นาที ป้องกัน cold start', SpreadsheetApp.getUi().ButtonSet.OK);
}
function menu_uninstallWarm() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === '_warm_') ScriptApp.deleteTrigger(t); });
  SpreadsheetApp.getUi().alert('❄️ ถอด Warm Trigger แล้ว', '', SpreadsheetApp.getUi().ButtonSet.OK);
}

/* ── Web App URL ─────────────────────────────────────────────────── */
function menu_openWebApp() {
  var url = ScriptApp.getService().getUrl();
  if (!url) { SpreadsheetApp.getUi().alert('ยังไม่ได้ Deploy', 'กรุณา Deploy > New deployment > Web app ก่อน', SpreadsheetApp.getUi().ButtonSet.OK); return; }
  var html = '<script>window.open("' + url + '","_blank");google.script.host.close();</script>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(50).setHeight(10), 'กำลังเปิด...');
}
function menu_copyWebAppUrl() {
  var url = ScriptApp.getService().getUrl() || '(ยังไม่ได้ Deploy)';
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Sarabun,sans-serif;padding:16px}input{width:100%;padding:8px;border:1px solid #E3C76F;border-radius:8px}</style></head><body>'
    + '<p>Web App URL:</p><input id="u" value="' + url + '" onclick="this.select()" readonly>'
    + '<p style="font-size:12px;color:#888">คลิกที่ช่องเพื่อเลือก แล้วกด Ctrl+C / Cmd+C</p></body></html>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(420).setHeight(160), 'คัดลอก URL');
}

/* ── About dialog (440×560) ──────────────────────────────────────── */
function menu_about() {
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">'
    + '<link href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;600;700;800&family=Sarabun:wght@400;500;600&display=swap" rel="stylesheet">'
    + '<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">'
    + '<style>'
    + 'body{margin:0;font-family:Kanit,Sarabun,system-ui,sans-serif;color:#2C2A22;background:#FFFCF5}'
    + '.about{padding:24px}'
    + '.ab-head{display:flex;align-items:center;gap:14px;padding-bottom:16px;border-bottom:1px solid #F0E6C8;margin-bottom:16px}'
    + '.ab-logo{width:60px;height:60px;border-radius:16px;background:linear-gradient(135deg,#B8860B,#D4AF37,#E6C200);display:flex;align-items:center;justify-content:center;color:#fff;font-size:30px;box-shadow:0 8px 24px rgba(184,134,11,.35)}'
    + '.ab-title{font-size:19px;font-weight:800}'
    + '.ab-version{display:inline-block;padding:2px 10px;background:linear-gradient(135deg,#B8860B,#D4AF37);color:#fff;border-radius:99px;font-size:11px;font-weight:700;margin-top:4px}'
    + '.ab-desc{font-size:13px;line-height:1.6;color:#6B6450;margin-bottom:14px}'
    + '.ab-meta{font-size:12px;color:#8A8270;margin-bottom:14px;line-height:1.9}'
    + '.ab-dev{display:flex;align-items:center;gap:14px;padding:14px;background:linear-gradient(135deg,#FBF5E3,#fff);border:1px solid #F0E6C8;border-radius:14px;text-decoration:none;color:inherit;transition:all .2s;margin-bottom:14px}'
    + '.ab-dev:hover{border-color:#E3C76F;box-shadow:0 8px 20px rgba(184,134,11,.15);transform:translateY(-1px)}'
    + '.ab-dev-photo{width:58px;height:58px;border-radius:50%;border:3px solid #fff;box-shadow:0 4px 12px rgba(184,134,11,.3);object-fit:cover;flex-shrink:0;background:linear-gradient(135deg,#B8860B,#D4AF37)}'
    + '.ab-dev-name{font-size:15px;font-weight:700;margin-top:2px}'
    + '.ab-dev-link{font-size:12px;color:#B8860B;font-weight:600;margin-top:4px}'
    + '.ab-tech{font-size:11px;color:#8A8270;background:#FBF5E3;padding:10px 12px;border-radius:10px;border-left:3px solid #C9A227}'
    + '.ab-btn{padding:9px 18px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;border:0;font-family:inherit;background:linear-gradient(135deg,#B8860B,#D4AF37);color:#fff;margin-top:16px;float:right}'
    + '</style></head><body><div class="about">'
    + '<div class="ab-head"><div class="ab-logo"><i class="bi bi-' + APP.LOGO_ICON + '"></i></div>'
    + '<div><div class="ab-title">' + APP.NAME + '</div><span class="ab-version">v' + APP.VERSION + '</span></div></div>'
    + '<div class="ab-desc">' + APP.DESCRIPTION + '</div>'
    + '<div class="ab-meta">📅 <strong>อัปเดตล่าสุด:</strong> ' + APP.LAST_UPDATED + '<br>🏢 <strong>องค์กร:</strong> ' + APP.ORG + '</div>'
    + '<a class="ab-dev" href="' + APP.DEV.URL + '" target="_blank" rel="noopener noreferrer">'
    + '<img class="ab-dev-photo" src="' + APP.DEV.LOGO + '" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">'
    + '<div><div style="font-size:11px;color:#8A8270;text-transform:uppercase;letter-spacing:.04em">ผู้พัฒนาระบบ</div>'
    + '<div class="ab-dev-name">' + APP.DEV.NAME + '</div>'
    + '<div class="ab-dev-link"><i class="bi bi-globe"></i> ' + APP.DEV.URL.replace(/^https?:\/\//, '') + '</div></div>'
    + '<i class="bi bi-arrow-up-right" style="color:#B8860B;font-size:18px;margin-left:auto"></i></a>'
    + '<div class="ab-tech"><i class="bi bi-tools"></i> Tech: Google Apps Script · V8 · Sheets-as-DB · HTML/CSS/JS SPA</div>'
    + '<button class="ab-btn" onclick="google.script.host.close()">ปิด</button>'
    + '</div></body></html>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(440).setHeight(560), 'เกี่ยวกับ ' + APP.SHORT);
}

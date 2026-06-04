/**
 * ═══════════════════════════════════════════════════════════════
 *  CAS · ระบบงานธุรการชั้นเรียน (Classroom Administration System)
 *  File:        Code.gs — Web entry (doGet) · include() · inline boot state
 *  Version:     1.0.0
 *  Last Update: 2026-05-30
 *  Developer:   ครูวิรัตน์  หาดคำ · www.kruwirat.com
 *  License:     Proprietary · © 2026
 * ═══════════════════════════════════════════════════════════════
 */

function doGet(e) {
  _resetReq_();
  var t = HtmlService.createTemplateFromFile('Index');
  // Inline boot state — Pattern 2: client อ่านจาก DOM ไม่ต้อง fetch รอบแรก
  try { t.bootData = App_bootAll('', {}); }
  catch (err) { t.bootData = { app: { name: APP.NAME, version: APP.VERSION } }; }
  t.webAppUrl = ScriptApp.getService().getUrl() || '';
  // หมายเหตุ: ไม่เรียก setFaviconUrl เพราะ GAS ตรวจ MIME จริง — SVG/lh3 ไม่ผ่าน จะ throw
  // "ไม่สนับสนุนรูปแบบภาพของไอคอน Fav" (ดู pitfall) — ปล่อยให้ใช้ favicon เริ่มต้นของ Google
  return t.evaluate()
    .setTitle(APP.TITLE)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=5');
}

function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

// JSON inline-safe (กัน </script> ปิด tag เร็ว)
function jsonInline(obj) {
  return JSON.stringify(obj).replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
}

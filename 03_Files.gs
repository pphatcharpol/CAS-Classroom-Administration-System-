/**
 * ═══════════════════════════════════════════════════════════════
 *  CAS · ระบบงานธุรการชั้นเรียน (Classroom Administration System)
 *  File:        03_Files.gs — Drive storage · โฟลเดอร์คู่สเปรดชีต · อัปโหลดภาพ · lh3 link
 *  Version:     1.0.0
 *  Last Update: 2026-05-30
 *  Developer:   ครูวิรัตน์  หาดคำ · www.kruwirat.com
 *  License:     Proprietary · © 2026
 * ═══════════════════════════════════════════════════════════════
 *  กฎ: โฟลเดอร์เก็บไฟล์อยู่ "พาธเดียวกับสเปรดชีต" และ "ชื่อเดียวกับสเปรดชีต"
 *      ลิงก์ภาพคืนค่าเป็น lh3 (https://lh3.googleusercontent.com/d/<id>)
 */

// หาหรือสร้างโฟลเดอร์หลัก: พาธเดียวกับสเปรดชีต ชื่อเดียวกับสเปรดชีต
function Files_rootFolder_() {
  var ss = cfg_ss_();
  var ssFile = DriveApp.getFileById(ss.getId());
  var parents = ssFile.getParents();
  var parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  var name = ss.getName();
  var it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

// โฟลเดอร์ย่อยตามหมวด (students, visits, announcements, conduct, misc)
function Files_subFolder_(sub) {
  var root = Files_rootFolder_();
  var it = root.getFoldersByName(sub);
  if (it.hasNext()) return it.next();
  return root.createFolder(sub);
}

// lh3 link จาก file id (โหลดเร็ว + ปรับขนาดได้ด้วย =sNNN)
function Files_lh3_(fileId) {
  return 'https://lh3.googleusercontent.com/d/' + fileId;
}

/**
 * อัปโหลดภาพจาก base64 (data URL) → คืน { url, file_id }
 * @param {string} dataUrl  "data:image/png;base64,...."
 * @param {string} sub      โฟลเดอร์ย่อย เช่น 'students'
 * @param {string} baseName ชื่อไฟล์ (ไม่รวมนามสกุล)
 */
function Files_uploadImage(dataUrl, sub, baseName) {
  if (!dataUrl || dataUrl.indexOf('base64,') < 0) throw new Error('รูปแบบไฟล์ภาพไม่ถูกต้อง');
  var m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!m) throw new Error('ไม่สามารถอ่านไฟล์ภาพได้');
  var mime = m[1];
  if (mime.indexOf('image/') !== 0) throw new Error('รองรับเฉพาะไฟล์ภาพเท่านั้น');
  var bytes = Utilities.base64Decode(m[2]);
  var ext = (mime.split('/')[1] || 'png').replace('jpeg', 'jpg');
  var stamp = Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyyMMdd-HHmmss');
  var fileName = (baseName || 'img') + '-' + stamp + '.' + ext;
  var blob = Utilities.newBlob(bytes, mime, fileName);
  var folder = Files_subFolder_(sub || 'misc');
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { url: Files_lh3_(file.getId()), file_id: file.getId() };
}

// ลบไฟล์เก่า (ใช้ตอนแทนรูปโปรไฟล์) — เงียบถ้าลบไม่ได้
function Files_remove_(fileId) {
  try { if (fileId) DriveApp.getFileById(fileId).setTrashed(true); } catch (e) {}
}

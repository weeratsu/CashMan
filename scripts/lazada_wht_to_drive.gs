/**
 * Lazada WHT Certificate (50 ทวิ) — เซฟ PDF จาก Gmail ลง Google Drive
 * ============================================================================
 *   - runInitialBackfill()  → ครั้งแรก: ดึงเมลเก่าทั้งหมด
 *   - runDailySync()        → เฉพาะ 2 เดือนล่าสุด
 *   - createDailyTrigger()  → ตั้ง trigger รายวัน (~02:00) รันครั้งเดียวตอนติดตั้ง
 * ชื่อไฟล์: [WHT-Lazada] <วันที่จ่ายใน PDF yyyy-MM-dd> - <ชื่อเดิม>.pdf
 *   (อ่านวันที่จ่ายด้วย OCR ของ Drive; อ่านไม่ได้ → ใช้วันที่เมล + ต่อท้าย _maildate)
 * ติดตั้ง:
 *   1) Project Settings → timezone = Asia/Bangkok
 *   2) Services (+) → เพิ่ม "Drive API" (v3)
 */

var WHT_SOURCES = [
  {
    name:     'Lazada',
    folderId: '1yEZEYTKH8dzC9-Xnfu58gsYExWvAxkEr',   // โฟลเดอร์เก็บ 50 ทวิ
    sender:   'noreply@support.lazada.co.th',
    subject:  'LAZADA WHT CERTIFICATE',
    tag:      '[WHT-Lazada]',
    label:    'WHT-Lazada-Saved'
  }
];

function runInitialBackfill() { WHT_SOURCES.forEach(function (b) { _whtSync_(b, null); }); }
function runDailySync()       { WHT_SOURCES.forEach(function (b) { _whtSync_(b, 'newer_than:2m'); }); }

function createDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'runDailySync') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('runDailySync').timeBased().everyDays(1).atHour(2).create();
  Logger.log('ตั้ง trigger รายวัน (~02:00) เรียบร้อย');
}

/** อ่านวันที่จ่ายจาก PDF (แถว "dd.mm.yyyy  <ยอดเงิน>") → 'yyyy-MM-dd' หรือ null */
function _whtPayDate_(blob) {
  var docId = null;
  try {
    var doc = Drive.Files.create(
      { name: 'tmp_wht_ocr', mimeType: 'application/vnd.google-apps.document' },
      blob.copyBlob(), { ocrLanguage: 'en' });
    docId = doc.id;
    var text = DocumentApp.openById(docId).getBody().getText();
    // วันที่ที่ตามด้วยตัวเลขจำนวนเงิน = วันที่จ่าย ในตารางเงินได้
    var m = text.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})\s+[\d,]+\.\d{2}/);
    if (!m) m = text.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/);   // สำรอง: วันที่แรกที่เจอ
    if (!m) return null;
    var y = parseInt(m[3], 10); if (y > 2500) y -= 543;               // พ.ศ. → ค.ศ.
    return y + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  } catch (e) {
    Logger.log('OCR ไม่ได้: ' + e); return null;
  } finally {
    if (docId) try { Drive.Files.remove(docId); } catch (e2) {}
  }
}

function _whtSync_(b, timeFilter) {
  var folder = DriveApp.getFolderById(b.folderId);
  var label  = GmailApp.getUserLabelByName(b.label) || GmailApp.createLabel(b.label);

  var query = 'from:' + b.sender + ' has:attachment filename:pdf subject:("' + b.subject + '") -label:' + b.label;
  if (timeFilter) query += ' ' + timeFilter;

  var saved = 0, bad = 0, start = 0, PAGE = 50;
  while (true) {
    var threads = GmailApp.search(query, start, PAGE);
    if (threads.length === 0) break;

    threads.forEach(function (thread) {
      var allOk = true;
      thread.getMessages().forEach(function (message) {
        if ((message.getSubject() || '').indexOf(b.subject) === -1) return;
        var mailDate = Utilities.formatDate(message.getDate(), 'Asia/Bangkok', 'yyyy-MM-dd');

        message.getAttachments().forEach(function (att) {
          var orig = att.getName();
          if (!orig || orig.toLowerCase().slice(-4) !== '.pdf') return;
          try {
            // byte ดิบ ไม่แปลง MIME (กันไฟล์เสีย)
            var blob = Utilities.newBlob(att.getBytes(), 'application/pdf', orig);
            var newName = b.tag + ' ' + mailDate + ' - ' + orig;
            blob.setName(newName);

            var existing = folder.getFilesByName(newName);
            if (existing.hasNext()) {
              var ef = existing.next();
              if (ef.getSize() === att.getSize()) { Logger.log('ข้าม (ซ้ำ): ' + newName); return; }
              ef.setTrashed(true);
            }
            var file = folder.createFile(blob).setName(newName);
            if (file.getSize() !== att.getSize()) {
              Logger.log('⚠️ ไฟล์เสีย (ขนาดไม่ตรง) ลบทิ้ง: ' + newName);
              file.setTrashed(true); bad++; allOk = false;
            } else { Logger.log('บันทึก: ' + newName); saved++; }
          } catch (e) { Logger.log('ผิดพลาด: ' + orig + ' — ' + e); bad++; allOk = false; }
        });
      });
      if (allOk) thread.addLabel(label);
    });
    if (threads.length < PAGE) break;
    start += PAGE;
  }
  Logger.log('[' + b.name + '] เสร็จ: บันทึก ' + saved + ' ไฟล์, ผิดพลาด ' + bad);
}

# CashMan — Pending TODO

## Done (Oct 14 2026)
- [x] (Card Bills) โชว์งวด (period) หลังชื่อรายการในคอลัมน์ Charge — เสร็จ ui-bills v=322/323 + ui-billreminder v=325 (advance bills โชว์ card_period+1 = งวดบริการ; non-advance โชว์ card_period; ตรงกันทั้ง Card Bills / Bill Reminder / Payment History)
- [x] iCloud/Netflix (advance, UOB) generator — ตรวจแล้ว NOT A BUG: generateOccurrences สร้าง occurrence ครบตั้งแต่ service Sep จริง (pushOcc chargeDate 2026-09-08), fold ใต้ UOB 2026-09 statement ถูก, badge โชว์ 2026-10 (advance) ตรง ground-truth. ที่เห็น "เริ่ม Oct" เป็นเพราะ sort/filter by card_period (advance+1). iCloud/Netflix ไม่โผล่เป็นแถวเดี่ยวเพราะ fold ใต้ statement = ถูกตาม design.

## In progress / known issues
(none)

## Card Summary — กราฟเปรียบเทียบ (requested Oct 15 2026)
- เพิ่มกราฟใน Card Summary เปรียบเทียบการใช้จ่ายข้าม period
- filter ตามบัตร หรือ รวมทุกบัตร
- ดูค่าเฉลี่ยการใช้จ่ายต่อเดือน (มาก/น้อยแค่ไหน)
- ใช้ "รูดใหม่" (net new charges) เป็นฐานการเทียบ (ไม่ใช่บิลรวมที่มียกมาปน)

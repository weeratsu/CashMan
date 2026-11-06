# 50 ทวิ (WHT) — วิธีใช้

## 1) Lazada (อัตโนมัติ)
- Gmail → Drive: `lazada_wht_to_drive.gs` (Apps Script, trigger รายวัน) เซฟ PDF ลง inbox
- Inbox → จัดเก็บ: `run_wht.bat` (Task Scheduler: Monthly, Last day, 18:00)

## 2) บริษัทอื่น (รันเอง)
1. **วางไฟล์ PDF ที่:**
   `G:\My Drive\Documents\Accountancy\Tax Submission\inbox\50 Tawi`
2. **รัน:** ดับเบิลคลิก `G:\My Drive\Develop\CashMan\scripts\run_wht.bat`
   (หรือ `cd /d "G:\My Drive\Develop\CashMan\scripts"` แล้ว `py parse_wht.py`)
3. **ไฟล์จะย้ายไปที่:**
   `G:\My Drive\Documents\Accountancy\Tax Submission\<ปีที่จ่าย>\50 Tawi\<ชื่อบริษัท>\<วันที่จ่าย> - <ชื่อเดิม>.pdf`
4. **ดูผล:** `scripts\wht_log.txt` แล้วเปิด CashMan → Other Income (Ctrl+F5) ใบใหม่ขึ้นเอง

## หมายเหตุ
- **Payer mapping** (CashMan › Other Income): ผูกด้วย **เลขผู้เสียภาษี 13 หลัก** ไม่ใช่ชื่อบริษัท · ตั้ง Display name / Folder / ประเภทเงินได้ตั้งต้น → กด **Save & export** (ได้ `wht_payers.json` ใน Downloads) → รอบถัดไป `run_wht.bat` หยิบไปใช้เอง
- payer ใหม่: เพิ่มลงตาราง mapping เอง · log ขึ้น `ℹ️ payer ใหม่ <เลข> (<ชื่อ>)` · ถ้ายังไม่ตั้ง Folder ใช้ชื่อตามเอกสาร
- **เปลี่ยน Folder**: รอบถัดไปไฟล์เก่าทุกปีย้ายตามเอง (ดูจากเลขผู้เสียภาษีในไฟล์) + ลบโฟลเดอร์ว่าง + path ในแอปอัปเดตเอง
  - ชื่อซ้ำ+ขนาดเท่า = ลบตัวซ้ำ · ชื่อซ้ำ+ขนาดต่าง = เก็บทั้งคู่ ต่อท้าย `(2)` และขึ้น ⚠️ ใน log
- **เปลี่ยน Display name**: มีผลทันทีทุกรายการ (ไม่ย้ายไฟล์)
- ไฟล์ที่อ่านไม่ได้จะ **ค้างใน inbox** และ log ขึ้น `⚠️ อ่านไม่ได้` → แปลว่าต้องเพิ่ม parser สำหรับบริษัทนั้น (ส่งไฟล์ตัวอย่างให้ Quick)
- ตอนนี้ parser รองรับฟอร์มแบบ Lazada (ภาษาอังกฤษ, text layer) เท่านั้น
- ชื่อโฟลเดอร์บริษัท: ตั้งที่ CashMan › Other Income › Payer mapping (ช่อง Folder) เท่านั้น ไม่ hard code · ว่าง = ใช้ชื่อตามเอกสาร
- ใบเดิมที่ถูกส่งใบใหม่มาแทน → เอาติ๊กออกในหน้า Other Income (ไม่นับภาษี)
- ข้อมูลอยู่บน PC เท่านั้น (`data/wht_income.*` อยู่ใน .gitignore)

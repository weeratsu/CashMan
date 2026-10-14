# CashMan — Credit Card Statement: สถาปัตยกรรมใหม่ (ร่างให้รีวิว)

> วันที่ 10 ต.ค. 2026 — เอกสารนี้ยัง **ไม่แตะโค้ด** เป็นแค่แผน ให้ตกลงกันก่อนลงมือ
> เป้าหมาย: บิลบัตรเครดิตใบเดียว มี **แหล่งความจริงเดียว** ทุกหน้าอ่านตรงกัน คีย์จ่ายที่ไหนก็อัพเดทหมด

---

## 1. ปัญหาจริง (ไม่ใช่ bug — เป็น architecture)

บิลบัตรใบเดียว ตอนนี้ถูกคำนวณ **แยกกัน** หลายที่ ไม่มีใครเป็นเจ้าของความจริง:

| หน้า | อ่าน "จ่ายรึยัง" จาก | คำนวณงวด/ยอด จาก | ตรงกับที่อื่นไหม |
|---|---|---|---|
| **Bill Reminder (current/history)** | `D.bill_payments['CB\|card\|PERIOD::dueMonth']` | `billOccurrences()` → group ด้วย **period** | ✅ ถูก (หลังแก้วันนี้) |
| **Card Bills** | `cbPaidRec()` → `_cbStmtKey = CB\|card\|VIEWMONTH::VIEWMONTH` | **view month** (เลื่อนดูทีละเดือน) | ❌ key ผิด → "Not paid yet" ทั้งที่จ่ายแล้ว |
| **Timeline** | — | `simulation.js` → `_cardGroups` (คำนวณเองอีกชุด) | ❌ คนละ logic |
| **Calendar/Dashboard** | ผ่าน `billOccurrences()` | `billOccurrences()` | ⚠️ บางส่วน |

**ต้นตอร่วม:** ไม่มีฟังก์ชันกลาง — แต่ละหน้าคำนวณ "งวด / ยอด / จ่ายรึยัง" เองคนละวิธี โดยเฉพาะ:
- **key ของ paid** มี 2 แบบไม่ตรงกัน: `CB|card|PERIOD::dueMonth` (ถูก) vs `CB|card|VIEWMONTH::VIEWMONTH` (ผิด ใน Card Bills)
- **"เดือน" มี 3 ความหมายปนกัน:** view month (เดือนที่เลื่อนดู) ≠ period (งวดใช้จ่าย) ≠ due month (เดือนครบกำหนด)
- **planned/installment ที่ผูกบัตร** ถูกดึงเข้า statement คนละวิธีใน billOccurrences กับ simulation

หลักฐานจาก console วันนี้:
- `D.bill_payments` มี `CB|BAY JCB|2026-08::2026-09 => paid=true` (ถูก)
- แต่ `cbPaidRec('BAY JCB',2026,8)` = **undefined** (Card Bills หาด้วย key `...2026-09::2026-09` → ไม่เจอ)

---

## 2. หลักการออกแบบใหม่ — Single Source of Truth

### 2.1 ฟังก์ชันกลางตัวเดียว: `cardStatements(fromPeriod, toPeriod)`

ตอบ **ทุกอย่าง** ต่อ statement ในที่เดียว ทุกหน้าเรียกตัวนี้ ไม่คำนวณเอง:

```
cardStatements() → [
  {
    card:        "BAY JCB",
    period:      "2026-08",         // งวด (usage month) — คีย์หลักเสมอ
    stmt_date:   "2026-09-09",      // วันตัดยอด (PDF จริง หรือ forecast จาก statement_day)
    due:         "2026-09-10",      // = stmt_date + due_offset
    deadline:    "2026-09-29",      // PDF: วันในบิล / forecast: deadline_day ที่ตั้ง
    amount:      22548.11,          // PDF: amount_due / forecast: installment+recurring+extra
    source:      "pdf" | "forecast",
    paid:        true,
    paid_date:   "2026-09-11",
    paid_amount: 22548.11,
    children: [ {name, kind, amount, seq:"(2/10)"} ... ],  // installment/recurring ที่ผูกงวดนี้
    extra:       0,                 // ยอดประเมินที่คีย์เอง (เฉพาะ forecast)
    unmatched:   [...],             // เงินจ่ายจากเมลที่ยัง match ไม่ได้
    points:      7812,
  }, ...
]
```

**กฎเหล็ก (ทุกหน้าใช้เหมือนกัน):**
1. **คีย์เดียว:** `CB|<card>|<period>::<dueMonth>` — period = งวด, dueMonth = เดือนของ due date. ไม่มี view-month key อีก
2. **period มาจาก parser** (`_cardPeriod`) สำหรับ PDF / จากกฎ day≤15 สำหรับ forecast
3. **paid อ่าน `D.bill_payments` ตัวเดียว** — เลิก `cbPaidRec`/`_cbStmtKey` ที่ใช้ view month
4. **เขียน paid จุดเดียว:** ฟังก์ชัน `cardMarkPaid(card, period)` ตัวเดียว ทุกปุ่มจ่าย (Bill Reminder, Card Bills, หน้าใหม่) เรียกตัวนี้ → เขียน key เดียวกัน → อัพเดททุกหน้า
5. **extra ผูก period** ไม่ใช่ view month

### 2.2 แต่ละหน้าเปลี่ยนเป็น

| หน้า | เปลี่ยนเป็น |
|---|---|
| Bill Reminder | เรียก `cardStatements()` แทน group เอง (logic เดิมถูกอยู่แล้ว แค่ย้ายมาเรียกกลาง) |
| Card Bills | เลิก view-month + `cbPaidRec` → แสดง **ทุกงวดจาก `cardStatements()`**, คีย์ extra/จ่าย ผูก period |
| Timeline | `simulation.js` ดึง statement จาก `cardStatements()` แทน `_cardGroups` |
| Calendar/Dashboard | เรียก `cardStatements()` |

### 2.3 "คีย์จ่าย" — รวมเป็นที่เดียว
- ปุ่ม "จ่าย"/"Mark paid" ทุกหน้า → เรียก `cardMarkPaid(card, period)` ตัวเดียว
- จ่ายจากเมลอัตโนมัติ (match_payments ใน parser) → เขียน key เดียวกัน
- → คีย์ที่ไหน เห็นตรงกันทุกหน้าทันที

---

## 3. สิ่งที่ **ไม่** แตะ (ทำงานถูกแล้ว — พรุ่งนี้บิลมาต้องใช้)
- `parse_cardbills.py` — อ่าน PDF + เมลจ่าย → card_bills.js ✅
- `krungsri_payments.gs` — เมลจ่าย → card_payments.json ✅
- period rule, Due=stmt+offset, Deadline=PDF, paid matching ✅
- → **automate flow พรุ่งนี้ไม่กระทบ** บิล BAY/JCB งวด 2026-09 ยัง parse เข้าถูก

---

## 4. ลำดับทำ (ทีละขั้น เทสต์ทีละขั้น ไม่วน)

1. **สร้าง `cardStatements()` + `cardMarkPaid()`** กลางใน ui-cardsync.js (หรือไฟล์ใหม่ card-core.js) — ยังไม่เปลี่ยนหน้าไหน แค่สร้าง + เทียบ output กับ console ว่าตรง
2. **ย้าย Card Bills** มาใช้ `cardStatements()` → แก้ paid-sync + extra-period ในตัว (บั๊กชัดสุดหายก่อน)
3. **ย้าย Bill Reminder** มาเรียกกลาง (verify ไม่เปลี่ยนผลที่ถูกอยู่)
4. **ย้าย Timeline + Calendar** มาเรียกกลาง
5. ลบ code เก่า (`cbPaidRec`, `_cbStmtKey`, `_cardGroups`) ที่ไม่ใช้แล้ว

แต่ละขั้น: ผม audit + เทสต์ logic เองก่อน แล้วค่อยให้คุณ Ctrl+F5 ดูผล — ไม่ให้ลองผิดลองถูก

---

## 5. ที่ต้องตัดสินใจ (ก่อนเริ่ม)
- **A. หน้า Credit Card ใหม่** — ทำเป็นแท็บเดียวที่เห็นทุกงวด/ทุกบัตร (เลิก view month) ใช่ไหม?
- **B. คีย์จ่าย** — ให้จ่ายได้ทุกหน้า (ทุกปุ่มเรียก cardMarkPaid เดียว) หรือจ่ายที่เดียวพอ หน้าอื่นแค่แสดง?
- **C. ลำดับ** — เริ่มขั้น 1 (สร้างฟังก์ชันกลาง) เลยไหม หรืออยากแก้ paid-sync จุดเดียวก่อนให้พรุ่งนี้ใช้ได้?

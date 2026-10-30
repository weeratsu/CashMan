# CashMan — STATE.md
> สถานะกลางของระบบ อ่านไฟล์นี้ก่อนเริ่มทุกครั้ง และอัปเดตทุกครั้งที่แก้
> อัปเดตล่าสุด: 2026-10-18 12:35 (Asia/Bangkok)

---

## 🔴 หลักการสถาปัตยกรรม (USER-LOCKED — ห้ามละเมิด)
**ทุก entity ที่ setup ได้ ต้องแยก `id` (primary key, ถาวร, ห้ามเปลี่ยน) ออกจาก `name`/description (เปลี่ยน/rename ได้)**
- การอ้างอิง/foreign key ทุกจุด = ใช้ `id` เท่านั้น ห้ามใช้ชื่อ
- `id` = running number ที่ไม่มีความหมาย (เช่น `c1,c2...`) — **ห้าม**ผูกกับ last4/ชื่อ/ข้อมูลบัตร
- rename = แก้แค่ field `name` ที่ record เดียว ต้องไม่กระทบข้อมูลที่ link อยู่
- ใช้กับทุก entity: cards, banks, limit_groups, bills, owners, types ฯลฯ

---

## 🎯 งานปัจจุบัน: id-based refactor (แก้ปัญหา rename บัตรแล้วข้อมูลพัง)

### เสร็จแล้ว ✅
1. **data.js (v304)** — card_id = running number `c<N>` (ไม่ผูก last4/ชื่อ)
   - `D._card_id_seq` counter; `window.cardNextId()` สำหรับ Add-Card
   - resolver กลาง: `cardById`, `cardByLast4`, `cardByName`, `cardIdByName`, `cardDisplayName(x,last4Hint)`, `cardResolve(x,last4Hint)` — รู้จัก `c<N>`, `card_*`, last4, ชื่อ
2. **ui-cardsummary.js (v17)** — resolve ชื่อจาก last4→ชื่อปัจจุบัน (dropdown/group/หัวการ์ด/txn filter)
   - ✅ user confirm 11:00: ชื่อถูก + trx ไม่ซ้ำ
3. **parse_cardbills.py** — เขียน `card_id` ลง bills + txns (`_ids_from_sheet`→`LAST4_TO_ID`)
   - dedup/merge key เปลี่ยนชื่อ→last4 ครบ 4 จุด (`_bk`, bills FINAL `_k`, `_tk`, `_tkf`) กัน row เก่า+ใหม่ซ้ำ
   - rebuild แล้ว: 26 bills + 525 txns, card_id ครบ (generated 10:43)
4. **ui-cardsync.js (v313)** — card_txns เลิก merge → **replace จาก PDF**
   - `_txnKey` ใช้ card_id; replace drop ของเก่าที่ card_id/last4/ชื่อ resolved ตรง fresh set
   - ✅ no_id 69→0 (user รัน snippet ล้างของเก่า KBank last4=null)
5. **ui-cardtxns.js (v2)** — Card Transactions resolve ชื่อจาก card_id/last4 (`_ctName`)
   - dropdown/filter/สดมภ์บัตร/sort resolve แล้ว — ⏳ รอ user ยืนยันหลังรีเฟรช
6. **index.html** — APP_VERSION label (วันที่-เวลา) โชว์ sidebar+title; ทุก deploy bump `window.APP_VERSION`
7. **Code.gs (Sheet)** — ไม่ต้องแก้ (เก็บทั้ง row เป็น _json → id ไหลเข้า Sheet อัตโนมัติเมื่อ sync)

### ค้างอยู่ / ขั้นต่อไป ⏳
1. **ui-cardtxns.js** — รอ user ยืนยัน dropdown ไม่มีชื่อซ้ำแล้ว
2. **ui-billreminder.js (Payment History)** — ยังไม่ refactor (อ่าน `_cardName` + CB| keys ดิบ) → ต้อง resolve
   - `cardPaidRecFor(card,period)` prefix-match `CB|card|period::` ด้วยชื่อดิบ — ยังไม่ resolve ด้วย id (ถ้าชื่อใน key เพี้ยนจะหา paid ไม่เจอ)
3. **ui-bills.js (Card Bills page)** — ยังไม่ตรวจว่า resolve ชื่อไหม
4. **id ยังไม่ไหลเข้า bill_payments / planned keys** — ยังเป็น `CB|<name>|period`; ปัจจุบันพึ่ง resolver by-last4/name ที่ display layer เป็นสะพาน

---

## 📂 ไฟล์หลัก (live, ไม่มี branch แล้ว)
- App: `G:\My Drive\Develop\CashMan\` (index.html + js/ + data/ + scripts/Code.gs)
  - user เปิด `file:///G:/My Drive/Develop/CashMan/index.html`
- Branch เดิม: ย้ายเป็น `_archive_branch-unified/` แล้ว (เลิก sync, ทำ live ที่เดียว)
- Parser: `G:\My Drive\Develop\CardBills\scripts\parse_cardbills.py`
  - `run_cardbills.bat` = parse inbox ใหม่เท่านั้น
  - `run_cardbills_rebuild.bat` = `python parse_cardbills.py rebuild` (อ่าน PDF archive ทั้งหมดใหม่) ← ใช้ตัวนี้เวลาจะ regenerate ทั้งหมด
  - config.json: endpoint+read_token ของ Sheet, cards+last4+pdf_password (6 บัตร)
- Sheet backend: `CashMan\scripts\Code.gs` (Apps Script web app; เก็บทั้ง row เป็น `_json`)
- PDF statements: `G:\My Drive\Documents\Bills\Credit Card Statements\<card>\<year>\`

## 💳 บัตร 9 ใบ (D.cards)
| ชื่อปัจจุบัน | last4 | หมายเหตุ |
|---|---|---|
| BAY Visa Platinum | 6425 | เดิมชื่อ "BAY" |
| BAY AIA Visa Platinum | 3243 | เดิม "BAY AIA" |
| BAY JCB Platinum | 8172 | เดิม "BAY JCB" |
| BBL Platinum | 2117 | |
| KBank PLUSTINUM | 8033 | เดิม "KBank"; บิลเก่า last4=None |
| KBank THE PASSION | (ว่าง) | บัตรใหม่ ยังไม่มีบิล |
| ttb Global House | 2252 | บัตรใหม่ ยังไม่มีบิล |
| ttb so smart | 1394 | |
| UOB Preferred Platinum | 5868 | ไม่มี PDF password |

## ⚠️ บทเรียน (method)
- **Deploy ลง G:\ ต้องใช้ file_write tool เท่านั้น** — `open(...,'w')` ผ่าน run_python เขียน G:\ **ไม่ติด** (silently fail, report success แต่ bytes ไม่เปลี่ยน) เพราะ Google Drive read-only ต่อ on-device python
- **Byte-verify ทุก deploy** — อ่านกลับจากดิสก์ เช็ค marker string + version
- **Syntax check**: JS = stub+execute ผ่าน run_javascript; Python = ast.parse
- **sandbox ไม่มีเน็ต** + **on-device อ่าน G:\ ไม่ได้** (PermissionError) → อ่าน Sheet ต้องให้ user รันเอง หรือผ่าน export JSON
- **อย่าแก้ที่ไฟล์ import อย่างเดียว** — ต้นเหตุคือโค้ดใช้ชื่อเป็น key; แก้ data ชั่วคราว เปลี่ยนชื่ออีกก็พังอีก


---

## 📋 แผน: bill_payments + cardbill_extra → card_id (งานใหญ่ ค้างทำ)
> วางแผน 2026-10-17 11:30 — ทำเป็น step ย่อย ทดสอบทีละ step

### ปัญหา
`D.bill_payments` key = `CB|<ชื่อบัตร>|period::dueMonth` และ `D.cardbill_extra` key = `<ชื่อบัตร>::period`
→ เปลี่ยนชื่อบัตร = key เก่าค้าง + ซ้ำ (เพิ่งเจอ JCB/BAY) ต้องล้าง snippet ทุกครั้ง

### กลยุทธ์ (chokepoint 2 จุด)
`cardStmtKey(card,period,due)` (writer) + `cardPaidRecFor(card,period)` (reader) ทั้งคู่ใน **ui-cardsync.js** คือตัวกลางที่ 6 ไฟล์เรียก:
ui-bills, ui-billreminder, ui-cardsummary, unified-adapter, ui-creditcards + ui-cardsync เอง
→ ถ้าทำให้ 2 ตัวนี้ resolve ชื่อ→card_id ภายใน (segment กลางเก็บ id) ทุกไฟล์ได้ประโยชน์พร้อมกัน โดยไม่ต้องแก้ callers

### STEP ย่อย (ทดสอบทีละ step)
1. **cardStmtKey**: resolve card→id ก่อนประกอบ key → `CB|<id>|period::due` (ถ้า resolve ไม่ได้ fallback ชื่อเดิม)
2. **cardPaidRecFor**: resolve card→id ก่อน prefix-match `CB|<id>|period::`
3. **cardMarkPaid / cardUnmarkPaid**: ใช้ cardStmtKey อยู่แล้ว → ได้ id อัตโนมัติ (ตรวจ rec.card ให้เก็บ id ด้วย)
4. **cardbill_extra**: key `<ชื่อ>::period` → `<id>::period` — จุดที่แตะ: ui-bills (เขียน cbSetExtra + อ่านหลายจุด), ui-creditcards (migrate), simulation, unified-adapter, ui-billreminder, trx-io (export). helper กลางใหม่: `cardExtraKey(card,period)` + `cardExtraGet(card,period)`
5. **migration (data.js, one-time `D._cb_key_id_migrated`)**: แปลง key เก่าทั้งหมด:
   - `CB|<ชื่อ>|...` → `CB|<id>|...` (resolve ชื่อ→id; ชนกัน merge paid_date ล่าสุด)
   - `<ชื่อ>::period` ใน cardbill_extra → `<id>::period`
6. **display**: ทุกหน้าที่โชว์ชื่อจาก key segment ต้อง resolve id→ชื่อ (cardDisplayName รองรับ c<N> แล้ว) — ตรวจ _cardStmtPer/_rowPer ที่ parse key.split('|')[1]

### จุดเสี่ยง
- key segment กลางเดิมเป็น period (`CB|card|PERIOD`) — ระวัง: segment[1]=card, segment[2]=period. เปลี่ยน card→id ไม่กระทบ period parsing
- รูปแบบ `::dueMonth` suffix ต้องคงไว้ (cardPaidRecFor prefix-match)
- ของเก่าใน Sheet sync แล้ว — migration ต้อง idempotent (รันซ้ำไม่พัง)
- ยังมี snippet-ล้างแล้วบางส่วน — migration ต้องกันซ้ำ (merge ไม่ใช่ overwrite)


---

## 📐 แผนเต็ม (DETAILED) — id ล้วนทั้งระบบ (ตัวเลือก 2, user-locked 2026-10-17 11:37)
> ขอบเขต: ทุก reference ของบัตรเป็น card_id (c<N>) ล้วน — รวม def.card ใน monthly/yearly/installments/planned
> ผลลัพธ์: rename = เปลี่ยนแค่ description, ไม่ต้อง migrate อะไรอีก (ccSaveCard ลบ migration ทิ้งได้)
> วิธีปลอดภัย: migrate ครั้งเดียว + resolver กลางมีอยู่แล้ว (cardById/cardByName/cardDisplayName) + ทำทีละ step + ทดสอบก่อนไปต่อ

### หลักการแปลง
- STORED key/reference ทุกชนิด → card_id:
  1. `def.card` (monthly/yearly/installments/planned) : ชื่อ → c<N>
  2. `CB|<id>|period::due` (bill_payments key)
  3. `<id>::period` (cardbill_extra key)
  4. planned `_cardKey='<id>|period'`, `_cardName`→เก็บ id (หรือเพิ่ม `_cardId`)
  5. `source_ref='<id>|period'` (unified)
  6. `t.card`/bill `card` ใน card_txns/CARD_BILLS : parser เขียน card_id แล้ว (เสร็จ) — ส่วน .card (ชื่อ) เก็บเป็น display ได้
- DISPLAY ทุกจุด: resolve id→ชื่อ ด้วย cardDisplayName(id)
- INPUT (dropdown เลือกบัตร): value=card_id, label=ชื่อ
- LOOKUP: `.find(x=>x.id===cardId)` แทน `.find(x=>x.name===card)`

### STEP (deploy+ทดสอบทีละ step)
**S1. data.js migration (one-time, idempotent) `D._card_ref_id_migrated`:**
   - def.card ทุก collection: ชื่อ→id (cardByName; ไม่เจอ=คงเดิม)
   - bill_payments: `CB|ชื่อ|...`→`CB|id|...` (merge paid_date ล่าสุด)
   - cardbill_extra: `ชื่อ::p`→`id::p`
   - planned: _cardKey, _cardName→id (+ _cardId)
   - รัน หลัง card_id migration (S0 ที่เสร็จแล้ว) — idempotent

**S2. cOpts/cOnlyOpts (dropdown builders ใน ui-bills):** value=id label=cardDisplayName(id)
**S3. ui-bills:** ทุก `.find(x.name===card)`→`id`, filter `.card===fc`→id, _cbOpen[id], cbPaidRec/cbMarkPaid/cbSetExtra ใช้ id, cardExtraKey helper
**S4. ui-cardsync:** cardStmtKey/cardPaidRecFor/cardMarkPaid resolve→id; cardAutoSyncPlanned เขียน _cardKey/_cardId=id; cardExtraKey
**S5. ui-billreminder:** occ.card=id; display resolve id→ชื่อ (_cardDisp รับ id แล้ว); _cardActual by id; deadline lookup by id; markRowPaid ส่ง id
**S6. simulation.js:** addE card param = id→resolve ชื่อ at display; cards.find by id; Dashboard Calendar/Timeline
**S7. unified.js/adapter:** source_ref=id; _card()/cardByName lookup by id; base._cardName=id
**S8. ui-creditcards:** Add-Card ใช้ cardNextId(); rename = แก้แค่ name (ลบ _ccMigrateCardName หรือเหลือแค่ no-op); ui-setup/ui-cardraw/ui-dashboard lookup by id
**S9. trx-io (export/import):** def.card เป็น id — export เก็บ id; import ไม่แปลง
**S10. ลบ migrate-on-rename:** ccSaveCard เลิก migrate key (id คงที่) — rename เปลี่ยนแค่ description

### จุดเสี่ยง
- Cash/Direct: ไม่ใช่บัตร — คงค่า 'Cash/Direct' ไว้ (ไม่แปลงเป็น id) ทุก lookup ต้อง skip
- income/receivable: card='Cash/Direct' เสมอ
- dropdown value เปลี่ยนเป็น id — ทุก onchange ที่อ่าน this.value ต้องรับ id
- Sheet sync หลัง migrate (ไม่งั้น pull ทับ)
- migration idempotent + merge-not-overwrite
- ต้องเทสต์: set recurring/installment/planned ใหม่ → .card เก็บ id, แสดงชื่อถูก; rename → ทุกหน้ายังตรง; import receipt ใหม่ → fold ถูก


---

## 🔴 S1 FAILURE LOG (2026-10-17 11:50) — DISABLED, DO NOT RE-ENABLE until root cause found
S1 migration (def.card + keys -> id) was deployed in data.js v305 then DISABLED in v306 (guard forced to `if(true||...)return`).
- **Symptom**: after refresh+run on LIVE, installments.card ALL became 'BAY AIA Visa Platinum' (a NAME, wrong card — should be BAY Visa/KBank/ttb), monthly.card AIS Fiber/Mobile became 'Cash/Direct' (was 'ttb so smart'), planned.card all 'Cash/Direct'. REAL DATA CORRUPTION.
- **BUT**: running the EXACT deployed data.js S1 against the clean backup through Node (stub+loadD) produced CORRECT ids (c1/c5/c8...). So S1 logic itself is correct in isolation.
- **Unresolved**: something in the full in-app load/sync order overwrites def.card AFTER S1 (or S1 runs against a D state different from the exported backup). NOT a legacy .card= writer in data.js (ripgrep clean). Suspects not yet ruled out: Sheet-sync pull after loadD, importData path, ui-cardsync cardAutoSyncPlanned, ccSaveCard.
- **Recovery**: user re-imported Backup/pre_id_refactor_20261017/live_before_S1.json (clean, names, migrated=None).
- bill_payments/cardbill_extra/card_txns id-keys were CORRECT in the corrupted file — only def.card (monthly/yearly/installments/planned) got wrong values.
- **NEXT**: before any S1 retry, instrument WHERE def.card changes during a real load (add console.trace or staged export). Do NOT re-enable S1 blind.


---

## 🔍 S1 ROOT-CAUSE INVESTIGATION (2026-10-17 12:11) — not reproducible from current code
Traced the full loadD order + searched every `.card=` writer in data.js:
- cardByName IS defined before S1 (23886 < 25548) — resolver available ✓
- NO stray `.card=` assignment writes a wrong card name post-S1 (only 'Direct Debit'->'Cash/Direct', unrelated)
- importData = `D=JSON.parse; saveD(); location.reload()` → on reload loadD runs migrations
- S1 only ever converts TO id (c<N>); the corrupted 1143 file had NAMES ('BAY AIA' on all 8 installments) — S1 cannot produce that. So the 'BAY AIA' corruption came from an EARLIER buggy cycle (Oct 16 rename mess / prior attempt) that was saved then re-exported, NOT from current S1 code.
- CONCLUSION: current S1 logic is correct in isolation AND no data.js writer corrupts post-S1. Live corruption NOT reproducible from current code. Data already recovered (installments correct after importing live_before_S1.json).

### DECISION PENDING (how to retry S1 safely)
Option A — defensive S1: convert .card to id ONLY when cardByName resolves to a real card; otherwise leave untouched (never write a wrong/blank). Keep _cardName as human-readable fallback. Lowest risk.
Option B — stage it: re-enable S1 but add a one-shot console export of def.card BEFORE and AFTER inside loadD, so the next real load shows exactly what changes — then decide.
Still DISABLED (`if(true||...)`) in data.js v306 until user picks.


---

## 🎯 S1 ROOT CAUSE — FOUND (2026-10-17 12:25): Sheet-sync re-corrupts on load
The S1 "corruption" was NEVER S1. Confirmed chain:
1. S1 logic is correct (dry-run on live showed installments resolve c1/c5/c8, all resolved:true).
2. The restored backup live_before_S1.json is clean (installments BAY Visa/KBank/ttb, migrated:None, no dup card names).
3. Yet the 12:23 post-S1 export has installments = 'BAY AIA Visa Platinum' x8 (NAMES, not ids) + migrated:true.
4. S1 only ever writes IDS, never a wrong NAME -> impossible for S1 to produce 'BAY AIA'.
5. **sheet-sync.js pulls the remote Sheet snapshot ON LOAD and adopts it over local D (REAL-DATA guard, realScore).** The Sheet still held the OLD corrupted snapshot (Oct-16 rename mess, installments already BAY AIA). So: import clean -> saveD local -> reload -> sheet-sync PULLS stale corrupted Sheet -> overwrites clean local D -> S1 then stamps migrated:true on the already-bad data.

### CONSEQUENCE
Every local fix (import, console snippet) is overwritten on the next refresh by the stale Sheet, until the SHEET ITSELF is fixed. This explains the ENTIRE multi-day loop of "fixed then broken again after refresh".

### FIX SEQUENCE (must push to Sheet, not just import)
1. Import clean live_before_S1.json
2. IMMEDIATELY push to Sheet (force) so the Sheet holds clean data — BEFORE any other refresh
3. Verify Sheet (read back) shows clean installments
4. THEN refresh; S1 converts clean->ids; push id-version back to Sheet
5. From here, local and Sheet agree; no more re-corruption

### S1 STATUS
data.js v308 has S1 WRITES ENABLED (real, idempotent). It is correct — do NOT disable it again. The problem is upstream (Sheet content), not S1.


---

## ✅ S1 COMPLETE (2026-10-17 12:42) — verified on live, Sheet in sync
RESOLVED the whole loop. The real root cause was the SHEET held the old corrupted snapshot (installments=BAY AIA from Oct-16 rename mess); on every load sheet-sync PULLED it over the clean local D, so each local fix was undone.

### What finally worked (user-executed)
1. Built the correct id-form file in Python from the clean backup: exported/cashflow_idform_2026-10-17.json (installments c1/c5/c8, all refs = id).
2. User imported it in the app.
3. **Direct Sheet overwrite from Console** (bypasses the dirty-gate; cmSheetSyncNow pulls when not dirty, so it could NOT be used):
   `fetch(CM_SHEET_CFG.endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({token:CM_SHEET_CFG.writeToken,action:'replaceAll',data:D})})`
4. Refresh → installments stayed ["c1","c5","c8",...], ais=["c8","c8"], migrated=true, dirty=false. Sheet and local now agree on id-form.

### Verified state
- def.card = id (c1/c5/c8...) across monthly/yearly/installments/planned
- bill_payments keys CB|<id>|period::due ; cardbill_extra <id>::period ; planned _cardKey/_cardId = id
- S1 in data.js v308 is CORRECT and ENABLED (idempotent). Keep it.

### KEY LESSON (write to memory)
When a localStorage-backed app ALSO syncs to a cloud Sheet with pull-on-load, fixing local data (import/console) is NOT enough — the stale cloud copy overwrites it on the next refresh. Must push the corrected data to the Sheet directly (writeToken + replaceAll) so cloud and local agree. The dirty-gated cmSheetSyncNow() pulls (not pushes) when the app thinks local==Sheet, so a direct POST is required.

### NEXT: S2 — dropdown builders (cOpts/cOnlyOpts) value=card_id, label=cardDisplayName(id)
Then S3-S10 per the full plan. All display code must resolve id->name via cardDisplayName.


---

## ✅ S3+S4+S5 COMPLETE + paid_date overwrite fixed (2026-10-17 13:17)
All 5 card display pages now resolve card_id -> name; all stored keys/refs are id. Verified live.
- S2 (data.js v309): cOpts/cOnlyOpts emit value=card_id, label=name.
- S4 (ui-cardsync v314): cardStmtKey/cardPaidRecFor/cardMarkPaid id-keyed (accept name OR id); cardExtraKey helper; _validCB/_cardManaged/_valid/_pdfPeriod cleanup sets id-keyed; cardAutoSyncPlanned writes id ckey/payKey/_cardId; markPaid stores rec.card=id.
- S3 (ui-bills v326): Card Bills resolves id->name; _cbPeriodForView + install/breakdown lookups accept id; cardbill_extra reads route through window.cardExtraKey. (Fixed "NO CHARGES" everywhere.)
- S5 (ui-billreminder v328): history row name for CB rows = cardDisplayName(id)+period; _cardSet/filter/sort resolve id->name. (Fixed History showing c9/c1.)
- **paid_date overwrite ROOT FIX (ui-cardsync v315)**: cardAutoSyncPlanned was REWRITING D.bill_payments[payKey].paid_date = card_bills paid_date on EVERY load when paid_full — so hand-corrected dates (JCB 14/05, 12/10) reverted to the PDF/email date (11/06) each refresh. Changed to CREATE-only: `if(!prev){...}` — never overwrite an existing paid record. THIS is why "fix then wrong again after refresh" kept happening for paid_date specifically.
- Data cleanup done via Console: deleted 5 leftover name-keyed CB records (id key kept), fixed JCB 2026-04/2026-09 paid_date, pushed to Sheet.

### STILL OPEN
- AIS Fiber/Mobile not folding into the card statement (e.g. Sept) — likely card_link still a NAME (S1 did NOT convert card_link, only .card). NEXT: migrate card_link -> id + resolve in the fold logic.
- S6/S7/S8/S9/S10 (simulation.js Dashboard/Timeline, unified.js/adapter, ui-creditcards/ui-setup/ui-cardraw/ui-dashboard lookups, trx-io, remove migrate-on-rename) not yet done.


---

## ✅ FOLD RULE ล็อคสมบูรณ์ + per-occurrence OVERRIDE + sync pause (2026-10-17 18:50)

### 🔴 FOLD RULE (USER-LOCKED — ใช้ทั้ง Bill Reminder และ Payment History เหมือนกัน)
charge ที่ผูกบัตร fold เข้า statement งวดไหน — แยกตามประเภท:
- **Installment (kind=I)**: fold ตาม **วันรูด (orig_due)** เสมอ — ไม่สน auto_pay (field นั้นเชื่อไม่ได้), ไม่สน paid_date. installment เป็น auto เสมอ (ไม่โผล่เป็นแถว manual ให้กดจ่ายเอง)
- **Monthly/Yearly auto-debit (auto_pay:true)**: fold ตามวันรูด (orig_due)
- **จ่ายแยกเอง (manual, เช่น AIS)**: fold ตาม **paid_date**
- **ยังไม่จ่าย (manual, unpaid)**: ไม่ fold — ค้างเป็นแถวเดี่ยว actionable
- fold ได้ก็ต่อเมื่อ statement ปลายทางจ่ายแล้ว (มี CB record ใน ledger); ถ้ายังไม่จ่าย → charge โผล่เดี่ยว + badge "↳ <card> <period>" รอ
- งวดคำนวณจาก statement_day/period_rule ของบัตร (อย่าถาม — card setting บอกหมดแล้ว)

ตัวอย่าง AIS (ttb c8, S=22):
- AIS 2026-08 จ่าย 29/08 ด้วย JCB(c3) → fold JCB 2026-08
- AIS 2026-09 จ่าย 29-30/09 ด้วย ttb(c8) → 29/30>22 → fold ttb 2026-10 (ไม่ใช่ 2026-09)

### ไฟล์ที่คุม fold (สำคัญ: มี 2 layer แยกกัน!)
- **Bill Reminder** → `window.billOccurrencesUnified` ใน **unified-adapter.js** (เพราะ CM_USE_UNIFIED=true) — ไม่ใช่ billOccurrences ใน ui-billreminder.js! (เสียเวลาแก้ผิด layer หลายรอบ)
- **Payment History** → fold block ใน ui-billreminder.js (renderBillReminder, ประมาณบรรทัด 1214+) — คนละตัวกับ adapter
- helper fold-by-date: `_periodForDateOnCardU(cardObj,iso)` (adapter) / inline ใน History (closure คนละตัว — อย่าเรียก _periodForDateOnCard ข้าม closure จะ ReferenceError)

### ✨ PER-OCCURRENCE OVERRIDE (แก้บิลเฉพาะงวด)
- เก็บใน `D.occ_overrides["<billKey>::<period>"]` = `{card,amount,due,paid_date}` (เฉพาะ field ที่ override; ไม่ใส่=ใช้ default)
- อ่านใน adapter (billOccurrencesUnified) ก่อน fold block → ทับ card/amount/due แล้ว fold ตามบัตรใหม่
- UI: ปุ่ม ✏️ "แก้งวดนี้" ทุกแถวบิลใน Bill Reminder (ยกเว้น statement/รายรับ) → popup `occEditOverride(billKey,period,fullKey,defCard,defAmt,defDue)` → occSaveOverride/occClearOverride
- popup แสดงค่า default ของงวดนั้น (card/amount/due) — override ทับถ้ามี
- paid_date override = write-through ไปที่ bill_payments[fullKey].paid_date ด้วย (ให้ fold-by-paid-date เห็น)

### ⏸ SYNC PAUSE (sheet-sync.js v6)
- `cmSyncOff()` = หยุด pull-on-load + push + beforeunload warning (เซฟแค่ local); flag `cm_sync_disabled` ใน localStorage (ค้างข้าม refresh)
- `cmSyncOn()` = เปิดกลับ + push ที่ค้างขึ้น Sheet
- `cmSyncStatus()` = 'on'/'paused'
- ใช้ระหว่างไล่แก้ data — กัน Sheet ดึงทับขณะ debug เสร็จค่อย cmSyncOn()

### export filename (data.js v310)
exportData() → `cashflow_YYYY-MM-DD_HHMMSS.json` (เวลาท้องถิ่น กันชื่อซ้ำ)

### VERSION ล่าสุด (live)
- ui-billreminder.js **v345** (History fold-by-date + installment=cut-date + override popup + default values)
- unified-adapter.js **v14** (fold-by-paid-date + installment=cut-date always auto + per-occ override read)
- data.js **v310** (export timestamp)
- sheet-sync.js **v6** (sync pause)
- index.html APP_VERSION = **2026-10-17 18:50**

### ⚠️ METHOD LESSON ใหม่ (สำคัญ)
- **แก้ layer ที่ symptom อ่านมาจริง** — CM_USE_UNIFIED=true → Bill Reminder ใช้ adapter ไม่ใช่ billOccurrences. เสียเวลาแก้ ui-billreminder.js หลายรอบ (v332-335) แล้วไม่มีผล
- **อย่าสร้าง string JS-in-HTML ด้วยมือ** — JSON.stringify ใส่ double-quote ชน onclick="..." → ใช้ single-quote escape แทน (แบบเดียวกับ markRowPaid)
- **เติม '+' เชื่อมเวลาแทรก string กลาง template** — ลืม → "is not a function" (string ถูกเรียกเป็น fn)


---

## ✅ Oct 18 2026 — yearly-materialize, overwrite rule, extra-key id, Timeline unify

### 🔴 OVERWRITE RULE (user-locked Oct 17 PM)
บิลจริง (เอกสาร/PDF sync) = ยึดเป็นหลัก ทับ record ที่ sync สร้างไว้ — ยกเว้น record ที่ user แก้มือ (flag `_userEdited`) ไม่ทับ
- ui-cardsync.js **v316**: create ถ้าไม่มี; ถ้ามี record `_fromCard && !_userEdited` → ทับจากเอกสาร; `_userEdited` → ไม่แตะ
- ui-billreminder.js: histSaveEdit + occSaveOverride ติด `_userEdited=true` ตอน user แก้

### extra key = id (ui-bills.js v327)
setCardBillExtra เขียน key ผ่าน `cardExtraKey` (resolve ชื่อ→id) — เดิมเขียน `card+'::'+period` ตรง ๆ ได้ `BAY JCB Platinum::...` (ชื่อ) → แตก statement ซ้ำ + ลบไม่ได้. ตอนนี้ key = `c3::period` ถูกต้อง

### yearly ↔ installment/planned DEDUP + MATERIALIZE
- **unified.js v7**: guard — ถ้าชื่อซ้ำระหว่าง yearly(installment mode) กับ manual installment → ข้าม yearly ไม่ emit ซ้ำ (manual = ของจริง). `_manualInstNames` set
- **ui-bills.js v329**: ปุ่ม **➕ สร้างรายการจริง** ในแถว detail ของ **Yearly** (ไม่ใช่ Monthly!). `yMaterialize(i)`:
  - installment mode → push `D.installments` (per_period/periods/billing_day/card) + `_fromYearly`
  - จ่ายทีเดียว → push `D.planned` (เดือน/วันตาม yearly) + `_fromYearly`
  - รายการที่สร้าง แก้/ลบได้อิสระ; soft link = `_fromYearly` ให้ guard ซ่อน yearly forecast
- **คอนเซปต์:** yearly = ประมาณการ; รูดจริง → กดสร้าง → ปรับเดือนตาม trx จริง (ก.ค./ก.ย. แล้วแต่รูด)

### ui-bills.js v330 — Planned sort
หน้า Planned คลิก header sort ได้: เพิ่ม Date + Card (เดิมมี Name/Type/Amount). Card เรียงตามชื่อ display (resolve id→ชื่อ)

### Timeline (simulation.js + ui-timeline.js) — resolve id + unify fold
- **simulation.js v287**: `_simCard(ref)`/`_simCardName(ref)` resolve id OR ชื่อ (เดิม `.find(name===)` พังกับ id ที่ 4 จุด: line 87/111/248/286). statement label = `_simCardName`. **card charge ลงวันตัดจริง (billing_day)** ไม่ใช่วันจ่าย-เลื่อน → auto(Netflix/iCloud) + manual(AIS) fold ใต้ statement ก้อนเดียวเหมือนกัน. PDF total row tag `_pdfTotal=true`
- **ui-timeline.js v255**: resolve ชื่อบัตร (`cardDisplayName`) ที่ badge + cardLabel (strip `__stmt_` prefix). ซ่อน `_pdfTotal` row ทั้ง timeline (`nL` filter) — เป็นยอดรวมที่เป็น statement header อยู่แล้ว ไม่โชว์ซ้ำ. statement แตกออกมาเหลือแค่ installment + extra

### VERSION ล่าสุด (live, Oct 18)
- unified.js **v7** (yearly/manual dedup guard)
- ui-bills.js **v330** (yMaterialize button + Planned Date/Card sort + extra-key id)
- ui-cardsync.js **v316** (overwrite-unless-_userEdited)
- ui-billreminder.js **v347** (_userEdited flag on edits)
- simulation.js **v287** (id resolve + card charge on cut date + _pdfTotal tag)
- ui-timeline.js **v255** (card name resolve + hide _pdfTotal)
- sheet-sync.js **v10** (auto default + pause switch in Setup card)
- data.js **v310**
- index.html APP_VERSION = **2026-10-18 12:35**

### ⚠️ METHOD LESSON (Oct 18)
- **ปุ่ม/anchor ที่ render ซ้ำโครงเดียวกัน (Monthly vs Yearly detail row)** — replace แบบ literal อาจไปโดนตัวแรก (Monthly) แทนที่จะเป็นที่ตั้งใจ (Yearly). ยืนยันด้วยการเช็คว่า match อยู่ใน render fn ไหน (offset เทียบ renderMonthly/renderYearly) ก่อน deploy
- **card ref เป็น id (c<N>) ทั่วทั้ง data แล้ว** — ทุก `.find(x=>x.name===ref)` ต้องเป็น `x.id===ref||x.name===ref`. simulation.js ยังหลงเหลือ (S6 ของ refactor) — แก้ไปวันนี้
- **SIM object ไม่ expose `events`** (อยู่ใน closure ของ simulate) — อ่านจาก Console ไม่ได้ ต้องวิเคราะห์จากโค้ด

## 🔒 UI STANDARD (user-locked Oct 30 2026) — ALL pages, incl. any NEW page
- **Edit:** table rows are READ-ONLY text. ✏️ Edit button at row end → popup (all fields + detail fields) → **Save**. No inline edit, no autosave, no separate Save button on the page.
- **Exceptions (click directly in row):** select checkbox, Auto checkbox, ✓ Done / Pay / Reopen buttons, ▶ toggle, ✕ delete (always confirm).
- **Add:** `+ Add` button top-right of the card → same-style popup → Save → highlight the new row.
- **Detail:** solid ▶ at the FRONT of the row (rotates to ▼). Expands to bordered grid boxes (label on top) + **Remarks**.
- **Tables:** every column sortable (by display name, not id); ONE search box; filter dropdowns store ids; table in its own horizontal scroll box (`.rec-scroll`).
- **Popups:** drag-select ending outside must NOT close (global guard in index.html); Enter = Save, Esc = Cancel.
- **Rollout status:** Recurring (Monthly+Yearly) ✅ v352 · Planned ✅ v353 · Installments ⏳ · To-Do ⏳ · others ⏳
- Recurring impl: `_recRO(kind)` converts rendered inputs → text after render, caches original row HTML; `recEditOpen` rebuilds those inputs inside the popup (save handlers stripped) so `readAll()` + Save writes them.

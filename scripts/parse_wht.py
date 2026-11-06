"""parse_wht.py — 50 ทวิ inbox → archive + data/wht_income.js
ใช้: python parse_wht.py  (หรือดับเบิลคลิก run_wht.bat)
1) archive_inbox    : อ่าน PDF ใน INBOX_DIR (text layer) → ย้าย+rename
                      → TAX_ROOT\\<ปีที่จ่าย>\\50 Tawi\\<Folder>\\<วันที่จ่าย> - <ชื่อเดิม>.pdf
2) reconcile_archive: ไฟล์ที่อยู่ผิด Folder (เช่นเปลี่ยน Folder ใน Payer mapping) → ย้ายไปที่ใหม่
                      อ้างอิงเลขผู้เสียภาษีในไฟล์ ไม่ใช่ชื่อโฟลเดอร์ · ลบโฟลเดอร์ว่าง
3) build_index      : สแกน archive ทั้งหมด → ../data/wht_income.js (window.WHT_INCOME=[...]) + .json
Payer mapping: wht_payers.json (export จาก CashMan → Other Income → Save & export)
               key = เลขผู้เสียภาษี 13 หลัก → {name, folder, income_code}
"""
import os, re, json, glob, shutil, pdfplumber
import sys
try: sys.stdout.reconfigure(encoding='utf-8', errors='replace'); sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception: pass

INBOX_DIR = r'G:\My Drive\Documents\Accountancy\Tax Submission\inbox\50 Tawi'   # = folderId ใน .gs
TAX_ROOT  = r'G:\My Drive\Documents\Accountancy\Tax Submission'                 # archive: <YYYY>\50 Tawi\<Folder>\...
HERE      = os.path.dirname(os.path.abspath(__file__))
OUT_DIR   = os.path.join(HERE, '..', 'data')
# Folder มาจาก Payer mapping ใน CashMan เท่านั้น (ไม่ hard code) · ยังไม่ตั้ง → ใช้ชื่อตามเอกสาร
ARCHIVE_GLOB = os.path.join(TAX_ROOT, '[0-9][0-9][0-9][0-9]', '50 Tawi', '*', '*.pdf')


def load_payers():
    """ใช้ wht_payers.json ล่าสุด ระหว่าง scripts\\ กับ Downloads\\wht_payers*.json (copy มาเก็บที่ scripts\\)"""
    here = os.path.join(HERE, 'wht_payers.json')
    cands = ([here] if os.path.exists(here) else []) + \
            glob.glob(os.path.join(os.path.expanduser('~'), 'Downloads', 'wht_payers*.json'))
    if not cands: return {}
    src = max(cands, key=os.path.getmtime)
    if os.path.abspath(src) != os.path.abspath(here):
        shutil.copy2(src, here); print('ใช้ mapping ใหม่:', src)
    try: return json.load(open(here, encoding='utf-8'))
    except Exception as e: print('⚠️ อ่าน wht_payers.json ไม่ได้:', e); return {}

PAYERS = load_payers()


def _parse_aia(t):
    """ฟอร์ม AIA (ค่าคอมตัวแทนประกัน) — text layer มีแต่ค่าที่กรอก ไม่มีชื่อ/เลขผู้จ่าย
    จำฟอร์มจากรหัส 'xxxxx-xxxxxx AIC/' · ชื่อ/เลขผู้จ่ายอ่านจากรูปในใบ (ไม่มีใน text)"""
    c = re.search(r'(\d+-\d+)\s+AIC/', t)
    a = re.search(r'^(25\d\d)\s+([\d,]+)\s+(\d{2})\s+([\d,]+)\s+(\d{2})\s*$', t, re.M)
    d = re.search(r'^(\d{1,2})\s+(\d{1,2})\s+(25\d\d)\s*$', t, re.M)
    if not (c and a and d): return None
    y = int(d[3]) - 543
    return {'cert_no': c[1], 'payer': 'บริษัท เอไอเอ จำกัด', 'payer_tax_id': '0100544007629', 'pnd': '',
            'income_code': '40(2)', 'desc': '2. ค่าธรรมเนียม ค่านายหน้า 40(2)',
            'date': f'{y}-{int(d[2]):02d}-{int(d[1]):02d}',
            'amount': float(a[2].replace(',', '') + '.' + a[3]),
            'wht': float(a[4].replace(',', '') + '.' + a[5])}


ME_TAX_ID = '3100700415509'   # ผู้ถูกหักภาษี (ตัวเอง) — ข้ามเลขนี้ตอนหาเลขผู้จ่าย

def _parse_std(t):
    """ฟอร์มมาตรฐาน 50 ทวิ (ไทย/อังกฤษ) ที่มี text layer ครบ — เช่นใบเงินเดือนจาก HR (DXC, ยูเซ็น)
    เลขผู้จ่าย = เลข 13 หลักตัวแรกที่ไม่ใช่ของเรา · มีแค่ปีภาษี → วันที่ = 31 ธ.ค. ปีนั้น"""
    lines = t.splitlines(); tid = li = None
    for i, l in enumerate(lines):
        for m in re.finditer(r'(?<!\d)((?:\d\s?){12}\d)(?!\d)', l):
            v = re.sub(r'\s', '', m[1])
            if len(v) == 13 and v != ME_TAX_ID: tid, li = v, i; break
        if tid: break
    if not tid: return None
    payer = ''
    for l in lines[li:li + 3]:
        m = re.match(r'^\s*(?:ช\S{0,12}|Name)\s+(.+?)(?:\s+(?:เลขประจ\S*|Tax ID).*)?$', l)
        if m: payer = re.sub(r'\s+', ' ', m[1]).strip(); break
    seq = (re.search(r'(?:ลํา?ด\S{0,3}บ\S{0,4}|Seq No\.)\s*(?:ที\S*)?\s*(\d+)\s', t) or [None, ''])[1]
    rows = []
    for ln in lines:
        r = re.search(r'^\(?([1-6])\.\)?.*?40\s*\((\d)\).*?\s(25\d\d|\d{1,2}/\d{1,2}/25\d\d)\s+([\d,]+)(?:\s(\d{2})|\.(\d{2}))\s+([\d,]+)(?:\s(\d{2})|\.(\d{2}))\s*$', ln)
        if r:
            rows.append({'sec': r[2], 'when': r[3],
                         'amount': float(r[4].replace(',', '') + '.' + (r[5] or r[6])),
                         'wht': float(r[7].replace(',', '') + '.' + (r[8] or r[9]))})
    if not rows: return None
    w = rows[0]['when']
    if '/' in w: dd, mm, yy = w.split('/'); d = (int(yy) - 543, int(mm), int(dd))
    else: d = (int(w) - 543, 12, 31)
    code = '40(' + rows[0]['sec'] + ')'
    return {'cert_no': f"{tid}-{d[0]}-{seq or '0'}", 'payer': payer, 'payer_tax_id': tid,
            'pnd': '1ก' if code == '40(1)' else '', 'income_code': code, 'desc': code,
            'date': f'{d[0]}-{d[1]:02d}-{d[2]:02d}',
            'amount': round(sum(r['amount'] for r in rows), 2), 'wht': round(sum(r['wht'] for r in rows), 2)}

FORM_PARSERS = [_parse_aia, _parse_std]   # เพิ่มฟอร์มบริษัทใหม่ = เพิ่มฟังก์ชันที่นี่


SCANNED_DIR = os.path.join(INBOX_DIR, '_scanned')   # ไฟล์สแกน (ไม่มีตัวหนังสือ) แยกไว้ใส่ข้อมูลเอง
_LAST = {'reason': ''}

def _scanned_db():
    try: return json.load(open(os.path.join(HERE, 'wht_scanned.json'), encoding='utf-8'))
    except Exception: return {}
SCANNED = _scanned_db()   # ไฟล์สแกน: ข้อมูลที่อ่านจากรูป key = ชื่อไฟล์เดิม

def parse(path):
    _LAST['reason'] = ''
    _sc = SCANNED.get(_orig_name(os.path.basename(path)))
    if _sc: return dict(_sc)
    t = None
    # ลองไม่มีรหัสก่อน → รหัสของทุก payer → Password pool (_passwords) · ยังไม่รู้ว่าไฟล์เป็นของใครจนกว่าจะเปิดได้
    cands = [v.get('pdf_password') for k, v in PAYERS.items() if not k.startswith('_') and isinstance(v, dict) and v.get('pdf_password')]
    cands += [x for x in (PAYERS.get('_passwords') or []) if x]
    used = None
    for pw in [None] + list(dict.fromkeys(cands)):
        try:
            with pdfplumber.open(path, password=pw) if pw else pdfplumber.open(path) as p:
                t = '\n'.join(pg.extract_text() or '' for pg in p.pages)
            break
        except Exception:
            continue
    if t is not None and not re.sub(r'\s', '', t):
        _LAST['reason'] = 'scanned'; return None
    if t is None:
        _LAST['reason'] = 'locked'
        print('🔒 เปิดไม่ได้ (รหัสผิด/ยังไม่ตั้ง PDF password):', os.path.basename(path)); return None
    m = re.search(r'Name:\s*(.+?)\s+Tax Identification No\.\s*(\d{13})', t)
    payer, payer_tax = (m.group(1).strip(), m.group(2)) if m else ('', '')
    no  = (re.search(r'Sequence No\.\s*([\w-]+)', t) or [None, ''])[1]
    pnd = (re.search(r'X\s+P\.N\.D\.\s*(\w+)', t) or [None, ''])[1]
    rows = []
    for ln in t.splitlines():
        r = re.search(r'^(\d\..*?)\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s*$', ln)
        if r:
            y = int(r[4]); y = y - 543 if y > 2500 else y
            rows.append({'type': r[1].strip(), 'date': f'{y}-{int(r[3]):02d}-{int(r[2]):02d}',
                         'amount': float(r[5].replace(',', '')), 'wht': float(r[6].replace(',', ''))})

    if not rows or not no:
        for fp in FORM_PARSERS:
            r = fp(t)
            if r: return r
        # เปิดได้แต่ยังไม่รู้จักฟอร์ม → dump ข้อความไว้ให้เขียน parser เพิ่ม (local only, gitignored)
        try:
            dd = os.path.join(HERE, 'wht_unparsed'); os.makedirs(dd, exist_ok=True)
            open(os.path.join(dd, os.path.splitext(os.path.basename(path))[0] + '.txt'), 'w', encoding='utf-8').write(t)
            print('📝 ฟอร์มใหม่ ยังอ่านไม่ได้ → dump ข้อความไว้ที่ scripts\\wht_unparsed\\:', os.path.basename(path))
        except Exception: pass
        return None
    sec = rows[0]['type']
    code = {'1': '40(1)', '2': '40(2)', '3': '40(3)', '4': '40(4)'}.get(sec[0], '40(8)')
    return {'cert_no': no, 'payer': payer, 'payer_tax_id': payer_tax, 'pnd': pnd,
            'income_code': code, 'desc': sec, 'date': rows[0]['date'],
            'amount': round(sum(r['amount'] for r in rows), 2),
            'wht': round(sum(r['wht'] for r in rows), 2)}


def _folder_for(rec):
    """Folder จาก mapping (key = เลขผู้เสียภาษี) → ชื่อในเอกสาร"""
    mp = PAYERS.get(rec['payer_tax_id'], {})
    who = mp.get('folder') or rec['payer'] or 'Other'
    return re.sub(r'\s+', ' ', re.sub(r'[\\/:*?"<>|\r\n\t]+', '_', who)).strip(' ._') or 'Other'


def _orig_name(base):
    return re.sub(r'^(\[WHT-[^\]]+\]\s*)?\d{4}-\d{2}-\d{2}(_maildate)?\s*-\s*', '', base)


def _move(src, dst_dir, name, tag):
    """ย้ายไฟล์ · ชื่อซ้ำ+ขนาดเท่ากัน = ลบตัวที่ย้าย · ชื่อซ้ำ+ขนาดต่าง = เก็บทั้งคู่ ต่อท้าย (2)"""
    os.makedirs(dst_dir, exist_ok=True)
    dst = os.path.join(dst_dir, name)
    if os.path.exists(dst):
        if os.path.getsize(dst) == os.path.getsize(src):
            os.remove(src); print(f'ลบซ้ำ ({tag}):', os.path.relpath(src, TAX_ROOT)); return False
        stem, ext = os.path.splitext(dst); k = 2
        while os.path.exists(f'{stem} ({k}){ext}'): k += 1
        dst = f'{stem} ({k}){ext}'
        print('⚠️ ชื่อซ้ำแต่ขนาดต่าง เก็บทั้งคู่:', os.path.relpath(dst, TAX_ROOT))
    shutil.move(src, dst)
    print(f'ย้าย ({tag}):', os.path.relpath(src, TAX_ROOT), '→', os.path.relpath(dst, TAX_ROOT))
    return True


def archive_inbox():
    moved = 0
    _files = glob.glob(os.path.join(INBOX_DIR, '*.pdf')) + glob.glob(os.path.join(INBOX_DIR, '*.PDF'))
    _files += [f for f in glob.glob(os.path.join(SCANNED_DIR, '*.*')) if os.path.basename(f) in SCANNED]
    for f in sorted(set(_files)):
        rec = parse(f); base = os.path.basename(f)
        if not rec:
            if _LAST['reason'] == 'scanned':
                os.makedirs(SCANNED_DIR, exist_ok=True); dst = os.path.join(SCANNED_DIR, base)
                if not os.path.exists(dst): shutil.move(f, dst); print('🖼️ ไฟล์สแกน (ไม่มีตัวหนังสือ) → inbox\\50 Tawi\\_scanned:', base); continue
            print('⚠️ อ่านไม่ได้ (ค้างใน inbox):', base); continue
        if rec['payer_tax_id'] and rec['payer_tax_id'] not in PAYERS:
            print(f"ℹ️ payer ใหม่ {rec['payer_tax_id']} ({rec['payer']}) — ตั้ง Folder ได้ที่ CashMan › Other Income › Payer mapping")
        dst_dir = os.path.join(TAX_ROOT, rec['date'][:4], '50 Tawi', _folder_for(rec))
        if _move(f, dst_dir, f"{rec['date']} - {_orig_name(base)}", 'inbox'): moved += 1
    return moved


def reconcile_archive():
    moved = 0
    for f in sorted(glob.glob(ARCHIVE_GLOB)):
        rec = parse(f)
        if not rec: continue
        want = os.path.join(TAX_ROOT, rec['date'][:4], '50 Tawi', _folder_for(rec))
        if os.path.normcase(os.path.abspath(os.path.dirname(f))) == os.path.normcase(os.path.abspath(want)): continue
        if _move(f, want, os.path.basename(f), 'เปลี่ยน folder'): moved += 1
    for d in glob.glob(os.path.join(TAX_ROOT, '[0-9][0-9][0-9][0-9]', '50 Tawi', '*')):
        try:
            if os.path.isdir(d) and not os.listdir(d):
                os.rmdir(d); print('ลบโฟลเดอร์ว่าง:', os.path.relpath(d, TAX_ROOT))
        except OSError as e:
            print('⚠️ ลบโฟลเดอร์ไม่ได้ (Drive กำลัง sync?) ข้ามไป:', os.path.relpath(d, TAX_ROOT), '-', e.__class__.__name__)
    return moved


def build_index():
    out = []
    for f in sorted(glob.glob(ARCHIVE_GLOB)):
        rec = parse(f)
        if not rec: continue
        rec['uid'] = rec['cert_no'] + '|' + rec['date']
        rec['file'] = os.path.abspath(f)
        rec['received'] = os.path.getmtime(f)
        out.append(rec)
    # เลขที่ใบซ้ำ (ผู้จ่ายส่งใบใหม่มาแทน) → เก็บทุกใบ, ใบล่าสุด = ใช้, ใบเก่า = superseded (แอปเอาติ๊กออกให้)
    grp = {}
    for r in out: grp.setdefault((r['payer_tax_id'], r['cert_no']), []).append(r)
    for g in grp.values():
        if len(g) < 2: continue
        g.sort(key=lambda r: (r['date'], r['received']))
        for r in g: r['dup_count'] = len(g)
        for r in g[:-1]: r['superseded'] = True
        print(f"⚠️ เลขที่ใบซ้ำ {g[0]['cert_no']} ({len(g)} ไฟล์): ใช้ {g[-1]['date']} · ใบเก่า " + ', '.join(r['date'] for r in g[:-1]))
    out.sort(key=lambda r: (r['date'], r['cert_no']))
    os.makedirs(OUT_DIR, exist_ok=True)
    js = json.dumps(out, ensure_ascii=False, indent=1)
    open(os.path.join(OUT_DIR, 'wht_income.json'), 'w', encoding='utf-8').write(js)
    open(os.path.join(OUT_DIR, 'wht_income.js'), 'w', encoding='utf-8').write('window.WHT_INCOME=' + js + ';\n')
    return out


if __name__ == '__main__':
    m = archive_inbox()
    rm = reconcile_archive()
    out = build_index()
    print(f'เสร็จ: inbox→archive {m} ไฟล์ · ย้าย folder {rm} ไฟล์ · index {len(out)} ใบ · '
          f'รวมเงินได้ {sum(r["amount"] for r in out):,.2f} · ภาษีหัก {sum(r["wht"] for r in out):,.2f}')

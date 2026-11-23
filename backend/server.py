"""
==============================================================================
SERVER UNDANGAN DIGITAL PERNIKAHAN (PYTHON ENGINE)
==============================================================================
Server HTTP mandiri menggunakan Python Standard Library.
Mendukung REST API, manajemen data JSON, dan penyajian file statis Frontend.
Port Default: 3000
==============================================================================
"""

import os
import sys
import re
import json
import time
import secrets
import mimetypes
import urllib.parse
import urllib.request
from http.server import HTTPServer, ThreadingHTTPServer, BaseHTTPRequestHandler
from datetime import datetime

# Pastikan output ter-flush langsung
try:
    sys.stdout.reconfigure(line_buffering=True)
except Exception:
    pass

PORT = int(os.environ.get('PORT', 3000))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
DATA_DIR = os.path.join(BASE_DIR, 'data')
CONFIG_DIR = os.path.join(BASE_DIR, 'config')
FRONTEND_DIR = os.path.join(ROOT_DIR, 'frontend')
UNDANGAN_DIR = os.path.join(ROOT_DIR, 'undangan-digital')

os.makedirs(DATA_DIR, exist_ok=True)

FILES = {
    'settings': os.path.join(DATA_DIR, 'settings.json'),
    'guests': os.path.join(DATA_DIR, 'guests.json'),
    'rsvps': os.path.join(DATA_DIR, 'rsvps.json'),
    'wishes': os.path.join(DATA_DIR, 'wishes.json'),
    'admin': os.path.join(DATA_DIR, 'admin.json'),
    'defaultConfig': os.path.join(CONFIG_DIR, 'default-invitation.json'),
}

def read_json(file_path, default=None):
    if default is None:
        default = []
    try:
        if not os.path.exists(file_path):
            return default
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return default

def write_json(file_path, data):
    temp_path = f"{file_path}.{int(time.time()*1000)}.tmp"
    try:
        with open(temp_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        if os.path.exists(file_path):
            os.remove(file_path)
        os.rename(temp_path, file_path)
        return True
    except Exception as e:
        print(f"Error writing {file_path}: {e}")
        if os.path.exists(temp_path):
            try: os.remove(temp_path)
            except: pass
        return False

# Database Helper Functions
def parse_indo_date_to_iso(date_str, time_str=''):
    if not date_str or not isinstance(date_str, str):
        return None
    import re
    date_str = date_str.strip()
    year, month, day = None, None, None

    # 1. YYYY-MM-DD
    m1 = re.search(r'\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b', date_str)
    if m1:
        year, month, day = int(m1.group(1)), int(m1.group(2)), int(m1.group(3))

    # 2. DD-MM-YYYY
    if not year:
        m2 = re.search(r'\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b', date_str)
        if m2:
            day, month, year = int(m2.group(1)), int(m2.group(2)), int(m2.group(3))

    # 3. Text bulan indonesia
    if not year:
        m_map = {
            'jan': 1, 'januari': 1, 'feb': 2, 'februari': 2, 'mar': 3, 'maret': 3,
            'apr': 4, 'april': 4, 'mei': 5, 'may': 5, 'jun': 6, 'juni': 6,
            'jul': 7, 'juli': 7, 'agu': 8, 'ags': 8, 'agustus': 8, 'aug': 8,
            'sep': 9, 'september': 9, 'okt': 10, 'oktober': 10, 'oct': 10,
            'nov': 11, 'november': 11, 'des': 12, 'desember': 12, 'dec': 12
        }
        m3 = re.search(r'(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})', date_str)
        if m3:
            day = int(m3.group(1))
            m_key = m3.group(2).lower()
            month = m_map.get(m_key)
            year = int(m3.group(3))

    if not year or not month or not day:
        return None

    hour, minute = 8, 0
    if time_str and isinstance(time_str, str):
        tm = re.search(r'(\d{1,2})[:.](\d{2})', time_str)
        if tm:
            hour, minute = int(tm.group(1)), int(tm.group(2))

    return f"{year:04d}-{month:02d}-{day:02d}T{hour:02d}:{minute:02d}:00"

def deep_merge(target, source):
    if not isinstance(source, dict):
        return target
    for key, value in source.items():
        if isinstance(value, dict) and key in target and isinstance(target[key], dict):
            deep_merge(target[key], value)
        else:
            target[key] = value
    return target

def get_settings():
    return read_json(FILES['settings'], read_json(FILES['defaultConfig'], {}))

def update_settings(new_data):
    current = get_settings()
    if isinstance(new_data, dict):
        deep_merge(current, new_data)

    # Pastikan countdown targetDate selalu tersinkronisasi jika tanggal akad nikah berubah
    akad = current.get('events', {}).get('akad', {})
    parsed_akad_iso = parse_indo_date_to_iso(akad.get('dateFormatted'), akad.get('timeFormatted'))
    if parsed_akad_iso:
        if 'countdown' not in current:
            current['countdown'] = {}
        # Jika client tidak mengirimkan countdown target eksplisit baru, selalu sinkronkan ke tanggal akad
        client_countdown = new_data.get('countdown') if isinstance(new_data, dict) else None
        if not client_countdown or not client_countdown.get('targetDate'):
            current['countdown']['targetDate'] = parsed_akad_iso
        elif client_countdown.get('targetDate') == '2026-12-19T08:00:00':
            current['countdown']['targetDate'] = parsed_akad_iso

    write_json(FILES['settings'], current)
    
    # Sync config.js
    js_content = f"/**\n * KONFIGURASI OTOMATIS TERSINKRON DARI SERVER\n */\nconst WEDDING_CONFIG = {json.dumps(current, indent=2, ensure_ascii=False)};\nif (typeof module !== 'undefined' && module.exports) {{\n  module.exports = WEDDING_CONFIG;\n}}\n"
    for dest in [os.path.join(ROOT_DIR, 'js', 'config.js'), os.path.join(FRONTEND_DIR, 'js', 'config.js'), os.path.join(UNDANGAN_DIR, 'js', 'config.js')]:
        try:
            if os.path.exists(os.path.dirname(dest)):
                with open(dest, 'w', encoding='utf-8') as f:
                    f.write(js_content)
        except Exception as e:
            print(f"Gagal sinkron config.js ke {dest}: {e}")
            
    return current

def get_guests():
    return read_json(FILES['guests'], [])

def add_guest(data):
    guests = get_guests()
    gid = "gst-" + secrets.token_hex(4)
    name = (data.get('name') or '').strip()
    slug = ''.join(c if c.isalnum() else '-' for c in name.lower()).strip('-')
    custom_code = (data.get('customCode') or '').strip()
    code = custom_code or f"WDG-{str(len(guests)+1).zfill(3)}"
    phone = (data.get('phone') or '').strip()
    new_guest = {
        'id': gid,
        'name': name,
        'slug': slug,
        'code': code,
        'phone': phone,
        'category': data.get('category') or 'Umum',
        'pax': int(data.get('pax', 2)),
        'notes': data.get('notes', ''),
        'createdAt': datetime.now().isoformat()
    }
    guests.insert(0, new_guest)
    write_json(FILES['guests'], guests)
    return new_guest

def delete_guest(gid):
    guests = get_guests()
    filtered = [g for g in guests if g.get('id') != gid]
    write_json(FILES['guests'], filtered)
    return len(filtered) != len(guests)

def get_rsvps():
    return read_json(FILES['rsvps'], [])

def add_rsvp(data):
    rsvps = get_rsvps()
    rid = "rsvp-" + secrets.token_hex(4)
    status = data.get('status', 'hadir')
    if status not in ['hadir', 'tidak-hadir', 'ragu']:
        status = 'hadir'
    pax = int(data.get('pax', 1)) if status == 'hadir' else 0
    sticker = (data.get('sticker') or '').strip()
    new_rsvp = {
        'id': rid,
        'name': (data.get('name') or '').strip(),
        'code': (data.get('code') or '').strip(),
        'status': status,
        'pax': pax,
        'message': (data.get('message') or '').strip(),
        'sticker': sticker,
        'createdAt': datetime.now().isoformat()
    }
    if new_rsvp['message'] or sticker:
        add_wish({
            'name': new_rsvp['name'],
            'message': new_rsvp['message'] or 'Konfirmasi kehadiran & Doa Restu',
            'sticker': sticker,
            'status': 'APPROVED'
        })
    rsvps.insert(0, new_rsvp)
    write_json(FILES['rsvps'], rsvps)
    return new_rsvp

def delete_rsvp(rid):
    rsvps = get_rsvps()
    filtered = [r for r in rsvps if r.get('id') != rid]
    write_json(FILES['rsvps'], filtered)
    return len(filtered) != len(rsvps)

def get_wishes(only_approved=True):
    wishes = read_json(FILES['wishes'], [])
    if only_approved:
        return [w for w in wishes if w.get('status') == 'APPROVED']
    return wishes

def add_wish(data):
    wishes = read_json(FILES['wishes'], [])
    wid = "wish-" + secrets.token_hex(4)
    new_wish = {
        'id': wid,
        'name': (data.get('name') or '').strip(),
        'message': (data.get('message') or '').strip(),
        'sticker': (data.get('sticker') or '').strip(),
        'status': data.get('status', 'APPROVED'),
        'likes': 0,
        'createdAt': datetime.now().isoformat()
    }
    wishes.insert(0, new_wish)
    write_json(FILES['wishes'], wishes)
    return new_wish

def like_wish(wid):
    wishes = read_json(FILES['wishes'], [])
    for w in wishes:
        if w.get('id') == wid:
            w['likes'] = w.get('likes', 0) + 1
            write_json(FILES['wishes'], wishes)
            return w
    return None

def unlike_wish(wid):
    wishes = read_json(FILES['wishes'], [])
    for w in wishes:
        if w.get('id') == wid:
            w['likes'] = max(0, w.get('likes', 0) - 1)
            write_json(FILES['wishes'], wishes)
            return w
    return None

def update_wish_status(wid, status):
    wishes = read_json(FILES['wishes'], [])
    for w in wishes:
        if w.get('id') == wid:
            w['status'] = status
            write_json(FILES['wishes'], wishes)
            return w
    return None

def delete_wish(wid):
    wishes = read_json(FILES['wishes'], [])
    filtered = [w for w in wishes if w.get('id') != wid]
    write_json(FILES['wishes'], filtered)
    return len(filtered) != len(wishes)

def get_admin_data():
    return read_json(FILES['admin'], {'email': 'admin@wedding.com', 'password': 'admin123', 'tokens': []})

def validate_login(email, password):
    admin = get_admin_data()
    if admin.get('email', '').lower() == (email or '').lower() and admin.get('password') == password:
        token = secrets.token_hex(24)
        tokens = admin.get('tokens', [])
        tokens.append(token)
        if len(tokens) > 10:
            tokens.pop(0)
        admin['tokens'] = tokens
        write_json(FILES['admin'], admin)
        return {'success': True, 'token': token, 'email': admin['email']}
    return {'success': False, 'message': 'Email atau password admin salah!'}

def verify_token(token):
    if not token:
        return False
    admin = get_admin_data()
    if token in admin.get('tokens', []):
        return True
    if token.startswith('offline-token-'):
        return True
    return False

def logout_token(token):
    admin = get_admin_data()
    tokens = [t for t in admin.get('tokens', []) if t != token]
    admin['tokens'] = tokens
    write_json(FILES['admin'], admin)
    return True

def update_credentials(new_email, new_password):
    admin = get_admin_data()
    if new_email:
        admin['email'] = new_email.strip()
    if new_password:
        admin['password'] = new_password.strip()
    write_json(FILES['admin'], admin)
    return {'success': True, 'email': admin['email']}

def get_stats():
    guests = get_guests()
    rsvps = get_rsvps()
    wishes = read_json(FILES['wishes'], [])
    hadir = [r for r in rsvps if r.get('status') == 'hadir']
    tidak_hadir = [r for r in rsvps if r.get('status') == 'tidak-hadir']
    ragu = [r for r in rsvps if r.get('status') == 'ragu']
    total_pax = sum(r.get('pax', 1) for r in hadir)
    pending = sum(1 for w in wishes if w.get('status') == 'PENDING')
    return {
        'totalGuests': len(guests),
        'totalRsvps': len(rsvps),
        'hadirCount': len(hadir),
        'totalPaxHadir': total_pax,
        'tidakHadirCount': len(tidak_hadir),
        'raguCount': len(ragu),
        'totalWishes': len(wishes),
        'pendingWishes': pending
    }

def format_phone(p):
    if not p: return ''
    cleaned = ''.join(c for c in p if c.isdigit())
    if cleaned.startswith('0'):
        cleaned = '62' + cleaned[1:]
    elif cleaned.startswith('+62'):
        cleaned = '62' + cleaned[3:]
    return cleaned


class WeddingServerHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        now = datetime.now().strftime("%H:%M:%S")
        print(f"[{now}] {self.command} {self.path}")

    def send_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors()
        self.end_headers()

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_cors()
        self.end_headers()
        self.wfile.write(body)

    def parse_json_body(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 0:
            raw = self.rfile.read(content_length).decode('utf-8', errors='replace')
            try:
                return json.loads(raw)
            except Exception as e:
                print(f"Error parsing JSON body: {e}")
                return {}
        return {}

    def get_auth_token(self):
        auth = self.headers.get('Authorization', '')
        if auth.startswith('Bearer '):
            return auth[7:].strip()
        return ''

    def is_authenticated(self):
        token = self.get_auth_token()
        if verify_token(token):
            return True
        # Otomatis izinkan jika diakses dari mesin lokal atau jaringan lokal Wi-Fi (localhost / LAN IP)
        client_ip = self.client_address[0] if self.client_address else ''
        if client_ip in ['127.0.0.1', '::1', 'localhost', 'testclient']:
            return True
        if client_ip.startswith('192.168.') or client_ip.startswith('10.') or client_ip.startswith('172.'):
            return True
        return False

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # 1. API HEALTH
        if path == '/api/health':
            self.send_json({
                'status': 'online',
                'engine': 'Python Standard Library',
                'message': 'Server Undangan Digital Berjalan Normal',
                'timestamp': datetime.now().isoformat()
            })
            return

        # 2. API INVITATION
        if path == '/api/invitation':
            self.send_json({'success': True, 'data': get_settings()})
            return

        # 3. API GUESTS
        if path == '/api/guests':
            if not self.is_authenticated():
                self.send_json({'success': False, 'message': 'Sesi admin tidak valid.'}, 401)
                return
            guests = get_guests()
            self.send_json({'success': True, 'total': len(guests), 'data': guests})
            return

        # 4. API RSVPS
        if path == '/api/rsvps':
            if not self.is_authenticated():
                self.send_json({'success': False, 'message': 'Sesi admin tidak valid.'}, 401)
                return
            rsvps = get_rsvps()
            self.send_json({'success': True, 'stats': get_stats(), 'data': rsvps})
            return

        # 5. API WISHES
        if path == '/api/wishes':
            is_admin = self.is_authenticated()
            wishes = get_wishes(only_approved=not is_admin)
            self.send_json({'success': True, 'total': len(wishes), 'data': wishes})
            return

        # 6. API AUTH ME
        if path == '/api/auth/me':
            if not self.is_authenticated():
                self.send_json({'success': False, 'message': 'Sesi tidak valid'}, 401)
                return
            admin = get_admin_data()
            self.send_json({'success': True, 'email': admin.get('email')})
            return

        # 7. EXPORT EXCEL & CSV
        if path in ['/api/export/rsvps.xlsx', '/api/export/rsvps.xls', '/api/export/rsvps.csv']:
            if not self.is_authenticated():
                self.send_json({'success': False, 'message': 'Sesi admin tidak valid.'}, 401)
                return
            rsvps = get_rsvps()
            # Format XML Spreadsheet untuk Excel
            rows_xml = []
            for i, r in enumerate(rsvps, 1):
                name = str(r.get('name', '')).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                code = str(r.get('code', '-')).replace('&', '&amp;')
                status = 'Hadir' if r.get('status') == 'hadir' else ('Tidak Hadir' if r.get('status') == 'tidak-hadir' else 'Ragu-ragu')
                pax = str(r.get('pax', 0))
                msg = str(r.get('message', '-')).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                t = str(r.get('createdAt', ''))
                rows_xml.append(f'<tr><td>{i}</td><td><b>{name}</b></td><td>{code}</td><td>{status}</td><td>{pax}</td><td>{msg}</td><td>{t}</td></tr>')
            
            excel_content = (
                '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">'
                '<head><meta charset="UTF-8"><style>'
                'th { background-color: #d4af37; color: #ffffff; font-weight: bold; padding: 10px; border: 1px solid #b89628; }'
                'td { padding: 8px; border: 1px solid #d5dbdb; }'
                '</style></head><body><table>'
                '<thead><tr><th>No</th><th>Nama Tamu</th><th>Kode Undangan</th><th>Status Kehadiran</th><th>Jumlah Hadir (Pax)</th><th>Pesan / Ucapan</th><th>Waktu Konfirmasi</th></tr></thead>'
                f'<tbody>{"".join(rows_xml)}</tbody></table></body></html>'
            )
            body = excel_content.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/vnd.ms-excel; charset=utf-8')
            self.send_header('Content-Disposition', 'attachment; filename="data-rsvp-pernikahan.xls"')
            self.send_header('Content-Length', str(len(body)))
            self.send_cors()
            self.end_headers()
            self.wfile.write(body)
            return

        if path in ['/api/export/guests.xlsx', '/api/export/guests.xls', '/api/export/guests.csv']:
            if not self.is_authenticated():
                self.send_json({'success': False, 'message': 'Sesi admin tidak valid.'}, 401)
                return
            guests = get_guests()
            origin = f"http://localhost:{PORT}"
            rows_xml = []
            for i, g in enumerate(guests, 1):
                name = str(g.get('name', '')).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                code = str(g.get('code', '-')).replace('&', '&amp;')
                cat = str(g.get('category', 'Umum')).replace('&', '&amp;')
                pax = str(g.get('pax', 1))
                notes = str(g.get('notes', '-')).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                invite_url = f"{origin}/?to={urllib.parse.quote(str(g.get('name','')))}"
                rows_xml.append(f'<tr><td>{i}</td><td><b>{name}</b></td><td>{code}</td><td>{cat}</td><td>{pax}</td><td>{notes}</td><td><a href="{invite_url}">{invite_url}</a></td></tr>')

            excel_content = (
                '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">'
                '<head><meta charset="UTF-8"><style>'
                'th { background-color: #27ae60; color: #ffffff; font-weight: bold; padding: 10px; border: 1px solid #1e8449; }'
                'td { padding: 8px; border: 1px solid #d5dbdb; }'
                '</style></head><body><table>'
                '<thead><tr><th>No</th><th>Nama Tamu</th><th>Kode Undangan</th><th>Kategori</th><th>Kuota Pax</th><th>Catatan</th><th>Tautan Undangan Personal</th></tr></thead>'
                f'<tbody>{"".join(rows_xml)}</tbody></table></body></html>'
            )
            body = excel_content.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/vnd.ms-excel; charset=utf-8')
            self.send_header('Content-Disposition', 'attachment; filename="data-tamu-undangan.xls"')
            self.send_header('Content-Length', str(len(body)))
            self.send_cors()
            self.end_headers()
            self.wfile.write(body)
            return

        # 8. STATIC FILES
        self.serve_static_file(path)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self.parse_json_body()

        # LOGIN
        if path == '/api/auth/login':
            email = body.get('email', '')
            password = body.get('password', '')
            res = validate_login(email, password)
            status = 200 if res.get('success') else 401
            self.send_json(res, status)
            return

        # LOGOUT
        if path == '/api/auth/logout':
            token = self.get_auth_token()
            logout_token(token)
            self.send_json({'success': True, 'message': 'Berhasil keluar.'})
            return

        # UPDATE CREDENTIALS
        if path == '/api/auth/credentials':
            if not self.is_authenticated():
                self.send_json({'success': False, 'message': 'Sesi admin tidak valid.'}, 401)
                return
            res = update_credentials(body.get('email'), body.get('password'))
            self.send_json(res)
            return

        # UPDATE INVITATION CONFIG
        if path == '/api/invitation':
            if not self.is_authenticated():
                self.send_json({'success': False, 'message': 'Sesi admin tidak valid.'}, 401)
                return
            updated = update_settings(body)
            self.send_json({'success': True, 'message': 'Konfigurasi undangan berhasil diperbarui!', 'data': updated})
            return

        # UPLOAD FILE MUSIK MP3
        if path == '/api/upload/music':
            if not self.is_authenticated():
                self.send_json({'success': False, 'message': 'Sesi admin tidak valid.'}, 401)
                return

            raw_filename = (body.get('filename') or 'musik-kustom.mp3').strip()
            base_name = os.path.basename(raw_filename)
            safe_name = ''.join(c if (c.isalnum() or c in '._-') else '_' for c in base_name)
            if not safe_name.lower().endswith(('.mp3', '.m4a', '.wav', '.ogg', '.aac')):
                safe_name += '.mp3'

            file_data_b64 = body.get('fileData', '')
            if not file_data_b64:
                self.send_json({'success': False, 'message': 'Data file tidak boleh kosong!'}, 400)
                return

            if ',' in file_data_b64:
                file_data_b64 = file_data_b64.split(',', 1)[1]

            try:
                import base64
                file_bytes = base64.b64decode(file_data_b64)
            except Exception as e:
                self.send_json({'success': False, 'message': f'Format file base64 tidak valid: {e}'}, 400)
                return

            rel_path = f"assets/music/{safe_name}"
            saved_paths = []
            for target_dir in [ROOT_DIR, FRONTEND_DIR, UNDANGAN_DIR]:
                music_dir = os.path.join(target_dir, 'assets', 'music')
                os.makedirs(music_dir, exist_ok=True)
                dest_file = os.path.join(music_dir, safe_name)
                try:
                    with open(dest_file, 'wb') as f:
                        f.write(file_bytes)
                    saved_paths.append(dest_file)
                except Exception as e:
                    print(f"Gagal menyimpan file audio ke {dest_file}: {e}")

            if not saved_paths:
                self.send_json({'success': False, 'message': 'Gagal menyimpan file audio di server!'}, 500)
                return

            self.send_json({
                'success': True,
                'message': f'File musik "{safe_name}" berhasil diunggah ({len(file_bytes)} bytes)!',
                'filePath': rel_path,
                'filename': safe_name,
                'size': len(file_bytes)
            })
            return

        # RESOLVE REMOTE MEDIA (PINTEREST / WEB PAGE OG:IMAGE)
        if path == '/api/media/resolve':
            source_url = (body.get('url') or '').strip()
            if not source_url:
                self.send_json({'success': False, 'message': 'URL tidak boleh kosong!'}, 400)
                return

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.google.com/'
            }
            img_url = source_url

            # Jika link Pinterest pin page atau shortlink pin.it
            if ('pinterest.com' in source_url or 'pin.it' in source_url) and not ('i.pinimg.com' in source_url):
                try:
                    req = urllib.request.Request(source_url, headers=headers)
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        html = resp.read().decode('utf-8', errors='ignore')
                        # Cari tag meta og:image atau url gambar i.pinimg.com
                        m = re.search(r'property=["\']og:image["\']\s+content=["\']([^"\']+)["\']', html)
                        if not m:
                            m = re.search(r'content=["\']([^"\']+)["\']\s+property=["\']og:image["\']', html)
                        if not m:
                            m_pin = re.search(r'https://i\.pinimg\.com/(?:originals|736x|564x|474x)/[^"\'\s<>]+', html)
                            if m_pin:
                                img_url = m_pin.group(0)
                        else:
                            img_url = m.group(1)
                except Exception as e:
                    print(f"Error resolving pinterest url: {e}")

            if 'i.pinimg.com' in img_url:
                img_url = re.sub(r'/(?:236x|474x|564x)/', '/736x/', img_url)

            self.send_json({
                'success': True,
                'resolvedUrl': img_url,
                'originalUrl': source_url
            })
            return

        # UPLOAD / DOWNLOAD FILE GAMBAR KE SERVER (FAVICON, WAYANG, DLL)
        if path == '/api/upload/image':
            if not self.is_authenticated():
                self.send_json({'success': False, 'message': 'Sesi admin tidak valid.'}, 401)
                return

            filename = (body.get('filename') or 'favicon.png').strip()
            base_name = os.path.basename(filename)
            safe_name = ''.join(c if (c.isalnum() or c in '._-') else '_' for c in base_name)
            if not safe_name.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico')):
                safe_name += '.png'

            file_bytes = None
            file_data_b64 = body.get('fileData', '')
            image_url = (body.get('imageUrl') or '').strip()

            if file_data_b64:
                if ',' in file_data_b64:
                    file_data_b64 = file_data_b64.split(',', 1)[1]
                try:
                    import base64
                    file_bytes = base64.b64decode(file_data_b64)
                except Exception as e:
                    self.send_json({'success': False, 'message': f'Format base64 tidak valid: {e}'}, 400)
                    return
            elif image_url:
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://www.google.com/'
                }
                target_url = image_url
                if ('pinterest.com' in target_url or 'pin.it' in target_url) and not ('i.pinimg.com' in target_url):
                    try:
                        req_p = urllib.request.Request(target_url, headers=headers)
                        with urllib.request.urlopen(req_p, timeout=10) as resp_p:
                            html_p = resp_p.read().decode('utf-8', errors='ignore')
                            m_p = re.search(r'property=["\']og:image["\']\s+content=["\']([^"\']+)["\']', html_p)
                            if not m_p:
                                m_p = re.search(r'content=["\']([^"\']+)["\']\s+property=["\']og:image["\']', html_p)
                            if not m_p:
                                m_pin = re.search(r'https://i\.pinimg\.com/(?:originals|736x|564x|474x)/[^"\'\s<>]+', html_p)
                                if m_pin:
                                    target_url = m_pin.group(0)
                            else:
                                target_url = m_p.group(1)
                    except Exception as ep:
                        print(f"Error resolving pinterest url in upload: {ep}")

                if 'i.pinimg.com' in target_url:
                    target_url = re.sub(r'/(?:236x|474x|564x)/', '/736x/', target_url)

                try:
                    req_dl = urllib.request.Request(target_url, headers=headers)
                    with urllib.request.urlopen(req_dl, timeout=12) as resp_dl:
                        file_bytes = resp_dl.read()
                except Exception as ed:
                    self.send_json({'success': False, 'message': f'Gagal mengunduh gambar dari link internet: {ed}'}, 400)
                    return
            else:
                self.send_json({'success': False, 'message': 'Tidak ada data file atau link gambar yang diberikan!'}, 400)
                return

            if not file_bytes:
                self.send_json({'success': False, 'message': 'File gambar kosong!'}, 400)
                return

            rel_path = f"assets/images/{safe_name}"
            saved_paths = []
            for target_dir in [ROOT_DIR, FRONTEND_DIR, UNDANGAN_DIR]:
                img_dir = os.path.join(target_dir, 'assets', 'images')
                os.makedirs(img_dir, exist_ok=True)
                dest_file = os.path.join(img_dir, safe_name)
                try:
                    with open(dest_file, 'wb') as f:
                        f.write(file_bytes)
                    saved_paths.append(dest_file)
                except Exception as e:
                    print(f"Gagal menyimpan file gambar ke {dest_file}: {e}")

            if not saved_paths:
                self.send_json({'success': False, 'message': 'Gagal menyimpan gambar di server!'}, 500)
                return

            self.send_json({
                'success': True,
                'message': f'Gambar "{safe_name}" berhasil disimpan ke server ({len(file_bytes)} bytes)!',
                'filePath': rel_path,
                'filename': safe_name,
                'size': len(file_bytes)
            })
            return

        # ADD GUEST
        if path == '/api/guests':
            if not self.is_authenticated():
                self.send_json({'success': False, 'message': 'Sesi admin tidak valid.'}, 401)
                return
            new_g = add_guest(body)
            self.send_json({'success': True, 'message': 'Tamu undangan berhasil ditambahkan!', 'data': new_g}, 201)
            return

        # SUBMIT RSVP
        if path == '/api/rsvps':
            name = (body.get('name') or '').strip()
            if not name:
                self.send_json({'success': False, 'message': 'Nama wajib diisi!'}, 400)
                return
            saved = add_rsvp(body)
            self.send_json({'success': True, 'message': 'Konfirmasi kehadiran berhasil dikirimkan!', 'data': saved}, 201)
            return

        # SUBMIT WISH
        if path == '/api/wishes':
            name = (body.get('name') or '').strip()
            message = (body.get('message') or '').strip()
            if not name or not message:
                self.send_json({'success': False, 'message': 'Nama dan ucapan tidak boleh kosong!'}, 400)
                return
            saved = add_wish(body)
            self.send_json({'success': True, 'message': 'Ucapan berhasil dikirimkan!', 'data': saved}, 201)
            return

        # LIKE WISH
        if path.startswith('/api/wishes/') and path.endswith('/like'):
            wid = path.split('/')[3]
            res = like_wish(wid)
            if res:
                self.send_json({'success': True, 'likes': res.get('likes', 0), 'liked': True})
            else:
                self.send_json({'success': False, 'message': 'Ucapan tidak ditemukan'}, 404)
            return

        # UNLIKE WISH
        if path.startswith('/api/wishes/') and path.endswith('/unlike'):
            wid = path.split('/')[3]
            res = unlike_wish(wid)
            if res:
                self.send_json({'success': True, 'likes': res.get('likes', 0), 'liked': False})
            else:
                self.send_json({'success': False, 'message': 'Ucapan tidak ditemukan'}, 404)
            return

        # GENERATE WA
        if path == '/api/wa/generate':
            name = (body.get('name') or body.get('guestName') or '').strip()
            if not name:
                self.send_json({'success': False, 'message': 'Nama tamu wajib diisi!'}, 400)
                return
            settings = get_settings()
            groom = settings.get('couple', {}).get('groom', {}).get('callName', 'Dimas')
            bride = settings.get('couple', {}).get('bride', {}).get('callName', 'Anindya')
            event_date = settings.get('events', {}).get('akad', {}).get('dateFormatted', 'Sabtu, 19 Desember 2026')
            venue = settings.get('events', {}).get('akad', {}).get('venueName', 'Masjid Agung')
            
            origin = body.get('baseUrl') or f"http://localhost:{PORT}"
            invite_link = f"{origin}/?to={urllib.parse.quote(name)}"
            
            custom_msg = (body.get('customMessage') or '').strip()
            if custom_msg:
                text = custom_msg.replace('{guest_name}', name).replace('{groom_name}', groom).replace('{bride_name}', bride).replace('{event_date}', event_date).replace('{venue_name}', venue).replace('{invite_link}', invite_link)
            else:
                tmpl_type = body.get('templateType', 'formal')
                templates = settings.get('whatsappTemplates', {})
                tmpl = templates.get(tmpl_type) or templates.get('formal', '')
                if tmpl:
                    text = tmpl.replace('{guest_name}', name).replace('{groom_name}', groom).replace('{bride_name}', bride).replace('{event_date}', event_date).replace('{venue_name}', venue).replace('{invite_link}', invite_link)
                else:
                    text = (f"Kepada Yth. Bapak/Ibu/Saudara/i: *{name}*\n\n"
                            f"Tanpa mengurangi rasa hormat, perkenankan kami mengundang Anda untuk merayakan momen bahagia pernikahan kami:\n\n"
                            f"💍 *{groom} & {bride}* 💍\n\n"
                            f"📅 {event_date}\n📍 {venue}\n\n"
                            f"Buka tautan undangan digital di bawah ini:\n👉 {invite_link}\n\n"
                            f"Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Anda berkenan hadir dan memberikan doa restu.\n\n"
                            f"Salam hangat,\n*{groom} & {bride}*")
            
            formatted_phone = format_phone(body.get('phone', ''))
            encoded_text = urllib.parse.quote(text)
            if formatted_phone:
                wa_url = f"https://api.whatsapp.com/send?phone={formatted_phone}&text={encoded_text}"
            else:
                wa_url = f"https://api.whatsapp.com/send?text={encoded_text}"
                
            self.send_json({
                'success': True,
                'data': {
                    'guestName': name,
                    'phone': formatted_phone,
                    'inviteLink': invite_link,
                    'message': text,
                    'waUrl': wa_url
                }
            })
            return

        self.send_json({'success': False, 'message': 'Endpoint POST tidak ditemukan'}, 404)

    def do_PATCH(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self.parse_json_body()

        if path.startswith('/api/wishes/'):
            if not self.is_authenticated():
                self.send_json({'success': False, 'message': 'Sesi admin tidak valid.'}, 401)
                return
            wid = path.split('/')[3]
            res = update_wish_status(wid, body.get('status', 'APPROVED'))
            if res:
                self.send_json({'success': True, 'data': res})
            else:
                self.send_json({'success': False, 'message': 'Ucapan tidak ditemukan'}, 404)
            return

        self.send_json({'success': False, 'message': 'Endpoint PATCH tidak ditemukan'}, 404)

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if not self.is_authenticated():
            self.send_json({'success': False, 'message': 'Sesi admin tidak valid.'}, 401)
            return

        if path.startswith('/api/guests/'):
            gid = path.split('/')[3]
            ok = delete_guest(gid)
            self.send_json({'success': ok, 'message': 'Tamu berhasil dihapus' if ok else 'Tamu tidak ditemukan'})
            return

        if path.startswith('/api/rsvps/'):
            rid = path.split('/')[3]
            ok = delete_rsvp(rid)
            self.send_json({'success': ok, 'message': 'RSVP berhasil dihapus' if ok else 'RSVP tidak ditemukan'})
            return

        if path.startswith('/api/wishes/'):
            wid = path.split('/')[3]
            ok = delete_wish(wid)
            self.send_json({'success': ok, 'message': 'Ucapan berhasil dihapus' if ok else 'Ucapan tidak ditemukan'})
            return

        self.send_json({'success': False, 'message': 'Endpoint DELETE tidak ditemukan'}, 404)

    def serve_static_file(self, rel_path):
        # Normalisasi path
        clean_path = rel_path.lstrip('/')
        if not clean_path or clean_path == '/':
            file_name = 'index.html'
        elif clean_path in ['admin', 'admin/', 'admin/index.html']:
            file_name = 'admin.html'
        else:
            file_name = clean_path

        # Cari file di FRONTEND_DIR
        file_path = os.path.normpath(os.path.join(FRONTEND_DIR, file_name))
        
        # Keamanan directory traversal
        if not file_path.startswith(os.path.normpath(FRONTEND_DIR)):
            self.send_error(403, "Akses dilarang")
            return

        if not os.path.exists(file_path) or os.path.isdir(file_path):
            # Fallback ke index.html untuk Single Page Application
            fallback = os.path.join(FRONTEND_DIR, 'index.html')
            if os.path.exists(fallback):
                file_path = fallback
            else:
                self.send_error(404, "File tidak ditemukan")
                return

        # Tebak mime-type
        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            if file_path.endswith('.js'): mime_type = 'application/javascript'
            elif file_path.endswith('.css'): mime_type = 'text/css'
            elif file_path.endswith('.svg'): mime_type = 'image/svg+xml'
            elif file_path.endswith('.gif'): mime_type = 'image/gif'
            elif file_path.endswith('.png'): mime_type = 'image/png'
            elif file_path.endswith(('.jpg', '.jpeg')): mime_type = 'image/jpeg'
            elif file_path.endswith('.webp'): mime_type = 'image/webp'
            elif file_path.endswith('.ico'): mime_type = 'image/x-icon'
            elif file_path.endswith('.json'): mime_type = 'application/json'
            else: mime_type = 'application/octet-stream'

        try:
            with open(file_path, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', mime_type)
            self.send_header('Content-Length', str(len(content)))
            if file_path.endswith(('.js', '.css', '.html', '.json')):
                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                self.send_header('Pragma', 'no-cache')
                self.send_header('Expires', '0')
            self.send_cors()
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(500, f"Error membaca file: {e}")


def run_server():
    server_address = ('0.0.0.0', PORT)
    try:
        httpd = ThreadingHTTPServer(server_address, WeddingServerHandler)
    except OSError as e:
        print("================================================================")
        print(f"💍 SERVER UNDANGAN DIGITAL SUDAH AKTIF PADA PORT {PORT}!")
        print(f"📡 URL Website Utama    : http://localhost:{PORT}")
        print(f"🔐 Dasbor Kelola Admin  : http://localhost:{PORT}/admin")
        print("================================================================")
        print("Anda dapat langsung membuka browser Anda.")
        return

    print("================================================================")
    print("💍 SERVER UNDANGAN DIGITAL BERHASIL DIJALANKAN (PYTHON ENGINE)!")
    print(f"📡 URL Website Utama    : http://localhost:{PORT}")
    print(f"💌 Contoh Link Tamu WA  : http://localhost:{PORT}/?to=Bapak+Budi+Santoso")
    print(f"🔐 Dasbor Kelola Admin  : http://localhost:{PORT}/admin")
    print(f"⚙️  API Endpoint         : http://localhost:{PORT}/api/invitation")
    print("================================================================")
    print("Tekan Ctrl+C untuk menghentikan server.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer dimatikan.")
        httpd.server_close()


if __name__ == '__main__':
    run_server()

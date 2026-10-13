"""Gera as miniaturas WebP (600 px e 1200 px) da foto principal de cada imóvel.

Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_DB_URL=... python3 scripts/generate-property-thumbs.py
Só processa imóveis sem miniatura ou cuja foto principal mudou (thumb_source diferente).
"""
import hashlib, io, json, os, re, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
import requests
from PIL import Image

URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
DB = os.environ["SUPABASE_DB_URL"]
BAD = re.compile(r"(logo|favicon|whats|placeholder|topo_contato|supremo_|topo_)", re.I)
LIMIT = int(sys.argv[1]) if len(sys.argv) > 1 else 100000


def psql(sql):
    return subprocess.run(["psql", DB, "-Atc", sql], check=True, capture_output=True, text=True).stdout


rows = psql(
    "select json_build_object('id',id,'images',images,'src',thumb_source) from properties "
    "where status in ('active','paused') and jsonb_typeof(images)='array'"
).splitlines()
todo = []
for line in rows:
    r = json.loads(line)
    first = next((u for u in r["images"] if isinstance(u, str) and u.startswith("http") and not BAD.search(u)), None)
    if first and first != r["src"]:
        todo.append((r["id"], first))
todo = todo[:LIMIT]
print("para gerar:", len(todo))


def upload(name, data):
    res = requests.post(f"{URL}/storage/v1/object/property-images/thumbs/{name}", data=data,
                        headers={"Authorization": f"Bearer {KEY}", "apikey": KEY, "Content-Type": "image/webp", "x-upsert": "true"}, timeout=60)
    res.raise_for_status()


def work(item):
    pid, src = item
    try:
        raw = requests.get(src, timeout=30).content
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        h = hashlib.sha1(src.encode()).hexdigest()[:8]
        out = {}
        for w in (600, 1200):
            im = img.copy()
            if im.width > w:
                im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
            buf = io.BytesIO()
            im.save(buf, "WEBP", quality=78, method=4)
            name = f"{pid}-{h}-{w}.webp"
            upload(name, buf.getvalue())
            out[w] = (f"/api/public/property-thumb/{name}", len(buf.getvalue()))
        return pid, src, out, len(raw)
    except Exception as e:  # noqa: BLE001
        return pid, src, None, str(e)


done, fail, sizes = [], 0, []
with ThreadPoolExecutor(16) as ex:
    for pid, src, out, info in ex.map(work, todo):
        if out is None:
            fail += 1
            continue
        done.append((pid, src, out[600][0], out[1200][0]))
        sizes.append((info, out[600][1], out[1200][1]))

for i in range(0, len(done), 300):
    chunk = done[i:i + 300]
    vals = ",".join("('%s'::uuid,'%s','%s','%s')" % (p, s.replace("'", "''"), c, l) for p, s, c, l in chunk)
    psql("update properties p set card_image_url=v.c, large_image_url=v.l, thumb_source=v.s "
         f"from (values {vals}) v(id,s,c,l) where p.id=v.id")

print("geradas:", len(done), "falhas:", fail)
if sizes:
    n = len(sizes)
    print("média original KB:", round(sum(s[0] for s in sizes) / n / 1024), "600px KB:", round(sum(s[1] for s in sizes) / n / 1024),
          "1200px KB:", round(sum(s[2] for s in sizes) / n / 1024))

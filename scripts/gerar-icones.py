"""Gera os PNGs do PWA em public/icons/ a partir da marca "EC" da sidebar
(quadrado branco arredondado + "EC" preto sobre #08090A). Sem dependência npm:
usa Chromium (Playwright) pra renderizar a fonte e PIL pra redimensionar.
Uso: python scripts/gerar-icones.py"""
import io
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

SAIDA = Path(__file__).resolve().parent.parent / "public" / "icons"
MASTER = 1024

HTML = """<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@900&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;background:#08090A}
  #c{width:%(t)dpx;height:%(t)dpx;background:#08090A;position:relative}
  #m{position:absolute;left:50%%;top:50%%;width:%(m)dpx;height:%(m)dpx;transform:translate(-50%%,-50%%);
     background:#fff;border-radius:%(r)dpx;display:flex;align-items:center;justify-content:center;
     font:900 %(f)dpx 'Plus Jakarta Sans',Arial,sans-serif;color:#050507;letter-spacing:-0.02em}
</style></head><body><div id="c"><div id="m">EC</div></div></body></html>"""


def renderizar(page, escala_marca):
    m = round(MASTER * escala_marca)
    page.set_viewport_size({"width": MASTER, "height": MASTER})
    page.set_content(HTML % {"t": MASTER, "m": m, "r": round(m * 0.32), "f": round(m * 0.46)})
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(600)
    return Image.open(io.BytesIO(page.screenshot(clip={"x": 0, "y": 0, "width": MASTER, "height": MASTER}))).convert("RGB")


def salvar(img, nome, tamanho):
    img.resize((tamanho, tamanho), Image.LANCZOS).save(SAIDA / nome, optimize=True)
    print("ok", nome)


SAIDA.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_page()
    normal = renderizar(page, 0.70)      # purpose "any"
    maskable = renderizar(page, 0.56)    # dentro da safe zone (círculo de 80%)
    apple = renderizar(page, 0.68)       # iOS arredonda sozinho: fundo sólido
    b.close()

for t in (72, 96, 128, 144, 152, 192, 384, 512):
    salvar(normal, f"icon-{t}.png", t)
salvar(apple, "apple-touch-icon.png", 180)
salvar(maskable, "maskable-512.png", 512)

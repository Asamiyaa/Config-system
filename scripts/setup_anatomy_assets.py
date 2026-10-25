#!/usr/bin/env python3
"""Download BodyParts3D mesh files and local Three.js dependencies for personal use.
Source: jixiangying/skeleton, based on BodyParts3D / Anatomography.
License: CC BY-SA 2.1 Japan. Run from project root: python scripts/setup_anatomy_assets.py
"""
from __future__ import annotations
import re, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / 'static'
ANATOMY = STATIC / 'anatomy'
MODEL_DIR = STATIC / 'models' / 'bodyparts3d'
VENDOR = ANATOMY / 'vendor'
RAW = 'https://raw.githubusercontent.com/jixiangying/skeleton/main/'
THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
UA = 'WEALTH-OS-Personal-Anatomy-Setup/1.0'
def fetch(url, timeout=90):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=timeout) as resp: return resp.read()
def main():
    for d in (ANATOMY, MODEL_DIR, VENDOR): d.mkdir(parents=True, exist_ok=True)
    print('[1/4] Downloading BodyParts3D viewer metadata...')
    try: html = fetch(RAW + 'index.html').decode('utf-8')
    except Exception as e:
        print('ERROR: cannot download source metadata:', e)
        print('Check access to raw.githubusercontent.com, then rerun.'); return 2
    files = sorted(set(re.findall(r'file:\s*["\']([^"\']+\.obj)["\']', html)))
    if len(files) < 100: raise RuntimeError(f'Expected a full bone list; found only {len(files)} meshes')
    print(f'  source lists {len(files)} individual bone meshes')
    print('[2/4] Downloading referenced meshes into static/models/bodyparts3d/ ...')
    def get_model(name):
        target = MODEL_DIR / name
        if target.exists() and target.stat().st_size > 1000: return name
        target.write_bytes(fetch(RAW + 'partof_BP3D_4.0_obj_99/' + name, timeout=90))
        return name
    completed, failed = 0, []
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(get_model, name): name for name in files}
        for future in as_completed(futures):
            try: future.result(); completed += 1
            except Exception as e: failed.append((futures[future], str(e)))
            if completed and completed % 20 == 0: print(f'  progress {completed}/{len(files)}, failures={len(failed)}')
    if len(list(MODEL_DIR.glob('*.obj'))) < 100: raise RuntimeError(f'Only {len(list(MODEL_DIR.glob("*.obj")))} meshes downloaded; errors: {failed[:3]}')
    print('[3/4] Installing local viewer and Three.js...')
    (ANATOMY / 'index.html').write_text(html, encoding='utf-8')
    for rel in ('js/OBJLoader.js','js/OrbitControls.js','js/ModelCache.js','sw.js','favicon.svg'):
        try:
            target = ANATOMY / rel; target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(fetch(RAW + rel))
        except Exception as e:
            if rel in ('js/OBJLoader.js','js/OrbitControls.js'): raise RuntimeError(f'Cannot download required {rel}: {e}')
            print('  optional file skipped:', rel, e)
    (VENDOR / 'three.min.js').write_bytes(fetch(THREE_URL))
    html = (ANATOMY / 'index.html').read_text(encoding='utf-8')
    html = html.replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', 'vendor/three.min.js')
    html = html.replace('partof_BP3D_4.0_obj_99/', '../models/bodyparts3d/')
    html = html.replace('<script src="https://cdn.tailwindcss.com"></script>', '')
    html = html.replace("navigator.serviceWorker.register('/sw.js')", "navigator.serviceWorker.register('./sw.js')")
    injected = """<style>
      html,body{width:100%;height:100%;overflow:hidden;background:#07111b;color:#dce9f5}
      .sidebar,.info-panel,.stats-bar,.cache-indicator,.cache-stats,.mobile-toggle,.overlay{display:none!important}
      #canvas-container{position:absolute!important;inset:0!important;width:100%!important;height:100%!important}
      #loading{background:#07111b!important}.loading-spinner{border-top-color:#9bea68!important}
      .loading-overlay>div:nth-child(2){font-size:12px!important}
    </style>"""
    html = html.replace('</head>', injected + '\n</head>')
    (ANATOMY / 'index.html').write_text(html, encoding='utf-8')
    (MODEL_DIR / 'ATTRIBUTION.txt').write_text(
        'BodyParts3D / Anatomography data, distributed by jixiangying/skeleton.\n'
        'Copyright: The Database Center for Life Science (DBCLS), Japan.\n'
        'License: Creative Commons Attribution-ShareAlike 2.1 Japan (CC BY-SA 2.1 JP).\n'
        'Source: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/\n'
        'Repository: https://github.com/jixiangying/skeleton\n'
        'Keep this attribution with copies or modified versions. Share-alike obligations apply.\n', encoding='utf-8')
    print('[4/4] Verifying local assets...')
    count = len(list(MODEL_DIR.glob('*.obj')))
    assert count >= 100 and (VENDOR / 'three.min.js').stat().st_size > 100_000
    assert (ANATOMY / 'js' / 'OBJLoader.js').exists() and (ANATOMY / 'js' / 'OrbitControls.js').exists()
    print(f'OK: {count} local OBJ meshes; Three.js + OBJLoader + OrbitControls installed.')
    if failed: print(f'WARNING: {len(failed)} models failed; example: {failed[:3]}')
    print('Open WEALTH OS > 健康管理 > 健身管理 > 骨骼. Models and GIFs load from local files after setup.')
    print('First setup needs internet; subsequent model viewing is local/offline.')
    return 0
if __name__ == '__main__':
    try: raise SystemExit(main())
    except KeyboardInterrupt: raise SystemExit(130)
    except Exception as e: print('ERROR:', e); raise SystemExit(1)

from pathlib import Path
import requests
base='https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/'
for name in ['partof_parts_list_e.txt','partof_element_parts.txt','partof_BP3D_4.0_obj_99.zip']:
 p=Path('artifacts')/name
 if not p.exists():
  with requests.get(base+name,timeout=60,stream=True) as r,p.open('wb') as f:
   r.raise_for_status()
   for data in r.iter_content(1024*1024):f.write(data)
 print(name,p.stat().st_size,flush=True)
for name,url in {'three.min.js':'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','OBJLoader.js':'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js','OrbitControls.js':'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'}.items():
 p=Path('static/anatomy/vendor')/name;p.parent.mkdir(exist_ok=True);r=requests.get(url,timeout=40);r.raise_for_status();p.write_bytes(r.content)

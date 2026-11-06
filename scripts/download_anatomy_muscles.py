import requests
from pathlib import Path
base='https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/'
for name in ['isa_parts_list_e.txt','isa_element_parts.txt','isa_BP3D_4.0_obj_99.zip']:
 p=Path('artifacts')/name
 with requests.get(base+name,timeout=90,stream=True) as r,p.open('wb') as f:
  r.raise_for_status()
  for data in r.iter_content(1024*1024):f.write(data)
 print(name,p.stat().st_size,flush=True)

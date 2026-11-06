import csv,json,zipfile
from pathlib import Path
out=Path('static/models/bodyparts3d');out.mkdir(exist_ok=True)
def records(name):
 rows=list(csv.reader(Path('artifacts',name).read_text(encoding='utf-8-sig').splitlines(),delimiter='\t'))[1:];d={}
 for r in rows:
  if len(r)>=3:d.setdefault(r[0],{'name':r[1],'files':[]})['files'].append(r[2])
 return d
part=records('partof_element_parts.txt');isa=records('isa_element_parts.txt')
# Prefer specific one-element anatomical labels to compound group names.
labels={}
for d in [part,isa]:
 for rec in d.values():
  if len(rec['files'])==1:labels.setdefault(rec['files'][0],rec['name'])
manifest={k:[] for k in ['muscle','skeleton','skin','head']}
for cid,zone in [('FMA9616','head'),('FMA9617','upper'),('FMA9619','chest'),('FMA9620','core'),('FMA9621','upper'),('FMA9622','lower'),('FMA19086','lower')]:
 for f in isa.get(cid,{}).get('files',[]):manifest['muscle'].append({'id':f,'name':labels.get(f,isa[cid]['name']),'zone':zone})
for mode,cid in [('skeleton','FMA23881'),('skin','FMA7163')]:
 for f in part[cid]['files']:manifest[mode].append({'id':f,'name':labels.get(f,part[cid]['name']),'zone':'full'})
import re
# Fill the appendicular skeleton from the established bone inventory; geometry still comes from official archives.
for f,name,en,category in re.findall(r'file:\s*"([^"]+)"\s*,\s*name:\s*"([^"]+)"\s*,\s*nameEn:\s*"([^"]+)"\s*,\s*category:\s*"([^"]+)"',Path('artifacts/anatomy-source.html').read_text(encoding='utf-8')):
 manifest['skeleton'].append({'id':Path(f).stem,'name':name+' / '+en,'zone':{'skull':'head','upper':'upper','lower':'lower','ribs':'chest','spine':'core'}.get(category,'full')})
head=set(part['FMA7154']['files']);manifest['head']=[dict(x,zone='head') for x in manifest['skeleton'] if x['id'] in head]
for mode in manifest:manifest[mode]=list({x['id']:x for x in manifest[mode]}.values())
needed={x['id'] for rows in manifest.values() for x in rows}
for archive in ['partof_BP3D_4.0_obj_99.zip','isa_BP3D_4.0_obj_99.zip']:
 with zipfile.ZipFile(Path('artifacts')/archive) as z:
  for name in z.namelist():
   f=Path(name)
   if f.suffix=='.obj' and f.stem in needed:(out/f.name).write_bytes(z.read(name))
missing=[f for f in needed if not (out/(f+'.obj')).exists()];assert not missing,missing
Path('static/anatomy/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False),encoding='utf-8')
(out/'ATTRIBUTION.txt').write_text('BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.\nSource: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html\nOriginal reduced polygon meshes; grouping and browser viewer added by this project. Educational reference, not clinically validated.\n',encoding='utf-8')
print({k:len(v) for k,v in manifest.items()})

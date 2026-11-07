import json
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
 b=pw.chromium.launch(args=['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']);p=b.new_page(viewport={'width':1440,'height':1000});errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 seed=json.loads(Path('data/seed_state.json').read_text(encoding='utf-8'));manifest=json.loads(Path('static/anatomy/manifest.json').read_text(encoding='utf-8'));small={k:v[:3] for k,v in manifest.items()};models=[]
 p.on('request',lambda r:models.append(r.url) if '.obj' in r.url else None)
 p.route('**/manifest.json',lambda r:r.fulfill(json=small))
 def api(r):
  url=r.request.url
  if url.endswith('/api/state'):data={'state':seed}
  elif url.endswith('/api/session'):data={'authenticated':True,'username':'test'}
  elif '/api/gym/status' in url:data={'available':True,'total':0,'translated':0,'media':{'clip':0,'still':0}}
  elif '/api/gym/' in url:data={'items':[],'total':0,'bodyParts':[],'equipment':[],'categories':[]}
  else:data={'registrationEnabled':True,'demoEnabled':True,'boards':[]}
  r.fulfill(json=data)
 p.route('**/api/**',api)
 p.goto('http://127.0.0.1:8877/static/index.html');p.locator('#viewRoot[data-page="dailyflow"]').wait_for()
 p.wait_for_function("document.querySelector('.persistent-anatomy-frame')",timeout=15000)
 f=p.frames[-1];p.locator('.hub-tab[data-page="calendar"]').click();p.locator('#viewRoot[data-page="calendar"]').wait_for();p.locator('.hub-tab[data-page="dailyflow"]').click();f.wait_for_function("window.anatomyLoaded?.mode==='muscle'",timeout=60000)
 f.evaluate("window.cacheIdentity='same-instance'")
 p.evaluate("sessionStorage.setItem('wealthos-fit-tab','library');renderPage('fitness',{transition:false})");p.wait_for_timeout(500)
 assert p.locator('.action-inspector .exercise-list').count()==0
 assert p.locator('.action-inspector').get_by_text('推荐动作').count()==0
 p.locator('.training-studio').scroll_into_view_if_needed();p.wait_for_timeout(300)
 assert p.locator('.persistent-anatomy-frame').is_visible()
 for mode in ['skeleton','skin','head','muscle']:
  p.locator('.body-mode-switch [data-mode="'+mode+'"]').click();f.wait_for_function('(m)=>window.anatomyLoaded?.mode===m',arg=mode,timeout=60000)
  assert f.evaluate('window.anatomyLoaded.failed')==0
 before=len(models)
 p.evaluate("renderPage('dailyflow',{transition:false})");p.wait_for_timeout(200)
 p.evaluate("renderPage('fitness',{transition:false})");p.wait_for_timeout(500)
 assert f.evaluate('window.cacheIdentity')=='same-instance'
 assert len(models)==before,(before,len(models))
 p.locator('[data-action="body-zone"][data-zone="chest"]').click();p.wait_for_timeout(200)
 p.locator('[data-action="body-open-library"]').click();p.wait_for_timeout(300)
 assert p.evaluate('gymUI().bodyPart')=='chest'
 assert not errors,errors
 b.close()
print('PASS: background worker parsing, all four layers, persistent iframe and parsed cache reuse, inspector-to-library filter; no JS errors')


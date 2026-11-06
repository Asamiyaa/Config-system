import json
from pathlib import Path
from playwright.sync_api import sync_playwright
seed=json.loads(Path('data/seed_state.json').read_text(encoding='utf-8'))
pages=['growthplan','review','home','today','dashboard','allocation','nasdaq','ashare','health','checkin','diet','fitness','skin','sleep','style','agents','newconfig','english','reading','archive','dailyflow','mistakes','calendar','stats','alpharadar']
with sync_playwright() as p:
 b=p.chromium.launch()
 page=b.new_page(viewport={'width':1440,'height':1000})
 errors=[];overflow=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/api/**',lambda r:r.fulfill(json={'state':seed} if r.request.url.endswith('/api/state') else {'authenticated':True,'username':'demo','registrationEnabled':True,'demoEnabled':True,'exercises':[],'items':[],'available':False}))
 page.goto('http://127.0.0.1:8877/static/index.html')
 page.locator('.spatial-hero').wait_for()
 for width in [1440,390]:
  page.set_viewport_size({'width':width,'height':1000 if width==1440 else 844})
  for name in pages:
   page.evaluate('(p)=>renderPage(p,{transition:false,animate:false})',name)
   page.wait_for_timeout(650)
   page.evaluate('window.scrollTo(0,0)')
   if page.evaluate('document.documentElement.scrollWidth>innerWidth+2'):overflow.append([width,name])
   if name in ['home','today','dashboard','health','reading','english','newconfig']:
    page.screenshot(path=f'artifacts/redesign-{name}-{width}.png')
  page.evaluate("document.body.dataset.theme='dark';document.documentElement.dataset.theme='dark';renderPage('home',{transition:false,animate:false})")
  page.wait_for_timeout(700)
  page.screenshot(path=f'artifacts/redesign-dark-{width}.png')
  page.evaluate("document.body.dataset.theme='light';document.documentElement.dataset.theme='light'")
 print('Browser errors:',errors)
 print('Overflow:',overflow)
 assert not errors
 assert not overflow
 page.locator('[data-workspace="search"]').click()
 assert page.locator('#tastePalette').is_visible()
 page.keyboard.press('Escape')
 b.close()
print('PASS: 25 pages at desktop/mobile, shared search, dark/light renders')

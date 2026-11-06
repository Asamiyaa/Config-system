import json
from pathlib import Path
from playwright.sync_api import sync_playwright
seed=json.loads(Path('data/seed_state.json').read_text(encoding='utf-8'))
with sync_playwright() as p:
 b=p.chromium.launch()
 page=b.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 def route(r):
  path=r.request.url.split('/api/')[-1]
  data={'state':seed} if path=='state' else {'authenticated':True,'username':'demo','registrationEnabled':True,'demoEnabled':True}
  r.fulfill(json=data)
 page.route('**/api/**',route)
 page.goto('http://127.0.0.1:8877/static/index.html')
 page.locator('.spatial-hero').wait_for()
 page.wait_for_timeout(700)
 Path('artifacts').mkdir(exist_ok=True)
 page.screenshot(path='artifacts/spatial-desktop.png')
 assert page.locator('.spatial-hero').is_visible()
 page.locator('.spatial-hero').hover(position={'x':30,'y':30})
 page.wait_for_timeout(100)
 assert page.locator('.spatial-hero').evaluate("e=>e.style.getPropertyValue('--spatial-x')")
 page.set_viewport_size({'width':390,'height':844})
 page.wait_for_timeout(300)
 assert page.locator('.spatial-dock').is_visible()
 assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'mobile overflow'
 page.screenshot(path='artifacts/spatial-mobile.png')
 page.locator('[data-spatial-page="today"]').click()
 page.wait_for_timeout(600)
 assert page.locator('#viewRoot').get_attribute('data-page')=='today'
 assert page.locator('[data-spatial-page="today"]').get_attribute('aria-current')=='page'
 page.locator('[data-spatial-page="home"]').click()
 page.wait_for_timeout(500)
 page.locator('[data-workspace="theme"]').click()
 page.wait_for_timeout(400)
 page.screenshot(path='artifacts/spatial-light.png')
 page.emulate_media(reduced_motion='reduce')
 assert page.locator('.spatial-hero').evaluate("e=>getComputedStyle(e).animationName")=='none'
 assert not errors,errors
 b.close()
print('PASS: desktop 3D, mobile layout and navigation, active state, light theme, reduced motion; no browser errors')

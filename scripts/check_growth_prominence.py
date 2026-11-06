import json
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch();page=b.new_page(viewport={'width':1440,'height':1000})
 seed=json.loads(Path('data/seed_state.json').read_text(encoding='utf-8'))
 page.route('**/api/**',lambda r:r.fulfill(json={'state':seed} if r.request.url.endswith('/api/state') else {'authenticated':True,'username':'demo','registrationEnabled':True,'demoEnabled':True}))
 page.goto('http://127.0.0.1:8877/static/index.html');page.locator('.growth-home').wait_for()
 assert page.locator('#mainNav .nav-item').first.get_attribute('data-page')=='newconfig'
 page.locator('#mainNav [data-page="newconfig"]').click();page.locator('.growth-foundations').wait_for();page.wait_for_timeout(600)
 for sel in ['.capability-pyramid-card','.capability-launch-card']:
  assert page.locator('.growth-foundations '+sel).is_visible()
  assert not page.locator('.growth-foundations '+sel).evaluate("e=>!!e.closest('.fit-panel,details')")
 page.screenshot(path='artifacts/growth-prominent-desktop.png')
 page.locator('.ncfg-tabs [data-tab="cashflow"]').click()
 assert page.locator('.growth-foundations .capability-pyramid-card').is_visible()
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(300)
 assert page.locator('.spatial-dock button').first.get_attribute('data-spatial-page')=='newconfig'
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
 page.locator('.growth-foundations .capability-launch [data-page="english"]') if False else None
 page.locator('.growth-foundations [data-page="english"]').click();page.wait_for_timeout(500)
 assert page.locator('#viewRoot').get_attribute('data-page')=='english'
 b.close()
print('PASS: growth first on desktop/mobile; core sections visible across tabs; mobile width; capability navigation')

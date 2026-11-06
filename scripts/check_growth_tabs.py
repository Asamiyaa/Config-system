import json
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch();page=b.new_page(viewport={'width':1440,'height':1000})
 seed=json.loads(Path('data/seed_state.json').read_text(encoding='utf-8'))
 page.route('**/api/**',lambda r:r.fulfill(json={'state':seed} if r.request.url.endswith('/api/state') else {'authenticated':True,'username':'demo','registrationEnabled':True,'demoEnabled':True}))
 page.goto('http://127.0.0.1:8877/static/index.html');page.locator('.growth-home').wait_for()
 assert page.locator('#mainNav .nav-item').first.get_attribute('data-page')=='newconfig'
 page.locator('#mainNav [data-page="newconfig"]').click();page.locator('.hub-tabs').wait_for()
 assert page.locator('.hub-tabs .hub-tab').all_text_contents()==['新登','成长总览','90天计划','每周复盘','英语','阅读']
 assert page.locator('.growth-overview-capabilities .capability-launch-card').is_visible()
 page.locator('.hub-tab[data-page="xindeng"]').click();page.wait_for_timeout(400)
 assert page.locator('#viewRoot').get_attribute('data-page')=='xindeng'
 assert page.locator('#capability-pyramid h3').inner_text()=='新登'
 assert page.locator('#capability-pyramid').is_visible()
 assert page.locator('#mainNav [data-page="newconfig"]').get_attribute('aria-current')=='page'
 page.locator('.hub-tab[data-page="newconfig"]').click();page.wait_for_timeout(400)
 assert page.locator('#viewRoot h1').inner_text()=='成长总览'
 b.close()
print('PASS: tab order, new page, renamed pyramid, overview capabilities and active parent navigation')

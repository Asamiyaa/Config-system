import json
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
 b=pw.chromium.launch()
 for width,height,theme in [(1440,1000,'light'),(390,844,'light'),(390,844,'dark')]:
  p=b.new_page(viewport={'width':width,'height':height},is_mobile=width<500,has_touch=width<500)
  errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  seed=json.loads(Path('data/seed_state.json').read_text(encoding='utf-8'))
  def api(r):
   url=r.request.url
   if '/api/session' in url:data={'authenticated':True,'username':'test'}
   elif '/api/state' in url:data={'state':seed,'ok':True}
   else:data={'boards':[],'jobs':[],'settings':{}}
   r.fulfill(json=data)
  p.route('**/api/**',api);p.goto('http://127.0.0.1:8877/static/index.html');p.locator('#viewRoot[data-page=dailyflow]').wait_for()
  p.evaluate("""theme=>{document.body.dataset.theme=theme;document.documentElement.dataset.theme=theme;state.dailyFlows.weekday=[{id:'skin',title:'晨间护理',start:480,end:490,destination:'skin'},{id:'focus',title:'留出一段专注时间',start:540,end:600},{id:'gym',title:'力量训练',start:1080,end:1125,destination:'fitness'}];ui.flowViewMode='checklist';ui.flowKind='weekday';ui.checklistDate=todayKey();renderPage('dailyflow',{transition:false});}""",theme)
  p.wait_for_timeout(500)
  assert p.locator('.execution-focus').is_visible()
  assert p.locator('.execution-focus progress').get_attribute('max')=='3'
  assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  p.screenshot(path=f'artifacts/design-{width}-{theme}.png',full_page=True)
  p.locator('.quick-todo').click() if width<500 else p.evaluate('openQuickTodo()')
  p.locator('#quickTodo [name=title]').fill('设计验证')
  box=p.locator('#quickTodo').bounding_box();assert box['x']>=-1 and box['x']+box['width']<=width+1
  p.screenshot(path=f'artifacts/design-dialog-{width}-{theme}.png',full_page=False)
  p.locator('#quickTodo [data-close]').click()
  p.locator('[data-checklist-id]').first.check();p.wait_for_timeout(250)
  assert p.locator('.execution-focus progress').get_attribute('value')=='1'
  assert not errors,errors
  p.close()
 b.close()
print('PASS: desktop/mobile light and dark, focus progress, form fit, no horizontal overflow or JS errors')

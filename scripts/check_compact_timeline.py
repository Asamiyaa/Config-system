import json
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
 b=pw.chromium.launch()
 for width,height in [(1440,1000),(390,844),(360,740)]:
  p=b.new_page(viewport={'width':width,'height':height},is_mobile=width<500,has_touch=width<500)
  seed=json.loads(Path('data/seed_state.json').read_text(encoding='utf-8'))
  errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  def api(r):
   url=r.request.url
   if '/api/state' in url:data={'state':seed,'ok':True}
   elif '/api/session' in url:data={'authenticated':True,'username':'test'}
   else:data={'registrationEnabled':True,'boards':[]}
   r.fulfill(json=data)
  p.route('**/api/**',api)
  p.goto('http://127.0.0.1:8877/static/index.html');p.locator('#viewRoot[data-page=dailyflow]').wait_for()
  p.evaluate("ui.flowKind='weekday';ui.flowViewMode='timeline';state.dailyFlows.weekday=[{id:'early',title:'凌晨任务',start:0,end:30},{id:'a',title:'五分钟任务',start:600,end:605},{id:'b',title:'相邻五分钟',start:605,end:610},{id:'c',title:'并行任务',start:600,end:660},{id:'late',title:'晚间任务',start:1380,end:1440}];renderPage('dailyflow',{transition:false})")
  p.wait_for_timeout(500)
  rect=p.locator('#flowTimeline').bounding_box();print(width,height,rect,flush=True)
  Path('artifacts').mkdir(exist_ok=True);p.screenshot(path=f'artifacts/compact-flow-{width}.png',full_page=True)
  assert rect['y']+rect['height']<=height-(55 if width<500 else 20),(width,rect)
  assert p.locator('.flow-overview-item, .flow-detail-timeline').count()==0
  labels=p.locator('.flow-block strong')
  for label in labels.all():assert label.is_visible() and label.bounding_box()['height']>=18
  assert p.locator('[data-flow-id=a]').get_attribute('data-flow-lane')!=p.locator('[data-flow-id=b]').get_attribute('data-flow-lane')
  p.locator('[data-flow-id=a] strong').dblclick();p.locator('#flowEditForm').wait_for()
  assert p.locator('#flowEditForm [name=start]').input_value()=='10:00'
  p.locator('[data-action=flow-modal-close]').last.click()
  p.locator('#flowTimeline').dblclick(position={'x':10,'y':40})
  p.locator('#flowEditForm').wait_for()
  p.locator('[data-action=flow-modal-close]').last.click()
  Path('artifacts').mkdir(exist_ok=True)
  p.screenshot(path=f'artifacts/compact-flow-{width}.png',full_page=True)
  assert not errors,errors
  p.close()
 b.close()
print('PASS: full day fits desktop/mobile; short and adjacent task labels; double-click edit/add')


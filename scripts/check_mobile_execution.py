import json
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
 b=pw.chromium.launch();p=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 seed=json.loads(Path('data/seed_state.json').read_text(encoding='utf-8'));errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.add_init_script("window.nativeCalls=[];window.AndroidApp={syncReminders:x=>nativeCalls.push(JSON.parse(x)),configureShortcuts:()=>{},consumeExecutionRoute:()=>'',requestReminderPermission:()=>{},requestAlarmPermission:()=>{}}")
 def api(r):
  url=r.request.url
  if '/api/state' in url:
   if r.request.method=='PUT':seed.update(r.request.post_data_json['state'])
   data={'state':seed,'ok':True}
  elif '/api/session' in url:data={'authenticated':True,'username':'test'}
  elif '/api/gym/exercises/' in url:data={'id':'test','name':'测试深蹲','bodyPartZh':'腿'}
  else:data={'boards':[],'jobs':[],'settings':{}}
  r.fulfill(json=data)
 p.route('**/api/**',api);p.goto('http://127.0.0.1:8877/static/index.html');p.locator('.quick-todo').wait_for();p.wait_for_timeout(500)
 assert p.locator('.spatial-dock button').count()==5
 p.locator('.quick-todo').click();p.locator('#quickTodo [name=title]').fill('饭后散步');p.locator('#quickTodo [name=date]').fill('2026-12-01');p.locator('#quickTodo [name=time]').fill('18:30');p.locator('#quickTodo [type=submit]').click();p.wait_for_timeout(500)
 assert seed['focusTasks'][-1]['time']=='18:30' and seed['focusTasks'][-1]['startDate']=='2026-12-01'
 p.evaluate("state.dailyFlows.weekday=[{id:'skin-test',title:'护肤',start:600,end:610,destination:'skin'}];ui.flowKind='weekday';ui.flowViewMode='checklist';renderPage('dailyflow',{transition:false})")
 p.locator('[data-flow-go]').click();p.wait_for_timeout(300);assert p.locator('#viewRoot').get_attribute('data-page')=='skin'
 p.evaluate("renderPage('dailyflow',{transition:false})");p.locator('[data-shortcuts]').click();p.locator('#executionSheet details summary').click();p.locator('#executionSheet [value=calendar]').check();p.locator('#executionSheet form button').click();p.wait_for_timeout(300);assert 'calendar' in seed['executionShortcuts']
 p.locator('[data-reminders]').click();p.locator('[data-enabled]').check();p.wait_for_timeout(400);assert seed['executionReminders'];assert p.evaluate('nativeCalls.at(-1).some(x=>x.weekly)')
 p.locator('#executionSheet [data-dismiss]').click()
 p.evaluate("const b=document.createElement('button');b.dataset.quickWorkout='test';document.body.append(b);b.click();b.remove()")
 p.locator('#executionSheet [data-set]').wait_for();p.locator('#executionSheet [data-set]').click();p.locator('#executionSheet [data-finish]').click();p.wait_for_timeout(400);assert seed['trainingSessions'][0]['sets']==1 and seed['quickWorkout'] is None
 assert not errors,errors
 print('PASS mobile dock, dated todo, checklist destination, shortcut persistence, native schedule contract, workout sets and check-in; no JS errors')
 b.close()

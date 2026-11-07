import json
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE='http://127.0.0.1:8877/static/index.html'
with sync_playwright() as pw:
 browser=pw.chromium.launch()
 page=browser.new_page(viewport={'width':1440,'height':1000})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 seed=json.loads(Path('data/seed_state.json').read_text(encoding='utf-8'))
 def route(r):
  url=r.request.url
  if url.endswith('/api/state'):
   if r.request.method=='PUT': seed.update(r.request.post_data_json['state']); data={'ok':True}
   else: data={'state':seed}
  elif url.endswith('/api/session'): data={'authenticated':True,'username':'demo'}
  elif 'personal-vault/status' in url:data={'ok':True,'databasePath':'test/db.sqlite3','backupPath':'test/backups'}
  else:data={'registrationEnabled':True,'demoEnabled':True,'jobs':[],'settings':{}}
  r.fulfill(json=data)
 page.route('**/api/**',route)
 page.goto(BASE)
 page.wait_for_function("document.querySelector('#viewRoot').dataset.page==='dailyflow'")
 page.wait_for_timeout(500)
 assert page.locator('#mainNav .nav-label').all_text_contents()==['成长','资产','健康','设置','归档']
 tabs=page.locator('.hub-tabs .hub-tab')
 assert tabs.all_text_contents()==['流程','周历','90天计划','新登','平衡','成长总览','避坑','每周复盘','白布画板']
 for key in ['whiteboard','xindeng','agents','calendar','newconfig','growthplan','mistakes','review','dailyflow']:
  page.locator(f'.hub-tab[data-page="{key}"]').click()
  page.wait_for_function('(k)=>document.querySelector("#viewRoot").dataset.page===k',arg=key)
  page.wait_for_timeout(200)
  assert page.locator('#viewRoot').inner_text().strip(),key
  assert page.locator('#mainNav [data-page="newconfig"]').get_attribute('aria-current')=='page',key
 page.locator('.hub-tab[data-page="xindeng"]').click();page.wait_for_timeout(300)
 assert page.locator('.xindeng-flow').count()==0
 page.locator('.hub-tab[data-page="agents"]').click();page.wait_for_timeout(300)
 page.locator('[data-action="agents-spin"]').click();page.wait_for_timeout(200);page.locator('[data-action="agent-cycle"]').first.click();page.wait_for_timeout(300)
 assert seed.get('agentStatuses')
 page.reload();page.wait_for_timeout(500)
 page.locator('.hub-tab[data-page="agents"]').click();page.wait_for_timeout(300)
 assert page.evaluate('JSON.stringify(state.agentStatuses)')==json.dumps(seed['agentStatuses'],separators=(',',':'))
 page.locator('#mainNav [data-page="settings"]').click();page.wait_for_timeout(500)
 assert page.locator('.hub-tabs').inner_text()=='自动化'
 page.locator('#mainNav [data-page="dashboard"]').click();page.wait_for_timeout(500)
 assert page.locator('.hub-tab').first.get_attribute('href')=='http://39.106.118.186/'
 page.locator('#mainNav [data-page="newconfig"]').click();page.wait_for_timeout(300)
 assert page.locator('#viewRoot').get_attribute('data-page')=='dailyflow'
 page.evaluate("state.dailyFlows.weekday=[{id:'short',title:'五分钟任务',start:600,end:605}];ui.flowKind='weekday';renderPage('dailyflow',{transition:false})")
 page.locator('.flow-block').dblclick();page.wait_for_timeout(200)
 assert page.locator('.flow-modal').is_visible()
 page.evaluate("document.querySelector('.flow-modal')?.remove();document.querySelector('.flow-modal-backdrop')?.remove()")
 page.locator('[data-tab="checklist"]').click();page.wait_for_timeout(200)
 page.evaluate("ui.checklistDate='2026-11-06';renderPage('dailyflow',{transition:false})")
 page.locator('[data-checklist-index]').first.check();page.wait_for_timeout(300)
 assert page.evaluate("state.flowChecklist['2026-11-06'][0].done")
 page.locator('.hub-tab[data-page="calendar"]').click();page.wait_for_timeout(250)
 page.locator('[data-action="calendar-toggle-create"]').click();page.wait_for_timeout(250)
 assert page.locator('#calendarTaskTitle').is_visible()
 assert page.locator('#viewRoot').get_attribute('data-page')=='calendar'
 page.locator('#calendarTaskTitle').fill('周历新增测试')
 page.locator('#calendarTaskForm button[type="submit"]').click();page.wait_for_timeout(250)
 assert page.locator('#viewRoot').get_attribute('data-page')=='calendar'
 page.locator('[data-calendar-date]').first.dblclick();page.wait_for_timeout(250)
 assert page.locator('#calendarTaskTitle').is_visible()
 page.locator('.hub-tab[data-page="whiteboard"]').click();page.wait_for_timeout(200)
 page.locator('[data-board="new"]').click();page.wait_for_timeout(250)
 assert page.locator('#whiteCanvas').is_visible()
 canvas=page.locator('#whiteCanvas').bounding_box();page.mouse.move(canvas['x']+30,canvas['y']+30);page.mouse.down();page.mouse.move(canvas['x']+100,canvas['y']+100,steps=5);page.mouse.up();page.wait_for_timeout(200)
 assert page.evaluate('state.whiteboards[0].strokes.length')==1
 page.locator('[data-board="save"]').click();page.wait_for_timeout(200)
 assert seed['whiteboards']
 page.locator('.hub-tab[data-page="dailyflow"]').click();page.wait_for_timeout(200)
 page.locator('[data-tab="edit"]').click()
 page.screenshot(path='artifacts/xindeng-flow-desktop.png',full_page=False)
 mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
 m=mobile.new_page();m.on('pageerror',lambda e:errors.append(str(e)));m.route('**/api/**',route);m.goto(BASE);m.wait_for_timeout(800)
 assert m.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 session=mobile.new_cdp_session(m)
 def swipe(y1,y2):
  session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':190,'y':y1}]})
  for i in range(1,13):
   session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':190,'y':y1+(y2-y1)*i/12}]});m.wait_for_timeout(20)
  session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});m.wait_for_timeout(300)
 swipe(650,220)
 assert m.evaluate('scrollY')>100,'Swipe must scroll the document'
 m.screenshot(path='artifacts/xindeng-flow-mobile.png')
 # Deterministic boundary test: gestures beginning below top cannot become refresh gestures.
 assert m.evaluate('''()=>{const fire=(name,y)=>{const t=new Touch({identifier:1,target:document.body,clientX:100,clientY:y});const e=new TouchEvent(name,{bubbles:true,cancelable:true,touches:[t]});document.body.dispatchEvent(e);return e.defaultPrevented;};window.scrollTo(0,100);fire('touchstart',100);window.scrollTo(0,0);return fire('touchmove',180)}''')
 assert not m.evaluate('''()=>{const fire=(name,y)=>{const t=new Touch({identifier:1,target:document.body,clientX:100,clientY:y});const e=new TouchEvent(name,{bubbles:true,cancelable:true,touches:[t]});document.body.dispatchEvent(e);return e.defaultPrevented;};window.scrollTo(0,0);fire('touchstart',100);return fire('touchmove',180)}''')
 for pg,name in [(page,'desktop'),(m,'mobile')]:
  pg.evaluate('showAuth()');pg.wait_for_timeout(300);pg.screenshot(path=f'artifacts/xindeng-login-{name}.png',full_page=True)
  assert pg.locator('#authSubmit').is_visible()
  assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 assert not errors,errors
 browser.close()
print('PASS: navigation, all growth pages, settings async tabs, market link, account role state, touch scrolling, refresh boundaries, login layouts; zero JS errors')

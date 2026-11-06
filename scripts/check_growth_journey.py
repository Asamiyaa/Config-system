import json,copy
from pathlib import Path
from playwright.sync_api import sync_playwright
saved=json.loads(Path('data/seed_state.json').read_text(encoding='utf-8'))
saved['focusTasks']=[]
fail=False
with sync_playwright() as p:
 b=p.chromium.launch();page=b.new_page(viewport={'width':1440,'height':1000});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 def route(r):
  global saved
  if r.request.url.endswith('/api/state'):
   if r.request.method=='PUT':
    if fail:r.fulfill(status=503,json={'detail':'测试失败'});return
    saved=json.loads(r.request.post_data)['state']
   r.fulfill(json={'state':copy.deepcopy(saved)});return
  r.fulfill(json={'authenticated':True,'username':'demo','registrationEnabled':True,'demoEnabled':True})
 page.route('**/api/**',route);page.goto('http://127.0.0.1:8877/static/index.html');page.locator('.growth-home').wait_for()
 page.locator('[data-growth="setup"]').click();page.locator('#growthSetupForm [name="goal"]').fill('建立作品集');page.locator('#growthSetupForm [name="stage"]').select_option('1');page.locator('#growthSetupForm [type="submit"]').click();page.locator('#growthSetupForm').wait_for(state='detached')
 assert saved['growth']['stage']==1
 page.evaluate("renderPage('growthplan',{transition:false,animate:false})")
 page.locator('[data-growth="goal"]').first.click();page.locator('#growthGoalForm [name="title"]').fill('完成一个作品');page.locator('#growthGoalForm [name="evidence"]').fill('可以演示');page.locator('#growthGoalForm button').click();page.locator('#growthGoalForm').wait_for(state='detached')
 page.locator('[data-growth="step"]').first.click();page.locator('#growthQuickForm [name="title"]').fill('完成原型');page.locator('#growthQuickForm [type="submit"]').click();page.locator('#growthQuickForm').wait_for(state='detached')
 assert saved['focusTasks'][0]['goalId']==saved['growth']['goals'][0]['id']
 page.locator('.growth-goals [data-action="toggle-focus-task"]').first.click();page.wait_for_timeout(300)
 assert saved['focusTasks'][0]['done']
 assert page.evaluate('growthProgress(growthState().goals[0]).done')==1
 for kind in ['expense','learning','training','reading']:
  page.locator('.workspace-tools [data-growth="quick"]').click();page.locator('#growthQuickForm [name="kind"]').select_option(kind);page.locator('#growthQuickForm [name="title"]').fill('测试记录 '+kind);
  if kind=='expense':page.locator('#growthQuickForm [name="amount"]').fill('12.50')
  else:page.locator('#growthQuickForm [name="application"]').fill('用于作品项目')
  if kind=='learning':fail=True
  page.locator('#growthQuickForm [type="submit"]').click()
  if fail:
   page.locator('#saveRecovery').wait_for(state='visible');assert page.locator('#growthQuickForm').is_visible();fail=False;page.locator('#growthQuickForm [type="submit"]').click()
  page.locator('#growthQuickForm').wait_for(state='detached')
 assert len(saved['englishLogs'])==1
 assert saved['growth']['expenses'][0]['amount']==12.5
 assert len(saved['growth']['outputs'])==2
 page.evaluate("renderPage('review',{transition:false,animate:false})")
 page.locator('#growthReviewForm [name="reflection"]').fill('形成初稿');page.locator('#growthReviewForm [name="next"]').fill('发布作品');page.locator('#growthReviewForm button').click();page.wait_for_timeout(300)
 assert saved['growth']['reviews'][0]['next']=='发布作品'
 page.reload();page.locator('.growth-home').wait_for();assert page.evaluate('growthState().goals.length')==2
 for name in ['home','growthplan','review','today','newconfig']:
  page.evaluate('(name)=>renderPage(name,{transition:false,animate:false})',name);page.wait_for_timeout(200)
  for width in [1440,390]:
   page.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});page.wait_for_timeout(150)
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+2'),(name,width)
 page.evaluate("renderPage('home',{transition:false,animate:false})");page.wait_for_timeout(400);page.screenshot(path='artifacts/growth-mobile.png')
 # Imported roadmap status follows linked actions in both directions.
 page.evaluate("growthState().goals.push({id:'linked-test',title:'路线联动',roadmapIndex:0});state.focusTasks.push({id:'linked-action',goalId:'linked-test',title:'验证',done:true});growthSyncGoals()")
 assert page.evaluate('state.tasks[0].status')=='已完成'
 page.evaluate("state.focusTasks.find(x=>x.id==='linked-action').done=false;growthSyncGoals()")
 assert page.evaluate('state.tasks[0].status')=='进行中'
 samples=page.evaluate('window.workspacePerformance')
 Path('artifacts/growth-performance.json').write_text(json.dumps({'renderSamples':samples,'saveMs':page.evaluate('window.lastWorkspaceSaveMs || null'),'scope':'mock API; JS render time, excludes paint and real network'},ensure_ascii=False,indent=2),encoding='utf-8')
 print('Render samples:',samples)
 assert not errors,errors
 b.close()
print('PASS: setup, goal/task linkage, five record types, failed save retry without duplication, weekly review, reload and responsive layout')

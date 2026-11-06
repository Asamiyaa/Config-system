import json, copy
from pathlib import Path
from playwright.sync_api import sync_playwright
seed=json.loads(Path('data/seed_state.json').read_text(encoding='utf-8'))
seed['focusTasks']=[{'id':'ux-task','title':'验证每日行动','done':False,'priority':'高','project':'收集箱','dueDate':'','startDate':'','estimate':25}]
saved=copy.deepcopy(seed)
fail=False
with sync_playwright() as p:
 b=p.chromium.launch()
 page=b.new_page(viewport={'width':390,'height':844})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 def route(r):
  global saved
  endpoint=r.request.url.split('/api/')[-1]
  if endpoint=='state' and r.request.method=='PUT':
   if fail: r.fulfill(status=503,json={'detail':'测试保存失败'});return
   saved=json.loads(r.request.post_data)['state'];r.fulfill(json={'ok':True});return
  r.fulfill(json={'state':copy.deepcopy(saved)} if endpoint=='state' else {'authenticated':True,'username':'demo','registrationEnabled':True,'demoEnabled':True})
 page.route('**/api/**',route)
 page.goto('http://127.0.0.1:8877/static/index.html')
 page.locator('.spatial-hero').wait_for()
 page.wait_for_timeout(600)
 action=page.locator('.growth-home [data-action="toggle-focus-task"]')
 assert action.is_visible()
 page.locator('.growth-home [data-action="edit-focus-task"]').click()
 page.locator('#focusEditName').fill('编辑后的任务')
 page.locator('#focusEditStart').fill('2026-11-05')
 page.locator('#focusEditDue').fill('2026-11-04')
 page.locator('#focusTaskEditForm [type="submit"]').click()
 assert page.evaluate("state.focusTasks[0].title")=='验证每日行动'
 page.locator('#focusEditStart').fill('')
 page.locator('#focusEditDue').fill('')
 fail=True
 page.locator('#focusTaskEditForm [type="submit"]').click()
 page.locator('#saveRecovery').wait_for(state='visible')
 assert page.locator('#focusTaskModal').is_visible()
 assert '已保存' not in page.locator('#toast').inner_text()
 fail=False
 page.locator('#focusTaskEditForm [type="submit"]').click()
 page.locator('#focusTaskModal').wait_for(state='detached')
 assert saved['focusTasks'][0]['title']=='编辑后的任务'
 page.locator('.growth-home [data-action="toggle-focus-task"]').click()
 page.wait_for_timeout(400)
 assert saved['focusTasks'][0]['done']
 page.reload();page.locator('.spatial-hero').wait_for()
 assert page.evaluate('state.focusTasks[0].done')
 page.evaluate("deleteWithUndo(state.focusTasks,0,'任务')")
 page.wait_for_timeout(300)
 assert not saved['focusTasks']
 page.locator('[data-action="undo-delete"]').click()
 page.wait_for_timeout(300)
 assert len(saved['focusTasks'])==1
 page.evaluate("renderPage('today',{transition:false})")
 page.locator('#focusTaskTitle').fill('新增回归任务')
 page.locator('#focusTaskForm [type="submit"]').click()
 page.wait_for_timeout(500)
 assert any(t['title']=='新增回归任务' for t in saved['focusTasks'])
 for target in ['english','reading','health','dashboard','home']:
  page.evaluate('(p)=>renderPage(p,{transition:false})',target)
  page.wait_for_timeout(250)
  assert page.locator('#viewRoot').get_attribute('data-page')==target
 # Learning deletions use the same undo transaction and preserve neighboring records.
 page.evaluate("state.englishLogs=[{date:'2026-11-04',minutes:10,output:'保留'},{date:'2026-11-04',minutes:15,output:'恢复'}];engDelete(1)")
 page.wait_for_timeout(250)
 page.locator('[data-action="undo-delete"]').click()
 page.wait_for_timeout(250)
 assert [x['output'] for x in saved['englishLogs']]==['保留','恢复']
 page.evaluate("state.readingBooks=[{title:'阅读回归',currentPage:12,totalPages:100}];readDelete('book',0)")
 page.wait_for_timeout(250)
 page.locator('[data-action="undo-delete"]').click()
 page.wait_for_timeout(250)
 assert saved['readingBooks'][0]['currentPage']==12
 page.evaluate('window.scrollTo(0,0)')
 page.wait_for_timeout(300)
 page.screenshot(path='artifacts/ux-mobile-refined.png')
 assert not errors,errors
 b.close()
print('PASS: compact mobile action, edit validation, failed save retains editor, retry, completion, reload, delete/undo, add task, five-page smoke')

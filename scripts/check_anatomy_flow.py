from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(args=['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':1000,'height':800});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 for mode in ['muscle','skeleton','skin','head']:
  page.goto('http://127.0.0.1:8765/static/anatomy/index.html?mode='+mode)
  page.wait_for_function('window.anatomyLoaded',timeout=60000)
  result=page.evaluate('anatomyLoaded');assert result['count']>0 and result['failed']==0,result
  if mode=='skin':
   page.locator('canvas').click(position={'x':500,'y':300})
   assert 'FJ' in page.locator('#selection').inner_text()
  print(result,flush=True)
  page.screenshot(path='artifacts/anatomy-'+mode+'.png')
 page.goto('http://127.0.0.1:8765');page.locator('#authSubmit').click();page.locator('.growth-home').wait_for()
 page.evaluate("renderPage('xindeng',{transition:false})");page.locator('.xindeng-flow').wait_for()
 assert page.locator('.growth-foundations .capability-launch-card').count()==0
 page.locator('.xindeng-flow [data-action="flow-new"]').click();page.locator('#flowEditForm').wait_for();page.locator('[data-action="flow-modal-close"]').last.click()
 page.locator('.xindeng-flow [data-action="flow-kind"][data-kind="restday"]').click();page.wait_for_timeout(300)
 assert page.locator('#viewRoot').get_attribute('data-page')=='xindeng'
 page.evaluate("renderPage('fitness',{transition:false});sessionStorage.setItem('wealthos-fit-tab','library')")
 page.locator('.fit-tabs [data-tab="library"]').click()
 frame=page.frame_locator('.medical-anatomy-frame')
 frame.locator('#mode').select_option('muscle');page.wait_for_timeout(200)
 rec=page.locator('.fit-panel[data-tab-panel="library"] [data-action="body-pick-exercise"]').first
 name=rec.get_attribute('data-exercise');rec.click();page.wait_for_function('(q)=>gymUI().q===q && !GYM.loading',arg=name,timeout=30000)
 assert page.locator('#gymSearch').input_value()==name
 assert not errors,errors
 b.close()
print('PASS: four WebGL layers, local meshes, embedded flow editing, recommendation-to-library')

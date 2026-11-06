from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch();page=b.new_page(viewport={'width':1440,'height':1000});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8765')
 page.locator('#authSubmit').click();page.locator('.growth-home').wait_for()
 assert page.locator('#mainNav [data-page="agents"]').count()==0
 assert page.locator('.today-roles .agent-balance-stage').is_visible()
 assert page.locator('#viewRoot h1').count()==1
 page.evaluate("renderPage('agents',{transition:false})");page.wait_for_timeout(350)
 assert page.locator('#viewRoot').get_attribute('data-page')=='home'
 page.evaluate("sessionStorage.setItem('wealthos-fit-tab','tools');renderPage('fitness',{transition:false})")
 page.locator('#gymGrid .gym-card').first.wait_for(timeout=25000)
 assert page.locator('.fit-tabs [data-tab="tools"]').count()==0
 assert page.locator('.fit-panel[data-tab-panel="library"]').is_visible()
 assert page.locator('.fit-panel[data-tab-panel="library"] .exercise-list').count()>0
 recommendation=page.locator('.fit-panel[data-tab-panel="library"] [data-action="body-pick-exercise"]').first
 chosen=recommendation.get_attribute('data-exercise')
 recommendation.click()
 page.wait_for_function('(q)=>!GYM.loading && gymUI().q===q',arg=chosen)
 assert page.locator('#gymSearch').input_value()==chosen
 page.evaluate("openRecommendedGym('俯卧撑')")
 page.wait_for_function("!GYM.loading && gymUI().q==='俯卧撑' && GYM.items.length>0")
 assert page.locator('#gymSearch').input_value()=='俯卧撑'
 page.locator('#gymGrid [data-action="gym-detail"]').first.click();page.locator('#gymModal').wait_for()
 page.screenshot(path='artifacts/gym-connected-detail.png')
 page.evaluate("closeGymModal()")
 page.locator('#gymGrid [data-action="gym-add-plan"]').first.click()
 page.locator('#gymAddPlanForm').wait_for()
 assert page.locator('#gymAddPlanForm [name="exerciseId"]').input_value()
 page.evaluate('window.UISheet.close()')
 # A dropped request stays actionable and retry recovers with the real service.
 page.route('**/api/gym/status*',lambda r:r.abort('failed'))
 page.evaluate("GYM.status=null;GYM.loadedOnce=false;loadGym(true)")
 page.wait_for_function('!GYM.loading && !!GYM.error')
 assert '无法连接本地服务' in page.locator('#gymGrid').inner_text()
 page.unroute('**/api/gym/status*')
 page.locator('#gymGrid [data-action="gym-retry"]').click()
 page.wait_for_function('!GYM.loading && !GYM.error && GYM.items.length>0',timeout=25000)
 assert not errors,errors
 b.close()
print('PASS: real login/catalogue/search/detail; merged tools migration; network failure + retry; roles/today merged')

import base64,time
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
 browser=pw.chromium.launch()
 context=browser.new_context(viewport={'width':1440,'height':1000})
 base='http://127.0.0.1:8880'
 assert context.request.post(base+'/api/login',data={'username':'demo','password':'Demo1234!'}).ok
 p=context.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.goto(base);p.get_by_role('button',name='UI 学习',exact=True).click()
 frame=p.frame_locator('.ui-learning-frame');frame.locator('#resultsCount').wait_for()
 assert int(frame.locator('#resultsCount').inner_text())>=108
 title='UI learning regression '+str(int(time.time()))
 frame.locator('#addItem').click();frame.locator('#itemForm [name=title]').fill(title);frame.locator('[name=prompt]').fill('Preserve state and test layout.')
 png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jv1sAAAAASUVORK5CYII=')
 frame.locator('#imageFile').set_input_files({'name':'sample.png','mimeType':'image/png','buffer':png})
 frame.locator('[name=demo]').select_option('image');frame.get_by_role('button',name='保存知识',exact=True).click()
 frame.locator('.account-sync').filter(has_text='已保存到账户').wait_for()
 saved=context.request.get(base+'/api/ui-learning').json();item=next(x for x in saved['document']['customItems'] if x['title']==title)
 assert saved['document']['images'][item['id']].startswith('data:image/png;base64,')
 p.reload();p.get_by_role('button',name='UI 学习',exact=True).click();frame.locator('#searchInput').fill(title)
 frame.locator('.result-item').first.click();assert frame.locator('#detailHead h2').inner_text()==title
 frame.get_by_role('button',name='☆ 收藏',exact=True).click();frame.get_by_role('combobox',name='学习进度').select_option('practiced')
 frame.locator('.account-sync').filter(has_text='已保存到账户').wait_for()
 data=context.request.get(base+'/api/ui-learning').json()['document'];assert item['id'] in data['favorites'] and data['progress'][item['id']]=='practiced'
 with p.expect_download() as download:frame.locator('#exportBtn').click()
 assert download.value.suggested_filename.endswith('.json')
 p.screenshot(path='artifacts/critique/ui-learning-desktop-test.png')
 for width in [390,360]:
  p.set_viewport_size({'width':width,'height':844});p.wait_for_timeout(450)
  assert frame.locator('#exportBtn').is_visible() and frame.locator('#importBtn').is_visible()
  assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  assert frame.locator('body').evaluate('el=>el.scrollWidth<=innerWidth+1')
  p.screenshot(path=f'artifacts/critique/ui-learning-{width}.png')
 # Conflict must block silent navigation and offer recovery, never claim a save.
 p.route('**/api/ui-learning',lambda route:route.fulfill(status=409,json={'detail':'Other window updated'}) if route.request.method=='PUT' else route.continue_())
 frame.get_by_role('combobox',name='学习进度').select_option('learning')
 frame.get_by_role('button',name='重试保存',exact=True).wait_for(state='visible')
 assert frame.get_by_role('button',name='重新读取账户资料',exact=True).is_visible()
 assert p.evaluate('window.uiLearningDirty===true')
 assert not errors,errors
 browser.close()
print('PASS real backend UI: tab, search, custom knowledge + image, reload, favorite, progress, export, 390/360 layout, conflict guard')

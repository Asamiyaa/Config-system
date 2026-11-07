from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
 b=pw.chromium.launch();p=b.new_page(viewport={'width':1400,'height':900});errors=[];p.on('pageerror',lambda e:errors.append(str(e)));board={'id':'test','title':'测试画板','version':0,'scene':{},'revisions':[]};saved=[]
 def api(route):
  if route.request.method=='PUT':
   value=route.request.post_data_json;assert value['version']==board['version'];board.update(value);board['version']+=1;saved.append(value);route.fulfill(json={'ok':True,'version':board['version']})
  else:route.fulfill(json=board)
 p.route('**/api/boards/test',api)
 p.goto('http://127.0.0.1:8877/static/whiteboard/index.html?id=test')
 p.locator('.excalidraw').wait_for(timeout=60000);p.wait_for_timeout(2000)
 p.locator('label').filter(has=p.locator('input[data-testid="toolbar-rectangle"]')).click();p.mouse.move(500,350);p.mouse.down();p.mouse.move(700,500,steps=8);p.mouse.up();p.wait_for_timeout(2000)
 p.screenshot(path='artifacts/excal-debug.png')
 assert saved and len(board['scene']['elements'])>0,board
 p.locator('input[aria-label="画板名称"]').fill('历史画板');p.wait_for_timeout(1500)
 assert board['title']=='历史画板'
 count=len(board['scene']['elements']);p.reload();p.locator('.excalidraw').wait_for();p.wait_for_timeout(1500)
 assert count==len(board['scene']['elements'])
 p.screenshot(path='artifacts/excalidraw-integrated.png')
 assert not errors,errors
 b.close()
print('PASS: real Excalidraw load, draw, account autosave, title and reload')

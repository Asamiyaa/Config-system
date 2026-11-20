"""Browser regression for interruption, modal focus and reduced motion. Mock account only."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

with sync_playwright() as pw:
 b=pw.chromium.launch()
 for width in [1440,390]:
  p=b.new_page(viewport={"width":width,"height":900 if width>500 else 844})
  errors=[]
  p.on("pageerror",lambda e:errors.append(str(e)))
  seed=json.loads(Path("data/seed_state.json").read_text(encoding="utf-8"))
  def api(r):
   if "/api/session" in r.request.url:data={"authenticated":True,"username":"test"}
   elif "/api/state" in r.request.url:data={"state":seed,"ok":True}
   else:data={"boards":[],"jobs":[],"settings":{}}
   r.fulfill(json=data)
  p.route("**/api/**",api)
  p.goto("http://127.0.0.1:8877/static/index.html")
  p.locator("#viewRoot[data-page=dailyflow]").wait_for()
  p.evaluate("for(let i=0;i<8;i++){renderPage('calendar');renderPage('dailyflow');}renderPage('dailyflow',{transition:false})")
  p.wait_for_timeout(600)
  assert p.locator("#flowViewToggle").is_visible()
  # Present a fictional catalogue entry through the production detail handler.
  p.evaluate("""() => {
   GYM.detail.set('motion-test',{id:'motion-test',name:'深蹲 · 体验验证',nameEn:'Squat',bodyPartZh:'腿部',targetZh:'股四头肌',equipmentZh:'自重',categoryZh:'力量',instructions:['双脚站稳，缓慢屈膝。','保持躯干稳定，回到站姿。'],secondaryMusclesZh:['臀肌'],description:'虚构测试条目，用于验证交互。',instructionsTranslated:true,descriptionTranslated:true});
   const card=document.createElement('article');card.className='gym-card';card.innerHTML='<button data-action="gym-detail" data-id="motion-test">查看深蹲详情</button>';document.querySelector('#viewRoot').prepend(card);
  }""")
  p.evaluate("""async()=>{
   const original=gymRequest;
   gymRequest=url=>new Promise(resolve=>setTimeout(()=>resolve({...GYM.detail.get('motion-test'),id:url.endsWith('slow')?'slow':'fast',name:url.endsWith('slow')?'slow':'fast'}),url.endsWith('slow')?150:10));
   try{await Promise.all([openGymDetail('slow'),openGymDetail('fast')]);if(!document.querySelector('#gymModalTitle').textContent.includes('fast'))throw Error('stale detail');closeGymModal();}finally{gymRequest=original;}
  }""")
  trigger=p.locator('[data-action="gym-detail"][data-id="motion-test"]')
  trigger.click();p.locator('#gymModal').wait_for();p.wait_for_timeout(400)
  assert p.evaluate("document.activeElement.matches('.gym-modal-x')")
  assert p.evaluate("getComputedStyle(document.body).overflow=='hidden'")
  p.locator('#gymModal button').last.focus();p.keyboard.press('Tab')
  assert p.evaluate("document.activeElement===document.querySelector('#gymModal button')")
  p.locator('#gymModal video').dispatch_event('error')
  assert p.locator('.media-recovery button').is_visible()
  if width<500:
   box=p.locator('.gym-modal').bounding_box();assert abs(box['y']+box['height']-844)<2
  p.screenshot(path=f'artifacts/motion-detail-{width}.png')
  p.keyboard.press('Escape');assert p.locator('#gymModal').count()==0
  assert trigger.evaluate('(el)=>el===document.activeElement')
  p.emulate_media(reduced_motion='reduce');trigger.click();p.wait_for_timeout(50)
  assert p.evaluate("document.querySelector('.gym-modal').getAnimations().length===0")
  p.keyboard.press('Escape')
  # Continuous scroll returns to its initial state.
  p.evaluate("document.querySelector('#viewRoot').style.minHeight='2400px';window.scrollTo(0,700)")
  p.wait_for_timeout(100)
  assert p.locator('.reading-progress').evaluate("el=>getComputedStyle(el).transform")!='matrix(0, 0, 0, 1, 0, 0)'
  p.evaluate('scrollTo(0,0)');p.wait_for_timeout(100)
  assert p.locator('.reading-progress').evaluate("el=>getComputedStyle(el).transform")=='matrix(0, 0, 0, 1, 0, 0)'
  p.evaluate("ui.flowViewMode='checklist';state.dailyFlows.weekday=[];ui.flowKind='weekday';renderPage('dailyflow',{transition:false});toast('模拟保存失败，请重试',true)")
  assert p.locator('[data-action="flow-new"]').count()>0
  assert p.locator('#toast').get_attribute('role')=='status'
  p.screenshot(path=f'artifacts/motion-empty-error-{width}.png')
  assert not errors,errors
  p.close()
 fallback=b.new_page()
 fallback.add_init_script("const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:get.call(this,type,...args)}")
 fallback.goto('http://127.0.0.1:8877/static/anatomy/index.html')
 fallback.wait_for_function("document.querySelector('#status').textContent.includes('3D')")
 assert fallback.locator('#mode').is_disabled()
 fallback.close()
 b.close()
print('PASS: rapid navigation, detail spatial entrance, focus trap/return, reduced motion, reversible scroll, empty/error states; desktop + mobile')

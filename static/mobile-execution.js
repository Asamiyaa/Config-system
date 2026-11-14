/* Execution shortcuts share the account state and calendar task store. */
(() => {
 const root=document.querySelector('#viewRoot');
 function composer(){
  if(document.querySelector('#quickTodo'))return;
  const dialog=document.createElement('dialog');dialog.id='quickTodo';
  dialog.innerHTML='<form><h2>快捷待办</h2><label>事项<input name="title" required maxlength="180" autofocus></label><label>日期<input name="date" type="date"></label><label>时间<input name="time" type="time"></label><p>选择日期后显示在周历中。</p><button type="button" data-voice>语音输入</button><p data-feedback role="status"></p><button type="submit">保存待办</button><button type="button" data-close>取消</button></form>';
  document.body.append(dialog);dialog.showModal();
  let recognition;
  const close=()=>{recognition?.abort();dialog.remove();};
  dialog.querySelector('[data-close]').onclick=close;dialog.addEventListener('cancel',close);
  dialog.querySelector('[data-voice]').onclick=()=>{
   if(window.AndroidApp?.startVoiceInput){AndroidApp.startVoiceInput();return;}
   const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
   const feedback=dialog.querySelector('[data-feedback]');
   if(!Speech){feedback.textContent='当前设备不支持网页语音识别，请使用键盘麦克风或文字输入。';return;}
   recognition?.abort();recognition=new Speech();recognition.lang='zh-CN';
   recognition.onresult=e=>{dialog.querySelector('[name=title]').value=e.results[0][0].transcript;feedback.textContent='已识别，请确认后保存。';};
   recognition.onerror=()=>feedback.textContent='语音未完成，请检查麦克风权限或使用文字输入。';
   try{recognition.start();feedback.textContent='正在听…';}catch(_){feedback.textContent='无法启动麦克风，请使用文字输入。';}
  };
  dialog.querySelector('form').onsubmit=async e=>{
   e.preventDefault();const form=new FormData(e.target),title=String(form.get('title')).trim();if(!title)return;
   const date=String(form.get('date')),time=String(form.get('time'));
   if(time&&!date){dialog.querySelector('[data-feedback]').textContent='请为提醒时间选择日期。';return;}
   const button=dialog.querySelector('[type=submit]');button.disabled=true;
   focusTasks().push({id:crypto.randomUUID(),title,startDate:date,dueDate:date,time,project:'收集箱',quadrant:'later',done:false,createdAt:new Date().toISOString()});
   const ok=await persist({quiet:true});close();toast(ok?'待办已保存'+(date?'，已加入周历':''):'尚未同步，请使用页面上的重试保存');
   if(currentPage==='calendar'||currentPage==='inbox')renderPage(currentPage);
  };
 }
 const dock=document.querySelector('.spatial-dock');
 if(dock){const button=document.createElement('button');button.type='button';button.className='quick-todo';button.innerHTML='<b>＋</b><span>待办</span>';button.onclick=composer;dock.insertBefore(button,dock.children[2]);}
 window.addEventListener('native-voice',e=>{const input=document.querySelector('#quickTodo [name=title]');if(input)input.value=String(e.detail||'');});
 window.openQuickTodo=composer;
})();

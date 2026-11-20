/* Account-scoped adapter. The original knowledge renderer stays independent. */
(() => {
 'use strict';
 let version=0,userId,key,pending=null,inflight=false,timer,conflict=false,editing=false;
 const bar=document.createElement('div');bar.className='account-sync';bar.setAttribute('role','status');
 const label=document.createElement('span'),retry=document.createElement('button');retry.textContent='重试保存';retry.hidden=true;
 const recover=document.createElement('button');recover.textContent='重新读取账户资料';recover.hidden=true;
 bar.append(label,retry,recover);document.body.prepend(bar);
 recover.onclick=()=>{if(!confirm('请先用“备份数据”导出未同步内容。重新读取将丢弃当前未同步草稿，是否继续？'))return;pending=null;editing=false;cache();notify();location.reload();};
 const notify=()=>{const dirty=!!pending||editing;parent.postMessage({type:'ui-learning-dirty',dirty},location.origin);return dirty;};
 function status(text,error=false){label.textContent=text;retry.hidden=!error;recover.hidden=!conflict;}
 function cache(){try{if(pending)localStorage.setItem(key,JSON.stringify({version,document:pending}));else localStorage.removeItem(key);}catch(_){/* In-memory dirty guard remains active; export stays available. */}}
 async function request(method,body){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);try{const response=await fetch('/api/ui-learning',{method,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},signal:controller.signal,...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();if(!response.ok){const error=Error(data.detail||'保存失败');error.status=response.status;throw error;}return data;}finally{clearTimeout(timeout);}}
 async function flush(){
  if(!pending||inflight||conflict)return;
  inflight=true;const snapshot=pending;status('正在保存到账户…');
  try{const result=await request('PUT',{userId,version,document:snapshot});version=result.version;if(pending===snapshot)pending=null;cache();status(result.storageWarning||'已保存到账户');}
  catch(e){conflict=e.status===409;status(conflict?e.message:'尚未同步，请重试保存或备份数据',true);}
  finally{inflight=false;notify();if(pending&&!conflict&&pending!==snapshot)flush();}
 }
 retry.onclick=()=>{if(conflict){status('请先使用“备份数据”导出当前资料，再重新打开并导入合并。',true);return;}flush();};
 window.addEventListener('online',flush);
 window.addEventListener('beforeunload',e=>{if(notify()){e.preventDefault();e.returnValue='';}});
 document.addEventListener('input',e=>{if(e.target.closest('#itemDialog,#moduleDialog')){editing=true;notify();}});
 document.addEventListener('close',e=>{if(e.target.matches('#itemDialog,#moduleDialog')){editing=false;notify();}},true);
 window.LearningStore={save(document){pending=JSON.parse(JSON.stringify(document));editing=false;cache();notify();status('等待同步…');clearTimeout(timer);timer=setTimeout(flush,350);return true;},ready:(async()=>{
  status('正在读取账户资料…');document.documentElement.classList.add('account-loading');
  try{const result=await request('GET');userId=result.userId;version=result.version;key='xindeng-ui-learning-'+userId;
   let draft;try{draft=JSON.parse(localStorage.getItem(key)||'null');}catch(_){}
   if(draft?.document){pending=draft.document;conflict=draft.version!==version;notify();status(conflict?'另一个窗口有更新，请先备份当前草稿再重新打开。':'已恢复未同步草稿',conflict);if(!conflict)setTimeout(flush,0);}
   else status('资料随新登账户保存');
   document.documentElement.classList.remove('account-loading');return {key,document:pending||result.document};
  }catch(e){status('无法读取账户资料，请确认已登录后重新打开。',true);retry.textContent='重新加载';retry.onclick=()=>location.reload();return null;}
 })()};
})();

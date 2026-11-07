/* Only a fresh downward gesture at the document top may invoke browser refresh.
 * A gesture begun in a nested scroller or below the top must never chain to it. */
(() => {
  let gesture=null;
  const top=()=>Math.max(0,document.scrollingElement?.scrollTop || window.scrollY || 0);
  document.addEventListener('touchstart',e=>{
    gesture=null;
    if(e.touches.length!==1)return;
    let node=e.target instanceof Element?e.target:null, nested=false;
    while(node && node!==document.body && node!==document.documentElement){
      const css=getComputedStyle(node);
      if(/auto|scroll/.test(css.overflowY)&&node.scrollHeight>node.clientHeight+1){nested=true;break;}
      node=node.parentElement;
    }
    gesture={x:e.touches[0].clientX,y:e.touches[0].clientY,allow:top()<=1&&!nested,scroller:nested?node:null};
  },{passive:true,capture:true});
  document.addEventListener('touchmove',e=>{
    if(!gesture||e.touches.length!==1)return;
    const dy=e.touches[0].clientY-gesture.y,dx=e.touches[0].clientX-gesture.x;
    if(dy<=4||Math.abs(dx)>Math.abs(dy))return;
    if(!gesture.allow && top()<=1 && (!gesture.scroller||gesture.scroller.scrollTop<=0) && e.cancelable)e.preventDefault();
  },{passive:false,capture:true});
  for(const name of ['touchend','touchcancel'])document.addEventListener(name,()=>{gesture=null;},{passive:true,capture:true});
})();

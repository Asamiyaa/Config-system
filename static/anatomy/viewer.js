(() => {
 const host=document.querySelector('#view'),status=document.querySelector('#status'),select=document.querySelector('#mode');
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,.1,10000);
 let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true});}catch(e){status.textContent='当前浏览器无法启用 WebGL，请开启硬件加速或更换浏览器。';return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));host.append(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xffffff,0x334039,.8));const light=new THREE.DirectionalLight(0xffffff,.5);light.position.set(0,1,2);scene.add(light);
 const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=false;
 let group=new THREE.Group();scene.add(group);let manifest,token=0,selected,center=new THREE.Vector3(),distance=300;
 const draw=()=>renderer.render(scene,camera);controls.addEventListener('change',draw);
 function size(){const r=host.getBoundingClientRect();renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();draw();}new ResizeObserver(size).observe(host);
 function fit(back=false){const box=new THREE.Box3().setFromObject(group);box.getCenter(center);distance=box.getSize(new THREE.Vector3()).length()*1.6;controls.target.copy(center);camera.position.set(center.x,center.y,center.z+(back?-distance:distance));camera.near=Math.max(.01,distance/1000);camera.far=distance*10;camera.updateProjectionMatrix();controls.update();draw();}
 async function load(){parent.postMessage({type:'anatomy-mode',mode:select.value},location.origin);const run=++token;selected=null;group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});scene.remove(group);group=new THREE.Group();scene.add(group);const target=group;const rows=manifest[select.value]||[],queue=[...rows];let count=0,failed=0;
 document.querySelector('#selection').textContent='拖动旋转，点击结构查看名称。';status.textContent='正在加载本地网格…';
 async function worker(){while(queue.length&&run===token){const row=queue.shift();try{const obj=await new THREE.OBJLoader().loadAsync('../models/bodyparts3d/'+row.id+'.obj');if(run!==token)return;obj.rotation.x=-Math.PI/2;obj.traverse(o=>{if(o.isMesh){o.material=new THREE.MeshPhongMaterial({color:select.value==='muscle'?0xb96558:select.value==='skin'?0xc9997a:0xe3dac0,shininess:12,specular:0x111111,side:THREE.DoubleSide});o.userData=row;}});target.add(obj);}catch(e){failed++;}count++;if(count===rows.length){fit();}status.textContent=`已加载 ${count-failed}/${rows.length} 个结构${failed?' · '+failed+' 个失败，请切换图层重试':''}`;}}
 await Promise.all(Array.from({length:6},worker));if(run===token){window.anatomyLoaded={mode:select.value,count:count-failed,failed};draw();}
 }
 let down;renderer.domElement.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY});renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;const r=renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=ray.intersectObjects(group.children,true).find(h=>h.object.visible);if(!hit)return;if(selected)selected.material.emissive.setHex(0);selected=hit.object;selected.material.emissive.setHex(0x335533);document.querySelector('#selection').textContent=selected.userData.name+' · '+selected.userData.id;parent.postMessage({type:'anatomy-select',...selected.userData},location.origin);draw();});
 document.querySelector('#reset').onclick=()=>fit();document.querySelector('#back').onclick=()=>fit(true);
 document.querySelector('#isolate').onclick=()=>{if(!selected)return;group.traverse(o=>{if(o.isMesh)o.visible=o===selected;});draw();};document.querySelector('#showAll').onclick=()=>{group.traverse(o=>{if(o.isMesh)o.visible=true;});draw();};
 select.onchange=load;const mode=new URLSearchParams(location.search).get('mode');if(['muscle','skeleton','skin','head'].includes(mode))select.value=mode;
 fetch('manifest.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{manifest=data;load();}).catch(()=>status.textContent='模型清单读取失败，请检查本地服务并刷新。');
})();

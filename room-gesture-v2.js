"use strict";
(()=>{
  const room=document.querySelector(".home-room");
  const layer=document.querySelector(".home-room-decor");
  if(!room||!layer)return;

  const KEY="tiranon-room-layout-v1";
  const DECOR_KEY="tiranon-room-decor-v1";
  const TEST=new URLSearchParams(location.search).get("run-test")==="1";
  const MIN=.45,MAX=2.4;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  let state=load();
  let gesture=null;

  function load(){
    try{
      const raw=JSON.parse(localStorage.getItem(KEY)||"null");
      return raw&&raw.positions?{positions:{...raw.positions}}:{positions:{}};
    }catch(e){return {positions:{}};}
  }
  function save(){if(!TEST)try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}}
  function decorIds(){
    try{return JSON.parse(localStorage.getItem(DECOR_KEY)||"{}")||{};}catch(e){return {};}
  }
  function itemFor(node){
    const slot=node.dataset.roomSlot;
    const id=decorIds()[slot];
    const items=window.TIRANON_COLLECTION_V2?.items||[];
    return items.find(x=>x.id===id)||items.find(x=>x.slot===slot&&x.name===node.title)||null;
  }
  function bounds(node,scale){
    const r=room.getBoundingClientRect();
    const w=node.offsetWidth*scale,h=node.offsetHeight*scale;
    return {r,minX:-w*.3,maxX:r.width-w*.7,minY:-h*.3,maxY:r.height-h*.7};
  }
  function pose(node,left,top,scale){
    scale=clamp(scale,MIN,MAX);
    const b=bounds(node,scale);
    left=clamp(left,b.minX,b.maxX);top=clamp(top,b.minY,b.maxY);
    node.style.left=`${left}px`;node.style.top=`${top}px`;
    node.style.right="auto";node.style.bottom="auto";
    node.style.transformOrigin="0 0";node.style.transform=`scale(${scale})`;
    node.dataset.roomScale=String(scale);
    return {left,top,scale};
  }
  function apply(node){
    if(!node.classList.contains("has-item"))return;
    const item=itemFor(node);if(!item)return;
    const p=state.positions[item.id];
    if(!p||!Number.isFinite(Number(p.x))||!Number.isFinite(Number(p.y)))return;
    const r=room.getBoundingClientRect();
    pose(node,Number(p.x)*r.width,Number(p.y)*r.height,Number(p.scale)||1);
  }
  function applyAll(){state=load();layer.querySelectorAll(".home-room-decor-slot.has-item").forEach(apply);}
  function ensure(node,item){
    const p=state.positions[item.id];
    const r=room.getBoundingClientRect();
    if(p&&Number.isFinite(Number(p.x))&&Number.isFinite(Number(p.y)))return pose(node,Number(p.x)*r.width,Number(p.y)*r.height,Number(p.scale)||1);
    const n=node.getBoundingClientRect();
    return pose(node,n.left-r.left,n.top-r.top,1);
  }
  function store(){
    if(!gesture)return;
    const r=room.getBoundingClientRect();
    const left=parseFloat(gesture.node.style.left),top=parseFloat(gesture.node.style.top);
    if(!Number.isFinite(left)||!Number.isFinite(top))return;
    state.positions[gesture.item.id]={x:left/r.width,y:top/r.height,scale:Number(gesture.node.dataset.roomScale)||1};
    save();
  }

  const style=document.createElement("style");
  style.textContent=`
    .room-edit-bar{display:none!important}
    .home-room-decor{z-index:8!important}
    .home-room-decor-slot.has-item{pointer-events:auto!important;touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab}
    .home-room-decor-slot.has-item img{pointer-events:none;-webkit-user-drag:none}
    .home-room-decor-slot.has-item.is-gesture{cursor:grabbing;filter:drop-shadow(0 8px 7px rgba(35,72,56,.28))}
    .room-gesture-note{margin:-5px 0 2px;text-align:center;color:#5b776f;font-size:10px;font-weight:900;line-height:1.3}
  `;
  document.head.appendChild(style);
  document.querySelectorAll(".room-edit-bar").forEach(x=>x.remove());
  const note=document.createElement("p");
  note.className="room-gesture-note";
  note.textContent="飾りはそのまま移動・2本指で拡大縮小できるよ";
  room.insertAdjacentElement("afterend",note);

  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
  function single(p){
    const rect=gesture.node.getBoundingClientRect();
    gesture.mode="drag";gesture.dragId=p.id;
    gesture.ox=p.x-rect.left;gesture.oy=p.y-rect.top;
  }
  function pinch(){
    const [a,b]=[...gesture.ptr.values()].slice(0,2);
    const r=room.getBoundingClientRect(),c=mid(a,b);
    const left=parseFloat(gesture.node.style.left)||0,top=parseFloat(gesture.node.style.top)||0;
    const scale=Number(gesture.node.dataset.roomScale)||1;
    gesture.mode="pinch";gesture.d0=Math.max(8,dist(a,b));gesture.s0=scale;
    gesture.ax=(c.x-r.left-left)/(gesture.node.offsetWidth*scale||1);
    gesture.ay=(c.y-r.top-top)/(gesture.node.offsetHeight*scale||1);
  }
  function down(e,node){
    if(e.pointerType==="mouse"&&e.button!==0)return;
    const item=itemFor(node);if(!item)return;
    if(!gesture||gesture.node!==node){if(gesture)store();ensure(node,item);gesture={node,item,ptr:new Map()};}
    gesture.ptr.set(e.pointerId,{id:e.pointerId,x:e.clientX,y:e.clientY});
    node.classList.add("is-gesture");
    try{node.setPointerCapture(e.pointerId);}catch(err){}
    gesture.ptr.size===1?single(gesture.ptr.get(e.pointerId)):pinch();
    e.preventDefault();
  }
  function move(e){
    if(!gesture||!gesture.ptr.has(e.pointerId))return;
    gesture.ptr.set(e.pointerId,{id:e.pointerId,x:e.clientX,y:e.clientY});
    const r=room.getBoundingClientRect();
    if(gesture.ptr.size>=2){
      if(gesture.mode!=="pinch")pinch();
      const [a,b]=[...gesture.ptr.values()].slice(0,2),c=mid(a,b);
      const scale=clamp(gesture.s0*dist(a,b)/gesture.d0,MIN,MAX);
      pose(gesture.node,c.x-r.left-gesture.ax*gesture.node.offsetWidth*scale,c.y-r.top-gesture.ay*gesture.node.offsetHeight*scale,scale);
    }else{
      const p=[...gesture.ptr.values()][0];if(!p)return;
      if(gesture.mode!=="drag"||gesture.dragId!==p.id)single(p);
      pose(gesture.node,p.x-r.left-gesture.ox,p.y-r.top-gesture.oy,Number(gesture.node.dataset.roomScale)||1);
    }
    e.preventDefault();
  }
  function up(e){
    if(!gesture||!gesture.ptr.has(e.pointerId))return;
    const node=gesture.node;gesture.ptr.delete(e.pointerId);
    try{node.releasePointerCapture(e.pointerId);}catch(err){}
    if(!gesture.ptr.size){store();node.classList.remove("is-gesture");gesture=null;}
    else if(gesture.ptr.size===1)single([...gesture.ptr.values()][0]);
    else pinch();
    e.preventDefault();
  }

  layer.addEventListener("pointerdown",e=>{const node=e.target.closest?.(".home-room-decor-slot.has-item");if(node)down(e,node);});
  layer.addEventListener("pointermove",move);layer.addEventListener("pointerup",up);layer.addEventListener("pointercancel",up);
  let q=false;
  new MutationObserver(()=>{if(q)return;q=true;queueMicrotask(()=>{q=false;applyAll();});}).observe(layer,{subtree:true,attributes:true,attributeFilter:["class","src","title"]});
  window.addEventListener("resize",()=>requestAnimationFrame(applyAll));
  window.TIRANON_ROOM_GESTURE_V2={render:applyAll};
  applyAll();
})();

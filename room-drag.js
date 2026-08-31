"use strict";

/* Touch-friendly free placement for equipped room decorations. */
(()=>{
  const home=document.querySelector(".tiranon-home");
  const room=document.querySelector(".home-room");
  const layer=document.querySelector(".home-room-decor");
  if(!home||!room||!layer)return;

  const LAYOUT_STORAGE_KEY="tiranon-room-layout-v1";
  const DECOR_STORAGE_KEY="tiranon-room-decor-v1";
  const TEST_MODE=new URLSearchParams(location.search).get("run-test")==="1";
  const collectionItems=()=>window.TIRANON_COLLECTION_V2?.items||[];

  function loadLayout(){
    try{
      const raw=JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY)||"null");
      if(raw&&typeof raw==="object"&&raw.positions&&typeof raw.positions==="object")return {positions:{...raw.positions}};
    }catch(error){}
    return {positions:{}};
  }
  let layoutState=loadLayout();
  function saveLayout(){
    if(TEST_MODE)return;
    try{localStorage.setItem(LAYOUT_STORAGE_KEY,JSON.stringify(layoutState));}catch(error){}
  }

  function currentDecorIds(){
    try{
      const raw=JSON.parse(localStorage.getItem(DECOR_STORAGE_KEY)||"null");
      return raw&&typeof raw==="object"?raw:{};
    }catch(error){return {};}
  }
  function itemForSlot(slot,node){
    const savedId=currentDecorIds()[slot];
    const items=collectionItems();
    if(savedId){
      const saved=items.find(item=>item.id===savedId);
      if(saved)return saved;
    }
    const title=node?.title||"";
    return items.find(item=>item.slot===slot&&item.name===title)||null;
  }
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  function dragBounds(slot,roomRect,nodeRect){
    const w=roomRect.width,h=roomRect.height,iw=nodeRect.width,ih=nodeRect.height;
    let minX=4,maxX=Math.max(4,w-iw-4);
    let minY=4,maxY=Math.max(4,h-ih-4);

    if(slot==="wall"){
      minY=Math.min(maxY,34);
      maxY=Math.max(minY,Math.min(maxY,h*.58-ih));
    }else if(slot==="rug"){
      minY=Math.min(maxY,Math.max(4,h*.58));
    }else if(slot==="decor"||slot==="floor"){
      minY=Math.min(maxY,Math.max(4,h*.43));
    }else if(slot==="lamp"){
      minY=Math.min(maxY,18);
    }
    return {minX,maxX,minY,maxY};
  }

  function clearCustomPosition(node){
    node.style.left="";
    node.style.top="";
    node.style.right="";
    node.style.bottom="";
    node.style.transform="";
  }
  function setCustomPosition(node,left,top){
    node.style.left=`${Math.round(left*10)/10}px`;
    node.style.top=`${Math.round(top*10)/10}px`;
    node.style.right="auto";
    node.style.bottom="auto";
    node.style.transform="none";
  }
  function applyPosition(node){
    if(!node?.classList.contains("has-item"))return;
    const slot=node.dataset.roomSlot;
    const item=itemForSlot(slot,node);
    if(!item)return;
    const pos=layoutState.positions[item.id];
    if(!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.y)){
      clearCustomPosition(node);
      return;
    }
    const roomRect=room.getBoundingClientRect();
    const nodeRect=node.getBoundingClientRect();
    const bounds=dragBounds(slot,roomRect,nodeRect);
    const left=clamp(pos.x*roomRect.width,bounds.minX,bounds.maxX);
    const top=clamp(pos.y*roomRect.height,bounds.minY,bounds.maxY);
    setCustomPosition(node,left,top);
  }
  function applyAllPositions(){
    layer.querySelectorAll(".home-room-decor-slot").forEach(applyPosition);
    updateEditAvailability();
  }

  const style=document.createElement("style");
  style.textContent=`
    .room-edit-bar{display:flex;align-items:center;justify-content:center;gap:9px;margin-top:-4px;}
    .room-edit-button{min-height:42px;padding:8px 16px;border:2px solid rgba(255,255,255,.94);border-radius:999px;color:#35675a;background:rgba(255,255,255,.9);box-shadow:0 4px 10px rgba(36,91,78,.11);font-size:13px;font-weight:1000;}
    .room-edit-button[disabled]{opacity:.48;box-shadow:none;}
    .room-edit-hint{display:none;color:#55776d;font-size:11px;font-weight:900;}
    .room-edit-bar.is-editing .room-edit-button{color:#fff;background:#31855d;border-color:#fff;}
    .room-edit-bar.is-editing .room-edit-hint{display:inline;}
    .home-room.is-room-editing .home-room-decor{z-index:8;pointer-events:auto;}
    .home-room.is-room-editing .home-room-decor-slot.has-item{pointer-events:auto;touch-action:none;cursor:grab;outline:3px dashed rgba(48,142,99,.72);outline-offset:2px;border-radius:14px;user-select:none;-webkit-user-select:none;}
    .home-room.is-room-editing .home-room-decor-slot.has-item::after{content:"↕";position:absolute;right:2px;top:2px;display:grid;place-items:center;width:22px;height:22px;border-radius:50%;color:#fff;background:rgba(40,121,83,.88);font-size:12px;font-weight:1000;box-shadow:0 2px 5px rgba(0,0,0,.18);}
    .home-room.is-room-editing .home-room-decor-slot.is-dragging{cursor:grabbing;outline-style:solid;filter:drop-shadow(0 8px 6px rgba(35,72,56,.28));}
    .home-prebirth-fixed .room-edit-bar{display:none!important;}
    @media(max-width:520px){.room-edit-bar{gap:6px}.room-edit-button{min-height:38px;padding:7px 13px;font-size:12px}.room-edit-hint{font-size:10px}}
  `;
  document.head.appendChild(style);

  const editBar=document.createElement("div");
  editBar.className="room-edit-bar";
  editBar.innerHTML=`<button class="room-edit-button" type="button" aria-pressed="false">✋ おへや編集</button><span class="room-edit-hint">飾りを指で動かしてね</span>`;
  room.insertAdjacentElement("afterend",editBar);
  const editButton=editBar.querySelector(".room-edit-button");

  let editing=false;
  function updateEditAvailability(){
    const hasAny=Boolean(layer.querySelector(".home-room-decor-slot.has-item"));
    editButton.disabled=!hasAny;
    if(!hasAny&&editing)setEditing(false);
  }
  function setEditing(next){
    editing=Boolean(next);
    room.classList.toggle("is-room-editing",editing);
    editBar.classList.toggle("is-editing",editing);
    editButton.setAttribute("aria-pressed",String(editing));
    editButton.textContent=editing?"✓ 配置を決定":"✋ おへや編集";
    if(!editing)applyAllPositions();
  }
  editButton.addEventListener("click",()=>{if(!editButton.disabled)setEditing(!editing);});

  let drag=null;
  function startDrag(event,node){
    if(!editing||event.button>0)return;
    const slot=node.dataset.roomSlot;
    const item=itemForSlot(slot,node);
    if(!item)return;
    const roomRect=room.getBoundingClientRect();
    const nodeRect=node.getBoundingClientRect();
    drag={pointerId:event.pointerId,node,item,slot,offsetX:event.clientX-nodeRect.left,offsetY:event.clientY-nodeRect.top};
    node.classList.add("is-dragging");
    try{node.setPointerCapture(event.pointerId);}catch(error){}
    event.preventDefault();
  }
  function moveDrag(event){
    if(!drag||event.pointerId!==drag.pointerId)return;
    const roomRect=room.getBoundingClientRect();
    const nodeRect=drag.node.getBoundingClientRect();
    const bounds=dragBounds(drag.slot,roomRect,nodeRect);
    const left=clamp(event.clientX-roomRect.left-drag.offsetX,bounds.minX,bounds.maxX);
    const top=clamp(event.clientY-roomRect.top-drag.offsetY,bounds.minY,bounds.maxY);
    setCustomPosition(drag.node,left,top);
    drag.lastLeft=left;
    drag.lastTop=top;
    event.preventDefault();
  }
  function endDrag(event){
    if(!drag||event.pointerId!==drag.pointerId)return;
    const active=drag;
    active.node.classList.remove("is-dragging");
    try{active.node.releasePointerCapture(event.pointerId);}catch(error){}
    if(Number.isFinite(active.lastLeft)&&Number.isFinite(active.lastTop)){
      const roomRect=room.getBoundingClientRect();
      layoutState.positions[active.item.id]={x:active.lastLeft/roomRect.width,y:active.lastTop/roomRect.height};
      saveLayout();
    }
    drag=null;
  }

  layer.addEventListener("pointerdown",event=>{
    const node=event.target.closest?.(".home-room-decor-slot.has-item");
    if(node)startDrag(event,node);
  });
  layer.addEventListener("pointermove",moveDrag);
  layer.addEventListener("pointerup",endDrag);
  layer.addEventListener("pointercancel",endDrag);

  let observerQueued=false;
  const observer=new MutationObserver(()=>{
    if(observerQueued)return;
    observerQueued=true;
    queueMicrotask(()=>{observerQueued=false;applyAllPositions();});
  });
  observer.observe(layer,{subtree:true,attributes:true,attributeFilter:["class","src","title"]});

  window.addEventListener("resize",()=>requestAnimationFrame(applyAllPositions));
  window.TIRANON_ROOM_DRAG={
    render:applyAllPositions,
    edit(value=true){setEditing(Boolean(value));},
    reset(){layoutState={positions:{}};saveLayout();layer.querySelectorAll(".home-room-decor-slot").forEach(clearCustomPosition);}
  };

  applyAllPositions();
})();

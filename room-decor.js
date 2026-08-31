"use strict";

/* Persistent Tiranon Home decoration using the same real images as collection cards. */
(()=>{
  if(typeof game==="undefined")return;

  const DECOR_STORAGE_KEY="tiranon-room-decor-v1";
  const COLLECTION_STORAGE_KEY="tiranon-route-collection-v1";
  const DECOR_TEST_MODE=new URLSearchParams(location.search).get("run-test")==="1";
  const SLOT_LABELS={wall:"壁かざり",lamp:"ランプ",decor:"置きもの",floor:"床アイテム",rug:"ラグ"};

  const DECOR_ITEMS=window.TIRANON_COLLECTION_V2?.items||[];
  const ITEM_BY_ID=new Map(DECOR_ITEMS.map(item=>[item.id,item]));

  function ownedIds(){
    try{
      const raw=JSON.parse(localStorage.getItem(COLLECTION_STORAGE_KEY)||"null");
      return new Set(Array.isArray(raw?.owned)?raw.owned:[]);
    }catch(error){return new Set();}
  }
  function defaultDecorState(){return {wall:null,lamp:null,decor:null,floor:null,rug:null};}
  function loadDecorState(){
    const base=defaultDecorState();
    try{
      const raw=JSON.parse(localStorage.getItem(DECOR_STORAGE_KEY)||"null");
      if(!raw||typeof raw!=="object")return base;
      const owned=ownedIds();
      for(const slot of Object.keys(base)){
        const id=typeof raw[slot]==="string"?raw[slot]:null;
        const item=id?ITEM_BY_ID.get(id):null;
        if(item&&item.slot===slot&&owned.has(id))base[slot]=id;
      }
    }catch(error){}
    return base;
  }

  let decorState=loadDecorState();
  function saveDecorState(){
    if(DECOR_TEST_MODE)return;
    try{localStorage.setItem(DECOR_STORAGE_KEY,JSON.stringify(decorState));}catch(error){}
  }

  const style=document.createElement("style");
  style.textContent=`
    .home-room-decor{position:absolute;inset:0;z-index:2;pointer-events:none;}
    .home-room-decor-slot{position:absolute;display:none;place-items:center;overflow:hidden;filter:drop-shadow(0 5px 4px rgba(45,58,48,.18));}
    .home-room-decor-slot.has-item{display:grid;}
    .home-room-decor-slot img{display:block;width:100%;height:100%;object-fit:contain;}
    .home-room-decor-slot--wall{top:78px;left:18px;width:92px;height:92px;padding:5px;border:5px solid rgba(255,250,235,.96);border-radius:12px;background:#fff;box-shadow:0 5px 12px rgba(57,43,28,.18);}
    .home-room-decor-slot--lamp{right:8px;bottom:18px;width:105px;height:122px;z-index:3;}
    .home-room-decor-slot--decor{left:12px;bottom:18px;width:100px;height:98px;z-index:3;}
    .home-room-decor-slot--floor{right:18px;bottom:14px;width:104px;height:92px;z-index:3;}
    .home-room-decor-slot--rug{left:50%;bottom:0;width:230px;height:82px;z-index:0;transform:translateX(-50%);opacity:.78;}
    .home-room-decor-slot--rug img{object-fit:fill;border-radius:50%;}
    .home-prebirth-fixed .home-room-decor{display:none!important;}

    .collection-item.is-decorable{cursor:pointer;border:2px solid transparent;transition:border-color .16s ease,transform .16s ease,background .16s ease;}
    .collection-item.is-decorable::after{content:"タップでかざる";color:#5d7d73;font-size:9px;font-weight:900;}
    .collection-item.is-equipped{border-color:#56b879;background:#effcf3;}
    .collection-item.is-equipped::after{content:"✓ かざり中";color:#2f8a54;}
    .collection-decor-hint{margin:0 0 10px;padding:9px 12px;border-radius:14px;background:#e9f6ef;color:#4f7469;font-size:12px;font-weight:900;line-height:1.4;}

    .decor-dialog{position:absolute;inset:0;z-index:76;display:grid;place-items:center;padding:20px;background:rgba(24,44,39,.56);backdrop-filter:blur(2px);}
    .decor-dialog[hidden]{display:none;}
    .decor-dialog__card{width:min(92%,360px);padding:20px;border:3px solid rgba(255,255,255,.92);border-radius:25px;background:#fffdf4;color:#315d52;box-shadow:0 12px 30px rgba(0,0,0,.24);text-align:center;}
    .decor-dialog__preview{width:150px;height:150px;margin:0 auto 10px;padding:7px;display:grid;place-items:center;border-radius:20px;background:#fff;box-shadow:inset 0 0 0 1px rgba(74,102,92,.08),0 4px 12px rgba(0,0,0,.09);}
    .decor-dialog__preview img{width:100%;height:100%;object-fit:contain;border-radius:14px;}
    .decor-dialog__card h3{margin:2px 0 5px;font-size:22px;}
    .decor-dialog__slot{margin:0;color:#6d827b;font-size:13px;font-weight:900;}
    .decor-dialog__current{margin:12px 0 0;padding:10px;border-radius:14px;background:#f0f6f2;font-size:13px;font-weight:900;line-height:1.4;}
    .decor-dialog__actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px;}
    .decor-dialog__actions button{min-height:48px;border:0;border-radius:15px;font-size:15px;font-weight:1000;}
    .decor-cancel{color:#526b64;background:#edf2ef;}
    .decor-equip{color:#fff;background:linear-gradient(145deg,#46b96c,#287d4b);box-shadow:0 4px 0 #226640;}
    .decor-equip.is-remove{background:linear-gradient(145deg,#d27963,#aa5549);box-shadow:0 4px 0 #89443b;}

    @media(max-width:520px){
      .home-room-decor-slot--wall{top:70px;left:10px;width:78px;height:78px;}
      .home-room-decor-slot--lamp{right:4px;bottom:15px;width:88px;height:105px;}
      .home-room-decor-slot--decor{left:5px;bottom:17px;width:84px;height:83px;}
      .home-room-decor-slot--floor{right:10px;bottom:13px;width:88px;height:80px;}
      .home-room-decor-slot--rug{width:190px;height:70px;}
    }
    @media(prefers-reduced-motion:reduce){.collection-item.is-decorable{transition:none;}}
  `;
  document.head.appendChild(style);

  const homeRoom=document.querySelector(".home-room");
  if(!homeRoom||!DECOR_ITEMS.length)return;

  const decorLayer=document.createElement("div");
  decorLayer.className="home-room-decor";
  decorLayer.setAttribute("aria-hidden","true");
  decorLayer.innerHTML=Object.keys(SLOT_LABELS).map(slot=>`<span class="home-room-decor-slot home-room-decor-slot--${slot}" data-room-slot="${slot}"><img alt=""></span>`).join("");
  homeRoom.insertBefore(decorLayer,homeRoom.firstChild);

  const dialog=document.createElement("section");
  dialog.className="decor-dialog";
  dialog.hidden=true;
  dialog.setAttribute("aria-label","部屋に飾るアイテムの選択");
  dialog.innerHTML=`<div class="decor-dialog__card"><div class="decor-dialog__preview"><img alt=""></div><h3></h3><p class="decor-dialog__slot"></p><p class="decor-dialog__current"></p><div class="decor-dialog__actions"><button class="decor-cancel" type="button">やめる</button><button class="decor-equip" type="button">かざる</button></div></div>`;
  game.appendChild(dialog);

  const dialogImage=dialog.querySelector(".decor-dialog__preview img");
  const dialogTitle=dialog.querySelector("h3");
  const dialogSlot=dialog.querySelector(".decor-dialog__slot");
  const dialogCurrent=dialog.querySelector(".decor-dialog__current");
  const dialogCancel=dialog.querySelector(".decor-cancel");
  const dialogEquip=dialog.querySelector(".decor-equip");
  let selectedItem=null;

  function updateDefaultDecorVisibility(){
    const baseRug=document.querySelector(".home-decor--rug");
    const baseLamp=document.querySelector(".home-decor--lamp");
    const baseToy=document.querySelector(".home-decor--toy");
    if(baseRug)baseRug.style.visibility=decorState.rug?"hidden":"";
    if(baseLamp)baseLamp.style.visibility=decorState.lamp?"hidden":"";
    if(baseToy)baseToy.style.visibility=decorState.floor?"hidden":"";
  }

  function renderRoom(){
    const owned=ownedIds();
    let changed=false;
    for(const slot of Object.keys(decorState)){
      const id=decorState[slot];
      const item=id?ITEM_BY_ID.get(id):null;
      if(id&&(!item||item.slot!==slot||!owned.has(id))){decorState[slot]=null;changed=true;}
      const node=decorLayer.querySelector(`[data-room-slot="${slot}"]`);
      const active=decorState[slot]?ITEM_BY_ID.get(decorState[slot]):null;
      if(!node)continue;
      const image=node.querySelector("img");
      if(active){image.src=active.image;image.alt=active.name;node.title=active.name;}
      else{image.removeAttribute("src");image.alt="";node.title="";}
      node.classList.toggle("has-item",Boolean(active));
    }
    if(changed)saveDecorState();
    updateDefaultDecorVisibility();
    annotateCollectionItems();
  }

  function closeDialog(){dialog.hidden=true;selectedItem=null;}
  function openDialog(item){
    if(!item||!ownedIds().has(item.id))return;
    selectedItem=item;
    const currentId=decorState[item.slot];
    const current=currentId?ITEM_BY_ID.get(currentId):null;
    const removing=currentId===item.id;
    dialogImage.src=item.image;
    dialogImage.alt=item.name;
    dialogTitle.textContent=item.name;
    dialogSlot.textContent=`${SLOT_LABELS[item.slot]} にかざれるアイテム`;
    dialogCurrent.textContent=current?`いま：${current.name}`:"いま：何もかざっていない";
    dialogEquip.textContent=removing?"はずす":"かざる";
    dialogEquip.classList.toggle("is-remove",removing);
    dialog.hidden=false;
  }

  dialogCancel.addEventListener("click",closeDialog);
  dialog.addEventListener("pointerdown",event=>{if(event.target===dialog)closeDialog();});
  dialogEquip.addEventListener("click",()=>{
    if(!selectedItem)return;
    const item=selectedItem;
    decorState[item.slot]=decorState[item.slot]===item.id?null:item.id;
    saveDecorState();
    renderRoom();
    closeDialog();
  });

  function annotateCollectionItems(){
    const routes=document.querySelector(".collection-routes");
    if(!routes)return;
    const owned=ownedIds();
    routes.querySelectorAll(".collection-item").forEach(cell=>{
      const item=ITEM_BY_ID.get(cell.dataset.collectionId);
      if(!item)return;
      cell.dataset.decorId=item.id;
      const unlocked=!cell.classList.contains("is-locked")&&owned.has(item.id);
      cell.classList.toggle("is-decorable",unlocked);
      cell.classList.toggle("is-equipped",decorState[item.slot]===item.id);
      if(unlocked){
        cell.setAttribute("role","button");cell.tabIndex=0;cell.setAttribute("aria-label",`${item.name}を部屋に飾る`);
      }else{
        cell.removeAttribute("role");cell.removeAttribute("tabindex");cell.removeAttribute("aria-label");
      }
    });
  }

  const collectionPanel=document.querySelector(".collection-panel");
  const collectionRoutes=document.querySelector(".collection-routes");
  const collectionSummary=document.querySelector(".collection-summary");
  if(collectionSummary&&!document.querySelector(".collection-decor-hint")){
    const note=document.createElement("p");
    note.className="collection-decor-hint";
    note.textContent="🏠 入手済みの画像をタップすると、そのままティラノンの部屋にかざれるよ";
    collectionSummary.insertAdjacentElement("afterend",note);
  }

  function handleCollectionActivate(target){
    const cell=target.closest?.(".collection-item.is-decorable");
    if(!cell)return;
    const item=ITEM_BY_ID.get(cell.dataset.decorId);
    if(item)openDialog(item);
  }
  if(collectionRoutes){
    collectionRoutes.addEventListener("click",event=>handleCollectionActivate(event.target));
    collectionRoutes.addEventListener("keydown",event=>{
      if(event.key!=="Enter"&&event.key!==" ")return;
      const cell=event.target.closest?.(".collection-item.is-decorable");
      if(!cell)return;
      event.preventDefault();handleCollectionActivate(cell);
    });
    new MutationObserver(()=>queueMicrotask(annotateCollectionItems)).observe(collectionRoutes,{childList:true,subtree:true});
  }
  if(collectionPanel){
    new MutationObserver(()=>{
      if(!collectionPanel.hidden){decorState=loadDecorState();annotateCollectionItems();}
    }).observe(collectionPanel,{attributes:true,attributeFilter:["hidden"]});
  }

  window.TIRANON_ROOM_DECOR_V2={render(){decorState=loadDecorState();renderRoom();}};
  renderRoom();
})();

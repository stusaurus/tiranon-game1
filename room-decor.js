"use strict";

/*
 * Persistent Tiranon Home decoration using already-earned route collection items.
 * No image assets are added: collection icons become lightweight room decorations.
 */
(()=>{
  if(typeof game==="undefined")return;

  const DECOR_STORAGE_KEY="tiranon-room-decor-v1";
  const COLLECTION_STORAGE_KEY="tiranon-route-collection-v1";
  const DECOR_TEST_MODE=new URLSearchParams(location.search).get("run-test")==="1";

  const SLOT_LABELS={
    wall:"壁かざり",
    lamp:"ランプ",
    decor:"置きもの",
    floor:"床アイテム",
    rug:"ラグ"
  };

  /* Keep this order aligned with the collection grid in run-rewards.js. */
  const DECOR_ITEMS=[
    {id:"forest-leaf",icon:"🍃",name:"森の葉っぱ飾り",slot:"wall"},
    {id:"forest-pot",icon:"🪴",name:"森の鉢植え",slot:"floor"},
    {id:"forest-acorn",icon:"🌰",name:"木の実オブジェ",slot:"decor"},
    {id:"forest-bench",icon:"🪵",name:"丸太ベンチ",slot:"floor"},
    {id:"forest-lamp",icon:"✨",name:"ひかる木の実ランプ",slot:"lamp"},
    {id:"forest-mobile",icon:"🦋",name:"森のモビール",slot:"wall"},

    {id:"river-shell",icon:"🐚",name:"川辺の貝がら飾り",slot:"decor"},
    {id:"river-drop",icon:"💧",name:"水晶のしずく",slot:"decor"},
    {id:"river-stone",icon:"🪨",name:"青い川石",slot:"decor"},
    {id:"river-rug",icon:"🟦",name:"水色のラグ",slot:"rug"},
    {id:"river-mirror",icon:"🪞",name:"水面ミラー",slot:"wall"},
    {id:"river-lamp",icon:"💡",name:"しずくランプ",slot:"lamp"},

    {id:"volcano-rock",icon:"🪨",name:"火山石オブジェ",slot:"decor"},
    {id:"volcano-brick",icon:"🧱",name:"黒いレンガ飾り",slot:"wall"},
    {id:"volcano-flame",icon:"🔥",name:"炎のオブジェ",slot:"decor"},
    {id:"volcano-rug",icon:"🟥",name:"マグマラグ",slot:"rug"},
    {id:"volcano-crystal",icon:"💎",name:"マグマ結晶",slot:"decor"},
    {id:"volcano-lamp",icon:"💡",name:"溶岩ランプ",slot:"lamp"},

    {id:"night-star",icon:"⭐",name:"星の壁飾り",slot:"wall"},
    {id:"night-moon",icon:"🌙",name:"月のクッション",slot:"floor"},
    {id:"night-planet",icon:"🪐",name:"惑星オブジェ",slot:"decor"},
    {id:"night-rug",icon:"🌌",name:"星空ラグ",slot:"rug"},
    {id:"night-scope",icon:"🔭",name:"天体望遠鏡",slot:"floor"},
    {id:"night-projector",icon:"✨",name:"星座プロジェクター",slot:"lamp"}
  ];

  const ITEM_BY_ID=new Map(DECOR_ITEMS.map(item=>[item.id,item]));

  function ownedIds(){
    try{
      const raw=JSON.parse(localStorage.getItem(COLLECTION_STORAGE_KEY)||"null");
      return new Set(Array.isArray(raw?.owned)?raw.owned:[]);
    }catch(error){
      return new Set();
    }
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
    .home-room-decor{position:absolute;inset:0;z-index:1;pointer-events:none;}
    .home-decor-slot{position:absolute;display:grid;place-items:center;min-width:50px;min-height:50px;font-size:40px;line-height:1;filter:drop-shadow(0 4px 3px rgba(46,75,62,.18));opacity:0;transform:scale(.78);transition:opacity .24s ease,transform .24s ease;}
    .home-decor-slot.has-item{opacity:1;transform:scale(1);}
    .home-decor-slot--wall{top:74px;left:20px;font-size:38px;}
    .home-decor-slot--lamp{top:132px;left:24px;font-size:38px;}
    .home-decor-slot--decor{left:24px;bottom:30px;z-index:3;font-size:42px;}
    .home-decor-slot--floor{right:24px;bottom:28px;z-index:3;font-size:44px;}
    .home-decor-slot--rug{left:50%;bottom:8px;z-index:0;width:150px;height:46px;border-radius:50%;font-size:62px;overflow:hidden;transform:translateX(-50%) scale(.78);opacity:0;filter:saturate(.84) drop-shadow(0 3px 3px rgba(42,68,58,.12));}
    .home-decor-slot--rug.has-item{transform:translateX(-50%) scale(1);opacity:.64;}

    .collection-item.is-decorable{cursor:pointer;border:2px solid transparent;transition:border-color .16s ease,transform .16s ease,background .16s ease;}
    .collection-item.is-decorable::after{content:"タップでかざる";color:#5d7d73;font-size:9px;font-weight:900;}
    .collection-item.is-equipped{border-color:#56b879;background:#effcf3;}
    .collection-item.is-equipped::after{content:"✓ かざり中";color:#2f8a54;}
    .collection-decor-hint{margin:0 0 10px;padding:9px 12px;border-radius:14px;background:#e9f6ef;color:#4f7469;font-size:12px;font-weight:900;line-height:1.4;}

    .decor-dialog{position:absolute;inset:0;z-index:76;display:grid;place-items:center;padding:20px;background:rgba(24,44,39,.56);backdrop-filter:blur(2px);}
    .decor-dialog[hidden]{display:none;}
    .decor-dialog__card{width:min(92%,360px);padding:20px;border:3px solid rgba(255,255,255,.92);border-radius:25px;background:#fffdf4;color:#315d52;box-shadow:0 12px 30px rgba(0,0,0,.24);text-align:center;}
    .decor-dialog__icon{font-size:58px;line-height:1;margin-bottom:5px;}
    .decor-dialog__card h3{margin:2px 0 5px;font-size:22px;}
    .decor-dialog__slot{margin:0;color:#6d827b;font-size:13px;font-weight:900;}
    .decor-dialog__current{margin:12px 0 0;padding:10px;border-radius:14px;background:#f0f6f2;font-size:13px;font-weight:900;line-height:1.4;}
    .decor-dialog__actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px;}
    .decor-dialog__actions button{min-height:48px;border:0;border-radius:15px;font-size:15px;font-weight:1000;}
    .decor-cancel{color:#526b64;background:#edf2ef;}
    .decor-equip{color:#fff;background:linear-gradient(145deg,#46b96c,#287d4b);box-shadow:0 4px 0 #226640;}
    .decor-equip.is-remove{background:linear-gradient(145deg,#d27963,#aa5549);box-shadow:0 4px 0 #89443b;}

    @media(max-width:520px){
      .home-decor-slot--wall{top:68px;left:13px;font-size:34px;}
      .home-decor-slot--lamp{top:119px;left:16px;font-size:34px;}
      .home-decor-slot--decor{left:15px;bottom:25px;font-size:38px;}
      .home-decor-slot--floor{right:15px;bottom:24px;font-size:40px;}
      .home-decor-slot--rug{width:132px;height:42px;font-size:55px;}
    }
    @media(prefers-reduced-motion:reduce){.home-decor-slot,.collection-item.is-decorable{transition:none;}}
  `;
  document.head.appendChild(style);

  const homeRoom=document.querySelector(".home-room");
  if(!homeRoom)return;

  const decorLayer=document.createElement("div");
  decorLayer.className="home-room-decor";
  decorLayer.setAttribute("aria-hidden","true");
  decorLayer.innerHTML=`
    <span class="home-decor-slot home-decor-slot--wall" data-room-slot="wall"></span>
    <span class="home-decor-slot home-decor-slot--lamp" data-room-slot="lamp"></span>
    <span class="home-decor-slot home-decor-slot--decor" data-room-slot="decor"></span>
    <span class="home-decor-slot home-decor-slot--floor" data-room-slot="floor"></span>
    <span class="home-decor-slot home-decor-slot--rug" data-room-slot="rug"></span>
  `;
  homeRoom.insertBefore(decorLayer,homeRoom.firstChild);

  const dialog=document.createElement("section");
  dialog.className="decor-dialog";
  dialog.hidden=true;
  dialog.setAttribute("aria-label","部屋に飾るアイテムの選択");
  dialog.innerHTML=`
    <div class="decor-dialog__card">
      <div class="decor-dialog__icon"></div>
      <h3></h3>
      <p class="decor-dialog__slot"></p>
      <p class="decor-dialog__current"></p>
      <div class="decor-dialog__actions">
        <button class="decor-cancel" type="button">やめる</button>
        <button class="decor-equip" type="button">かざる</button>
      </div>
    </div>
  `;
  game.appendChild(dialog);

  const dialogIcon=dialog.querySelector(".decor-dialog__icon");
  const dialogTitle=dialog.querySelector("h3");
  const dialogSlot=dialog.querySelector(".decor-dialog__slot");
  const dialogCurrent=dialog.querySelector(".decor-dialog__current");
  const dialogCancel=dialog.querySelector(".decor-cancel");
  const dialogEquip=dialog.querySelector(".decor-equip");
  let selectedItem=null;

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
      node.textContent=active?.icon||"";
      node.classList.toggle("has-item",Boolean(active));
      node.title=active?.name||"";
    }
    if(changed)saveDecorState();
    annotateCollectionItems();
  }

  function closeDialog(){dialog.hidden=true;selectedItem=null;}

  function openDialog(item){
    if(!item||!ownedIds().has(item.id))return;
    selectedItem=item;
    const currentId=decorState[item.slot];
    const current=currentId?ITEM_BY_ID.get(currentId):null;
    const removing=currentId===item.id;
    dialogIcon.textContent=item.icon;
    dialogTitle.textContent=item.name;
    dialogSlot.textContent=`${SLOT_LABELS[item.slot]} に置けるアイテム`;
    dialogCurrent.textContent=current?`いま：${current.icon} ${current.name}`:"いま：何もかざっていない";
    dialogEquip.textContent=removing?"はずす":"かざる";
    dialogEquip.classList.toggle("is-remove",removing);
    dialog.hidden=false;
  }

  dialogCancel.addEventListener("click",closeDialog);
  dialog.addEventListener("pointerdown",event=>{if(event.target===dialog)closeDialog();});
  dialogEquip.addEventListener("click",()=>{
    if(!selectedItem)return;
    const item=selectedItem;
    if(decorState[item.slot]===item.id)decorState[item.slot]=null;
    else decorState[item.slot]=item.id;
    saveDecorState();
    renderRoom();
    closeDialog();
  });

  function annotateCollectionItems(){
    const routes=document.querySelector(".collection-routes");
    if(!routes)return;
    const cells=[...routes.querySelectorAll(".collection-item")];
    cells.forEach((cell,index)=>{
      const item=DECOR_ITEMS[index];
      if(!item)return;
      cell.dataset.decorId=item.id;
      const unlocked=!cell.classList.contains("is-locked")&&ownedIds().has(item.id);
      cell.classList.toggle("is-decorable",unlocked);
      cell.classList.toggle("is-equipped",decorState[item.slot]===item.id);
      if(unlocked){
        cell.setAttribute("role","button");
        cell.tabIndex=0;
        cell.setAttribute("aria-label",`${item.name}を部屋に飾る`);
      }else{
        cell.removeAttribute("role");
        cell.removeAttribute("tabindex");
        cell.removeAttribute("aria-label");
      }
    });
  }

  const collectionPanel=document.querySelector(".collection-panel");
  const collectionRoutes=document.querySelector(".collection-routes");
  const collectionSummary=document.querySelector(".collection-summary");
  if(collectionSummary){
    const hint=document.createElement("p");
    hint.className="collection-decor-hint";
    hint.textContent="🏠 入手済みアイテムをタップすると、ティラノンの部屋にかざれるよ";
    collectionSummary.insertAdjacentElement("afterend",hint);
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
      event.preventDefault();
      handleCollectionActivate(cell);
    });
    const collectionObserver=new MutationObserver(()=>queueMicrotask(annotateCollectionItems));
    collectionObserver.observe(collectionRoutes,{childList:true,subtree:true});
  }

  if(collectionPanel){
    const panelObserver=new MutationObserver(()=>{
      if(!collectionPanel.hidden){
        decorState=loadDecorState();
        annotateCollectionItems();
      }
    });
    panelObserver.observe(collectionPanel,{attributes:true,attributeFilter:["hidden"]});
  }

  renderRoom();
})();

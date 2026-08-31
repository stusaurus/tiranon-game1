"use strict";

/* Unified game verification panel. Normal URL: no-op. */
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get("run-test")!=="1")return;

  const fullSafeMode=params.get("growth-test")==="1";
  const COLLECTION_KEY="tiranon-route-collection-v1";
  let safeMode=true;
  let lastMessage="準備OK";
  let collectionOverride=null;

  const COLLECTION_ITEMS=[
    {id:"forest-blocks",route:"forest"},{id:"forest-dino-toy",route:"forest"},{id:"forest-bone-plush",route:"forest"},
    {id:"river-ball",route:"river"},{id:"river-rug",route:"river"},{id:"river-lamp",route:"river"},
    {id:"volcano-meat",route:"volcano"},{id:"volcano-fish",route:"volcano"},{id:"volcano-salad",route:"volcano"},
    {id:"night-banana",route:"night"},{id:"night-egg-memory",route:"night"},{id:"night-baby-memory",route:"night"}
  ];

  if(typeof Storage!=="undefined"){
    const originalGetItem=Storage.prototype.getItem;
    Storage.prototype.getItem=function(key){
      if(this===localStorage&&key===COLLECTION_KEY&&Array.isArray(collectionOverride)){
        return JSON.stringify({owned:collectionOverride,chests:{common:0,route:0,rare:0}});
      }
      return originalGetItem.call(this,key);
    };
  }

  const launcher=document.createElement("button");
  launcher.type="button";
  launcher.textContent="🧪 GAME TEST";
  Object.assign(launcher.style,{position:"fixed",right:"8px",top:"72px",zIndex:"10020",border:"0",borderRadius:"999px",padding:"8px 11px",fontWeight:"900",fontSize:"12px",background:"#fff",color:"#222",boxShadow:"0 3px 12px rgba(0,0,0,.25)"});

  const panel=document.createElement("section");
  panel.hidden=true;
  Object.assign(panel.style,{position:"fixed",right:"8px",top:"112px",zIndex:"10019",width:"min(390px,94vw)",maxHeight:"76vh",overflow:"auto",boxSizing:"border-box",padding:"10px",borderRadius:"16px",background:"rgba(20,24,30,.96)",color:"#fff",boxShadow:"0 8px 28px rgba(0,0,0,.38)",fontSize:"12px"});
  panel.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:7px"><strong style="font-size:14px">GAME TEST MODE</strong><span style="opacity:.72">${fullSafeMode?"FULL SAVE OFF":"TEST"}</span></div><div id="game-test-status" style="padding:7px 8px;margin-bottom:8px;border-radius:10px;background:rgba(255,255,255,.09);line-height:1.45"></div><div id="game-test-actions" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px"></div>`;
  document.body.append(launcher,panel);
  launcher.addEventListener("click",()=>{panel.hidden=!panel.hidden;});
  const status=panel.querySelector("#game-test-status");
  const actions=panel.querySelector("#game-test-actions");

  function section(text){
    const node=document.createElement("div");
    node.textContent=text;
    Object.assign(node.style,{gridColumn:"1/-1",marginTop:"5px",padding:"6px 3px 2px",color:"#b9e8d5",fontWeight:"1000",fontSize:"11px",letterSpacing:".08em"});
    actions.appendChild(node);
  }
  function hint(text){
    const node=document.createElement("div");
    node.textContent=text;
    Object.assign(node.style,{gridColumn:"1/-1",margin:"0 0 3px",padding:"7px 8px",borderRadius:"9px",background:"rgba(185,232,213,.12)",color:"#dff8ed",fontSize:"11px",fontWeight:"750",lineHeight:"1.4"});
    actions.appendChild(node);
  }
  function button(label,fn,wide=false){
    const node=document.createElement("button");
    node.type="button";node.textContent=label;
    Object.assign(node.style,{border:"0",borderRadius:"10px",padding:"9px 7px",fontWeight:"850",background:"#fff",color:"#20242a",fontSize:"12px",lineHeight:"1.2"});
    if(wide)node.style.gridColumn="1/-1";
    node.addEventListener("click",async()=>{try{await fn();}catch(error){lastMessage=`ERROR: ${error?.message||error}`;}updateStatus();});
    actions.appendChild(node);return node;
  }

  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function enableFullSafeTest(){const url=new URL(location.href);url.searchParams.set("run-test","1");url.searchParams.set("growth-test","1");location.replace(url.href);}
  function closeGameOverlays(){
    if(typeof runDraftPaused!=="undefined"&&runDraftPaused&&typeof runResumeGame==="function")runResumeGame();
    if(typeof runLevelOverlay!=="undefined")runLevelOverlay.hidden=true;
    if(typeof adventureRouteOverlay!=="undefined")adventureRouteOverlay.hidden=true;
    const reward=document.querySelector(".reward-overlay");if(reward)reward.hidden=true;
  }
  async function ensureStage(){
    if(typeof startStageOne!=="function")throw new Error("startStageOne がありません");
    if(!stageActive||!isPlaying){startStageOne();await wait(140);}
    stageActive=true;stageFinishing=false;gameOverScreen.hidden=true;stageHud.hidden=false;
    if(typeof beginSpecialHazards==="function"&&typeof specialHazardsActive!=="undefined"&&!specialHazardsActive)beginSpecialHazards();
  }
  function syncRunLevel(stars){
    if(typeof RUN_LEVEL_STAR_TARGETS==="undefined"||typeof runNextLevelIndex==="undefined")return;
    runNextLevelIndex=RUN_LEVEL_STAR_TARGETS.filter(target=>target<=stars).length;
    runNextLevelAt=typeof runCurrentTarget==="function"?(runCurrentTarget()??Infinity):Infinity;
    runLevel=1+runNextLevelIndex;
    if(typeof runUpdateHud==="function")runUpdateHud();
  }
  function setStars(value){
    value=Math.max(0,Math.floor(value));closeGameOverlays();stageStars=value;
    if(typeof runStarsCollected!=="undefined")runStarsCollected=value;
    stageCleared=value>=STAGE_ONE_TARGET;stageFinishing=false;adventureStageClearAnnounced=stageCleared;
    adventureRouteIndex=ADVENTURE_ROUTE_THRESHOLDS.filter(target=>target<=value).length;
    syncRunLevel(value);if(typeof renderStageHud==="function")renderStageHud();
  }
  function testStar(){const star=document.createElement("div");star.className="star";star.textContent="★";star.dataset.type="normal";star.dataset.x="20";star.dataset.y="120";star.style.transform="translate(20px,120px)";playArea.appendChild(star);return star;}
  async function triggerAt(target){await ensureStage();setStars(target-1);const star=testStar();collectStar(star,performance.now());star.remove();await wait(100);lastMessage=`⭐${target} を実処理で通過`;}
  async function route(key){await ensureStage();closeGameOverlays();if(!ADVENTURE_ROUTES[key])throw new Error("ルートがありません");adventureRouteKey=key;if(typeof adventureApplyRouteTheme==="function")adventureApplyRouteTheme(key,false);if(typeof renderStageHud==="function")renderStageHud();lastMessage=`${ADVENTURE_ROUTES[key].icon}${ADVENTURE_ROUTES[key].name} に固定`;}
  async function spawnBomb(){await ensureStage();if(stageStars<30)setStars(30);playArea.querySelectorAll(".danger-star").forEach(node=>node.remove());if(typeof createDangerStar!=="function")throw new Error("落下障害処理がありません");createDangerStar();lastMessage="💣を強制出現";}
  async function spawnSide(){await ensureStage();if(stageStars<40)setStars(40);playArea.querySelectorAll(".air-hazard,.air-warning").forEach(node=>node.remove());if(typeof createAirHazard!=="function")throw new Error("横障害処理がありません");createAirHazard();lastMessage="横切る障害物を強制出現";}
  async function spawnRock(){await ensureStage();if(typeof createRock!=="function")throw new Error("岩処理がありません");createRock();lastMessage="基本障害物を強制出現";}

  function growth(index){
    if(!fullSafeMode){enableFullSafeTest();return;}
    if(typeof showHome==="function")showHome();
    const stages=[...document.querySelectorAll(".growth-test-stage")];
    if(!stages[index])throw new Error("成長テストUIがありません");
    stages[index].click();const modal=document.querySelector(".growth-test-modal");if(modal)modal.hidden=true;
    lastMessage=`成長：${["たまご","ヒビ入り","あかちゃん","はいはい期","成体"][index]}`;
  }

  function collectionIds(routeKey){return COLLECTION_ITEMS.filter(item=>item.route===routeKey).map(item=>item.id);}
  function applyCollection(ids,label){
    collectionOverride=[...new Set(ids)];
    if(typeof showHome==="function")showHome();
    if(window.TIRANON_COLLECTION_V2?.reload)window.TIRANON_COLLECTION_V2.reload();
    const collectionPanel=document.querySelector(".collection-panel");if(collectionPanel)collectionPanel.hidden=false;
    lastMessage=`コレクション：${label}`;
  }
  document.querySelector(".home-collection-button")?.addEventListener("click",()=>{
    if(!Array.isArray(collectionOverride))return;
    setTimeout(()=>window.TIRANON_COLLECTION_V2?.reload?.(),0);
  },true);

  section("成長段階");
  if(!fullSafeMode)button("🧬 完全テストをON",enableFullSafeTest,true);
  else{
    button("🥚 たまご",()=>growth(0));button("🥚 ヒビ入り",()=>growth(1));
    button("👶 あかちゃん",()=>growth(2));button("🦖 はいはい",()=>growth(3));
    button("🦖 成体",()=>growth(4),true);
  }

  section("📖 コレクション状態を変更");
  hint("↓ 押した状態に切り替わり、そのまま画像コレクションが開きます");
  button("📕 全部未収集にする",()=>applyCollection([],"未収集 0/12"),true);
  button("🌳 森だけ収集済み",()=>applyCollection(collectionIds("forest"),"森 3/3"));
  button("🌊 川だけ収集済み",()=>applyCollection(collectionIds("river"),"川 3/3"));
  button("🌋 火山だけ収集済み",()=>applyCollection(collectionIds("volcano"),"火山 3/3"));
  button("🌙 夜だけ収集済み",()=>applyCollection(collectionIds("night"),"夜 3/3"));
  button("🏆 全部収集済みにする",()=>applyCollection(COLLECTION_ITEMS.map(item=>item.id),"完全収集 12/12"),true);
  button("↩ テスト表示をやめる",()=>location.reload(),true);

  section("RUN / 宝箱");
  button("▶ 最初から",async()=>{closeGameOverlays();startStageOne();await wait(150);lastMessage="RUNを最初から";},true);
  button("⭐20 分岐",()=>triggerAt(20));button("⭐40 分岐",()=>triggerAt(40));
  button("⭐60 分岐",()=>triggerAt(60));button("⭐80 CLEAR",()=>triggerAt(80));
  button("🎁 ⭐100",()=>triggerAt(100));button("🎁 ⭐120",()=>triggerAt(120));
  button("✨ ⭐150",()=>triggerAt(150),true);

  section("ルート / 障害物");
  button("🌳 森",()=>route("forest"));button("🌊 川辺",()=>route("river"));
  button("🌋 火山",()=>route("volcano"));button("🌙 夜",()=>route("night"));
  button("横障害を出す",spawnSide);button("💣 上から出す",spawnBomb);button("🪨 岩を出す",spawnRock);
  const safeButton=button("🛡 無敵 ON",()=>{safeMode=!safeMode;if(!safeMode)invincibleUntil=0;safeButton.textContent=safeMode?"🛡 無敵 ON":"💔 無敵 OFF";lastMessage=safeMode?"無敵ON":"通常ダメージON";});

  function updateStatus(){
    if(safeMode&&isPlaying)invincibleUntil=performance.now()+2500;
    const stars=typeof stageStars==="number"?stageStars:0;
    const currentRoute=typeof adventureRoute==="function"?adventureRoute():null;
    let growthName="-";try{growthName=typeof growthStage==="function"?growthStage().name:"-";}catch(error){}
    const collectionText=Array.isArray(collectionOverride)?`${collectionOverride.length}/12 TEST`:"実データ";
    const bombs=playArea.querySelectorAll(".danger-star").length;
    const sides=playArea.querySelectorAll(".air-hazard").length;
    status.innerHTML=`<strong>${stageCleared?"BONUS RUN":"STAGE"}</strong> ⭐${stars}<br>ROUTE ${currentRoute?`${currentRoute.icon}${currentRoute.name}`:"草原"}<br>🧬 ${growthName}　📖 ${collectionText}<br>💣${bombs}　横${sides}　${safeMode?"🛡無敵":"💔通常"}<br><span style="opacity:.72">${lastMessage}</span>`;
  }
  setInterval(updateStatus,300);updateStatus();
})();

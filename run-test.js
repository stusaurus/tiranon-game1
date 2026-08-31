"use strict";

/*
 * Full verification helpers.
 * This file does nothing on the normal game URL.
 * Enable with ?run-test=1. For the safest full growth test use
 * ?run-test=1&growth-test=1 (growth-test blocks localStorage writes).
 */
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get("run-test")!=="1")return;

  const fullGrowthTest=params.get("growth-test")==="1";

  /* Existing test safeguard. growth-test=1 additionally blocks Storage writes. */
  ["savePetState","saveProgressionState","saveCareState","saveGrowthV2","saveBestScore"].forEach(name=>{
    try{
      if(typeof window[name]==="function")window[name]=()=>{};
    }catch(error){}
  });

  let safeMode=true;
  let lastMessage="準備OK";

  /*
   * Collection preview is memory-only. Never overwrite the player's collection.
   * room-decor.js reads this storage key dynamically, so overriding getItem lets
   * completed test collections also be tapped/equipped without touching save data.
   */
  const TEST_COLLECTION_KEY="tiranon-route-collection-v1";
  const TEST_COLLECTION_ITEMS=[
    {id:"forest-leaf",icon:"🍃",name:"森の葉っぱ飾り",route:"forest"},
    {id:"forest-pot",icon:"🪴",name:"森の鉢植え",route:"forest"},
    {id:"forest-acorn",icon:"🌰",name:"木の実オブジェ",route:"forest"},
    {id:"forest-bench",icon:"🪵",name:"丸太ベンチ",route:"forest"},
    {id:"forest-lamp",icon:"✨",name:"ひかる木の実ランプ",route:"forest"},
    {id:"forest-mobile",icon:"🦋",name:"森のモビール",route:"forest"},
    {id:"river-shell",icon:"🐚",name:"川辺の貝がら飾り",route:"river"},
    {id:"river-drop",icon:"💧",name:"水晶のしずく",route:"river"},
    {id:"river-stone",icon:"🪨",name:"青い川石",route:"river"},
    {id:"river-rug",icon:"🟦",name:"水色のラグ",route:"river"},
    {id:"river-mirror",icon:"🪞",name:"水面ミラー",route:"river"},
    {id:"river-lamp",icon:"💡",name:"しずくランプ",route:"river"},
    {id:"volcano-rock",icon:"🪨",name:"火山石オブジェ",route:"volcano"},
    {id:"volcano-brick",icon:"🧱",name:"黒いレンガ飾り",route:"volcano"},
    {id:"volcano-flame",icon:"🔥",name:"炎のオブジェ",route:"volcano"},
    {id:"volcano-rug",icon:"🟥",name:"マグマラグ",route:"volcano"},
    {id:"volcano-crystal",icon:"💎",name:"マグマ結晶",route:"volcano"},
    {id:"volcano-lamp",icon:"💡",name:"溶岩ランプ",route:"volcano"},
    {id:"night-star",icon:"⭐",name:"星の壁飾り",route:"night"},
    {id:"night-moon",icon:"🌙",name:"月のクッション",route:"night"},
    {id:"night-planet",icon:"🪐",name:"惑星オブジェ",route:"night"},
    {id:"night-rug",icon:"🌌",name:"星空ラグ",route:"night"},
    {id:"night-scope",icon:"🔭",name:"天体望遠鏡",route:"night"},
    {id:"night-projector",icon:"✨",name:"星座プロジェクター",route:"night"}
  ];
  let testCollectionOverride=null;
  let originalCollectionSnapshot=null;

  if(typeof Storage!=="undefined"){
    const getItemBeforeRunTest=Storage.prototype.getItem;
    Storage.prototype.getItem=function(key){
      if(this===localStorage&&key===TEST_COLLECTION_KEY&&Array.isArray(testCollectionOverride)){
        return JSON.stringify({owned:testCollectionOverride,chests:{common:0,route:0,rare:0}});
      }
      return getItemBeforeRunTest.call(this,key);
    };
  }

  const toggle=document.createElement("button");
  toggle.type="button";
  toggle.textContent="🧪 GAME TEST";
  Object.assign(toggle.style,{
    position:"fixed",right:"8px",top:"72px",zIndex:"10002",
    border:"0",borderRadius:"999px",padding:"8px 11px",
    fontWeight:"900",fontSize:"12px",background:"#fff",color:"#222",
    boxShadow:"0 3px 12px rgba(0,0,0,.25)"
  });

  const panel=document.createElement("section");
  panel.hidden=true;
  Object.assign(panel.style,{
    position:"fixed",right:"8px",top:"112px",zIndex:"10001",
    width:"min(380px,94vw)",maxHeight:"76vh",overflow:"auto",
    boxSizing:"border-box",padding:"10px",borderRadius:"16px",
    background:"rgba(20,24,30,.96)",color:"#fff",
    boxShadow:"0 8px 28px rgba(0,0,0,.38)",fontSize:"12px"
  });
  panel.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px">
      <strong style="font-size:14px">GAME TEST MODE</strong>
      <span style="opacity:.7">SAVE OFF</span>
    </div>
    <div id="run-test-status" style="padding:7px 8px;margin-bottom:8px;border-radius:10px;background:rgba(255,255,255,.09);line-height:1.45"></div>
    <div id="run-test-actions" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px"></div>
  `;

  document.body.append(toggle,panel);
  toggle.addEventListener("click",()=>{panel.hidden=!panel.hidden;});

  const status=panel.querySelector("#run-test-status");
  const actions=panel.querySelector("#run-test-actions");

  function addSection(title){
    const heading=document.createElement("div");
    heading.textContent=title;
    Object.assign(heading.style,{
      gridColumn:"1 / -1",marginTop:"5px",padding:"6px 4px 2px",
      color:"#b9e8d5",fontWeight:"1000",fontSize:"11px",letterSpacing:".08em"
    });
    actions.appendChild(heading);
  }

  function addButton(label,handler,wide=false){
    const button=document.createElement("button");
    button.type="button";
    button.textContent=label;
    Object.assign(button.style,{
      border:"0",borderRadius:"10px",padding:"9px 7px",fontWeight:"850",
      background:"#fff",color:"#20242a",fontSize:"12px",lineHeight:"1.2"
    });
    if(wide)button.style.gridColumn="1 / -1";
    button.addEventListener("click",async()=>{
      try{await handler();}
      catch(error){lastMessage=`ERROR: ${error?.message||error}`;}
      updateStatus();
    });
    actions.appendChild(button);
    return button;
  }

  function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

  async function ensureStage(){
    if(typeof startStageOne!=="function")throw new Error("startStageOne が見つかりません");
    if(!stageActive||!isPlaying){
      startStageOne();
      await wait(140);
    }
    stageActive=true;
    stageFinishing=false;
    gameOverScreen.hidden=true;
    stageHud.hidden=false;
    if(typeof beginSpecialHazards==="function"&&!specialHazardsActive)beginSpecialHazards();
  }

  function closePauseOverlays(){
    if(typeof runDraftPaused!=="undefined"&&runDraftPaused&&typeof runResumeGame==="function")runResumeGame();
    if(typeof runLevelOverlay!=="undefined")runLevelOverlay.hidden=true;
    if(typeof adventureRouteOverlay!=="undefined")adventureRouteOverlay.hidden=true;
    document.querySelector(".reward-overlay")?.setAttribute("hidden","");
  }

  function syncRunLevelForStars(stars){
    if(typeof RUN_LEVEL_STAR_TARGETS==="undefined"||typeof runNextLevelIndex==="undefined")return;
    const passed=RUN_LEVEL_STAR_TARGETS.filter(target=>target<=stars).length;
    runNextLevelIndex=passed;
    runNextLevelAt=typeof runCurrentTarget==="function"?(runCurrentTarget()??Infinity):Infinity;
    runLevel=1+passed;
    if(typeof runUpdateHud==="function")runUpdateHud();
  }

  function setStars(stars){
    const value=Math.max(0,Math.floor(stars));
    closePauseOverlays();
    stageStars=value;
    if(typeof runStarsCollected!=="undefined")runStarsCollected=value;
    stageCleared=value>=STAGE_ONE_TARGET;
    stageFinishing=false;
    adventureStageClearAnnounced=stageCleared;
    adventureRouteIndex=ADVENTURE_ROUTE_THRESHOLDS.filter(target=>target<=value).length;
    syncRunLevelForStars(value);
    if(typeof renderStageHud==="function")renderStageHud();
  }

  function makeTestStar(){
    const star=document.createElement("div");
    star.className="star";
    star.textContent="★";
    star.dataset.type="normal";
    star.dataset.x="20";
    star.dataset.y="120";
    star.style.transform="translate(20px,120px)";
    playArea.appendChild(star);
    return star;
  }

  async function triggerAt(target){
    await ensureStage();
    const before=Math.max(0,target-1);
    setStars(before);
    const star=makeTestStar();
    collectStar(star,performance.now());
    star.remove();
    await wait(100);
    lastMessage=`⭐${target} を実処理で通過`;
  }

  async function chooseRoute(key){
    await ensureStage();
    closePauseOverlays();
    if(!ADVENTURE_ROUTES[key])throw new Error(`route ${key} がありません`);
    adventureRouteKey=key;
    if(typeof adventureApplyRouteTheme==="function")adventureApplyRouteTheme(key,false);
    if(typeof renderStageHud==="function")renderStageHud();
    lastMessage=`${ADVENTURE_ROUTES[key].icon}${ADVENTURE_ROUTES[key].name} に固定`;
  }

  async function forceChestnut(){
    await ensureStage();
    closePauseOverlays();
    if(stageStars<40)setStars(40);
    playArea.querySelectorAll(".air-hazard,.air-warning").forEach(element=>element.remove());
    if(typeof beginSpecialHazards==="function"&&!specialHazardsActive)beginSpecialHazards();
    if(typeof createAirHazard!=="function")throw new Error("createAirHazard が見つかりません");
    createAirHazard();
    lastMessage="横切る特殊障害物を強制（約0.56秒後）";
  }

  async function forceDanger(){
    await ensureStage();
    closePauseOverlays();
    if(stageStars<30)setStars(30);
    playArea.querySelectorAll(".danger-star").forEach(element=>element.remove());
    if(typeof beginSpecialHazards==="function"&&!specialHazardsActive)beginSpecialHazards();
    if(typeof createDangerStar!=="function")throw new Error("createDangerStar が見つかりません");
    createDangerStar();
    lastMessage="💣 落下障害物を強制出現";
  }

  async function forceRock(){
    await ensureStage();
    closePauseOverlays();
    if(typeof createRock!=="function")throw new Error("createRock が見つかりません");
    createRock();
    lastMessage="基本障害物を強制出現";
  }

  async function restartTest(){
    closePauseOverlays();
    startStageOne();
    await wait(150);
    lastMessage="RUNを最初から開始";
  }

  function enableFullTestUrl(){
    const url=new URL(location.href);
    url.searchParams.set("run-test","1");
    url.searchParams.set("growth-test","1");
    location.replace(url.href);
  }

  function applyGrowthStage(index){
    if(!fullGrowthTest){enableFullTestUrl();return;}
    const buttons=[...document.querySelectorAll(".growth-test-stage")];
    if(!buttons[index])throw new Error("成長テストUIが見つかりません");
    if(typeof showHome==="function")showHome();
    buttons[index].click();
    document.querySelector(".growth-test-modal")?.setAttribute("hidden","");
    lastMessage=`成長：${["たまご","もうすぐうまれそう","あかちゃん","はいはい期","ティラノン"][index]}`;
  }

  function captureCollectionSnapshot(){
    if(originalCollectionSnapshot)return;
    const panel=document.querySelector(".collection-panel");
    const cells=[...document.querySelectorAll(".collection-routes .collection-item")];
    const headers=[...document.querySelectorAll(".collection-route__head span")];
    const button=document.querySelector(".home-collection-button");
    const summary=document.querySelector(".collection-summary");
    originalCollectionSnapshot={
      cells:cells.map(cell=>({html:cell.innerHTML,className:cell.className})),
      headers:headers.map(header=>header.textContent),
      button:button?.textContent||"",
      summary:summary?.textContent||"",
      panelHidden:panel?.hidden??true
    };
  }

  function applyCollectionPreview(ids,label){
    captureCollectionSnapshot();
    const ownedSet=new Set(ids);
    testCollectionOverride=[...ownedSet];
    if(typeof showHome==="function")showHome();

    const cells=[...document.querySelectorAll(".collection-routes .collection-item")];
    TEST_COLLECTION_ITEMS.forEach((item,index)=>{
      const cell=cells[index];
      if(!cell)return;
      const unlocked=ownedSet.has(item.id);
      cell.classList.toggle("is-locked",!unlocked);
      cell.classList.remove("is-equipped");
      cell.innerHTML=`<span class="collection-item__icon">${unlocked?item.icon:"❔"}</span><strong>${unlocked?item.name:"？？？"}</strong>`;
    });

    const routes=["forest","river","volcano","night"];
    const headers=[...document.querySelectorAll(".collection-route__head span")];
    routes.forEach((route,index)=>{
      const count=TEST_COLLECTION_ITEMS.filter(item=>item.route===route&&ownedSet.has(item.id)).length;
      if(headers[index])headers[index].textContent=`${count}/6`;
    });

    const button=document.querySelector(".home-collection-button");
    const summary=document.querySelector(".collection-summary");
    if(button)button.textContent=`📖 コレクション ${ownedSet.size}/24`;
    if(summary)summary.textContent=`テスト表示：集めたもの ${ownedSet.size} / 24`;

    const collectionPanel=document.querySelector(".collection-panel");
    if(collectionPanel)collectionPanel.hidden=false;
    lastMessage=`コレクション：${label}`;
  }

  function routeCollection(route){
    return TEST_COLLECTION_ITEMS.filter(item=>item.route===route).map(item=>item.id);
  }

  function restoreCollectionPreview(){
    if(!originalCollectionSnapshot){lastMessage="実データのまま";return;}
    testCollectionOverride=null;
    const cells=[...document.querySelectorAll(".collection-routes .collection-item")];
    originalCollectionSnapshot.cells.forEach((snapshot,index)=>{
      const cell=cells[index];
      if(!cell)return;
      cell.className=snapshot.className;
      cell.innerHTML=snapshot.html;
    });
    const headers=[...document.querySelectorAll(".collection-route__head span")];
    originalCollectionSnapshot.headers.forEach((text,index)=>{if(headers[index])headers[index].textContent=text;});
    const button=document.querySelector(".home-collection-button");
    const summary=document.querySelector(".collection-summary");
    if(button)button.textContent=originalCollectionSnapshot.button;
    if(summary)summary.textContent=originalCollectionSnapshot.summary;
    lastMessage="コレクション：実データ表示へ戻した";
  }

  const collectionOpenButton=document.querySelector(".home-collection-button");
  collectionOpenButton?.addEventListener("click",()=>{
    if(!Array.isArray(testCollectionOverride))return;
    const ids=[...testCollectionOverride];
    setTimeout(()=>applyCollectionPreview(ids,`${ids.length}/24`),0);
  },true);

  addSection("RUN / BONUS");
  addButton("▶ 最初から",restartTest,true);
  addButton("⭐20 分岐",()=>triggerAt(20));
  addButton("⭐40 分岐",()=>triggerAt(40));
  addButton("⭐60 分岐",()=>triggerAt(60));
  addButton("⭐80 CLEAR",()=>triggerAt(80));
  addButton("🎁 ⭐100",()=>triggerAt(100));
  addButton("🎁 ⭐120",()=>triggerAt(120));
  addButton("✨ ⭐150",()=>triggerAt(150),true);

  addSection("成長段階");
  if(!fullGrowthTest){
    addButton("🧬 成長テストをON",enableFullTestUrl,true);
  }else{
    addButton("🥚 たまご",()=>applyGrowthStage(0));
    addButton("🥚 ヒビ",()=>applyGrowthStage(1));
    addButton("👶 あかちゃん",()=>applyGrowthStage(2));
    addButton("🦖 はいはい",()=>applyGrowthStage(3));
    addButton("🦖 成体",()=>applyGrowthStage(4),true);
  }

  addSection("コレクション表示");
  addButton("📕 0 / 24",()=>applyCollectionPreview([],"0/24"));
  addButton("🌳 森 6/6",()=>applyCollectionPreview(routeCollection("forest"),"森 6/6"));
  addButton("🌊 川 6/6",()=>applyCollectionPreview(routeCollection("river"),"川 6/6"));
  addButton("🌋 火山 6/6",()=>applyCollectionPreview(routeCollection("volcano"),"火山 6/6"));
  addButton("🌙 夜 6/6",()=>applyCollectionPreview(routeCollection("night"),"夜 6/6"));
  addButton("🏆 全部 24/24",()=>applyCollectionPreview(TEST_COLLECTION_ITEMS.map(item=>item.id),"完全収集 24/24"));
  addButton("↩ 実データ表示",restoreCollectionPreview,true);

  addSection("障害物 / ルート");
  addButton("横障害を出す",forceChestnut);
  addButton("💣 上から出す",forceDanger);
  addButton("🪨 岩を出す",forceRock);
  const safeButton=addButton("🛡 無敵 ON",async()=>{
    safeMode=!safeMode;
    safeButton.textContent=safeMode?"🛡 無敵 ON":"💔 無敵 OFF";
    if(!safeMode)invincibleUntil=0;
    lastMessage=safeMode?"無敵テストをON":"通常ダメージをON";
  });
  addButton("🌳 森",()=>chooseRoute("forest"));
  addButton("🌊 川辺",()=>chooseRoute("river"));
  addButton("🌋 火山",()=>chooseRoute("volcano"));
  addButton("🌙 夜",()=>chooseRoute("night"));

  function updateStatus(){
    if(safeMode&&isPlaying)invincibleUntil=performance.now()+2500;
    const stars=typeof stageStars==="number"?stageStars:0;
    const route=typeof adventureRoute==="function"?adventureRoute():null;
    const tier=typeof adventureDifficultyTier==="function"?adventureDifficultyTier():"-";
    const lifeText=typeof lives==="number"?lives:"-";
    const sideHazards=playArea.querySelectorAll(".air-hazard").length;
    const bombs=playArea.querySelectorAll(".danger-star").length;
    let growthText="-";
    try{growthText=typeof growthStage==="function"?growthStage().name:"-";}catch(error){}
    const collectionText=Array.isArray(testCollectionOverride)?`${testCollectionOverride.length}/24 TEST":"実データ";
    status.innerHTML=`
      <strong>${stageCleared?"BONUS RUN":"STAGE"}</strong>　⭐${stars}<br>
      ROUTE ${route?`${route.icon}${route.name}`:"草原"}　難易度 ${tier}<br>
      ❤️${lifeText}　横${sideHazards}　💣${bombs}　${safeMode?"🛡無敵":"💔通常"}<br>
      🧬 ${growthText}　📖 ${collectionText}<br>
      <span style="opacity:.72">${lastMessage}</span>
    `;
  }

  setInterval(updateStatus,300);
  updateStatus();
})();

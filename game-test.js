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

  /* Session-only collection override. Nothing is written to localStorage. */
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
  panel.innerHTML=`
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:7px">
      <strong style="font-size:14px">GAME TEST MODE</strong>
      <span style="opacity:.72">${fullSafeMode?"FULL SAVE OFF":"TEST"}</span>
    </div>
    <div id="game-test-status" style="padding:7px 8px;margin-bottom:8px;border-radius:10px;background:rgba(255,255,255,.09);line-height:1.45"></div>
    <div id="game-test-actions" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px"></div>`;

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

  function button(label,fn,wide=false){
    const node=document.createElement("button");
    node.type="button";node.textContent=label;
    Object.assign(node.style,{border:"0",borderRadius:"10px",padding:"9px 7px",fontWeight:"850",background:"#fff",color:"#20242a",fontSize:"12px",lineHeight:"1.2"});
    if(wide)node.style.gridColumn="1/-1";
    node.addEventListener("click",async()=>{
      try{await fn();}catch(error){lastMessage=`ERROR: ${error?.message||error}`;}
      updateStatus();
    });
    actions.appendChild(node);
    return node;
  }

  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  function enableFullSafeTest(){
    const url=new URL(location.href);
    url.searchParams.set("run-test","1");
    url.searchParams.set("growth-test","1");
    location.replace(url.href);
  }

  function closeGameOverlays(){
    if(typeof runDraftPaused!=="undefined"&&runDraftPaused&&typeof runResumeGame==="function")runResumeGame();
    if(typeof runLevelOverlay!=="undefined")runLevelOverlay.hidden=true;
    if(typeof adventureRouteOverlay!=="undefined")adventureRouteOverlay.hidden=true;
    const reward=document.querySelector(".reward-overlay");
    if(reward)reward.hidden=true;
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
    value=Math.max(0,Math.floor(value));
    closeGameOverlays();
    stageStars=value;
    if(typeof runStarsCollected!=="undefined")runStarsCollected=value;
    stageCleared=value>=STAGE_ONE_TARGET;
    stageFinishing=false;
    adventureStageClearAnnounced=stageCleared;
    adventureRouteIndex=ADVENTURE_ROUTE_THRESHOLDS.filter(target=>target<=value).length;
    syncRunLevel(value);
    if(typeof renderStageHud==="function")renderStageHud();
  }

  function testStar(){
    const star=document.createElement("div");
    star.className="star";star.textContent="★";star.dataset.type="normal";star.dataset.x="20";star.dataset.y="120";star.style.transform="translate(20px,120px)";
    playArea.appendChild(star);return star;
  }

  async function triggerAt(target){
    await ensureStage();
    setStars(target-1);
    const star=testStar();collectStar(star,performance.now());star.remove();
    await wait(100);
    lastMessage=`⭐${target} を実処理で通過`;
  }

  async function route(key){
    await ensureStage();closeGameOverlays();
    if(!ADVENTURE_ROUTES[key])throw new Error("ルートがありません");
    adventureRouteKey=key;
    if(typeof adventureApplyRouteTheme==="function")adventureApplyRouteTheme(key,false);
    if(typeof renderStageHud==="function")renderStageHud();
    lastMessage=`${ADVENTURE_ROUTES[key].icon}${ADVENTURE_ROUTES[key].name} に固定`;
  }

  async function spawnBomb(){
    await ensureStage();if(stageStars<30)setStars(30);
    playArea.querySelectorAll(".danger-star").forEach(node=>node.remove());
    if(typeof createDangerStar!=="function")throw new Error("落下障害処理がありません");
    createDangerStar();lastMessage="💣を強制出現";
  }

  async function spawnSide(){
    await ensureStage();if(stageStars<40)setStars(40);
    playArea.querySelectorAll(".air-hazard,.air-warning").forEach(node=>node.remove());
    if(typeof createAirHazard!=="function")throw new Error("横障害処理がありません");
    createAirHazard();lastMessage="横切る障害物を強制出現";
  }

  async function spawnRock(){
    await ensureStage();if(typeof createRock!=="function")throw new Error("岩処理がありません");
    createRock();lastMessage="基本障害物を強制出現";
  }

  function growth(index){
    if(!fullSafeMode){enableFullSafeTest();return;}
    if(typeof showHome==="function")showHome();
    const stages=[...document.querySelectorAll(".growth-test-stage")];
    if(!stages[index])throw new Error("成長テストUIがありません");
    stages[index].click();
    const modal=document.querySelector(".growth-test-modal");if(modal)modal.hidden=true;
    lastMessage=`成長：${["たまご","ヒビ入り","あかちゃん","はいはい期","成体"][index]}`;
  }

  function collectionIds(routeKey){return COLLECTION_ITEMS.filter(item=>item.route===routeKey).map(item=>item.id);}

  function applyCollection(ids,label){
    collectionOverride=[...new Set(ids)];
    if(typeof showHome==="function")showHome();
    const owned=new Set(collectionOverride);
    const cells=[...document.querySelectorAll(".collection-routes .collection-item")];
    COLLECTION_ITEMS.forEach((item,index)=>{
      const cell=cells[index];if(!cell)return;
      const unlocked=owned.has(item.id);
      cell.classList.toggle("is-locked",!unlocked);
      cell.classList.remove("is-equipped");
      cell.innerHTML=`<span class="collection-item__icon">${unlocked?item.icon:"❔"}</span><strong>${unlocked?item.name:"？？？"}</strong>`;
    });
    const routeKeys=["forest","river","volcano","night"];
    const headers=[...document.querySelectorAll(".collection-route__head span")];
    routeKeys.forEach((key,index)=>{
      const count=COLLECTION_ITEMS.filter(item=>item.route===key&&owned.has(item.id)).length;
      if(headers[index])headers[index].textContent=`${count}/6`;
    });
    const open=document.querySelector(".home-collection-button");
    const summary=document.querySelector(".collection-summary");
    if(open)open.textContent=`📖 コレクション ${owned.size}/24`;
    if(summary)summary.textContent=`テスト表示：集めたもの ${owned.size} / 24`;
    const collectionPanel=document.querySelector(".collection-panel");if(collectionPanel)collectionPanel.hidden=false;
    lastMessage=`コレクション：${label}`;
  }

  document.querySelector(".home-collection-button")?.addEventListener("click",()=>{
    if(!Array.isArray(collectionOverride))return;
    const ids=[...collectionOverride];setTimeout(()=>applyCollection(ids,`${ids.length}/24`),0);
  },true);

  section("成長段階");
  if(!fullSafeMode){button("🧬 完全テストをON",enableFullSafeTest,true);}
  else{
    button("🥚 たまご",()=>growth(0));button("🥚 ヒビ入り",()=>growth(1));
    button("👶 あかちゃん",()=>growth(2));button("🦖 はいはい",()=>growth(3));
    button("🦖 成体",()=>growth(4),true);
  }

  section("コレクション");
  button("📕 0 / 24",()=>applyCollection([],"0/24"));
  button("🌳 森 6/6",()=>applyCollection(collectionIds("forest"),"森 6/6"));
  button("🌊 川 6/6",()=>applyCollection(collectionIds("river"),"川 6/6"));
  button("🌋 火山 6/6",()=>applyCollection(collectionIds("volcano"),"火山 6/6"));
  button("🌙 夜 6/6",()=>applyCollection(collectionIds("night"),"夜 6/6"));
  button("🏆 全部 24/24",()=>applyCollection(COLLECTION_ITEMS.map(item=>item.id),"完全収集 24/24"));
  button("↩ 実データへ戻す",()=>location.reload(),true);

  section("RUN / 宝箱");
  button("▶ 最初から",async()=>{closeGameOverlays();startStageOne();await wait(150);lastMessage="RUNを最初から";},true);
  button("⭐20 分岐",()=>triggerAt(20));button("⭐40 分岐",()=>triggerAt(40));
  button("⭐60 分岐",()=>triggerAt(60));button("⭐80 CLEAR",()=>triggerAt(80));
  button("🎁 ⭐100",()=>triggerAt(100));button("🎁 ⭐120",()=>triggerAt(120));
  button("✨ ⭐150",()=>triggerAt(150),true);

  section("ルート / 障害物");
  button("🌳 森",()=>route("forest"));button("🌊 川辺",()=>route("river"));
  button("🌋 火山",()=>route("volcano"));button("🌙 夜",()=>route("night"));
  button("横障害を出す",spawnSide);button("💣 上から出す",spawnBomb);
  button("🪨 岩を出す",spawnRock);
  const safeButton=button("🛡 無敵 ON",()=>{
    safeMode=!safeMode;if(!safeMode)invincibleUntil=0;
    safeButton.textContent=safeMode?"🛡 無敵 ON":"💔 無敵 OFF";
    lastMessage=safeMode?"無敵ON":"通常ダメージON";
  });

  function updateStatus(){
    if(safeMode&&isPlaying)invincibleUntil=performance.now()+2500;
    const stars=typeof stageStars==="number"?stageStars:0;
    const currentRoute=typeof adventureRoute==="function"?adventureRoute():null;
    let growthName="-";try{growthName=typeof growthStage==="function"?growthStage().name:"-";}catch(error){}
    const collectionText=Array.isArray(collectionOverride)?`${collectionOverride.length}/24 TEST`:"実データ";
    const bombs=playArea.querySelectorAll(".danger-star").length;
    const sides=playArea.querySelectorAll(".air-hazard").length;
    status.innerHTML=`<strong>${stageCleared?"BONUS RUN":"STAGE"}</strong> ⭐${stars}<br>ROUTE ${currentRoute?`${currentRoute.icon}${currentRoute.name}`:"草原"}<br>🧬 ${growthName}　📖 ${collectionText}<br>💣${bombs}　横${sides}　${safeMode?"🛡無敵":"💔通常"}<br><span style="opacity:.72">${lastMessage}</span>`;
  }

  setInterval(updateStatus,300);updateStatus();
})();

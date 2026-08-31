"use strict";

/*
 * RUN verification helpers.
 * This file does nothing on the normal game URL.
 * Enable only with ?run-test=1 so browser testing can jump directly to
 * route thresholds, BONUS RUN, and individual hazards without a long play session.
 */
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get("run-test")!=="1")return;

  /* Test runs must not change the player's persistent progression. */
  ["savePetState","saveProgressionState","saveCareState","saveGrowthV2","saveBestScore"].forEach(name=>{
    try{
      if(typeof window[name]==="function")window[name]=()=>{};
    }catch(error){}
  });

  let safeMode=true;
  let lastMessage="準備OK";

  const toggle=document.createElement("button");
  toggle.type="button";
  toggle.textContent="🧪 RUN TEST";
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
    width:"min(360px,92vw)",maxHeight:"72vh",overflow:"auto",
    boxSizing:"border-box",padding:"10px",borderRadius:"16px",
    background:"rgba(20,24,30,.96)",color:"#fff",
    boxShadow:"0 8px 28px rgba(0,0,0,.38)",fontSize:"12px"
  });
  panel.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px">
      <strong style="font-size:14px">RUN TEST MODE</strong>
      <span style="opacity:.7">SAVE OFF</span>
    </div>
    <div id="run-test-status" style="padding:7px 8px;margin-bottom:8px;border-radius:10px;background:rgba(255,255,255,.09);line-height:1.45"></div>
    <div id="run-test-actions" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px"></div>
  `;

  document.body.append(toggle,panel);
  toggle.addEventListener("click",()=>{panel.hidden=!panel.hidden;});

  const status=panel.querySelector("#run-test-status");
  const actions=panel.querySelector("#run-test-actions");

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
    if(typeof runDraftPaused!=="undefined"&&runDraftPaused&&typeof runResumeGame==="function"){
      runResumeGame();
    }
    if(typeof runLevelOverlay!=="undefined")runLevelOverlay.hidden=true;
    if(typeof adventureRouteOverlay!=="undefined")adventureRouteOverlay.hidden=true;
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
    await wait(80);
    lastMessage=`⭐${target} を実処理で通過`;
  }

  async function chooseRoute(key){
    await ensureStage();
    closePauseOverlays();
    if(!ADVENTURE_ROUTES[key])throw new Error(`route ${key} がありません`);
    adventureRouteKey=key;
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
    lastMessage="🌰 警告→出現を強制（約0.56秒後）";
  }

  async function forceDanger(){
    await ensureStage();
    closePauseOverlays();
    if(stageStars<30)setStars(30);
    playArea.querySelectorAll(".danger-star").forEach(element=>element.remove());
    if(typeof beginSpecialHazards==="function"&&!specialHazardsActive)beginSpecialHazards();
    if(typeof createDangerStar!=="function")throw new Error("createDangerStar が見つかりません");
    createDangerStar();
    lastMessage="✹ 落下障害物を強制出現";
  }

  async function forceRock(){
    await ensureStage();
    closePauseOverlays();
    if(typeof createRock!=="function")throw new Error("createRock が見つかりません");
    createRock();
    lastMessage="岩を強制出現";
  }

  async function restartTest(){
    closePauseOverlays();
    startStageOne();
    await wait(150);
    lastMessage="RUNを最初から開始";
  }

  addButton("▶ 最初から",restartTest,true);
  addButton("⭐20 分岐",()=>triggerAt(20));
  addButton("⭐40 分岐",()=>triggerAt(40));
  addButton("⭐60 分岐",()=>triggerAt(60));
  addButton("⭐80 CLEAR",()=>triggerAt(80));
  addButton("⭐100 BONUS",()=>triggerAt(100));
  addButton("⭐120 BONUS",()=>triggerAt(120));
  addButton("🌰 強制出現",forceChestnut);
  addButton("✹ 強制出現",forceDanger);
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
    const chestnuts=playArea.querySelectorAll(".air-hazard").length;
    const dangers=playArea.querySelectorAll(".danger-star").length;
    status.innerHTML=`
      <strong>${stageCleared?"BONUS RUN":"STAGE"}</strong>　⭐${stars}<br>
      ROUTE ${route?`${route.icon}${route.name}`:"草原"}　難易度 ${tier}<br>
      ❤️${lifeText}　🌰${chestnuts}　✹${dangers}　${safeMode?"🛡無敵":"💔通常"}<br>
      <span style="opacity:.72">${lastMessage}</span>
    `;
  }

  setInterval(updateStatus,300);
  updateStatus();
})();

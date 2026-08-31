"use strict";

const PET_STORAGE_KEY="tiranon-pet-growth-v1";
const STAGE_ONE_TARGET=80;
const ADVENTURE_ROUTE_THRESHOLDS=[20,40,60];

let petState=loadPetState();
let stageActive=false;
let stageFinishing=false;
let stageCleared=false;
let stageStars=0;
let lastExpEarned=0;
let adventureRouteIndex=0;
let adventureRouteKey="meadow";
let adventureRouteHistory=[];
let adventureStageClearAnnounced=false;

const ADVENTURE_ROUTES={
  forest:{icon:"🌳",name:"木の実の森",description:"🌰が多い・SCORE +20%",score:1.20,speed:1.06,fallDelay:1.00,airDelay:.68},
  river:{icon:"🌊",name:"川辺",description:"障害物がゆっくり",score:1.00,speed:.82,fallDelay:1.20,airDelay:1.20},
  volcano:{icon:"🌋",name:"火山道",description:"かなり速い・SCORE +40%",score:1.40,speed:1.24,fallDelay:.82,airDelay:.82},
  night:{icon:"🌙",name:"星降る夜",description:"✹が多い・SCORE +30%",score:1.30,speed:1.10,fallDelay:.64,airDelay:1.02}
};

/* Keep timer-driven objects bounded when a mobile browser suspends animation frames. */
const ADVENTURE_ENTITY_LIMITS={
  ".star":10,
  ".rock":6,
  ".game-item":3,
  ".game-coin":4
};

function adventureTrimExcessEntities(){
  if(!stageActive)return;
  Object.entries(ADVENTURE_ENTITY_LIMITS).forEach(([selector,limit])=>{
    const elements=playArea.querySelectorAll(selector);
    for(let index=0;index<elements.length-limit;index++)elements[index].remove();
  });
}

const adventureEntityObserver=new MutationObserver(adventureTrimExcessEntities);
adventureEntityObserver.observe(playArea,{childList:true});

function defaultPetState(){
  return {level:1,exp:0,totalExp:0,stage1Clears:0};
}

function loadPetState(){
  try{
    const saved=JSON.parse(localStorage.getItem(PET_STORAGE_KEY)||"null");
    const base=defaultPetState();
    if(!saved||typeof saved!=="object")return base;
    base.level=Math.max(1,Math.floor(Number(saved.level)||1));
    base.exp=Math.max(0,Math.floor(Number(saved.exp)||0));
    base.totalExp=Math.max(0,Math.floor(Number(saved.totalExp)||0));
    base.stage1Clears=Math.max(0,Math.floor(Number(saved.stage1Clears)||0));
    return base;
  }catch(error){
    return defaultPetState();
  }
}

function savePetState(){
  try{localStorage.setItem(PET_STORAGE_KEY,JSON.stringify(petState));}catch(error){}
}

function expNeededForLevel(level){
  const safe=Math.max(1,Math.floor(level));
  return 80+(safe-1)*35;
}

function addPetExp(amount){
  let gained=Math.max(0,Math.floor(amount));
  petState.totalExp+=gained;
  petState.exp+=gained;
  let leveled=false;

  while(petState.exp>=expNeededForLevel(petState.level)){
    petState.exp-=expNeededForLevel(petState.level);
    petState.level++;
    leveled=true;
  }

  savePetState();
  return leveled;
}

const stageHud=document.createElement("div");
stageHud.className="stage-hud";
stageHud.hidden=true;
game.appendChild(stageHud);

const homeScreen=document.createElement("section");
homeScreen.className="tiranon-home";
homeScreen.setAttribute("aria-label","ティラノンホーム");
homeScreen.innerHTML=`
  <div class="home-topbar">
    <div class="home-level-pill">Lv.<strong id="home-pet-level">1</strong></div>
    <div class="home-wallet-pill">🪙 <strong id="home-wallet-coins">0</strong></div>
  </div>

  <div class="home-room">
    <p class="home-room__label">TIRANON HOME</p>
    <div class="home-speech" id="home-speech">きょうもいっしょにあそぼう！</div>
    <img class="home-tiranon" src="IMG_1796.png?v=20260830-v16" alt="ティラノン" draggable="false">
  </div>

  <div class="home-growth-card">
    <div class="home-growth-head">
      <div><span>ティラノン</span><strong id="home-level-text">Lv.1</strong></div>
      <span id="home-clear-count">草原クリア 0回</span>
    </div>
    <div class="home-exp-track" aria-label="経験値">
      <div id="home-exp-fill" class="home-exp-fill"></div>
    </div>
    <div class="home-exp-text"><span>EXP</span><strong id="home-exp-text">0 / 80</strong></div>
  </div>

  <div class="home-stage-card">
    <div class="home-stage-icon">🌿</div>
    <div class="home-stage-copy">
      <span>STAGE 1</span>
      <strong>草原</strong>
      <small>⭐80でクリア！その先はBONUS RUN</small>
    </div>
    <button id="home-play-button" class="home-play-button" type="button">あそびに行く</button>
  </div>

  <button id="home-shop-button" class="home-shop-button" type="button">🛒 アイテムショップ</button>
`;
game.appendChild(homeScreen);

const homePetLevel=document.getElementById("home-pet-level");
const homeWalletCoins=document.getElementById("home-wallet-coins");
const homeLevelText=document.getElementById("home-level-text");
const homeClearCount=document.getElementById("home-clear-count");
const homeExpFill=document.getElementById("home-exp-fill");
const homeExpText=document.getElementById("home-exp-text");
const homeSpeech=document.getElementById("home-speech");
const homePlayButton=document.getElementById("home-play-button");
const homeShopButton=document.getElementById("home-shop-button");

const resultCardForHome=document.querySelector(".result-card");
const restartButtonForHome=document.getElementById("restart-button");
const resultGrowth=document.createElement("div");
resultGrowth.className="result-growth";
resultGrowth.innerHTML=`<span>ティラノンEXP</span><strong id="result-exp-earned">+0 EXP</strong>`;
if(resultCardForHome&&restartButtonForHome)resultCardForHome.insertBefore(resultGrowth,restartButtonForHome);

const homeReturnButton=document.createElement("button");
homeReturnButton.type="button";
homeReturnButton.className="home-return-button";
homeReturnButton.textContent="🏠 ホームへ戻る";
if(resultCardForHome&&restartButtonForHome)resultCardForHome.insertBefore(homeReturnButton,restartButtonForHome);

const adventureRouteOverlay=document.createElement("section");
adventureRouteOverlay.className="run-level-overlay";
adventureRouteOverlay.hidden=true;
adventureRouteOverlay.setAttribute("aria-label","冒険ルートの選択");
adventureRouteOverlay.innerHTML=`
  <div class="run-level-card">
    <p class="run-level-kicker">ROUTE SELECT</p>
    <h2>どっちへ行くノン？</h2>
    <p class="run-level-sub">選んだ道で次の区間が変わるよ</p>
    <div class="run-level-choices adventure-route-choices"></div>
  </div>
`;
game.appendChild(adventureRouteOverlay);
const adventureRouteChoices=adventureRouteOverlay.querySelector(".adventure-route-choices");

/* Route themes use CSS only: no new image assets. */
const adventureThemeStyle=document.createElement("style");
adventureThemeStyle.textContent=`
  .game{transition:background .62s ease,color .45s ease;}
  .game .cloud{transition:opacity .55s ease,filter .55s ease;}
  .adventure-atmosphere{position:absolute;inset:0;z-index:2;overflow:hidden;pointer-events:none;opacity:0;transition:opacity .55s ease;background-size:100% 100%;}
  .adventure-atmosphere::before,.adventure-atmosphere::after{position:absolute;inset:-10%;content:"";pointer-events:none;}
  .game.route-forest{background:linear-gradient(180deg,#75cda9 0%,#b9e7b0 66%,#4f9d52 66%,#286e36 100%);}
  .game.route-forest .cloud{opacity:.56;filter:hue-rotate(55deg) saturate(.7);}
  .game.route-forest .adventure-atmosphere{opacity:1;background:radial-gradient(circle at 12% 22%,rgba(35,110,48,.34) 0 4%,transparent 4.5%),radial-gradient(circle at 78% 34%,rgba(24,96,43,.28) 0 6%,transparent 6.5%),radial-gradient(circle at 48% 55%,rgba(255,240,145,.20),transparent 28%);}
  .game.route-forest .adventure-atmosphere::before{content:"🍃    🍃       🍃";font-size:26px;letter-spacing:52px;opacity:.38;animation:route-leaves 6s linear infinite;}
  .game.route-river{background:linear-gradient(180deg,#65cdea 0%,#bdeef4 57%,#66c7bf 57%,#3f9f9d 76%,#62b65b 76%,#2f8441 100%);}
  .game.route-river .cloud{opacity:.84;filter:brightness(1.08);}
  .game.route-river .adventure-atmosphere{opacity:1;background:repeating-linear-gradient(174deg,transparent 0 16px,rgba(255,255,255,.15) 17px 19px,transparent 20px 34px);animation:route-water 2.8s ease-in-out infinite alternate;}
  .game.route-volcano{background:radial-gradient(circle at 50% 92%,rgba(255,116,40,.82),transparent 34%),linear-gradient(180deg,#845f64 0%,#bc7660 58%,#704233 58%,#3c2925 100%);}
  .game.route-volcano .cloud{opacity:.16;filter:sepia(1) brightness(.65);}
  .game.route-volcano .adventure-atmosphere{opacity:1;background:radial-gradient(circle at 22% 78%,rgba(255,195,75,.34) 0 2px,transparent 3px),radial-gradient(circle at 68% 62%,rgba(255,137,43,.40) 0 2px,transparent 3px),radial-gradient(circle at 82% 83%,rgba(255,214,104,.30) 0 3px,transparent 4px);background-size:88px 92px,120px 106px,150px 126px;animation:route-heat 1.4s ease-in-out infinite alternate;}
  .game.route-night{background:linear-gradient(180deg,#111b48 0%,#25366f 61%,#234f43 61%,#17382c 100%);}
  .game.route-night .cloud{opacity:.13;filter:brightness(.7) saturate(.5);}
  .game.route-night .status{color:#fff;text-shadow:0 2px 3px rgba(0,0,0,.55);}
  .game.route-volcano .status{color:#fff;text-shadow:0 2px 3px rgba(62,24,17,.58);}
  .game.route-night .adventure-atmosphere{opacity:1;background:radial-gradient(circle at 12% 16%,#fff 0 1px,transparent 2px),radial-gradient(circle at 72% 24%,#fff6ba 0 1.5px,transparent 2.5px),radial-gradient(circle at 42% 41%,#fff 0 1px,transparent 2px),radial-gradient(circle at 86% 48%,#d9ecff 0 1px,transparent 2px);background-size:92px 92px,128px 128px,74px 74px,116px 116px;animation:route-stars 2.2s ease-in-out infinite alternate;}
  .route-transition-banner{position:absolute;inset:0;z-index:18;display:grid;place-items:center;pointer-events:none;background:rgba(255,255,255,.08);opacity:0;transform:scale(1.04);transition:opacity .18s ease,transform .45s ease;}
  .route-transition-banner strong{padding:14px 20px;border:2px solid rgba(255,255,255,.86);border-radius:999px;color:#fff;background:rgba(23,53,48,.76);box-shadow:0 7px 22px rgba(0,0,0,.22);font-size:clamp(20px,5vw,34px);font-weight:1000;text-shadow:0 2px 3px rgba(0,0,0,.35);}
  .route-transition-banner.is-showing{opacity:1;transform:scale(1);}
  @keyframes route-leaves{from{transform:translate(-8%,-14%) rotate(-4deg)}to{transform:translate(10%,105%) rotate(12deg)}}
  @keyframes route-water{from{transform:translateY(-4px)}to{transform:translateY(5px)}}
  @keyframes route-heat{from{filter:blur(0);transform:translateY(0)}to{filter:blur(1.5px);transform:translateY(-5px)}}
  @keyframes route-stars{from{opacity:.58}to{opacity:1}}
  @media(prefers-reduced-motion:reduce){.game,.game .cloud,.adventure-atmosphere,.route-transition-banner{transition:none!important;animation:none!important}.adventure-atmosphere::before{animation:none!important}}
`;
document.head.appendChild(adventureThemeStyle);

const adventureAtmosphere=document.createElement("div");
adventureAtmosphere.className="adventure-atmosphere";
adventureAtmosphere.setAttribute("aria-hidden","true");
game.insertBefore(adventureAtmosphere,playArea);

const adventureRouteBanner=document.createElement("div");
adventureRouteBanner.className="route-transition-banner";
adventureRouteBanner.setAttribute("aria-hidden","true");
adventureRouteBanner.innerHTML="<strong></strong>";
game.appendChild(adventureRouteBanner);
let adventureRouteBannerTimer=0;

function adventureApplyRouteTheme(key,announce=false){
  game.classList.remove("route-forest","route-river","route-volcano","route-night");
  if(ADVENTURE_ROUTES[key])game.classList.add(`route-${key}`);
  if(!announce||!ADVENTURE_ROUTES[key])return;

  const route=ADVENTURE_ROUTES[key];
  clearTimeout(adventureRouteBannerTimer);
  adventureRouteBanner.querySelector("strong").textContent=`${route.icon} ${route.name}へ！`;
  adventureRouteBanner.classList.remove("is-showing");
  void adventureRouteBanner.offsetWidth;
  adventureRouteBanner.classList.add("is-showing");
  adventureRouteBannerTimer=setTimeout(()=>adventureRouteBanner.classList.remove("is-showing"),720);
}

function adventureCurrentStars(){
  return Math.max(stageStars,typeof runStarsCollected==="number"?runStarsCollected:0);
}

function adventureDifficultyTier(){
  const stars=adventureCurrentStars();
  if(stars<20)return 0;
  if(stars<40)return 1;
  if(stars<60)return 2;
  if(stars<80)return 3;
  return 4+Math.floor((stars-80)/20);
}

function adventureRoute(){return ADVENTURE_ROUTES[adventureRouteKey]||null;}

function adventureHazardSpeedMultiplier(){
  const tier=adventureDifficultyTier();
  const base=tier===0?.72:tier===1?.84:tier===2?.96:tier===3?1.08:Math.min(1.62,1.12+(tier-4)*.08);
  return base*(adventureRoute()?.speed||1);
}

function adventureHazardDelayMultiplier(type){
  const tier=adventureDifficultyTier();
  const base=tier===0?1.45:tier===1?1.24:tier===2?1.04:tier===3?.90:Math.max(.48,.84-(tier-4)*.06);
  const route=adventureRoute();
  if(!route)return base;
  return base*(type==="air"?route.airDelay:route.fallDelay);
}

function adventureShowPopup(text,duration=1100){
  const popup=document.createElement("div");
  popup.className="fever-popup";
  popup.textContent=text;
  popup.setAttribute("aria-hidden","true");
  playArea.appendChild(popup);
  setTimeout(()=>popup.remove(),duration);
}

function adventureRoutePool(){
  const pool=Object.keys(ADVENTURE_ROUTES).filter(key=>key!==adventureRouteKey);
  for(let i=pool.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [pool[i],pool[j]]=[pool[j],pool[i]];
  }
  return pool.slice(0,2);
}

function adventureOpenRouteChoice(){
  if(!isPlaying||adventureRouteOverlay.hidden===false)return;
  if(typeof runPauseGame!=="function"||typeof runResumeGame!=="function")return;
  if(typeof runDraftPaused!=="undefined"&&runDraftPaused)return;

  runPauseGame();
  if(typeof runLevelOverlay!=="undefined")runLevelOverlay.hidden=true;
  adventureRouteChoices.innerHTML="";

  for(const key of adventureRoutePool()){
    const route=ADVENTURE_ROUTES[key];
    const button=document.createElement("button");
    button.type="button";
    button.className="run-level-choice";
    button.innerHTML=`
      <span class="run-level-choice__icon">${route.icon}</span>
      <span class="run-level-choice__body">
        <strong>${route.name}</strong>
        <small>次の区間</small>
        <span>${route.description}</span>
      </span>
    `;
    button.addEventListener("click",()=>adventureChooseRoute(key));
    adventureRouteChoices.appendChild(button);
  }
  adventureRouteOverlay.hidden=false;
}

function adventureChooseRoute(key){
  if(!ADVENTURE_ROUTES[key])return;
  adventureRouteKey=key;
  adventureRouteHistory.push(key);
  adventureRouteIndex++;
  adventureRouteOverlay.hidden=true;
  const route=ADVENTURE_ROUTES[key];
  adventureApplyRouteTheme(key,true);
  runResumeGame();
  renderStageHud();
  setTimeout(()=>adventureShowPopup(`${route.icon} ${route.name}`),760);
}

function adventureResetRoute(){
  adventureRouteIndex=0;
  adventureRouteKey="meadow";
  adventureRouteHistory=[];
  adventureStageClearAnnounced=false;
  adventureRouteOverlay.hidden=true;
  adventureApplyRouteTheme("meadow",false);
}

function renderHome(){
  const needed=expNeededForLevel(petState.level);
  const ratio=Math.max(0,Math.min(1,petState.exp/needed));
  if(homePetLevel)homePetLevel.textContent=String(petState.level);
  if(homeLevelText)homeLevelText.textContent=`Lv.${petState.level}`;
  if(homeExpText)homeExpText.textContent=`${petState.exp} / ${needed}`;
  if(homeExpFill)homeExpFill.style.width=`${ratio*100}%`;
  if(homeClearCount)homeClearCount.textContent=`草原クリア ${petState.stage1Clears}回`;
  if(homeWalletCoins&&typeof progressionState!=="undefined")homeWalletCoins.textContent=String(progressionState.coins);

  if(homeSpeech){
    if(petState.level>=10)homeSpeech.textContent="もっと遠くまで冒険してみたい！";
    else if(petState.level>=5)homeSpeech.textContent="ぼく、ちょっと強くなったよ！";
    else if(petState.stage1Clears>0)homeSpeech.textContent="また草原にあそびにいこう！";
    else homeSpeech.textContent="きょうもいっしょにあそぼう！";
  }
}

function renderStageHud(){
  const route=adventureRoute();
  const routeText=route?` · ${route.icon}${route.name}`:"";
  if(stageCleared){
    stageHud.innerHTML=`<strong>BONUS RUN${routeText}</strong><span>⭐ ${stageStars}</span>`;
  }else{
    stageHud.innerHTML=`<strong>STAGE 1 草原${routeText}</strong><span>⭐ ${stageStars}/${STAGE_ONE_TARGET}</span>`;
  }
}

function stopGameForHome(){
  isPlaying=false;
  movingLeft=false;
  movingRight=false;
  cancelAnimationFrame(animationId);
  clearInterval(timerId);
  clearInterval(starTimerId);
  clearInterval(rockTimerId);
  clearTimeout(feverTimerId);
  if(typeof stopItemRound==="function")stopItemRound();
  if(typeof stopCoinRound==="function")stopCoinRound();
  if(typeof cleanupFeverVisuals==="function")cleanupFeverVisuals();
  game.classList.remove("fever-active");
  if(typeof runLevelOverlay!=="undefined")runLevelOverlay.hidden=true;
  adventureRouteOverlay.hidden=true;
  playArea.querySelectorAll(".star,.rock,.game-item,.game-coin,.point-popup,.damage-popup,.life-popup,.item-popup,.coin-popup,.fever-popup").forEach(element=>element.remove());
  gameOverScreen.hidden=true;
  stageHud.hidden=true;
}

function showHome(){
  stopGameForHome();
  stageActive=false;
  stageFinishing=false;
  stageCleared=false;
  adventureApplyRouteTheme("meadow",false);
  homeScreen.hidden=false;
  renderHome();
}

function startStageOne(){
  stageActive=true;
  stageFinishing=false;
  stageCleared=false;
  stageStars=0;
  lastExpEarned=0;
  adventureResetRoute();
  renderStageHud();
  stageHud.hidden=false;
  homeScreen.hidden=true;
  gameOverScreen.hidden=true;

  // Using the existing restart button triggers every add-on reset listener too.
  restartButton.click();
  setTimeout(()=>{
    stageActive=true;
    stageHud.hidden=false;
    renderStageHud();
    if(typeof resetLifeRound==="function")resetLifeRound();
  },0);
}

homePlayButton.addEventListener("click",startStageOne);
homeShopButton.addEventListener("click",()=>{
  if(typeof openShop==="function")openShop();
});
homeReturnButton.addEventListener("click",showHome);

/* Early RUN is intentionally forgiving; later routes and bonus tiers make rocks faster. */
const createRockBeforeAdventure=createRock;
createRock=function(){
  if(!isPlaying)return;
  const stars=adventureCurrentStars();
  if(stageActive){
    let skipChance=stars<10?.68:stars<20?.38:stars<40?.12:0;
    if(adventureRouteKey==="river")skipChance=Math.min(.80,skipChance+.12);
    if(Math.random()<skipChance)return;
  }

  createRockBeforeAdventure();
  const rocks=playArea.querySelectorAll(".rock");
  const rock=rocks[rocks.length-1];
  if(rock&&stageActive){
    rock.dataset.speed=String(Number(rock.dataset.speed)*adventureHazardSpeedMultiplier());
  }
};

const collectStarBeforeStage=collectStar;
collectStar=function(star,now){
  const scoreBefore=score;
  collectStarBeforeStage(star,now);
  if(!stageActive||stageFinishing)return;

  const gained=Math.max(0,score-scoreBefore);
  const route=adventureRoute();
  if(route&&route.score>1&&gained>0){
    const bonus=Math.max(1,Math.floor(gained*(route.score-1)));
    score+=bonus;
    scoreDisplay.textContent=`SCORE ${score}`;
  }

  stageStars++;

  if(!stageCleared&&stageStars>=STAGE_ONE_TARGET){
    stageCleared=true;
    stageFinishing=false;
    if(!adventureStageClearAnnounced){
      adventureStageClearAnnounced=true;
      adventureShowPopup("STAGE CLEAR!  BONUS RUN",1600);
    }
  }

  renderStageHud();

  const thresholdIndex=ADVENTURE_ROUTE_THRESHOLDS.indexOf(stageStars);
  if(thresholdIndex>=0&&thresholdIndex===adventureRouteIndex){
    setTimeout(()=>{if(isPlaying)adventureOpenRouteChoice();},0);
  }

  if(stageCleared&&stageStars>STAGE_ONE_TARGET&&(stageStars-STAGE_ONE_TARGET)%20===0){
    adventureShowPopup(`BONUS Lv.${adventureDifficultyTier()-3}`,900);
  }
};

const endGameBeforeHome=endGame;
endGame=function(){
  if(stageFinishing&&gameOverScreen.hidden===false)return;

  const wasClear=stageCleared;
  const starsAtEnd=stageStars;
  stageActive=false;
  stageHud.hidden=true;
  adventureRouteOverlay.hidden=true;

  endGameBeforeHome();

  const expEarned=wasClear
    ? 45+Math.floor(score/12)+Math.floor(starsAtEnd/8)
    : 10+Math.floor(starsAtEnd/5)+Math.floor(score/25);
  lastExpEarned=Math.max(1,expEarned);
  const leveled=addPetExp(lastExpEarned);
  if(wasClear){
    petState.stage1Clears++;
    savePetState();
  }

  const resultLabel=document.querySelector(".result-label");
  const rankMessage=document.getElementById("rank-message");
  const resultExp=document.getElementById("result-exp-earned");
  if(resultLabel)resultLabel.textContent=wasClear?"STAGE CLEAR + BONUS":"ADVENTURE END";
  if(rankMessage){
    if(leveled)rankMessage.textContent=`ティラノンがLv.${petState.level}になった！`;
    else if(wasClear)rankMessage.textContent=`草原クリア！⭐${starsAtEnd}まで冒険したよ！`;
    else rankMessage.textContent="ホームで休んで、また冒険しよう！";
  }
  if(resultExp)resultExp.textContent=`+${lastExpEarned} EXP`;
  renderHome();
};

// Make replay from RESULT mean another Stage 1 run, not an endless free run.
restartButton.addEventListener("click",()=>{
  if(gameOverScreen.hidden)return;
  setTimeout(()=>{
    stageActive=true;
    stageFinishing=false;
    stageCleared=false;
    stageStars=0;
    adventureResetRoute();
    stageHud.hidden=false;
    renderStageHud();
  },0);
},{capture:true});

/*
 * stage-hazards.js loads after this file. Patch after page scripts finish so:
 * - falling hazards begin later and speed up gradually
 * - chestnuts unlock at 40 stars
 * - chestnuts are no longer cancelled by rocks / falling hazards
 */
setTimeout(()=>{
  if(typeof scheduleDangerStar!=="function"||typeof scheduleAirHazard!=="function")return;

  createDangerStar=function(){
    if(!specialHazardsCanMove()||adventureCurrentStars()<30)return;
    if(playArea.querySelector(".danger-star"))return;

    const hazard=document.createElement("div");
    hazard.className="danger-star";
    hazard.textContent="✹";
    hazard.setAttribute("aria-hidden","true");
    const maxX=Math.max(20,playArea.clientWidth-58);
    hazard.dataset.x=String(10+Math.random()*Math.max(10,maxX-10));
    hazard.dataset.y="72";
    hazard.style.transform=`translate(${hazard.dataset.x}px,72px)`;
    playArea.appendChild(hazard);
  };

  createAirHazard=function(){
    if(!specialHazardsCanMove()||adventureCurrentStars()<40)return;
    if(playArea.querySelector(".air-hazard,.air-warning"))return;

    const fromLeft=Math.random()<.5;
    const warning=document.createElement("div");
    warning.className=`air-warning ${fromLeft?"air-warning--left":"air-warning--right"}`;
    warning.textContent="!";
    warning.setAttribute("aria-hidden","true");
    playArea.appendChild(warning);

    setTimeout(()=>{
      warning.remove();
      if(!specialHazardsCanMove()||adventureCurrentStars()<40)return;
      if(playArea.querySelector(".air-hazard"))return;

      const hazard=document.createElement("div");
      hazard.className="air-hazard";
      hazard.textContent="🌰";
      hazard.setAttribute("aria-hidden","true");
      hazard.dataset.direction=fromLeft?"1":"-1";
      hazard.dataset.x=String(fromLeft?-58:playArea.clientWidth+12);
      hazard.style.transform=`translateX(${hazard.dataset.x}px)`;
      playArea.appendChild(hazard);
    },560);
  };

  scheduleDangerStar=function(){
    clearTimeout(fallHazardTimeoutId);
    if(!specialHazardsActive)return;
    const delay=specialHazardDelay(FALL_SPAWN_MIN,FALL_SPAWN_MAX)*adventureHazardDelayMultiplier("fall");
    fallHazardTimeoutId=setTimeout(()=>{
      if(specialHazardsActive){
        createDangerStar();
        scheduleDangerStar();
      }
    },delay);
  };

  scheduleAirHazard=function(){
    clearTimeout(airHazardTimeoutId);
    if(!specialHazardsActive)return;
    let multiplier=adventureHazardDelayMultiplier("air");
    if(adventureRouteKey==="forest")multiplier*=.74;
    const delay=specialHazardDelay(AIR_SPAWN_MIN,AIR_SPAWN_MAX)*multiplier;
    airHazardTimeoutId=setTimeout(()=>{
      if(specialHazardsActive){
        createAirHazard();
        scheduleAirHazard();
      }
    },delay);
  };

  updateDangerStars=function(dt,currentTime){
    const playerHitbox=insetRect(player.getBoundingClientRect(),22,10);
    const gameBottom=game.getBoundingClientRect().bottom;
    const speed=FALL_HAZARD_SPEED*adventureHazardSpeedMultiplier();

    playArea.querySelectorAll(".danger-star").forEach(hazard=>{
      const nextY=Number(hazard.dataset.y)+speed*dt;
      hazard.dataset.y=String(nextY);
      hazard.style.transform=`translate(${hazard.dataset.x}px,${nextY}px)`;
      const rect=insetRect(hazard.getBoundingClientRect(),5,5);
      if(rectanglesOverlap(playerHitbox,rect)){
        specialHazardDamage(hazard,currentTime);
        return;
      }
      if(rect.top>=gameBottom)hazard.remove();
    });
  };

  updateAirHazards=function(dt,currentTime){
    const playerHitbox=insetRect(player.getBoundingClientRect(),23,10);
    const areaRect=playArea.getBoundingClientRect();
    const forestBoost=adventureRouteKey==="forest"?1.08:1;
    const speed=AIR_HAZARD_SPEED*adventureHazardSpeedMultiplier()*forestBoost;

    playArea.querySelectorAll(".air-hazard").forEach(hazard=>{
      const direction=Number(hazard.dataset.direction);
      const nextX=Number(hazard.dataset.x)+direction*speed*dt;
      hazard.dataset.x=String(nextX);
      hazard.style.transform=`translateX(${nextX}px) rotate(${direction*12}deg)`;
      const rect=insetRect(hazard.getBoundingClientRect(),5,5);
      if(rectanglesOverlap(playerHitbox,rect)){
        specialHazardDamage(hazard,currentTime);
        return;
      }
      const raw=hazard.getBoundingClientRect();
      if(raw.right<areaRect.left-70||raw.left>areaRect.right+70)hazard.remove();
    });
  };
},0);

/* life-mode.js replaces rock collision after this file loads. Replace it once more after all
 * synchronous scripts finish, keeping its LIFE / shield behavior but making visual near-misses fairer. */
setTimeout(()=>{
  if(typeof updateRocks!=="function"||typeof lives==="undefined")return;

  updateRocks=function(dt,currentTime){
    // Roughly 15% smaller effective collision area than the previous rock check.
    const playerHitbox=insetRect(player.getBoundingClientRect(),28,12);
    const areaRect=playArea.getBoundingClientRect();

    playArea.querySelectorAll(".rock").forEach(rock=>{
      const direction=Number(rock.dataset.direction);
      const speed=Number(rock.dataset.speed);
      const nextX=Number(rock.dataset.x)+direction*speed*dt;
      const rotation=Number(rock.dataset.rotation)+direction*90*dt;
      rock.dataset.x=String(nextX);
      rock.dataset.rotation=String(rotation);
      rock.style.transform=`translateX(${nextX}px) rotate(${rotation}deg)`;

      const rockRect=insetRect(rock.getBoundingClientRect(),7,5);
      if(currentTime>=invincibleUntil&&rectanglesOverlap(playerHitbox,rockRect)){
        if(shieldCharges>0){
          shieldCharges--;
          if(shieldCharges<=0)player.classList.remove("shield-active");
          invincibleUntil=currentTime+300;
          showShieldBlockPopup();
          renderItemStatus(currentTime);
          rock.remove();
          return;
        }

        lives=Math.max(0,lives-1);
        renderLives();
        resetCombo();
        showLifePopup("💔 -1","life-popup--damage");
        invincibleUntil=currentTime+1000;
        player.classList.add("is-hit");
        setTimeout(()=>player.classList.remove("is-hit"),900);
        rock.remove();

        if(lives<=0){
          setTimeout(()=>{if(isPlaying)endGame();},120);
        }
        return;
      }

      const rawRect=rock.getBoundingClientRect();
      if(rawRect.right<areaRect.left-70||rawRect.left>areaRect.right+70)rock.remove();
    });
  };
},0);

// The legacy game auto-starts during page load. Replace that initial state with HOME.
showHome();
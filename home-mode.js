"use strict";

const PET_STORAGE_KEY="tiranon-pet-growth-v1";
const STAGE_ONE_TARGET=80;

let petState=loadPetState();
let stageActive=false;
let stageFinishing=false;
let stageCleared=false;
let stageStars=0;
let lastExpEarned=0;

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
      <small>⭐を80個集めよう</small>
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
  stageHud.innerHTML=`<strong>STAGE 1 草原</strong><span>⭐ ${stageStars}/${STAGE_ONE_TARGET}</span>`;
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
  playArea.querySelectorAll(".star,.rock,.game-item,.game-coin,.point-popup,.damage-popup,.life-popup,.item-popup,.coin-popup,.fever-popup").forEach(element=>element.remove());
  gameOverScreen.hidden=true;
  stageHud.hidden=true;
}

function showHome(){
  stopGameForHome();
  stageActive=false;
  stageFinishing=false;
  stageCleared=false;
  homeScreen.hidden=false;
  renderHome();
}

function startStageOne(){
  stageActive=true;
  stageFinishing=false;
  stageCleared=false;
  stageStars=0;
  lastExpEarned=0;
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

const collectStarBeforeStage=collectStar;
collectStar=function(star,now){
  collectStarBeforeStage(star,now);
  if(!stageActive||stageFinishing)return;

  stageStars++;
  renderStageHud();

  if(stageStars>=STAGE_ONE_TARGET){
    stageCleared=true;
    stageFinishing=true;
    setTimeout(()=>{if(isPlaying)endGame();},0);
  }
};

const endGameBeforeHome=endGame;
endGame=function(){
  if(stageFinishing&&gameOverScreen.hidden===false)return;

  const wasClear=stageCleared;
  const starsAtEnd=stageStars;
  stageActive=false;
  stageHud.hidden=true;

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
  if(resultLabel)resultLabel.textContent=wasClear?"STAGE CLEAR!":"ADVENTURE END";
  if(rankMessage){
    if(leveled)rankMessage.textContent=`ティラノンがLv.${petState.level}になった！`;
    else if(wasClear)rankMessage.textContent="草原クリア！ティラノンが成長したよ！";
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
    stageHud.hidden=false;
    renderStageHud();
  },0);
});

// The legacy game auto-starts during page load. Replace that initial state with HOME.
showHome();

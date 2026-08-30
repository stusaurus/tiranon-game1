"use strict";

const RUN_LEVEL_STAR_STEP=7;
const RUN_SKILL_MAX=3;

let runDraftPaused=false;
let runStarsCollected=0;
let runLevel=1;
let runNextLevelAt=RUN_LEVEL_STAR_STEP;
let runPauseSnapshot=null;
let runSkillLevels={
  starPower:0,
  magnetBoost:0,
  shieldBoost:0,
  clockBoost:0,
  feverBoost:0,
  comboBoost:0
};

const runLevelHud=document.createElement("div");
runLevelHud.className="run-level-hud";
runLevelHud.setAttribute("aria-live","polite");
game.appendChild(runLevelHud);

const runLevelOverlay=document.createElement("section");
runLevelOverlay.className="run-level-overlay";
runLevelOverlay.hidden=true;
runLevelOverlay.setAttribute("aria-label","レベルアップの選択");
runLevelOverlay.innerHTML=`
  <div class="run-level-card">
    <p class="run-level-kicker">LEVEL UP!</p>
    <h2>1つ選ぼう</h2>
    <p class="run-level-sub">このプレイ中だけ強くなるよ</p>
    <div class="run-level-choices"></div>
  </div>
`;
game.appendChild(runLevelOverlay);

const runLevelChoices=runLevelOverlay.querySelector(".run-level-choices");

const RUN_SKILLS={
  starPower:{
    icon:"⭐",
    name:"スターパワー",
    description(level){return `星の基本得点 +${level}`;}
  },
  magnetBoost:{
    icon:"🧲",
    name:"マグネット強化",
    description(level){return `マグネット +${level*2}秒`;}
  },
  shieldBoost:{
    icon:"🛡️",
    name:"シールド強化",
    description(level){return `シールド取得時 +${level}回`;}
  },
  clockBoost:{
    icon:"⏰",
    name:"タイム強化",
    description(level){return `時計の効果 +${level}秒`;}
  },
  feverBoost:{
    icon:"🔥",
    name:"FEVER強化",
    description(level){return `FEVER +${level}秒`;}
  },
  comboBoost:{
    icon:"🔗",
    name:"コンボ強化",
    description(level){return `コンボ猶予 +${(level*.25).toFixed(2)}秒`;}
  }
};

function runUpdateHud(){
  const progress=Math.max(0,Math.min(RUN_LEVEL_STAR_STEP,RUN_LEVEL_STAR_STEP-(runNextLevelAt-runStarsCollected)));
  runLevelHud.innerHTML=`<strong>RUN Lv.${runLevel}</strong><span>⭐ ${progress}/${RUN_LEVEL_STAR_STEP}</span>`;
}

function runResetState(){
  runDraftPaused=false;
  runStarsCollected=0;
  runLevel=1;
  runNextLevelAt=RUN_LEVEL_STAR_STEP;
  runPauseSnapshot=null;
  runSkillLevels={starPower:0,magnetBoost:0,shieldBoost:0,clockBoost:0,feverBoost:0,comboBoost:0};
  runLevelOverlay.hidden=true;
  runUpdateHud();
}

function runAvailableSkillKeys(){
  return Object.keys(RUN_SKILLS).filter(key=>runSkillLevels[key]<RUN_SKILL_MAX);
}

function runPickThree(){
  const pool=runAvailableSkillKeys();
  for(let i=pool.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [pool[i],pool[j]]=[pool[j],pool[i]];
  }
  return pool.slice(0,3);
}

function runRenderChoices(){
  runLevelChoices.innerHTML="";
  for(const key of runPickThree()){
    const skill=RUN_SKILLS[key];
    const current=runSkillLevels[key];
    const next=current+1;
    const button=document.createElement("button");
    button.type="button";
    button.className="run-level-choice";
    button.innerHTML=`
      <span class="run-level-choice__icon">${skill.icon}</span>
      <span class="run-level-choice__body">
        <strong>${skill.name}</strong>
        <small>Lv.${current} → Lv.${next}</small>
        <span>${skill.description(next)}</span>
      </span>
    `;
    button.addEventListener("click",()=>runChooseSkill(key));
    runLevelChoices.appendChild(button);
  }
}

function runPauseGame(){
  if(runDraftPaused||!isPlaying)return;
  const now=performance.now();
  runDraftPaused=true;
  runPauseSnapshot={
    combo:Math.max(0,comboExpiresAt-now),
    magnet:typeof magnetUntil!=="undefined"?Math.max(0,magnetUntil-now):0,
    double:typeof doubleUntil!=="undefined"?Math.max(0,doubleUntil-now):0,
    invincible:Math.max(0,invincibleUntil-now),
    fever:(typeof feverModeIsActive==="function"&&feverModeIsActive()&&typeof feverEndsAt!=="undefined")?Math.max(0,feverEndsAt-now):0
  };

  clearInterval(timerId);
  clearInterval(starTimerId);
  clearInterval(rockTimerId);
  if(typeof itemSpawnTimeoutId!=="undefined")clearTimeout(itemSpawnTimeoutId);
  if(typeof coinSpawnTimeoutId!=="undefined")clearTimeout(coinSpawnTimeoutId);
  if(runPauseSnapshot.fever>0){
    clearTimeout(feverTimerId);
    if(typeof feverCountdownIntervalId!=="undefined")clearInterval(feverCountdownIntervalId);
  }

  runRenderChoices();
  runLevelOverlay.hidden=false;
}

function runResumeGame(){
  if(!runDraftPaused||!isPlaying)return;
  const now=performance.now();
  const snap=runPauseSnapshot||{combo:0,magnet:0,double:0,invincible:0,fever:0};

  comboExpiresAt=snap.combo>0?now+snap.combo:0;
  if(typeof magnetUntil!=="undefined")magnetUntil=snap.magnet>0?now+snap.magnet:0;
  if(typeof doubleUntil!=="undefined")doubleUntil=snap.double>0?now+snap.double:0;
  invincibleUntil=snap.invincible>0?now+snap.invincible:0;

  if(snap.fever>0&&typeof feverEndsAt!=="undefined"){
    feverEndsAt=now+snap.fever;
    if(typeof cleanupFeverVisuals==="function")cleanupFeverVisuals();
    if(typeof createFeverTimer==="function")createFeverTimer();
    if(typeof createFeverSparkles==="function")createFeverSparkles();
    clearTimeout(feverTimerId);
    feverTimerId=setTimeout(()=>{
      game.classList.remove("fever-active");
      if(typeof cleanupFeverVisuals==="function")cleanupFeverVisuals();
      resetCombo();
    },snap.fever);
  }

  runDraftPaused=false;
  runPauseSnapshot=null;
  runLevelOverlay.hidden=true;

  previousTime=now;
  if(typeof itemPreviousTime!=="undefined")itemPreviousTime=now;
  if(typeof coinPreviousTime!=="undefined")coinPreviousTime=now;

  timerId=setInterval(()=>{
    timeLeft--;
    timeDisplay.textContent=`TIME ${timeLeft}`;
    if(timeLeft===0)endGame();
  },1000);
  starTimerId=setInterval(createStar,STAR_INTERVAL);
  rockTimerId=setInterval(createRock,ROCK_INTERVAL);
  if(typeof scheduleNextItem==="function")scheduleNextItem();
  if(typeof scheduleNextCoin==="function")scheduleNextCoin();
}

function runChooseSkill(key){
  if(!runDraftPaused||!RUN_SKILLS[key])return;
  runSkillLevels[key]=Math.min(RUN_SKILL_MAX,runSkillLevels[key]+1);

  if(key==="shieldBoost"&&typeof shieldCharges!=="undefined"){
    shieldCharges+=1;
    player.classList.add("shield-active");
    if(typeof renderItemStatus==="function")renderItemStatus(performance.now());
  }

  runLevel++;
  runNextLevelAt+=RUN_LEVEL_STAR_STEP;
  runUpdateHud();
  runResumeGame();
}

const gameLoopBeforeRunLevel=gameLoop;
gameLoop=function(currentTime){
  if(runDraftPaused){
    previousTime=currentTime;
    if(typeof itemPreviousTime!=="undefined")itemPreviousTime=currentTime;
    animationId=requestAnimationFrame(gameLoop);
    return;
  }
  gameLoopBeforeRunLevel(currentTime);
};

if(typeof coinAnimationLoop==="function"){
  const coinAnimationLoopBeforeRunLevel=coinAnimationLoop;
  coinAnimationLoop=function(now){
    if(runDraftPaused){
      coinPreviousTime=now;
      requestAnimationFrame(coinAnimationLoop);
      return;
    }
    coinAnimationLoopBeforeRunLevel(now);
  };
}

const collectStarBeforeRunLevel=collectStar;
collectStar=function(star,now){
  const scoreBefore=score;
  collectStarBeforeRunLevel(star,now);

  const starPower=runSkillLevels.starPower;
  if(starPower>0){
    const comboMultiplier=Math.min(comboCount,MAX_COMBO_MULTIPLIER);
    const itemMultiplier=(typeof doubleIsActive==="function"&&doubleIsActive(now))?2:1;
    const extra=starPower*comboMultiplier*itemMultiplier;
    score+=extra;
    scoreDisplay.textContent=`SCORE ${score}`;
    const popups=playArea.querySelectorAll(".point-popup");
    const popup=popups[popups.length-1];
    if(popup)popup.textContent=`+${(score-scoreBefore)}`;
  }

  if(runSkillLevels.comboBoost>0&&comboExpiresAt>0){
    comboExpiresAt+=runSkillLevels.comboBoost*250;
  }

  runStarsCollected++;
  runUpdateHud();
  if(runStarsCollected>=runNextLevelAt&&!runDraftPaused){
    setTimeout(()=>{if(isPlaying&&!runDraftPaused)runPauseGame();},0);
  }
};

const collectItemBeforeRunLevel=collectItem;
collectItem=function(item,currentTime){
  const type=item.dataset.type;
  const clockAllowed=type!=="clock"||typeof itemClockUses==="undefined"||itemClockUses<2;
  collectItemBeforeRunLevel(item,currentTime);
  if(type==="clock"&&!clockAllowed)return;

  if(type==="magnet"&&runSkillLevels.magnetBoost>0){
    magnetUntil+=runSkillLevels.magnetBoost*2000;
  }else if(type==="shield"&&runSkillLevels.shieldBoost>0){
    shieldCharges+=runSkillLevels.shieldBoost;
  }else if(type==="clock"&&runSkillLevels.clockBoost>0){
    timeLeft+=runSkillLevels.clockBoost;
    timeDisplay.textContent=`TIME ${timeLeft}`;
  }

  if(typeof renderItemStatus==="function")renderItemStatus(currentTime);
};

const triggerFeverBeforeRunLevel=triggerFever;
triggerFever=function(){
  const wasActive=typeof feverModeIsActive==="function"&&feverModeIsActive();
  triggerFeverBeforeRunLevel();
  if(wasActive||runSkillLevels.feverBoost<=0||typeof feverEndsAt==="undefined")return;

  const bonus=runSkillLevels.feverBoost*1000;
  feverEndsAt+=bonus;
  clearTimeout(feverTimerId);
  feverTimerId=setTimeout(()=>{
    game.classList.remove("fever-active");
    if(typeof cleanupFeverVisuals==="function")cleanupFeverVisuals();
    resetCombo();
  },Math.max(0,feverEndsAt-performance.now()));
};

const endGameBeforeRunLevel=endGame;
endGame=function(){
  runDraftPaused=false;
  runLevelOverlay.hidden=true;
  endGameBeforeRunLevel();
};

if(isPlaying)runResetState();
restartButton.addEventListener("click",()=>{
  setTimeout(()=>{if(isPlaying)runResetState();},20);
});

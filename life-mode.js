"use strict";

const LIFE_MAX=5;
let lives=LIFE_MAX;
let careRunHunger=100;
let careRunMood=100;
let careMoodBonusCarry=0;

function careConditionAvailable(){
  return typeof careState!=="undefined"&&(typeof isPreBirth!=="function"||!isPreBirth());
}

function snapshotCareCondition(){
  careMoodBonusCarry=0;
  if(!careConditionAvailable()){
    careRunHunger=100;
    careRunMood=100;
    return;
  }
  if(typeof applyCareDecay==="function")applyCareDecay();
  careRunHunger=Math.max(0,Math.min(100,Number(careState.hunger)||0));
  careRunMood=Math.max(0,Math.min(100,Number(careState.mood)||0));
}

function startingLivesForHunger(hunger){
  if(hunger<40)return 3;
  if(hunger<70)return 4;
  return LIFE_MAX;
}

function moodScoreMultiplier(mood){
  if(mood>=80)return 1.25;
  if(mood>=60)return 1.10;
  return 1;
}

function careConditionLabel(){
  if(!careConditionAvailable())return "";
  const bonus=Math.round((moodScoreMultiplier(careRunMood)-1)*100);
  const moodText=bonus>0?`😊スコア+${bonus}%`:"😊スコア通常";
  return `<span style="display:block;margin-top:2px;font-size:10px;font-weight:800;line-height:1.1;white-space:nowrap">🍖${lives}ハート　${moodText}</span>`;
}

function renderLives(){
  const full="❤️".repeat(Math.max(0,lives));
  const empty="♡".repeat(Math.max(0,LIFE_MAX-lives));
  timeDisplay.classList.add("life-display");
  timeDisplay.innerHTML=`<span class="life-hearts" aria-label="ライフ ${lives}/${LIFE_MAX}">${full}<span class="life-hearts__empty">${empty}</span></span>${careConditionLabel()}`;
}

function heartHealForLevel(level){
  return [1,1,2,2,2][Math.max(1,Math.min(5,level))-1];
}

function heartInvincibleMsForLevel(level){
  return [0,1000,1000,1500,2000][Math.max(1,Math.min(5,level))-1];
}

function heartShopEffect(level){
  const heal=heartHealForLevel(level);
  const seconds=heartInvincibleMsForLevel(level)/1000;
  return seconds>0?`❤️${heal}回復・無敵${seconds}秒`:`❤️${heal}回復`;
}

function showLifePopup(text,className=""){
  const popup=document.createElement("div");
  popup.className=`life-popup ${className}`.trim();
  popup.textContent=text;
  const rect=player.getBoundingClientRect();
  const areaRect=playArea.getBoundingClientRect();
  popup.style.left=`${rect.left-areaRect.left+rect.width/2}px`;
  popup.style.top=`${Math.max(88,rect.top-areaRect.top-8)}px`;
  playArea.appendChild(popup);
  setTimeout(()=>popup.remove(),760);
}

function resetLifeRound(){
  snapshotCareCondition();
  lives=careConditionAvailable()?startingLivesForHunger(careRunHunger):LIFE_MAX;
  clearInterval(timerId);
  timerId=0;
  renderLives();
}

/* The old TIME loop is already running when this add-on loads. Stop it immediately. */
resetLifeRound();

/* Keep the internal item key "clock" for saved shop data, but present it as HEART. */
itemIcon=function(type){
  if(type==="magnet")return "🧲";
  if(type==="shield")return "🛡️";
  if(type==="clock")return "❤️";
  return "×2";
};

itemLabel=function(type){
  if(type==="magnet")return "MAGNET!";
  if(type==="shield")return "SHIELD!";
  if(type==="clock")return "HEART!";
  return "SCORE ×2!";
};

/* Hearts can keep appearing; remove the former two-clock-per-run restriction. */
randomItemType=function(){
  const roll=Math.random();
  if(roll<.29)return "magnet";
  if(roll<.55)return "shield";
  if(roll<.76)return "clock";
  return "double";
};

showItemPopup=function(item,type){
  const labels={magnet:"MAGNET!",shield:"SHIELD!",clock:"❤️ HEART!",double:"SCORE ×2!"};
  const popup=document.createElement("div");
  popup.className=`item-popup item-popup--${type} item-popup--pickup`;
  popup.textContent=labels[type]||"ITEM!";
  const playerRect=player.getBoundingClientRect();
  const areaRect=playArea.getBoundingClientRect();
  popup.style.left=`${playerRect.left-areaRect.left+playerRect.width/2}px`;
  popup.style.top=`${Math.max(92,playerRect.top-areaRect.top-16)}px`;
  playArea.appendChild(popup);
  setTimeout(()=>popup.remove(),700);
};

/* Final item collector: combines permanent shop level + temporary RUN level. */
collectItem=function(item,currentTime){
  const type=item.dataset.type;
  showItemPopup(item,type);
  const permanentLevel=typeof itemLevel==="function"?itemLevel(type):1;

  if(type==="magnet"){
    const runBonus=(typeof runSkillLevels!=="undefined"?runSkillLevels.magnetBoost:0)*2000;
    magnetUntil=currentTime+(typeof magnetDurationForLevel==="function"?magnetDurationForLevel(permanentLevel):ITEM_MAGNET_DURATION)+runBonus;
    game.classList.add("magnet-active");
  }else if(type==="shield"){
    const runBonus=typeof runSkillLevels!=="undefined"?runSkillLevels.shieldBoost:0;
    const base=typeof shieldChargesForLevel==="function"?shieldChargesForLevel(permanentLevel):1;
    shieldCharges=Math.max(1,base+runBonus);
    player.classList.add("shield-active");
  }else if(type==="clock"){
    const runBonus=typeof runSkillLevels!=="undefined"?runSkillLevels.clockBoost:0;
    const heal=Math.max(1,heartHealForLevel(permanentLevel)+runBonus);
    const before=lives;
    lives=Math.min(LIFE_MAX,lives+heal);
    const healed=lives-before;
    const invincibleMs=heartInvincibleMsForLevel(permanentLevel);
    if(invincibleMs>0)invincibleUntil=Math.max(invincibleUntil,currentTime+invincibleMs);
    renderLives();
    showLifePopup(healed>0?`❤️ +${healed}`:"❤️ FULL","life-popup--heal");
  }else if(type==="double"){
    doubleUntil=currentTime+(typeof doubleDurationForLevel==="function"?doubleDurationForLevel(permanentLevel):ITEM_DOUBLE_DURATION);
    game.classList.add("double-active");
  }

  item.remove();
  renderItemStatus(currentTime);
};

/* Rock damage now removes one LIFE instead of one score point. */
updateRocks=function(dt,currentTime){
  const playerHitbox=insetRect(player.getBoundingClientRect(),24,10);
  const areaRect=playArea.getBoundingClientRect();

  playArea.querySelectorAll(".rock").forEach(rock=>{
    const direction=Number(rock.dataset.direction);
    const speed=Number(rock.dataset.speed);
    const nextX=Number(rock.dataset.x)+direction*speed*dt;
    const rotation=Number(rock.dataset.rotation)+direction*90*dt;
    rock.dataset.x=String(nextX);
    rock.dataset.rotation=String(rotation);
    rock.style.transform=`translateX(${nextX}px) rotate(${rotation}deg)`;

    const rockRect=insetRect(rock.getBoundingClientRect(),6,4);
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

/* Good mood now has a direct adventure benefit without changing star collection itself. */
const collectStarBeforeCareCondition=collectStar;
collectStar=function(star,now){
  const scoreBefore=score;
  collectStarBeforeCareCondition(star,now);
  if(!careConditionAvailable())return;

  const gained=Math.max(0,score-scoreBefore);
  const multiplier=moodScoreMultiplier(careRunMood);
  if(gained<=0||multiplier<=1)return;

  careMoodBonusCarry+=gained*(multiplier-1);
  const bonus=Math.floor(careMoodBonusCarry);
  if(bonus<=0)return;

  careMoodBonusCarry-=bonus;
  score+=bonus;
  scoreDisplay.textContent=`SCORE ${score}`;
};

/* One adventure makes Tiranon hungry and a little tired, creating a care -> adventure loop. */
const endGameBeforeCareCondition=endGame;
endGame=function(){
  const shouldSpendCare=careConditionAvailable();
  endGameBeforeCareCondition();
  if(!shouldSpendCare)return;

  const now=Date.now();
  careState.hunger=Math.max(0,careState.hunger-10);
  careState.mood=Math.max(0,careState.mood-6);
  careState.hungerAt=now;
  careState.moodAt=now;
  if(typeof saveCareState==="function")saveCareState();
};

/* Permanent shop: replace Clock with Heart. */
if(typeof SHOP_DEFS!=="undefined"&&SHOP_DEFS.clock){
  SHOP_DEFS.clock={
    icon:"❤️",
    name:"ハート",
    effect(level){return heartShopEffect(level);}
  };
  if(typeof renderShop==="function")renderShop();
}

/* RUN skill: replace time extension with heart recovery strengthening. */
if(typeof RUN_SKILLS!=="undefined"&&RUN_SKILLS.clockBoost){
  RUN_SKILLS.clockBoost={
    icon:"❤️",
    name:"ハート強化",
    description(level){return `ハート取得時の回復 +${level}`;}
  };
}

/* Level-up requirements grow: 7, 12, 18, 25, 33, 42, ... */
function runStarsNeededForLevel(level){
  const safe=Math.max(1,Math.floor(level));
  return 7+Math.floor((safe-1)*(safe+8)/2);
}

if(typeof runUpdateHud==="function"){
  runUpdateHud=function(){
    const needed=runStarsNeededForLevel(runLevel);
    const levelStart=Math.max(0,runNextLevelAt-needed);
    const progress=Math.max(0,Math.min(needed,runStarsCollected-levelStart));
    runLevelHud.innerHTML=`<strong>RUN Lv.${runLevel}</strong><span>⭐ ${progress}/${needed}</span>`;
  };
}

if(typeof runResetState==="function"){
  runResetState=function(){
    runDraftPaused=false;
    runStarsCollected=0;
    runLevel=1;
    runNextLevelAt=runStarsNeededForLevel(1);
    runPauseSnapshot=null;
    runSkillLevels={starPower:0,magnetBoost:0,shieldBoost:0,clockBoost:0,feverBoost:0,comboBoost:0};
    runLevelOverlay.hidden=true;
    runUpdateHud();
  };
}

if(typeof runChooseSkill==="function"){
  runChooseSkill=function(key){
    if(!runDraftPaused||!RUN_SKILLS[key])return;
    runSkillLevels[key]=Math.min(RUN_SKILL_MAX,runSkillLevels[key]+1);

    if(key==="shieldBoost"&&typeof shieldCharges!=="undefined"){
      shieldCharges+=1;
      player.classList.add("shield-active");
      if(typeof renderItemStatus==="function")renderItemStatus(performance.now());
    }

    runLevel++;
    runNextLevelAt=runStarsCollected+runStarsNeededForLevel(runLevel);
    runUpdateHud();
    runResumeGame();
  };
}

/* RUN choice pause/resume must not restart the old TIME countdown. */
if(typeof runResumeGame==="function"){
  runResumeGame=function(){
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

    clearInterval(timerId);
    timerId=0;
    starTimerId=setInterval(createStar,STAR_INTERVAL);
    rockTimerId=setInterval(createRock,ROCK_INTERVAL);
    if(typeof scheduleNextItem==="function")scheduleNextItem();
    if(typeof scheduleNextCoin==="function")scheduleNextCoin();
    renderLives();
  };
}

/* Restart happens through listeners registered before this file loaded. Reset life just after them. */
restartButton.addEventListener("click",()=>{
  setTimeout(()=>{
    if(isPlaying){
      resetLifeRound();
      if(typeof runResetState==="function")runResetState();
    }
  },0);
});

if(typeof runUpdateHud==="function")runUpdateHud();

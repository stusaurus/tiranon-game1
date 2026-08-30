"use strict";

const FALL_HAZARD_SCORE=80;
const AIR_HAZARD_SCORE=200;
const FALL_HAZARD_SPEED=135.7; // ITEM_FALL_SPEED 118 × 1.15
const AIR_HAZARD_SPEED=242;
const FALL_SPAWN_MIN=2500;
const FALL_SPAWN_MAX=3900;
const AIR_SPAWN_MIN=3400;
const AIR_SPAWN_MAX=5000;

let specialHazardsActive=false;
let fallHazardTimeoutId=0;
let airHazardTimeoutId=0;
let specialHazardPreviousTime=performance.now();

function specialHazardsCanMove(){
  if(!specialHazardsActive||!isPlaying)return false;
  if(typeof stageActive!=="undefined"&&!stageActive)return false;
  if(typeof stageFinishing!=="undefined"&&stageFinishing)return false;
  if(typeof runDraftPaused!=="undefined"&&runDraftPaused)return false;
  return true;
}

function specialHazardDelay(min,max){return min+Math.random()*(max-min);}

function createDangerStar(){
  if(!specialHazardsCanMove()||score<FALL_HAZARD_SCORE)return;
  if(playArea.querySelector(".danger-star,.air-hazard"))return;

  const hazard=document.createElement("div");
  hazard.className="danger-star";
  hazard.textContent="✹";
  hazard.setAttribute("aria-hidden","true");

  // アイテムと同じ落下開始位置・横配置ルールにする。
  const maxX=Math.max(20,playArea.clientWidth-58);
  hazard.dataset.x=String(10+Math.random()*Math.max(10,maxX-10));
  hazard.dataset.y="72";
  hazard.style.transform=`translate(${hazard.dataset.x}px,72px)`;
  playArea.appendChild(hazard);
}

function createAirHazard(){
  if(!specialHazardsCanMove()||score<AIR_HAZARD_SCORE)return;
  if(playArea.querySelector(".rock,.danger-star,.air-hazard,.air-warning"))return;

  const fromLeft=Math.random()<.5;
  const warning=document.createElement("div");
  warning.className=`air-warning ${fromLeft?"air-warning--left":"air-warning--right"}`;
  warning.textContent="!";
  warning.setAttribute("aria-hidden","true");
  playArea.appendChild(warning);

  setTimeout(()=>{
    warning.remove();
    if(!specialHazardsCanMove()||score<AIR_HAZARD_SCORE)return;
    if(playArea.querySelector(".rock,.danger-star,.air-hazard"))return;

    const hazard=document.createElement("div");
    hazard.className="air-hazard";
    hazard.textContent="🌰";
    hazard.setAttribute("aria-hidden","true");
    hazard.dataset.direction=fromLeft?"1":"-1";
    hazard.dataset.x=String(fromLeft?-58:playArea.clientWidth+12);
    hazard.style.transform=`translateX(${hazard.dataset.x}px)`;
    playArea.appendChild(hazard);
  },560);
}

function scheduleDangerStar(){
  clearTimeout(fallHazardTimeoutId);
  if(!specialHazardsActive)return;
  fallHazardTimeoutId=setTimeout(()=>{
    if(specialHazardsActive){
      createDangerStar();
      scheduleDangerStar();
    }
  },specialHazardDelay(FALL_SPAWN_MIN,FALL_SPAWN_MAX));
}

function scheduleAirHazard(){
  clearTimeout(airHazardTimeoutId);
  if(!specialHazardsActive)return;
  airHazardTimeoutId=setTimeout(()=>{
    if(specialHazardsActive){
      createAirHazard();
      scheduleAirHazard();
    }
  },specialHazardDelay(AIR_SPAWN_MIN,AIR_SPAWN_MAX));
}

function specialHazardDamage(element,currentTime){
  if(currentTime<invincibleUntil){
    element.remove();
    return;
  }

  if(typeof shieldCharges!=="undefined"&&shieldCharges>0){
    shieldCharges--;
    if(shieldCharges<=0)player.classList.remove("shield-active");
    invincibleUntil=currentTime+300;
    if(typeof showShieldBlockPopup==="function")showShieldBlockPopup();
    if(typeof renderItemStatus==="function")renderItemStatus(currentTime);
    element.remove();
    return;
  }

  if(typeof lives!=="undefined"){
    lives=Math.max(0,lives-1);
    if(typeof renderLives==="function")renderLives();
  }
  resetCombo();
  if(typeof showLifePopup==="function")showLifePopup("💔 -1","life-popup--damage");
  invincibleUntil=currentTime+1000;
  player.classList.add("is-hit");
  setTimeout(()=>player.classList.remove("is-hit"),900);
  element.remove();

  if(typeof lives!=="undefined"&&lives<=0){
    setTimeout(()=>{if(isPlaying)endGame();},120);
  }
}

function updateDangerStars(dt,currentTime){
  const playerHitbox=insetRect(player.getBoundingClientRect(),22,10);
  const gameBottom=game.getBoundingClientRect().bottom;

  playArea.querySelectorAll(".danger-star").forEach(hazard=>{
    const nextY=Number(hazard.dataset.y)+FALL_HAZARD_SPEED*dt;
    hazard.dataset.y=String(nextY);
    hazard.style.transform=`translate(${hazard.dataset.x}px,${nextY}px)`;
    const rect=insetRect(hazard.getBoundingClientRect(),5,5);

    if(rectanglesOverlap(playerHitbox,rect)){
      specialHazardDamage(hazard,currentTime);
      return;
    }
    if(rect.top>=gameBottom)hazard.remove();
  });
}

function updateAirHazards(dt,currentTime){
  const playerHitbox=insetRect(player.getBoundingClientRect(),23,10);
  const areaRect=playArea.getBoundingClientRect();

  playArea.querySelectorAll(".air-hazard").forEach(hazard=>{
    const direction=Number(hazard.dataset.direction);
    const nextX=Number(hazard.dataset.x)+direction*AIR_HAZARD_SPEED*dt;
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
}

function specialHazardLoop(now){
  const dt=Math.min(Math.max(0,(now-specialHazardPreviousTime)/1000),.05);
  specialHazardPreviousTime=now;
  if(specialHazardsCanMove()){
    updateDangerStars(dt,now);
    updateAirHazards(dt,now);
  }
  requestAnimationFrame(specialHazardLoop);
}
requestAnimationFrame(specialHazardLoop);

function stopSpecialHazards(){
  specialHazardsActive=false;
  clearTimeout(fallHazardTimeoutId);
  clearTimeout(airHazardTimeoutId);
  fallHazardTimeoutId=0;
  airHazardTimeoutId=0;
  playArea.querySelectorAll(".danger-star,.air-hazard,.air-warning").forEach(element=>element.remove());
}

function beginSpecialHazards(){
  stopSpecialHazards();
  if(!isPlaying)return;
  specialHazardsActive=true;
  specialHazardPreviousTime=performance.now();
  scheduleDangerStar();
  scheduleAirHazard();
}

const endGameBeforeSpecialHazards=endGame;
endGame=function(){
  stopSpecialHazards();
  endGameBeforeSpecialHazards();
};

if(typeof homePlayButton!=="undefined"){
  homePlayButton.addEventListener("click",()=>setTimeout(()=>{if(isPlaying)beginSpecialHazards();},0));
}
if(typeof restartButton!=="undefined"){
  restartButton.addEventListener("click",()=>setTimeout(()=>{
    if(isPlaying&&(typeof stageActive==="undefined"||stageActive))beginSpecialHazards();
  },0));
}
if(typeof homeReturnButton!=="undefined")homeReturnButton.addEventListener("click",stopSpecialHazards);

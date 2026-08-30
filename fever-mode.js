"use strict";

const FEVER_MODE_COMBO_WINDOW=1200;
const FEVER_MODE_DURATION=5000;
const FEVER_MODE_GOLD_CHANCE=.55;
const FEVER_MODE_NORMAL_GOLD_CHANCE=.14;
let feverCountdownIntervalId=0;
let feverEndsAt=0;

function feverModeIsActive(){
  return game.classList.contains("fever-active");
}

function cleanupFeverVisuals(){
  clearInterval(feverCountdownIntervalId);
  feverCountdownIntervalId=0;
  game.querySelectorAll(".fever-timer, .fever-sparkles").forEach(element=>element.remove());
}

function createFeverSparkles(){
  const layer=document.createElement("div");
  layer.className="fever-sparkles";
  layer.setAttribute("aria-hidden","true");

  const sparkleSettings=[
    [7,0,.9,5],[15,.4,1.1,7],[24,.15,1.25,4],[32,.75,1.0,6],
    [41,.25,1.35,5],[50,.65,1.05,8],[59,.05,1.2,5],[68,.55,1.3,7],
    [76,.2,.95,4],[84,.8,1.15,6],[91,.35,1.25,5],[97,.6,1.0,7]
  ];

  sparkleSettings.forEach(([x,delay,duration,size])=>{
    const sparkle=document.createElement("span");
    sparkle.style.setProperty("--sparkle-x",`${x}%`);
    sparkle.style.setProperty("--sparkle-delay",`${delay}s`);
    sparkle.style.setProperty("--sparkle-duration",`${duration}s`);
    sparkle.style.setProperty("--sparkle-size",`${size}px`);
    layer.appendChild(sparkle);
  });

  game.appendChild(layer);
}

function createFeverTimer(){
  const timer=document.createElement("div");
  timer.className="fever-timer";
  timer.setAttribute("aria-live","polite");
  timer.textContent="FEVER 5";
  game.appendChild(timer);

  const updateTimer=()=>{
    if(!feverModeIsActive()){
      cleanupFeverVisuals();
      return;
    }
    const remaining=Math.max(1,Math.ceil((feverEndsAt-performance.now())/1000));
    timer.textContent=`FEVER ${remaining}`;
  };

  updateTimer();
  feverCountdownIntervalId=setInterval(updateTimer,100);
}

refreshCombo=function(now){
  if(comboCount>0&&now>comboExpiresAt)resetCombo();
};

triggerFever=function(){
  if(feverModeIsActive())return;

  clearTimeout(feverTimerId);
  cleanupFeverVisuals();
  game.classList.add("fever-active");
  feverEndsAt=performance.now()+FEVER_MODE_DURATION;

  const fever=document.createElement("div");
  fever.className="fever-popup";
  fever.textContent="FEVER!";
  fever.setAttribute("aria-hidden","true");
  playArea.appendChild(fever);
  setTimeout(()=>fever.remove(),900);

  createFeverTimer();
  createFeverSparkles();

  feverTimerId=setTimeout(()=>{
    game.classList.remove("fever-active");
    cleanupFeverVisuals();
    resetCombo();
  },FEVER_MODE_DURATION);
};

createStar=function(){
  if(!isPlaying)return;

  const star=document.createElement("div");
  const goldChance=feverModeIsActive()?FEVER_MODE_GOLD_CHANCE:FEVER_MODE_NORMAL_GOLD_CHANCE;
  const isGold=Math.random()<goldChance;

  star.className=isGold?"star star--gold":"star";
  star.textContent="★";
  star.dataset.type=isGold?"gold":"normal";
  star.setAttribute("aria-hidden","true");

  const maximumX=Math.max(0,playArea.clientWidth-38);
  star.dataset.x=String(Math.random()*maximumX);
  star.dataset.y="0";
  star.style.transform=`translate(${star.dataset.x}px, 0px)`;
  playArea.appendChild(star);
};

collectStar=function(star,now){
  if(comboCount>0&&now<=comboExpiresAt)comboCount++;
  else comboCount=1;

  comboExpiresAt=now+FEVER_MODE_COMBO_WINDOW;

  const basePoints=star.dataset.type==="gold"?GOLD_STAR_POINTS:1;
  const multiplier=Math.min(comboCount,MAX_COMBO_MULTIPLIER);
  const earned=basePoints*multiplier;

  score+=earned;
  scoreDisplay.textContent=`SCORE ${score}`;
  showPointPopup(star,earned);
  showCombo();

  if(comboCount>=5&&!feverModeIsActive())triggerFever();
};

updateStars=function(dt,currentTime){
  const playerRect=player.getBoundingClientRect();
  const controlsVisible=controls&&getComputedStyle(controls).display!=="none";
  const controlSafeRects=controlsVisible?controlButtons.map(button=>expandedRect(button,STAR_CONTROL_CLEARANCE)):[];
  const gameBottom=game.getBoundingClientRect().bottom;

  playArea.querySelectorAll(".star").forEach(star=>{
    const nextY=Number(star.dataset.y)+STAR_SPEED*dt;
    star.dataset.y=String(nextY);
    star.style.transform=`translate(${star.dataset.x}px, ${nextY}px)`;

    const starRect=star.getBoundingClientRect();

    if(rectanglesOverlap(playerRect,starRect)){
      collectStar(star,currentTime);
      star.remove();
      return;
    }

    if(controlSafeRects.some(rect=>rectanglesOverlap(starRect,rect))){
      star.remove();
      return;
    }

    if(starRect.top>=gameBottom){
      resetCombo();
      star.remove();
    }
  });
};

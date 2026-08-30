"use strict";

const FEVER_MODE_COMBO_WINDOW=1200;
const FEVER_MODE_DURATION=5000;
const FEVER_MODE_GOLD_CHANCE=.55;
const FEVER_MODE_NORMAL_GOLD_CHANCE=.14;

function feverModeIsActive(){
  return game.classList.contains("fever-active");
}

refreshCombo=function(now){
  if(comboCount>0&&now>comboExpiresAt)resetCombo();
};

triggerFever=function(){
  if(feverModeIsActive())return;

  clearTimeout(feverTimerId);
  game.classList.add("fever-active");

  const fever=document.createElement("div");
  fever.className="fever-popup";
  fever.textContent="FEVER!";
  fever.setAttribute("aria-hidden","true");
  playArea.appendChild(fever);
  setTimeout(()=>fever.remove(),900);

  feverTimerId=setTimeout(()=>{
    game.classList.remove("fever-active");
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

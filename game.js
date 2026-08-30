"use strict";

const game=document.getElementById("game");
const playArea=document.getElementById("play-area");
const player=document.getElementById("player");
const playerSprite=document.getElementById("player-sprite");
const scoreDisplay=document.getElementById("score");
const timeDisplay=document.getElementById("time");
const comboDisplay=document.getElementById("combo");
const gameOverScreen=document.getElementById("game-over");
const finalScoreDisplay=document.getElementById("final-score");
const restartButton=document.getElementById("restart-button");
const controls=document.querySelector(".controls");
const leftButton=document.getElementById("left-button");
const jumpButton=document.getElementById("jump-button");
const rightButton=document.getElementById("right-button");
const controlButtons=[leftButton,jumpButton,rightButton].filter(Boolean);

const GAME_TIME=30;
const PLAYER_SPEED=320;
const STAR_SPEED=165;
const STAR_INTERVAL=700;
const GOLD_STAR_CHANCE=.14;
const GOLD_STAR_POINTS=3;
const COMBO_WINDOW=1800;
const MAX_COMBO_MULTIPLIER=5;
const ROCK_SPEED=205;
const ROCK_INTERVAL=2200;
const JUMP_VELOCITY=580;
const JUMP_GRAVITY=1500;
const PLAYER_EDGE_MARGIN=8;
const STAR_CONTROL_CLEARANCE=14;
const ASSET_VERSION="20260830-v7";
const PLAYER_IMAGES={
  normal:{
    front:`IMG_1796.png?v=${ASSET_VERSION}`,
    right:`IMG_1792.png?v=${ASSET_VERSION}`,
    left:`IMG_1786.png?v=${ASSET_VERSION}`
  },
  jump:{
    front:`assets/tiranon-jump-front.png?v=${ASSET_VERSION}`,
    right:`assets/tiranon-jump-right.png?v=${ASSET_VERSION}`,
    left:`assets/tiranon-jump-left.png?v=${ASSET_VERSION}`
  }
};

Object.values(PLAYER_IMAGES).flatMap(group=>Object.values(group)).forEach(src=>{const img=new Image();img.src=src;});

let score=0;
let comboCount=0;
let comboExpiresAt=0;
let timeLeft=GAME_TIME;
let playerX=0;
let movingLeft=false;
let movingRight=false;
let isPlaying=false;
let animationId=0;
let timerId=0;
let starTimerId=0;
let rockTimerId=0;
let previousTime=0;
let currentSpriteKey="";
let jumpHeight=0;
let jumpVelocity=0;
let isJumping=false;
let invincibleUntil=0;
let feverTimerId=0;

function requestedDirection(){
  if(movingLeft&&!movingRight)return "left";
  if(movingRight&&!movingLeft)return "right";
  return "front";
}

function setPlayerImage(direction=requestedDirection()){
  const pose=isJumping?"jump":"normal";
  const dir=PLAYER_IMAGES[pose][direction]?direction:"front";
  const key=`${pose}-${dir}`;
  if(currentSpriteKey===key&&playerSprite.getAttribute("src"))return;
  currentSpriteKey=key;
  player.classList.remove("image-error");
  playerSprite.setAttribute("src",PLAYER_IMAGES[pose][dir]);
}

playerSprite.addEventListener("load",()=>player.classList.remove("image-error"));
playerSprite.addEventListener("error",()=>{
  currentSpriteKey="normal-front";
  playerSprite.setAttribute("src",PLAYER_IMAGES.normal.front);
  if(playerSprite.complete&&playerSprite.naturalWidth===0)player.classList.add("image-error");
});

function playerMaxX(){return Math.max(PLAYER_EDGE_MARGIN,playArea.clientWidth-player.offsetWidth-PLAYER_EDGE_MARGIN);}
function clampPlayerX(){playerX=Math.max(PLAYER_EDGE_MARGIN,Math.min(playerX,playerMaxX()));}

function resetPlayerPosition(){
  playerX=(playArea.clientWidth-player.offsetWidth)/2;
  jumpHeight=0;
  jumpVelocity=0;
  isJumping=false;
  currentSpriteKey="";
  setPlayerImage("front");
  clampPlayerX();
  drawPlayer();
}

function drawPlayer(){
  player.style.left=`${playerX}px`;
  player.style.transform=`translateY(${-jumpHeight}px)`;
}

function jump(){
  if(!isPlaying||isJumping)return;
  isJumping=true;
  jumpVelocity=JUMP_VELOCITY;
  player.classList.add("is-jumping");
  setPlayerImage(requestedDirection());
}

function updateJump(dt){
  if(!isJumping)return;
  jumpHeight+=jumpVelocity*dt;
  jumpVelocity-=JUMP_GRAVITY*dt;
  if(jumpHeight<=0){
    jumpHeight=0;
    jumpVelocity=0;
    isJumping=false;
    player.classList.remove("is-jumping");
  }
}

function resetCombo(){
  comboCount=0;
  comboExpiresAt=0;
  if(comboDisplay){
    comboDisplay.hidden=true;
    comboDisplay.textContent="";
  }
}

function refreshCombo(now){
  if(comboCount>0&&now>comboExpiresAt)resetCombo();
}

function showCombo(){
  if(!comboDisplay)return;
  if(comboCount<2){
    comboDisplay.hidden=true;
    comboDisplay.textContent="";
    return;
  }
  comboDisplay.textContent=`COMBO ×${Math.min(comboCount,MAX_COMBO_MULTIPLIER)}`;
  comboDisplay.hidden=false;
  comboDisplay.classList.remove("combo-pop");
  void comboDisplay.offsetWidth;
  comboDisplay.classList.add("combo-pop");
}

function triggerFever(){
  clearTimeout(feverTimerId);
  game.classList.add("fever-active");
  const fever=document.createElement("div");
  fever.className="fever-popup";
  fever.textContent="FEVER!";
  fever.setAttribute("aria-hidden","true");
  playArea.appendChild(fever);
  setTimeout(()=>fever.remove(),900);
  feverTimerId=setTimeout(()=>game.classList.remove("fever-active"),1000);
}

function createStar(){
  if(!isPlaying)return;
  const star=document.createElement("div");
  const isGold=Math.random()<GOLD_STAR_CHANCE;
  star.className=isGold?"star star--gold":"star";
  star.textContent="★";
  star.dataset.type=isGold?"gold":"normal";
  star.setAttribute("aria-hidden","true");
  const maximumX=Math.max(0,playArea.clientWidth-38);
  star.dataset.x=String(Math.random()*maximumX);
  star.dataset.y="0";
  star.style.transform=`translate(${star.dataset.x}px, 0px)`;
  playArea.appendChild(star);
}

function createRock(){
  if(!isPlaying)return;
  const rock=document.createElement("div");
  rock.className="rock";
  rock.setAttribute("aria-hidden","true");
  const fromLeft=Math.random()<.5;
  rock.dataset.direction=fromLeft?"1":"-1";
  rock.dataset.speed=String(ROCK_SPEED*(.88+Math.random()*.28));
  rock.dataset.x=String(fromLeft?-60:playArea.clientWidth+14);
  rock.dataset.rotation=String(Math.random()*24-12);
  rock.style.transform=`translateX(${rock.dataset.x}px) rotate(${rock.dataset.rotation}deg)`;
  playArea.appendChild(rock);
}

function rectanglesOverlap(a,b){return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;}
function expandedRect(element,margin){const r=element.getBoundingClientRect();return{left:r.left-margin,right:r.right+margin,top:r.top-margin,bottom:r.bottom+margin};}
function insetRect(rect,horizontal,vertical){return{left:rect.left+horizontal,right:rect.right-horizontal,top:rect.top+vertical,bottom:rect.bottom-vertical};}

function showPointPopup(star,points){
  const popup=document.createElement("div");
  popup.className=star.dataset.type==="gold"?"point-popup point-popup--gold":"point-popup";
  popup.textContent=`+${points}`;
  popup.style.left=`${Number(star.dataset.x)}px`;
  popup.style.top=`${Number(star.dataset.y)}px`;
  playArea.appendChild(popup);
  setTimeout(()=>popup.remove(),650);
}

function showDamagePopup(){
  const popup=document.createElement("div");
  popup.className="damage-popup";
  popup.textContent="-1";
  const rect=player.getBoundingClientRect();
  const areaRect=playArea.getBoundingClientRect();
  popup.style.left=`${rect.left-areaRect.left+rect.width/2-18}px`;
  popup.style.top=`${rect.top-areaRect.top-8}px`;
  playArea.appendChild(popup);
  setTimeout(()=>popup.remove(),700);
}

function collectStar(star,now){
  if(comboCount>0&&now<=comboExpiresAt)comboCount++;
  else comboCount=1;
  comboExpiresAt=now+COMBO_WINDOW;

  const basePoints=star.dataset.type==="gold"?GOLD_STAR_POINTS:1;
  const multiplier=Math.min(comboCount,MAX_COMBO_MULTIPLIER);
  const earned=basePoints*multiplier;
  score+=earned;
  scoreDisplay.textContent=`SCORE ${score}`;
  showPointPopup(star,earned);
  showCombo();
  if(comboCount===5)triggerFever();
}

function updateStars(dt,currentTime){
  const playerRect=player.getBoundingClientRect();
  const controlsVisible=controls&&getComputedStyle(controls).display!=="none";
  const controlSafeRects=controlsVisible?controlButtons.map(button=>expandedRect(button,STAR_CONTROL_CLEARANCE)):[];
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
    if(controlSafeRects.some(rect=>rectanglesOverlap(starRect,rect))){star.remove();return;}
    if(starRect.top>=game.getBoundingClientRect().bottom)star.remove();
  });
}

function updateRocks(dt,currentTime){
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
      score=Math.max(0,score-1);
      scoreDisplay.textContent=`SCORE ${score}`;
      resetCombo();
      showDamagePopup();
      invincibleUntil=currentTime+900;
      player.classList.add("is-hit");
      setTimeout(()=>player.classList.remove("is-hit"),900);
      rock.remove();
      return;
    }
    const rawRect=rock.getBoundingClientRect();
    if(rawRect.right<areaRect.left-70||rawRect.left>areaRect.right+70)rock.remove();
  });
}

function refreshPlayerDirection(){setPlayerImage(requestedDirection());}

function gameLoop(currentTime){
  if(!isPlaying)return;
  const dt=Math.min((currentTime-previousTime)/1000,.05);
  previousTime=currentTime;
  if(movingLeft)playerX-=PLAYER_SPEED*dt;
  if(movingRight)playerX+=PLAYER_SPEED*dt;
  clampPlayerX();
  updateJump(dt);
  refreshPlayerDirection();
  drawPlayer();
  refreshCombo(currentTime);
  updateStars(dt,currentTime);
  updateRocks(dt,currentTime);
  animationId=requestAnimationFrame(gameLoop);
}

function endGame(){
  isPlaying=false;
  movingLeft=false;
  movingRight=false;
  isJumping=false;
  jumpHeight=0;
  jumpVelocity=0;
  player.classList.remove("is-jumping");
  game.classList.remove("fever-active");
  clearTimeout(feverTimerId);
  currentSpriteKey="";
  setPlayerImage("front");
  drawPlayer();
  cancelAnimationFrame(animationId);
  clearInterval(timerId);
  clearInterval(starTimerId);
  clearInterval(rockTimerId);
  resetCombo();
  finalScoreDisplay.textContent=`最終スコア ${score}`;
  gameOverScreen.hidden=false;
}

function startGame(){
  cancelAnimationFrame(animationId);
  clearInterval(timerId);
  clearInterval(starTimerId);
  clearInterval(rockTimerId);
  clearTimeout(feverTimerId);
  playArea.querySelectorAll(".star, .rock, .point-popup, .damage-popup, .fever-popup").forEach(item=>item.remove());
  score=0;
  timeLeft=GAME_TIME;
  movingLeft=false;
  movingRight=false;
  invincibleUntil=0;
  resetCombo();
  game.classList.remove("fever-active");
  player.classList.remove("is-hit","is-jumping");
  scoreDisplay.textContent="SCORE 0";
  timeDisplay.textContent=`TIME ${GAME_TIME}`;
  gameOverScreen.hidden=true;
  resetPlayerPosition();
  isPlaying=true;
  createStar();
  starTimerId=setInterval(createStar,STAR_INTERVAL);
  rockTimerId=setInterval(createRock,ROCK_INTERVAL);
  setTimeout(()=>{if(isPlaying)createRock();},900);
  timerId=setInterval(()=>{
    timeLeft--;
    timeDisplay.textContent=`TIME ${timeLeft}`;
    if(timeLeft===0)endGame();
  },1000);
  previousTime=performance.now();
  animationId=requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown",event=>{
  if(["ArrowLeft","ArrowRight","ArrowUp","Space","KeyA","KeyD","KeyW"].includes(event.code))event.preventDefault();
  if(event.code==="ArrowLeft"||event.code==="KeyA")movingLeft=true;
  if(event.code==="ArrowRight"||event.code==="KeyD")movingRight=true;
  if(!event.repeat&&(event.code==="ArrowUp"||event.code==="Space"||event.code==="KeyW"))jump();
  refreshPlayerDirection();
});

window.addEventListener("keyup",event=>{
  if(event.code==="ArrowLeft"||event.code==="KeyA")movingLeft=false;
  if(event.code==="ArrowRight"||event.code==="KeyD")movingRight=false;
  refreshPlayerDirection();
});

window.addEventListener("blur",()=>{movingLeft=false;movingRight=false;refreshPlayerDirection();});

function preventButtonGestures(button){["contextmenu","selectstart","dragstart"].forEach(type=>button.addEventListener(type,event=>event.preventDefault()));}
function addHoldControls(button,direction){
  preventButtonGestures(button);
  button.addEventListener("pointerdown",event=>{
    event.preventDefault();
    if(button.setPointerCapture)button.setPointerCapture(event.pointerId);
    if(direction==="left")movingLeft=true;
    if(direction==="right")movingRight=true;
    refreshPlayerDirection();
  });
  const stop=()=>{
    if(direction==="left")movingLeft=false;
    if(direction==="right")movingRight=false;
    refreshPlayerDirection();
  };
  button.addEventListener("pointerup",stop);
  button.addEventListener("pointercancel",stop);
  button.addEventListener("lostpointercapture",stop);
}

addHoldControls(leftButton,"left");
addHoldControls(rightButton,"right");
if(jumpButton){
  preventButtonGestures(jumpButton);
  jumpButton.addEventListener("pointerdown",event=>{event.preventDefault();jump();});
}

game.addEventListener("dblclick",event=>event.preventDefault());
let lastTouchEnd=0;
game.addEventListener("touchend",event=>{
  const now=Date.now();
  if(now-lastTouchEnd<350)event.preventDefault();
  lastTouchEnd=now;
},{passive:false});

[game,playArea,player].forEach(element=>{
  ["contextmenu","selectstart","dragstart"].forEach(type=>element.addEventListener(type,event=>event.preventDefault()));
});

window.addEventListener("resize",()=>{clampPlayerX();drawPlayer();});
restartButton.addEventListener("click",startGame);
startGame();

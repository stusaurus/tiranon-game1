"use strict";

const game=document.getElementById("game");
const playArea=document.getElementById("play-area");
const player=document.getElementById("player");
const playerSprite=document.getElementById("player-sprite");
const scoreDisplay=document.getElementById("score");
const timeDisplay=document.getElementById("time");
const gameOverScreen=document.getElementById("game-over");
const finalScoreDisplay=document.getElementById("final-score");
const restartButton=document.getElementById("restart-button");
const leftButton=document.getElementById("left-button");
const rightButton=document.getElementById("right-button");

const GAME_TIME=30;
const PLAYER_SPEED=320;
const STAR_SPEED=165;
const STAR_INTERVAL=700;
const PLAYER_EDGE_MARGIN=8;
const ASSET_VERSION="20260830-1005";
const PLAYER_IMAGES={
  front:`IMG_1796.png?v=${ASSET_VERSION}`,
  right:`IMG_1792.png?v=${ASSET_VERSION}`,
  left:`IMG_1786.png?v=${ASSET_VERSION}`
};

Object.values(PLAYER_IMAGES).forEach(src=>{const img=new Image();img.src=src;});

let score=0;
let timeLeft=GAME_TIME;
let playerX=0;
let movingLeft=false;
let movingRight=false;
let isPlaying=false;
let animationId=0;
let timerId=0;
let starTimerId=0;
let previousTime=0;
let currentDirection="front";

function setPlayerImage(direction){
  const nextDirection=PLAYER_IMAGES[direction]?direction:"front";
  if(currentDirection===nextDirection && playerSprite.getAttribute("src")) return;
  currentDirection=nextDirection;
  player.classList.remove("is-fallback");
  playerSprite.setAttribute("src",PLAYER_IMAGES[nextDirection]);
}

playerSprite.addEventListener("load",()=>player.classList.remove("is-fallback"));
playerSprite.addEventListener("error",()=>player.classList.add("is-fallback"));

function playerMaxX(){
  return Math.max(PLAYER_EDGE_MARGIN,playArea.clientWidth-player.offsetWidth-PLAYER_EDGE_MARGIN);
}

function clampPlayerX(){
  playerX=Math.max(PLAYER_EDGE_MARGIN,Math.min(playerX,playerMaxX()));
}

function resetPlayerPosition(){
  playerX=(playArea.clientWidth-player.offsetWidth)/2;
  currentDirection="";
  setPlayerImage("front");
  clampPlayerX();
  drawPlayer();
}

function drawPlayer(){
  player.style.left=`${playerX}px`;
  player.style.transform="none";
}

function createStar(){
  if(!isPlaying)return;
  const star=document.createElement("div");
  star.className="star";
  star.textContent="★";
  star.setAttribute("aria-hidden","true");
  const maximumX=Math.max(0,playArea.clientWidth-34);
  star.dataset.x=String(Math.random()*maximumX);
  star.dataset.y="0";
  star.style.transform=`translate(${star.dataset.x}px, 0px)`;
  playArea.appendChild(star);
}

function rectanglesOverlap(a,b){return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;}

function showPointPopup(star){
  const popup=document.createElement("div");
  popup.className="point-popup";
  popup.textContent="+1";
  popup.style.left=`${Number(star.dataset.x)}px`;
  popup.style.top=`${Number(star.dataset.y)}px`;
  playArea.appendChild(popup);
  setTimeout(()=>popup.remove(),650);
}

function updateStars(dt){
  const playerRect=player.getBoundingClientRect();
  playArea.querySelectorAll(".star").forEach(star=>{
    const nextY=Number(star.dataset.y)+STAR_SPEED*dt;
    star.dataset.y=String(nextY);
    star.style.transform=`translate(${star.dataset.x}px, ${nextY}px)`;
    const starRect=star.getBoundingClientRect();
    if(rectanglesOverlap(playerRect,starRect)){
      score++;
      scoreDisplay.textContent=`SCORE ${score}`;
      showPointPopup(star);
      star.remove();
      return;
    }
    if(starRect.top>=game.getBoundingClientRect().bottom)star.remove();
  });
}

function refreshPlayerDirection(){
  if(movingLeft&&!movingRight)setPlayerImage("left");
  else if(movingRight&&!movingLeft)setPlayerImage("right");
  else setPlayerImage("front");
}

function gameLoop(currentTime){
  if(!isPlaying)return;
  const dt=Math.min((currentTime-previousTime)/1000,.05);
  previousTime=currentTime;
  if(movingLeft)playerX-=PLAYER_SPEED*dt;
  if(movingRight)playerX+=PLAYER_SPEED*dt;
  clampPlayerX();
  refreshPlayerDirection();
  drawPlayer();
  updateStars(dt);
  animationId=requestAnimationFrame(gameLoop);
}

function endGame(){
  isPlaying=false;
  movingLeft=false;
  movingRight=false;
  setPlayerImage("front");
  cancelAnimationFrame(animationId);
  clearInterval(timerId);
  clearInterval(starTimerId);
  finalScoreDisplay.textContent=`最終スコア ${score}`;
  gameOverScreen.hidden=false;
}

function startGame(){
  cancelAnimationFrame(animationId);
  clearInterval(timerId);
  clearInterval(starTimerId);
  playArea.querySelectorAll(".star, .point-popup").forEach(item=>item.remove());
  score=0;
  timeLeft=GAME_TIME;
  movingLeft=false;
  movingRight=false;
  scoreDisplay.textContent="SCORE 0";
  timeDisplay.textContent=`TIME ${GAME_TIME}`;
  gameOverScreen.hidden=true;
  resetPlayerPosition();
  isPlaying=true;
  createStar();
  starTimerId=setInterval(createStar,STAR_INTERVAL);
  timerId=setInterval(()=>{
    timeLeft--;
    timeDisplay.textContent=`TIME ${timeLeft}`;
    if(timeLeft===0)endGame();
  },1000);
  previousTime=performance.now();
  animationId=requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown",event=>{
  if(["ArrowLeft","ArrowRight","KeyA","KeyD"].includes(event.code))event.preventDefault();
  if(event.code==="ArrowLeft"||event.code==="KeyA")movingLeft=true;
  if(event.code==="ArrowRight"||event.code==="KeyD")movingRight=true;
  refreshPlayerDirection();
});

window.addEventListener("keyup",event=>{
  if(event.code==="ArrowLeft"||event.code==="KeyA")movingLeft=false;
  if(event.code==="ArrowRight"||event.code==="KeyD")movingRight=false;
  refreshPlayerDirection();
});

window.addEventListener("blur",()=>{
  movingLeft=false;
  movingRight=false;
  refreshPlayerDirection();
});

function addHoldControls(button,direction){
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

window.addEventListener("resize",()=>{
  clampPlayerX();
  drawPlayer();
});

restartButton.addEventListener("click",startGame);
startGame();

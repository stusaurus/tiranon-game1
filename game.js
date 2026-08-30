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
const GAME_TIME=30, PLAYER_SPEED=320, STAR_SPEED=165, STAR_INTERVAL=700;
const PLAYER_IMAGES={front:"IMG_1796.png",right:"IMG_1792.png",left:"IMG_1786.png"};
let score=0,timeLeft=GAME_TIME,playerX=0,movingLeft=false,movingRight=false,isPlaying=false,animationId=0,timerId=0,starTimerId=0,previousTime=0;
function setPlayerImage(direction){const src=PLAYER_IMAGES[direction]||PLAYER_IMAGES.front;if(playerSprite.getAttribute("src")!==src)playerSprite.setAttribute("src",src);}
playerSprite.addEventListener("load",()=>player.classList.remove("is-fallback"));
playerSprite.addEventListener("error",()=>player.classList.add("is-fallback"));
function resetPlayerPosition(){playerX=(playArea.clientWidth-player.offsetWidth)/2;setPlayerImage("front");drawPlayer();}
function drawPlayer(){player.style.left=`${playerX}px`;player.style.transform="none";}
function createStar(){if(!isPlaying)return;const star=document.createElement("div");star.className="star";star.textContent="★";star.setAttribute("aria-hidden","true");const maximumX=Math.max(0,playArea.clientWidth-34);star.dataset.x=String(Math.random()*maximumX);star.dataset.y="0";star.style.transform=`translate(${star.dataset.x}px, 0px)`;playArea.appendChild(star);}
function rectanglesOverlap(a,b){return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;}
function showPointPopup(star){const popup=document.createElement("div");popup.className="point-popup";popup.textContent="+1";popup.style.left=`${Number(star.dataset.x)}px`;popup.style.top=`${Number(star.dataset.y)}px`;playArea.appendChild(popup);setTimeout(()=>popup.remove(),650);}
function updateStars(dt){const playerRect=player.getBoundingClientRect();playArea.querySelectorAll(".star").forEach(star=>{const nextY=Number(star.dataset.y)+STAR_SPEED*dt;star.dataset.y=String(nextY);star.style.transform=`translate(${star.dataset.x}px, ${nextY}px)`;const starRect=star.getBoundingClientRect();if(rectanglesOverlap(playerRect,starRect)){score++;scoreDisplay.textContent=`SCORE ${score}`;showPointPopup(star);star.remove();return;}if(starRect.top>=game.getBoundingClientRect().bottom)star.remove();});}
function refreshPlayerDirection(){if(movingLeft&&!movingRight)setPlayerImage("left");else if(movingRight&&!movingLeft)setPlayerImage("right");else setPlayerImage("front");}
function gameLoop(currentTime){if(!isPlaying)return;const dt=Math.min((currentTime-previousTime)/1000,.05);previousTime=currentTime;if(movingLeft)playerX-=PLAYER_SPEED*dt;if(movingRight)playerX+=PLAYER_SPEED*dt;refreshPlayerDirection();const maximumX=playArea.clientWidth-player.offsetWidth;playerX=Math.max(0,Math.min(playerX,maximumX));drawPlayer();updateStars(dt);animationId=requestAnimationFrame(gameLoop);}
function endGame(){isPlaying=false;movingLeft=false;movingRight=false;setPlayerImage("front");cancelAnimationFrame(animationId);clearInterval(timerId);clearInterval(starTimerId);finalScoreDisplay.textContent=`最終スコア ${score}`;gameOverScreen.hidden=false;}
function startGame(){cancelAnimationFrame(animationId);clearInterval(timerId);clearInterval(starTimerId);playArea.querySelectorAll(".star, .point-popup").forEach(item=>item.remove());score=0;timeLeft=GAME_TIME;movingLeft=false;movingRight=false;scoreDisplay.textContent="SCORE 0";timeDisplay.textContent=`TIME ${GAME_TIME}`;gameOverScreen.hidden=true;resetPlayerPosition();isPlaying=true;createStar();starTimerId=setInterval(createStar,STAR_INTERVAL);timerId=setInterval(()=>{timeLeft--;timeDisplay.textContent=`TIME ${timeLeft}`;if(timeLeft===0)endGame();},1000);previousTime=performance.now();animationId=requestAnimationFrame(gameLoop);}
window.addEventListener("keydown",event=>{if(["ArrowLeft","ArrowRight","KeyA","KeyD"].includes(event.code))event.preventDefault();if(event.code==="ArrowLeft"||event.code==="KeyA")movingLeft=true;if(event.code==="ArrowRight"||event.code==="KeyD")movingRight=true;refreshPlayerDirection();});
window.addEventListener("keyup",event=>{if(event.code==="ArrowLeft"||event.code==="KeyA")movingLeft=false;if(event.code==="ArrowRight"||event.code==="KeyD")movingRight=false;refreshPlayerDirection();});
window.addEventListener("blur",()=>{movingLeft=false;movingRight=false;setPlayerImage("front");});
function addHoldControls(button,direction){button.addEventListener("pointerdown",event=>{event.preventDefault();button.setPointerCapture(event.pointerId);if(direction==="left")movingLeft=true;if(direction==="right")movingRight=true;refreshPlayerDirection();});const stop=()=>{if(direction==="left")movingLeft=false;if(direction==="right")movingRight=false;refreshPlayerDirection();};button.addEventListener("pointerup",stop);button.addEventListener("pointercancel",stop);button.addEventListener("lostpointercapture",stop);}
addHoldControls(leftButton,"left");addHoldControls(rightButton,"right");
window.addEventListener("resize",()=>{playerX=Math.max(0,Math.min(playerX,playArea.clientWidth-player.offsetWidth));drawPlayer();});
restartButton.addEventListener("click",startGame);startGame();

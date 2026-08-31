"use strict";

const JUMP_DIRECTION_MEMORY_MS=120;
const JUMP_ASSIST_SPEED=135;
const JUMP_ASSIST_MS=180;

/* Cloud Browser用。通常URLとスマホ表示には影響させない。 */
const touchControlsTestEnabled=new URLSearchParams(window.location.search).get("touchtest")==="1";
if(touchControlsTestEnabled)controls.style.display="flex";

let recentHorizontalDirection="front";
let recentHorizontalAt=0;
let jumpAssistDirection="front";
let jumpAssistStartedAt=0;
let controlsPlusPreviousTime=performance.now();

function clearJumpAssist(){
  recentHorizontalDirection="front";
  recentHorizontalAt=0;
  jumpAssistDirection="front";
  jumpAssistStartedAt=0;
}

function rememberHorizontalRelease(direction){
  if(direction!=="left"&&direction!=="right")return;
  recentHorizontalDirection=direction;
  recentHorizontalAt=performance.now();
}

/* 方向を離した直後だけ、ごく短く横ジャンプを補助する。 */
leftButton.addEventListener("pointerup",()=>rememberHorizontalRelease("left"),{capture:true});
rightButton.addEventListener("pointerup",()=>rememberHorizontalRelease("right"),{capture:true});
leftButton.addEventListener("pointercancel",()=>rememberHorizontalRelease("left"),{capture:true});
rightButton.addEventListener("pointercancel",()=>rememberHorizontalRelease("right"),{capture:true});

window.addEventListener("keyup",event=>{
  if(event.code==="ArrowLeft"||event.code==="KeyA")rememberHorizontalRelease("left");
  if(event.code==="ArrowRight"||event.code==="KeyD")rememberHorizontalRelease("right");
},{capture:true});

const jumpBeforeControlsPlus=jump;
jump=function(){
  if(!isPlaying||isJumping)return;

  const now=performance.now();
  const liveDirection=requestedDirection();

  /* 左右を押している間は元のゲーム処理だけで横移動する。 */
  if(liveDirection==="left"||liveDirection==="right"){
    jumpAssistDirection="front";
    jumpAssistStartedAt=0;
  }else if(now-recentHorizontalAt<=JUMP_DIRECTION_MEMORY_MS){
    jumpAssistDirection=recentHorizontalDirection;
    jumpAssistStartedAt=now;
  }else{
    jumpAssistDirection="front";
    jumpAssistStartedAt=0;
  }

  jumpBeforeControlsPlus();

  if(liveDirection==="left"||liveDirection==="right")setPlayerImage(liveDirection);
  else if(jumpAssistDirection==="left"||jumpAssistDirection==="right")setPlayerImage(jumpAssistDirection);
  else setPlayerImage("front");
};

/* 着地した瞬間に横方向の記憶・補助を必ず消す。 */
const updateJumpBeforeControlsPlus=updateJump;
updateJump=function(dt){
  const wasJumping=isJumping;
  updateJumpBeforeControlsPlus(dt);
  if(wasJumping&&!isJumping)clearJumpAssist();
};

const gameLoopBeforeControlsPlus=gameLoop;
gameLoop=function(currentTime){
  const dt=Math.min(Math.max(0,(currentTime-controlsPlusPreviousTime)/1000),.05);
  controlsPlusPreviousTime=currentTime;

  /* 指を離してジャンプボタンへ移した時だけ、最初の0.18秒だけ小さく補助。 */
  if(isPlaying&&isJumping&&!movingLeft&&!movingRight&&(jumpAssistDirection==="left"||jumpAssistDirection==="right")){
    const elapsed=currentTime-jumpAssistStartedAt;
    if(elapsed>=0&&elapsed<JUMP_ASSIST_MS){
      const strength=1-elapsed/JUMP_ASSIST_MS;
      const direction=jumpAssistDirection==="left"?-1:1;
      playerX+=direction*JUMP_ASSIST_SPEED*strength*dt;
      clampPlayerX();
    }else{
      jumpAssistDirection="front";
      jumpAssistStartedAt=0;
    }
  }

  gameLoopBeforeControlsPlus(currentTime);
};

const resetPlayerPositionBeforeControlsPlus=resetPlayerPosition;
resetPlayerPosition=function(){
  clearJumpAssist();
  controlsPlusPreviousTime=performance.now();
  resetPlayerPositionBeforeControlsPlus();
};

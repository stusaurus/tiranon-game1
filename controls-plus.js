"use strict";

const JUMP_DIRECTION_MEMORY_MS=520;
const JUMP_CARRY_SPEED=215;
const JUMP_CARRY_DECAY_MS=570;

let recentHorizontalDirection="front";
let recentHorizontalAt=0;
let jumpCarryDirection="front";
let jumpCarryStartedAt=0;
let controlsPlusPreviousTime=performance.now();

function rememberHorizontalDirection(direction){
  if(direction!=="left"&&direction!=="right")return;
  recentHorizontalDirection=direction;
  recentHorizontalAt=performance.now();
}

leftButton.addEventListener("pointerdown",()=>rememberHorizontalDirection("left"),{capture:true});
rightButton.addEventListener("pointerdown",()=>rememberHorizontalDirection("right"),{capture:true});

window.addEventListener("keydown",event=>{
  if(event.code==="ArrowLeft"||event.code==="KeyA")rememberHorizontalDirection("left");
  if(event.code==="ArrowRight"||event.code==="KeyD")rememberHorizontalDirection("right");
},{capture:true});

const jumpBeforeControlsPlus=jump;
jump=function(){
  if(!isPlaying||isJumping)return;

  const now=performance.now();
  const liveDirection=requestedDirection();
  if(liveDirection==="left"||liveDirection==="right"){
    jumpCarryDirection=liveDirection;
    rememberHorizontalDirection(liveDirection);
  }else if(now-recentHorizontalAt<=JUMP_DIRECTION_MEMORY_MS){
    jumpCarryDirection=recentHorizontalDirection;
  }else{
    jumpCarryDirection="front";
  }
  jumpCarryStartedAt=now;

  jumpBeforeControlsPlus();

  if(jumpCarryDirection==="left"||jumpCarryDirection==="right"){
    setPlayerImage(jumpCarryDirection);
  }
};

const gameLoopBeforeControlsPlus=gameLoop;
gameLoop=function(currentTime){
  const dt=Math.min(Math.max(0,(currentTime-controlsPlusPreviousTime)/1000),.05);
  controlsPlusPreviousTime=currentTime;

  if(isPlaying&&isJumping&&!movingLeft&&!movingRight&&(jumpCarryDirection==="left"||jumpCarryDirection==="right")){
    const elapsed=currentTime-jumpCarryStartedAt;
    if(elapsed<JUMP_CARRY_DECAY_MS){
      const strength=Math.max(.28,1-elapsed/JUMP_CARRY_DECAY_MS);
      const direction=jumpCarryDirection==="left"?-1:1;
      playerX+=direction*JUMP_CARRY_SPEED*strength*dt;
      clampPlayerX();
    }
  }

  if(isJumping){
    const liveDirection=requestedDirection();
    if(liveDirection==="left"||liveDirection==="right"){
      jumpCarryDirection=liveDirection;
      rememberHorizontalDirection(liveDirection);
    }
  }else{
    jumpCarryDirection="front";
  }

  gameLoopBeforeControlsPlus(currentTime);
};

const resetPlayerPositionBeforeControlsPlus=resetPlayerPosition;
resetPlayerPosition=function(){
  recentHorizontalDirection="front";
  recentHorizontalAt=0;
  jumpCarryDirection="front";
  jumpCarryStartedAt=0;
  controlsPlusPreviousTime=performance.now();
  resetPlayerPositionBeforeControlsPlus();
};

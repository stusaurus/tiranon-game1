"use strict";

const ITEM_SPAWN_MIN=5000;
const ITEM_SPAWN_MAX=7000;
const ITEM_FALL_SPEED=118;
const ITEM_MAGNET_DURATION=5000;
const ITEM_DOUBLE_DURATION=5000;
const ITEM_MAGNET_RADIUS=245;
const ITEM_MAGNET_PULL_SPEED=420;
const ITEM_CONTROL_CLEARANCE=10;

let itemSpawnTimeoutId=0;
let itemRoundActive=false;
let itemPreviousTime=performance.now();
let magnetUntil=0;
let doubleUntil=0;
let shieldCharges=0;

const itemStatus=document.createElement("div");
itemStatus.className="item-status";
itemStatus.setAttribute("aria-live","polite");
game.appendChild(itemStatus);

function itemNow(){return performance.now();}
function magnetIsActive(now=itemNow()){return now<magnetUntil;}
function doubleIsActive(now=itemNow()){return now<doubleUntil;}

function itemIcon(type){
  if(type==="magnet")return "🧲";
  if(type==="shield")return "🛡️";
  if(type==="clock")return "⏰";
  return "×2";
}

function itemLabel(type){
  if(type==="magnet")return "MAGNET 5s";
  if(type==="shield")return "SHIELD!";
  if(type==="clock")return "+3 SEC";
  return "SCORE ×2";
}

function randomItemType(){
  const roll=Math.random();
  if(roll<.29)return "magnet";
  if(roll<.55)return "shield";
  if(roll<.76)return "clock";
  return "double";
}

function spawnItem(){
  if(!isPlaying||!itemRoundActive)return;
  const type=randomItemType();
  const item=document.createElement("div");
  item.className=`game-item game-item--${type}`;
  item.dataset.type=type;
  item.textContent=itemIcon(type);
  item.setAttribute("aria-hidden","true");

  const maxX=Math.max(20,playArea.clientWidth-58);
  item.dataset.x=String(10+Math.random()*Math.max(10,maxX-10));
  item.dataset.y="72";
  item.style.transform=`translate(${item.dataset.x}px,72px)`;
  playArea.appendChild(item);
}

function scheduleNextItem(){
  clearTimeout(itemSpawnTimeoutId);
  if(!isPlaying||!itemRoundActive)return;
  const delay=ITEM_SPAWN_MIN+Math.random()*(ITEM_SPAWN_MAX-ITEM_SPAWN_MIN);
  itemSpawnTimeoutId=setTimeout(()=>{
    if(isPlaying&&itemRoundActive){
      spawnItem();
      scheduleNextItem();
    }
  },delay);
}

function showItemPopup(item,type){
  const popup=document.createElement("div");
  popup.className=`item-popup item-popup--${type}`;
  popup.textContent=itemLabel(type);
  popup.style.left=`${Number(item.dataset.x)+24}px`;
  popup.style.top=`${Number(item.dataset.y)}px`;
  playArea.appendChild(popup);
  setTimeout(()=>popup.remove(),900);
}

function showShieldBlockPopup(){
  const popup=document.createElement("div");
  popup.className="item-popup item-popup--shield";
  popup.textContent="BLOCK!";
  const rect=player.getBoundingClientRect();
  const areaRect=playArea.getBoundingClientRect();
  popup.style.left=`${rect.left-areaRect.left+rect.width/2}px`;
  popup.style.top=`${Math.max(80,rect.top-areaRect.top-4)}px`;
  playArea.appendChild(popup);
  setTimeout(()=>popup.remove(),850);
}

function collectItem(item,currentTime){
  const type=item.dataset.type;
  showItemPopup(item,type);

  if(type==="magnet"){
    magnetUntil=currentTime+ITEM_MAGNET_DURATION;
    game.classList.add("magnet-active");
  }else if(type==="shield"){
    shieldCharges=1;
    player.classList.add("shield-active");
  }else if(type==="clock"){
    timeLeft+=3;
    timeDisplay.textContent=`TIME ${timeLeft}`;
  }else if(type==="double"){
    doubleUntil=currentTime+ITEM_DOUBLE_DURATION;
    game.classList.add("double-active");
  }

  item.remove();
  renderItemStatus(currentTime);
}

function renderItemStatus(currentTime=itemNow()){
  const badges=[];
  if(magnetIsActive(currentTime)){
    badges.push(`<span class="item-status__badge">🧲 ${Math.max(1,Math.ceil((magnetUntil-currentTime)/1000))}s</span>`);
  }
  if(shieldCharges>0){
    badges.push(`<span class="item-status__badge item-status__badge--shield">🛡️ 1</span>`);
  }
  if(doubleIsActive(currentTime)){
    badges.push(`<span class="item-status__badge item-status__badge--double">×2 ${Math.max(1,Math.ceil((doubleUntil-currentTime)/1000))}s</span>`);
  }
  itemStatus.innerHTML=badges.join("");
}

function updateItemEffects(currentTime){
  if(!magnetIsActive(currentTime)){
    magnetUntil=0;
    game.classList.remove("magnet-active");
  }
  if(!doubleIsActive(currentTime)){
    doubleUntil=0;
    game.classList.remove("double-active");
  }
  if(shieldCharges<=0)player.classList.remove("shield-active");
  renderItemStatus(currentTime);
}

function updateItems(dt,currentTime){
  const playerRect=player.getBoundingClientRect();
  const controlsVisible=controls&&getComputedStyle(controls).display!=="none";
  const controlSafeRects=controlsVisible?controlButtons.map(button=>expandedRect(button,ITEM_CONTROL_CLEARANCE)):[];
  const gameBottom=game.getBoundingClientRect().bottom;

  playArea.querySelectorAll(".game-item").forEach(item=>{
    const nextY=Number(item.dataset.y)+ITEM_FALL_SPEED*dt;
    item.dataset.y=String(nextY);
    item.style.transform=`translate(${item.dataset.x}px,${nextY}px)`;
    const rect=item.getBoundingClientRect();

    if(rectanglesOverlap(playerRect,rect)){
      collectItem(item,currentTime);
      return;
    }

    if(controlSafeRects.some(safe=>rectanglesOverlap(rect,safe))){
      item.remove();
      return;
    }

    if(rect.top>=gameBottom)item.remove();
  });
}

function applyMagnetPull(dt,currentTime){
  if(!magnetIsActive(currentTime))return;

  const areaRect=playArea.getBoundingClientRect();
  const playerRect=player.getBoundingClientRect();
  const targetX=playerRect.left-areaRect.left+playerRect.width/2;
  const targetY=playerRect.top-areaRect.top+playerRect.height/2;

  playArea.querySelectorAll(".star").forEach(star=>{
    const starRect=star.getBoundingClientRect();
    const starX=starRect.left-areaRect.left+starRect.width/2;
    const starY=starRect.top-areaRect.top+starRect.height/2;
    const dx=targetX-starX;
    const dy=targetY-starY;
    const distance=Math.hypot(dx,dy);
    if(distance>ITEM_MAGNET_RADIUS||Math.abs(dx)<1)return;

    const strength=1+(1-distance/ITEM_MAGNET_RADIUS)*.8;
    const step=Math.min(Math.abs(dx),ITEM_MAGNET_PULL_SPEED*strength*dt);
    const maxX=Math.max(0,playArea.clientWidth-starRect.width);
    const nextX=Math.max(0,Math.min(maxX,Number(star.dataset.x)+Math.sign(dx)*step));
    star.dataset.x=String(nextX);
  });
}

const originalGameLoopForItems=gameLoop;
gameLoop=function(currentTime){
  const dt=Math.min(Math.max(0,(currentTime-itemPreviousTime)/1000),.05);
  itemPreviousTime=currentTime;

  if(itemRoundActive&&isPlaying){
    updateItemEffects(currentTime);
    applyMagnetPull(dt,currentTime);
    updateItems(dt,currentTime);
  }

  originalGameLoopForItems(currentTime);
};

collectStar=function(star,now){
  if(comboCount>0&&now<=comboExpiresAt)comboCount++;
  else comboCount=1;

  comboExpiresAt=now+FEVER_MODE_COMBO_WINDOW;

  const basePoints=star.dataset.type==="gold"?GOLD_STAR_POINTS:1;
  const comboMultiplier=Math.min(comboCount,MAX_COMBO_MULTIPLIER);
  const itemMultiplier=doubleIsActive(now)?2:1;
  const earned=basePoints*comboMultiplier*itemMultiplier;

  score+=earned;
  scoreDisplay.textContent=`SCORE ${score}`;
  showPointPopup(star,earned);
  showCombo();

  if(comboCount>=5&&!feverModeIsActive())triggerFever();
};

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
        shieldCharges=0;
        player.classList.remove("shield-active");
        invincibleUntil=currentTime+300;
        showShieldBlockPopup();
        renderItemStatus(currentTime);
        rock.remove();
        return;
      }

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
};

function stopItemRound(){
  itemRoundActive=false;
  clearTimeout(itemSpawnTimeoutId);
  itemSpawnTimeoutId=0;
  magnetUntil=0;
  doubleUntil=0;
  shieldCharges=0;
  game.classList.remove("magnet-active","double-active");
  player.classList.remove("shield-active");
  itemStatus.innerHTML="";
  playArea.querySelectorAll(".game-item,.item-popup").forEach(element=>element.remove());
}

function beginItemRound(){
  stopItemRound();
  itemRoundActive=true;
  itemPreviousTime=performance.now();

  // The first round starts before add-on scripts load. Restart the star timer once
  // so the current FEVER/gold-star implementation is used immediately.
  if(isPlaying){
    clearInterval(starTimerId);
    starTimerId=setInterval(createStar,STAR_INTERVAL);
  }

  scheduleNextItem();
}

const originalEndGameForItems=endGame;
endGame=function(){
  stopItemRound();
  originalEndGameForItems();
};

// game.js already started the first round before this add-on loads.
if(isPlaying)beginItemRound();

// game.js registered its restart click listener before this script loaded.
// Run item reset immediately after that listener completes.
restartButton.addEventListener("click",()=>{
  setTimeout(()=>{
    if(isPlaying)beginItemRound();
  },0);
});

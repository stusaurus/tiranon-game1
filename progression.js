"use strict";

const PROGRESSION_STORAGE_KEY="tiranon-adventure-progression-v1";
const COIN_VALUE=5;
const COIN_SPAWN_MIN=3800;
const COIN_SPAWN_MAX=5400;
const COIN_FALL_SPEED=108;
const COIN_CONTROL_CLEARANCE=12;
const UPGRADE_COSTS=[30,70,130,220];

let progressionState=loadProgressionState();
let roundCoins=0;
let coinSpawnTimeoutId=0;
let coinRoundActive=false;
let coinPreviousTime=performance.now();

function defaultProgressionState(){
  return {coins:0,levels:{magnet:1,shield:1,clock:1,double:1}};
}

function loadProgressionState(){
  try{
    const saved=JSON.parse(localStorage.getItem(PROGRESSION_STORAGE_KEY)||"null");
    const base=defaultProgressionState();
    if(!saved||typeof saved!=="object")return base;
    base.coins=Math.max(0,Math.floor(Number(saved.coins)||0));
    for(const type of Object.keys(base.levels)){
      base.levels[type]=Math.max(1,Math.min(5,Math.floor(Number(saved.levels?.[type])||1)));
    }
    return base;
  }catch(error){
    return defaultProgressionState();
  }
}

function saveProgressionState(){
  try{localStorage.setItem(PROGRESSION_STORAGE_KEY,JSON.stringify(progressionState));}catch(error){}
}

function itemLevel(type){return progressionState.levels[type]||1;}
function magnetDurationForLevel(level){return 5000+(level-1)*1000;}
function doubleDurationForLevel(level){return level===5?10000:5000+(level-1)*1000;}
function shieldChargesForLevel(level){return [1,1,2,2,3][Math.max(1,Math.min(5,level))-1];}
function shieldBlockBonusForLevel(level){return [0,2,4,6,10][Math.max(1,Math.min(5,level))-1];}
function clockSecondsForLevel(level){return [3,4,5,6,7][Math.max(1,Math.min(5,level))-1];}

const coinHud=document.createElement("div");
coinHud.className="coin-hud";
coinHud.setAttribute("aria-live","polite");
game.appendChild(coinHud);

function updateCoinHud(){coinHud.textContent=`🪙 +${roundCoins}`;}

const resultCard=document.querySelector(".result-card");
const restartButtonForShop=document.getElementById("restart-button");
const progressionSummary=document.createElement("div");
progressionSummary.className="progression-summary";
progressionSummary.innerHTML=`
  <div><span>今回のコイン</span><strong id="round-coins">+0</strong></div>
  <div><span>所持コイン</span><strong id="wallet-coins">🪙 0</strong></div>
`;
if(resultCard&&restartButtonForShop)resultCard.insertBefore(progressionSummary,restartButtonForShop);

const shopButton=document.createElement("button");
shopButton.type="button";
shopButton.className="shop-open-button";
shopButton.textContent="🛒 SHOP";
if(resultCard&&restartButtonForShop)resultCard.insertBefore(shopButton,restartButtonForShop);

const shopPanel=document.createElement("section");
shopPanel.className="shop-panel";
shopPanel.hidden=true;
shopPanel.setAttribute("aria-label","アイテムショップ");
shopPanel.innerHTML=`
  <div class="shop-card">
    <div class="shop-header">
      <div>
        <p class="shop-kicker">ITEM SHOP</p>
        <h2>アイテムを強くする</h2>
      </div>
      <button class="shop-close" type="button" aria-label="ショップを閉じる">×</button>
    </div>
    <div class="shop-wallet">所持コイン <strong id="shop-wallet">🪙 0</strong></div>
    <div id="shop-items" class="shop-items"></div>
  </div>
`;
game.appendChild(shopPanel);

const shopItems=shopPanel.querySelector("#shop-items");
const shopWallet=shopPanel.querySelector("#shop-wallet");
const shopClose=shopPanel.querySelector(".shop-close");

function shieldEffectText(level){
  const charges=shieldChargesForLevel(level);
  const bonus=shieldBlockBonusForLevel(level);
  return bonus>0?`岩を${charges}回防ぐ・1回ごとに+${bonus}点`:`岩を${charges}回防ぐ`;
}

const SHOP_DEFS={
  magnet:{icon:"🧲",name:"マグネット",effect(level){return `効果 ${magnetDurationForLevel(level)/1000}秒`; }},
  shield:{icon:"🛡️",name:"シールド",effect(level){return shieldEffectText(level); }},
  clock:{icon:"⏰",name:"時計",effect(level){return `TIME +${clockSecondsForLevel(level)}秒`; }},
  double:{icon:"×2",name:"スコア2倍",effect(level){return `効果 ${doubleDurationForLevel(level)/1000}秒`; }}
};

function renderShop(){
  if(!shopItems)return;
  if(shopWallet)shopWallet.textContent=`🪙 ${progressionState.coins}`;
  const walletResult=document.getElementById("wallet-coins");
  if(walletResult)walletResult.textContent=`🪙 ${progressionState.coins}`;

  shopItems.innerHTML="";
  for(const [type,def] of Object.entries(SHOP_DEFS)){
    const level=itemLevel(type);
    const maxed=level>=5;
    const cost=maxed?0:UPGRADE_COSTS[level-1];
    const row=document.createElement("article");
    row.className="shop-item";
    const nextText=maxed?`${def.effect(level)}・MAX`:`${def.effect(level)} → ${def.effect(level+1)}`;
    row.innerHTML=`
      <div class="shop-item__icon">${def.icon}</div>
      <div class="shop-item__body">
        <div class="shop-item__title"><strong>${def.name}</strong><span>Lv.${level}</span></div>
        <p>${nextText}</p>
      </div>
      <button class="shop-upgrade" type="button" ${maxed||progressionState.coins<cost?"disabled":""}>
        ${maxed?"MAX":`🪙 ${cost}`} 
      </button>
    `;
    const button=row.querySelector(".shop-upgrade");
    if(!maxed)button.addEventListener("click",()=>upgradeItem(type));
    shopItems.appendChild(row);
  }
}

function upgradeItem(type){
  const level=itemLevel(type);
  if(level>=5)return;
  const cost=UPGRADE_COSTS[level-1];
  if(progressionState.coins<cost)return;
  progressionState.coins-=cost;
  progressionState.levels[type]=level+1;
  saveProgressionState();
  renderShop();
}

function openShop(){renderShop();shopPanel.hidden=false;}
function closeShop(){shopPanel.hidden=true;}
shopButton.addEventListener("click",openShop);
shopClose.addEventListener("click",closeShop);
shopPanel.addEventListener("pointerdown",event=>{if(event.target===shopPanel)closeShop();});

function createCoin(){
  if(!isPlaying||!coinRoundActive)return;
  const coin=document.createElement("div");
  coin.className="game-coin";
  coin.textContent="🪙";
  coin.setAttribute("aria-hidden","true");
  const maxX=Math.max(20,playArea.clientWidth-54);
  coin.dataset.x=String(10+Math.random()*Math.max(10,maxX-10));
  coin.dataset.y="68";
  coin.style.transform=`translate(${coin.dataset.x}px,68px)`;
  playArea.appendChild(coin);
}

function scheduleNextCoin(){
  clearTimeout(coinSpawnTimeoutId);
  if(!isPlaying||!coinRoundActive)return;
  const delay=COIN_SPAWN_MIN+Math.random()*(COIN_SPAWN_MAX-COIN_SPAWN_MIN);
  coinSpawnTimeoutId=setTimeout(()=>{
    if(isPlaying&&coinRoundActive){createCoin();scheduleNextCoin();}
  },delay);
}

function showCoinPopup(){
  const popup=document.createElement("div");
  popup.className="coin-popup";
  popup.textContent=`+${COIN_VALUE} 🪙`;
  const playerRect=player.getBoundingClientRect();
  const areaRect=playArea.getBoundingClientRect();
  popup.style.left=`${playerRect.left-areaRect.left+playerRect.width/2}px`;
  popup.style.top=`${Math.max(90,playerRect.top-areaRect.top-12)}px`;
  playArea.appendChild(popup);
  setTimeout(()=>popup.remove(),700);
}

function updateCoins(dt){
  const playerRect=player.getBoundingClientRect();
  const controlsVisible=controls&&getComputedStyle(controls).display!=="none";
  const safeRects=controlsVisible?controlButtons.map(button=>expandedRect(button,COIN_CONTROL_CLEARANCE)):[];
  const bottom=game.getBoundingClientRect().bottom;
  playArea.querySelectorAll(".game-coin").forEach(coin=>{
    const nextY=Number(coin.dataset.y)+COIN_FALL_SPEED*dt;
    coin.dataset.y=String(nextY);
    coin.style.transform=`translate(${coin.dataset.x}px,${nextY}px)`;
    const rect=coin.getBoundingClientRect();
    if(rectanglesOverlap(playerRect,rect)){
      roundCoins+=COIN_VALUE;
      updateCoinHud();
      showCoinPopup();
      coin.remove();
      return;
    }
    if(safeRects.some(safe=>rectanglesOverlap(rect,safe))){coin.remove();return;}
    if(rect.top>=bottom)coin.remove();
  });
}

function coinAnimationLoop(now){
  const dt=Math.min(Math.max(0,(now-coinPreviousTime)/1000),.05);
  coinPreviousTime=now;
  if(isPlaying&&coinRoundActive)updateCoins(dt);
  requestAnimationFrame(coinAnimationLoop);
}
requestAnimationFrame(coinAnimationLoop);

function beginCoinRound(){
  clearTimeout(coinSpawnTimeoutId);
  playArea.querySelectorAll(".game-coin,.coin-popup").forEach(element=>element.remove());
  roundCoins=0;
  coinRoundActive=true;
  coinPreviousTime=performance.now();
  updateCoinHud();
  scheduleNextCoin();
}

function stopCoinRound(){
  coinRoundActive=false;
  clearTimeout(coinSpawnTimeoutId);
  coinSpawnTimeoutId=0;
  playArea.querySelectorAll(".game-coin").forEach(element=>element.remove());
}

/* Apply persistent item levels after the existing item handlers run. */
const collectItemBeforeProgression=collectItem;
collectItem=function(item,currentTime){
  const type=item.dataset.type;
  const clockAllowed=type!=="clock"||itemClockUses<2;
  collectItemBeforeProgression(item,currentTime);
  if(type==="clock"&&!clockAllowed)return;

  const level=itemLevel(type);
  if(type==="magnet"){
    magnetUntil=currentTime+magnetDurationForLevel(level);
  }else if(type==="shield"){
    shieldCharges=shieldChargesForLevel(level);
  }else if(type==="clock"){
    const extra=clockSecondsForLevel(level)-3;
    if(extra>0){timeLeft+=extra;timeDisplay.textContent=`TIME ${timeLeft}`;}
  }else if(type==="double"){
    doubleUntil=currentTime+doubleDurationForLevel(level);
  }
  renderItemStatus(currentTime);
};

const showShieldBlockPopupBeforeProgression=showShieldBlockPopup;
showShieldBlockPopup=function(){
  const bonus=shieldBlockBonusForLevel(itemLevel("shield"));
  if(bonus>0){
    score+=bonus;
    scoreDisplay.textContent=`SCORE ${score}`;
    const popup=document.createElement("div");
    popup.className="coin-popup shield-bonus-popup";
    popup.textContent=`SHIELD +${bonus}`;
    const rect=player.getBoundingClientRect();
    const areaRect=playArea.getBoundingClientRect();
    popup.style.left=`${rect.left-areaRect.left+rect.width/2}px`;
    popup.style.top=`${Math.max(86,rect.top-areaRect.top-8)}px`;
    playArea.appendChild(popup);
    setTimeout(()=>popup.remove(),700);
  }
  showShieldBlockPopupBeforeProgression();
};

const endGameBeforeProgression=endGame;
endGame=function(){
  const scoreBonus=Math.floor(score/50);
  const earned=roundCoins+scoreBonus;
  progressionState.coins+=earned;
  saveProgressionState();
  stopCoinRound();
  endGameBeforeProgression();

  const roundDisplay=document.getElementById("round-coins");
  const walletDisplay=document.getElementById("wallet-coins");
  if(roundDisplay)roundDisplay.textContent=`+${earned}`;
  if(walletDisplay)walletDisplay.textContent=`🪙 ${progressionState.coins}`;
  renderShop();
};

if(isPlaying)beginCoinRound();
restartButton.addEventListener("click",()=>{
  closeShop();
  setTimeout(()=>{if(isPlaying)beginCoinRound();},0);
});

renderShop();

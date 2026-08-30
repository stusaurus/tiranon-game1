"use strict";

const CARE_GROWTH_V2_KEY="tiranon-care-growth-v2";
const CARE_GROWTH_V2_STAGES=[
  {key:"egg",name:"たまご",image:"50DFE3E9-7F3D-4F43-904D-80FCC956FE8D.jpeg",speech:"なかでコトコトしているよ"},
  {key:"hatch",name:"もうすぐうまれそう",image:"CD0AD315-5B4E-41A6-810F-89806D5C27F3.jpeg",speech:"ピシッ…！なにかきこえる！"},
  {key:"baby",name:"あかちゃん",image:"F9654502-543D-425D-B99D-905B707420CB.jpeg",speech:"いっぱいおせわしてね"},
  {key:"crawl",name:"はいはい期",image:"1BED99C0-D098-4777-8C8A-9AB1E1A41C52.jpeg",speech:"もっとあそびたい！"},
  {key:"adult",name:"ティラノン",image:"IMG_1796.png",speech:"きょうはなにしてあそぶ？"}
];
const CARE_GROWTH_REQUIREMENTS=[
  null,
  {care:8,clears:1,label:"たまごにヒビが入る"},
  {care:22,clears:3,label:"ティラノンがうまれる"},
  {care:50,clears:7,label:"はいはいできる"},
  {care:90,clears:12,label:"大きく成長する"}
];

function legacyGrowthIndex(){
  const level=Math.max(1,Number(petState?.level)||1);
  if(level>=8)return 4;
  if(level>=5)return 3;
  if(level>=3)return 2;
  if(level>=2)return 1;
  return 0;
}

function defaultGrowthV2State(){
  const stageIndex=legacyGrowthIndex();
  const minimumCare=[0,8,22,50,90][stageIndex]||0;
  return {
    stageIndex,
    carePoints:minimumCare,
    clears:Math.max(0,Number(petState?.stage1Clears)||0),
    inventory:{banana:3},
    starterGranted:true,
    pendingEvolution:-1,
    lastPetPointAt:0
  };
}

function loadGrowthV2State(){
  const base=defaultGrowthV2State();
  try{
    const saved=JSON.parse(localStorage.getItem(CARE_GROWTH_V2_KEY)||"null");
    if(!saved||typeof saved!=="object")return base;
    base.stageIndex=Math.max(0,Math.min(4,Math.floor(Number(saved.stageIndex)||0)));
    base.carePoints=Math.max(0,Math.floor(Number(saved.carePoints)||0));
    base.clears=Math.max(0,Math.floor(Number(saved.clears)||0));
    base.inventory={banana:Math.max(0,Math.floor(Number(saved.inventory?.banana)||0))};
    base.starterGranted=saved.starterGranted!==false;
    base.pendingEvolution=Number.isFinite(Number(saved.pendingEvolution))?Math.floor(Number(saved.pendingEvolution)):-1;
    base.lastPetPointAt=Math.max(0,Number(saved.lastPetPointAt)||0);
    return base;
  }catch(error){return base;}
}

let careGrowthV2=loadGrowthV2State();
function saveGrowthV2(){
  try{localStorage.setItem(CARE_GROWTH_V2_KEY,JSON.stringify(careGrowthV2));}catch(error){}
}

/* Growth appearance is no longer tied directly to pet level. */
growthStage=function(){
  return CARE_GROWTH_V2_STAGES[careGrowthV2.stageIndex]||CARE_GROWTH_V2_STAGES[0];
};

const growthProgress=document.createElement("div");
growthProgress.className="growth-v2-progress";
growthProgress.innerHTML=`
  <div class="growth-v2-progress__head"><span>🌱 成長</span><strong id="growth-v2-next">次の成長</strong></div>
  <div class="growth-v2-progress__body" id="growth-v2-body"></div>
`;
if(homeGrowthCard)homeGrowthCard.appendChild(growthProgress);
const growthV2Next=document.getElementById("growth-v2-next");
const growthV2Body=document.getElementById("growth-v2-body");

const evolutionOverlay=document.createElement("section");
evolutionOverlay.className="evolution-overlay";
evolutionOverlay.hidden=true;
evolutionOverlay.innerHTML=`
  <div class="evolution-card">
    <p class="evolution-kicker">GROW UP!</p>
    <div class="evolution-glow"><img id="evolution-image" alt="ティラノンの成長"></div>
    <h2 id="evolution-title">せいちょうしたよ！</h2>
    <p id="evolution-message"></p>
    <button id="evolution-close" type="button">やった！</button>
  </div>
`;
game.appendChild(evolutionOverlay);
const evolutionImage=document.getElementById("evolution-image");
const evolutionTitle=document.getElementById("evolution-title");
const evolutionMessage=document.getElementById("evolution-message");
const evolutionClose=document.getElementById("evolution-close");

evolutionClose?.addEventListener("click",()=>{
  evolutionOverlay.hidden=true;
  careGrowthV2.pendingEvolution=-1;
  saveGrowthV2();
  renderHome();
});

function renderGrowthV2Progress(){
  if(!growthV2Body||!growthV2Next)return;
  const nextIndex=careGrowthV2.stageIndex+1;
  if(nextIndex>=CARE_GROWTH_V2_STAGES.length){
    growthV2Next.textContent="すくすく成長中";
    growthV2Body.innerHTML=`<span>お世話 ${careGrowthV2.carePoints}</span><span>草原 ${careGrowthV2.clears}回</span>`;
    return;
  }
  const req=CARE_GROWTH_REQUIREMENTS[nextIndex];
  growthV2Next.textContent=req.label;
  growthV2Body.innerHTML=`<span>🫶 ${Math.min(careGrowthV2.carePoints,req.care)}/${req.care}</span><span>🌿 ${Math.min(careGrowthV2.clears,req.clears)}/${req.clears}回</span>`;
}

function canGrowTo(nextIndex){
  const req=CARE_GROWTH_REQUIREMENTS[nextIndex];
  return !!req&&careGrowthV2.carePoints>=req.care&&careGrowthV2.clears>=req.clears;
}

function maybeShowEvolution(){
  const index=careGrowthV2.pendingEvolution;
  if(index<1||index>=CARE_GROWTH_V2_STAGES.length||!homeScreen||homeScreen.hidden)return;
  const stage=CARE_GROWTH_V2_STAGES[index];
  if(evolutionImage)evolutionImage.src=`${stage.image}?v=20260830-care2`;
  if(evolutionTitle)evolutionTitle.textContent=index===2?"ティラノンがうまれた！":"ティラノンがせいちょうした！";
  if(evolutionMessage){
    evolutionMessage.textContent=["","たまごにヒビが入った！","はじめまして、ティラノン！","はいはいできるようになった！","こんなに大きくなったよ！"][index]||"すくすく育っているよ！";
  }
  evolutionOverlay.hidden=false;
}

function tryAdvanceGrowthV2(){
  const nextIndex=careGrowthV2.stageIndex+1;
  if(nextIndex>=CARE_GROWTH_V2_STAGES.length||!canGrowTo(nextIndex))return false;
  careGrowthV2.stageIndex=nextIndex;
  careGrowthV2.pendingEvolution=nextIndex;
  saveGrowthV2();
  renderHome();
  renderGrowthV2Progress();
  maybeShowEvolution();
  return true;
}

function addGrowthCarePoints(points){
  careGrowthV2.carePoints=Math.max(0,careGrowthV2.carePoints+Math.max(0,Math.floor(points)));
  saveGrowthV2();
  renderGrowthV2Progress();
  tryAdvanceGrowthV2();
}

/* Add growth UI refresh without changing the existing care rendering. */
const renderCareHomeBeforeGrowthV2=renderCareHome;
renderCareHome=function(){
  renderCareHomeBeforeGrowthV2();
  renderGrowthV2Progress();
};

function foodKeyFor(food){
  const found=Object.entries(CARE_FOODS).find(([,value])=>value===food);
  return found?found[0]:"";
}

function feedTiranonV2(food,key=foodKeyFor(food)){
  const starterCount=key==="banana"?(careGrowthV2.inventory?.banana||0):0;
  const useStarter=starterCount>0;
  if(!useStarter&&progressionState.coins<food.cost)return;
  if(useStarter){careGrowthV2.inventory.banana=Math.max(0,starterCount-1);}
  else{progressionState.coins-=food.cost;saveProgressionState();}

  careState.hunger+=food.hunger;
  careState.mood+=food.mood;
  careState.hungerAt=Date.now();
  careState.moodAt=Date.now();
  clampCare();
  saveCareState();
  saveGrowthV2();
  if(typeof renderShop==="function")renderShop();
  carePanel.hidden=true;
  setHomeSpeech(`${food.name}おいしい！`);
  homeTiranon?.classList.add("care-pop");
  setTimeout(()=>homeTiranon?.classList.remove("care-pop"),450);
  grantCareExp(1);
  addGrowthCarePoints(2);
}

/* Keep any old food-card callbacks compatible. */
feedTiranon=function(food){feedTiranonV2(food,foodKeyFor(food));};

function renderFoodPanelV2(){
  carePanelTitle.textContent="ごはんをえらぶ";
  carePanelKicker.textContent="FOOD";
  carePanelItems.innerHTML="";
  for(const [key,food] of Object.entries(CARE_FOODS)){
    const unlocked=petState.level>=food.level;
    const starterCount=key==="banana"?(careGrowthV2.inventory?.banana||0):0;
    const canUseStarter=starterCount>0;
    const canBuy=unlocked&&(canUseStarter||progressionState.coins>=food.cost);
    const button=document.createElement("button");
    button.className="care-item-card";
    button.disabled=!canBuy;
    const price=canUseStarter?`🎒 ${starterCount}こ`:`🪙 ${food.cost}`;
    button.innerHTML=`<img loading="lazy" src="${food.image}" alt=""><div><strong>${food.name}</strong><small>${unlocked?`🍖 +${food.hunger}　😊 +${food.mood}`:`Lv.${food.level}で解放`}</small><span>${unlocked?price:"🔒"}</span></div>`;
    if(canBuy)button.addEventListener("click",()=>feedTiranonV2(food,key));
    carePanelItems.appendChild(button);
  }
  carePanel.hidden=false;
}

/* Stop the old coin-only food panel before its click handler runs. */
document.getElementById("care-feed-button")?.addEventListener("click",event=>{
  event.preventDefault();
  event.stopImmediatePropagation();
  renderFoodPanelV2();
},true);

/* Playing with a toy gives growth points only when the original action really succeeds. */
const playWithToyBeforeGrowthV2=playWithToy;
playWithToy=function(key,toy){
  const before=careState.lastPlayAt;
  playWithToyBeforeGrowthV2(key,toy);
  if(careState.lastPlayAt!==before)addGrowthCarePoints(2);
};

function countPetForGrowth(){
  const now=Date.now();
  const petActuallyWorked=now-careState.lastPetAt<900;
  if(!petActuallyWorked||now-careGrowthV2.lastPetPointAt<5*60*1000)return;
  careGrowthV2.lastPetPointAt=now;
  addGrowthCarePoints(1);
}
document.getElementById("care-pet-button")?.addEventListener("click",countPetForGrowth);
homeTiranon?.addEventListener("pointerdown",countPetForGrowth);

/* Adventure progress: growth cares about clears, while EXP remains its own system. */
const endGameBeforeGrowthV2=endGame;
endGame=function(){
  const wasStage=typeof stageActive!=="undefined"&&stageActive;
  const wasClear=typeof stageCleared!=="undefined"&&stageCleared;
  endGameBeforeGrowthV2();
  if(wasStage&&wasClear){
    careGrowthV2.clears++;
    careGrowthV2.carePoints+=5;
    saveGrowthV2();
    renderGrowthV2Progress();
    tryAdvanceGrowthV2();
  }
};

/* Evolution waits until the player comes home instead of covering the result screen. */
homeReturnButton?.addEventListener("click",()=>setTimeout(()=>{
  renderGrowthV2Progress();
  maybeShowEvolution();
},0));

renderGrowthV2Progress();
saveGrowthV2();

"use strict";

const CARE_STORAGE_KEY="tiranon-care-v1";
const CARE_HUNGER_INTERVAL=30*60*1000;
const CARE_MOOD_INTERVAL=45*60*1000;

const GROWTH_STAGES=[
  {min:1,max:1,key:"egg",name:"たまご",image:"50DFE3E9-7F3D-4F43-904D-80FCC956FE8D.jpeg",speech:"なかでコトコトしているよ"},
  {min:2,max:2,key:"hatch",name:"もうすぐうまれそう",image:"CD0AD315-5B4E-41A6-810F-89806D5C27F3.jpeg",speech:"ピシッ…！なにかきこえる！"},
  {min:3,max:4,key:"baby",name:"あかちゃん",image:"F9654502-543D-425D-B99D-905B707420CB.jpeg",speech:"いっぱいおせわしてね"},
  {min:5,max:7,key:"crawl",name:"はいはい期",image:"1BED99C0-D098-4777-8C8A-9AB1E1A41C52.jpeg",speech:"もっとあそびたい！"},
  {min:8,max:999,key:"adult",name:"ティラノン",image:"IMG_1796.png",speech:"きょうはなにしてあそぶ？"}
];

const CARE_FOODS={
  meat:{name:"おにく",image:"E4147F07-F1F3-4B06-B662-FF70CF990D83.jpeg",cost:8,hunger:30,mood:2,level:1},
  banana:{name:"バナナ",image:"CB09F6AF-752C-465C-99AA-B1CBAF5D8DA9.jpeg",cost:5,hunger:15,mood:9,level:1},
  salad:{name:"サラダ",image:"EBB4DECD-583E-4C9B-B1D7-BBD6FEF492A8.jpeg",cost:6,hunger:18,mood:10,level:2},
  fish:{name:"おさかな",image:"87E94B7E-D713-4A0B-9C49-63553EA8BC3D.jpeg",cost:8,hunger:25,mood:5,level:3}
};

const CARE_TOYS={
  ball:{name:"ボール",image:"FCBFADEE-5513-464B-9807-71E19E6C7B14.jpeg",mood:18,level:1},
  blocks:{name:"つみき",image:"F78AD737-4DA4-4EBD-9057-E8C1B9804EF9.jpeg",mood:16,level:2},
  pull:{name:"きょうりゅうおもちゃ",image:"7B0C29E9-A332-4276-86BF-3EA1AE5C3AC2.jpeg",mood:20,level:3},
  bone:{name:"ほねのぬいぐるみ",image:"40CC8F41-DCD0-4603-99F7-82738B48BD9A.jpeg",mood:17,level:4}
};

function defaultCareState(){
  const now=Date.now();
  return {hunger:82,mood:84,hungerAt:now,moodAt:now,lastPetAt:0,lastPlayAt:0,lastToy:"ball"};
}

function loadCareState(){
  try{
    const saved=JSON.parse(localStorage.getItem(CARE_STORAGE_KEY)||"null");
    const base=defaultCareState();
    if(!saved||typeof saved!=="object")return base;
    base.hunger=Math.max(0,Math.min(100,Number(saved.hunger)||0));
    base.mood=Math.max(0,Math.min(100,Number(saved.mood)||0));
    base.hungerAt=Number(saved.hungerAt)||Date.now();
    base.moodAt=Number(saved.moodAt)||Date.now();
    base.lastPetAt=Number(saved.lastPetAt)||0;
    base.lastPlayAt=Number(saved.lastPlayAt)||0;
    base.lastToy=CARE_TOYS[saved.lastToy]?saved.lastToy:"ball";
    return base;
  }catch(error){return defaultCareState();}
}

let careState=loadCareState();

function saveCareState(){
  try{localStorage.setItem(CARE_STORAGE_KEY,JSON.stringify(careState));}catch(error){}
}

function applyCareDecay(){
  const now=Date.now();
  const hungerLoss=Math.min(25,Math.floor((now-careState.hungerAt)/CARE_HUNGER_INTERVAL));
  const moodLoss=Math.min(20,Math.floor((now-careState.moodAt)/CARE_MOOD_INTERVAL));
  if(hungerLoss>0){careState.hunger=Math.max(0,careState.hunger-hungerLoss);careState.hungerAt+=hungerLoss*CARE_HUNGER_INTERVAL;}
  if(moodLoss>0){careState.mood=Math.max(0,careState.mood-moodLoss);careState.moodAt+=moodLoss*CARE_MOOD_INTERVAL;}
  saveCareState();
}

function growthStage(){
  return GROWTH_STAGES.find(stage=>petState.level>=stage.min&&petState.level<=stage.max)||GROWTH_STAGES[GROWTH_STAGES.length-1];
}

const homeRoom=document.querySelector(".home-room");
const homeTiranon=document.querySelector(".home-tiranon");
const homeGrowthCard=document.querySelector(".home-growth-card");
const homeStageCard=document.querySelector(".home-stage-card");

if(homeRoom){
  homeRoom.classList.add("home-room--care");
  homeRoom.insertAdjacentHTML("beforeend",`
    <img class="home-decor home-decor--rug" src="97B66ACE-5F8A-4C9B-BE7D-9E7BB9E5A0E9.jpeg" alt="" draggable="false">
    <img class="home-decor home-decor--lamp" src="1FCF9296-8DF0-4947-8244-998C2E3F023C.jpeg" alt="" draggable="false">
    <img id="home-current-toy" class="home-decor home-decor--toy" src="FCBFADEE-5513-464B-9807-71E19E6C7B14.jpeg" alt="" draggable="false">
    <div id="home-growth-badge" class="home-growth-badge">たまご</div>
  `);
}

const careCard=document.createElement("section");
careCard.className="home-care-card";
careCard.innerHTML=`
  <div class="care-stat">
    <div><span>🍖 おなか</span><strong id="care-hunger-text">82</strong></div>
    <div class="care-track"><i id="care-hunger-fill"></i></div>
  </div>
  <div class="care-stat">
    <div><span>😊 ごきげん</span><strong id="care-mood-text">84</strong></div>
    <div class="care-track care-track--mood"><i id="care-mood-fill"></i></div>
  </div>
`;
if(homeGrowthCard)homeGrowthCard.parentNode.insertBefore(careCard,homeGrowthCard);

const careActions=document.createElement("div");
careActions.className="home-care-actions";
careActions.innerHTML=`
  <button id="care-feed-button" type="button">🍖<span>ごはん</span></button>
  <button id="care-pet-button" type="button">🫶<span>なでる</span></button>
  <button id="care-play-button" type="button">🧸<span>あそぶ</span></button>
`;
if(homeStageCard)homeStageCard.parentNode.insertBefore(careActions,homeStageCard);

const carePanel=document.createElement("section");
carePanel.className="care-panel";
carePanel.hidden=true;
carePanel.innerHTML=`
  <div class="care-sheet">
    <div class="care-sheet__head"><div><small id="care-panel-kicker">CARE</small><h2 id="care-panel-title">おせわ</h2></div><button id="care-panel-close" type="button" aria-label="閉じる">×</button></div>
    <div id="care-panel-items" class="care-panel-items"></div>
  </div>
`;
game.appendChild(carePanel);

const careHungerText=document.getElementById("care-hunger-text");
const careMoodText=document.getElementById("care-mood-text");
const careHungerFill=document.getElementById("care-hunger-fill");
const careMoodFill=document.getElementById("care-mood-fill");
const growthBadge=document.getElementById("home-growth-badge");
const currentToy=document.getElementById("home-current-toy");
const feedButton=document.getElementById("care-feed-button");
const petButton=document.getElementById("care-pet-button");
const playButton=document.getElementById("care-play-button");
const carePanelItems=document.getElementById("care-panel-items");
const carePanelTitle=document.getElementById("care-panel-title");
const carePanelKicker=document.getElementById("care-panel-kicker");
const carePanelClose=document.getElementById("care-panel-close");

function clampCare(){
  careState.hunger=Math.max(0,Math.min(100,careState.hunger));
  careState.mood=Math.max(0,Math.min(100,careState.mood));
}

function setHomeSpeech(text){
  if(!homeSpeech)return;
  homeSpeech.textContent=text;
}

function renderCareHome(){
  applyCareDecay();
  clampCare();
  const stage=growthStage();
  if(homeTiranon){
    homeTiranon.src=`${stage.image}?v=20260830-care1`;
    homeTiranon.dataset.growth=stage.key;
    homeTiranon.classList.toggle("home-tiranon--paper",stage.key!=="adult");
  }
  if(growthBadge)growthBadge.textContent=stage.name;
  if(careHungerText)careHungerText.textContent=String(Math.round(careState.hunger));
  if(careMoodText)careMoodText.textContent=String(Math.round(careState.mood));
  if(careHungerFill)careHungerFill.style.width=`${careState.hunger}%`;
  if(careMoodFill)careMoodFill.style.width=`${careState.mood}%`;
  if(currentToy&&CARE_TOYS[careState.lastToy])currentToy.src=CARE_TOYS[careState.lastToy].image;

  if(careState.hunger<=25)setHomeSpeech("おなかすいた〜…ごはんほしいな");
  else if(careState.mood<=25)setHomeSpeech("ちょっとさみしいな。なでてほしい！");
  else if(careState.hunger>=80&&careState.mood>=80){
    if(stage.key==="baby")setHomeSpeech("げんきいっぱい！\nきょうもおせわしてね");
    else if(stage.key==="crawl")setHomeSpeech("げんきいっぱい！もっとあそびたい！");
    else setHomeSpeech("げんきいっぱい！あそびにいこう！");
  }
  else setHomeSpeech(stage.speech);
}

const renderHomeBeforeCare=renderHome;
renderHome=function(){renderHomeBeforeCare();renderCareHome();};

function grantCareExp(amount){
  const leveled=addPetExp(amount);
  if(leveled)setHomeSpeech(`やった！Lv.${petState.level}になったよ！`);
  renderHome();
}

function renderFoodPanel(){
  carePanelTitle.textContent="ごはんをえらぶ";
  carePanelKicker.textContent="FOOD";
  carePanelItems.innerHTML="";
  for(const food of Object.values(CARE_FOODS)){
    const unlocked=petState.level>=food.level;
    const canBuy=unlocked&&progressionState.coins>=food.cost;
    const button=document.createElement("button");
    button.className="care-item-card";
    button.disabled=!canBuy;
    button.innerHTML=`<img loading="lazy" src="${food.image}" alt=""><div><strong>${food.name}</strong><small>${unlocked?`🍖 +${food.hunger}　😊 +${food.mood}`:`Lv.${food.level}で解放`}</small><span>${unlocked?`🪙 ${food.cost}`:"🔒"}</span></div>`;
    if(canBuy)button.addEventListener("click",()=>feedTiranon(food));
    carePanelItems.appendChild(button);
  }
  carePanel.hidden=false;
}

function feedTiranon(food){
  if(progressionState.coins<food.cost)return;
  progressionState.coins-=food.cost;
  careState.hunger+=food.hunger;
  careState.mood+=food.mood;
  careState.hungerAt=Date.now();
  careState.moodAt=Date.now();
  clampCare();
  saveProgressionState();
  saveCareState();
  if(typeof renderShop==="function")renderShop();
  carePanel.hidden=true;
  setHomeSpeech(`${food.name}おいしい！`);
  homeTiranon?.classList.add("care-pop");
  setTimeout(()=>homeTiranon?.classList.remove("care-pop"),450);
  grantCareExp(2);
}

function renderToyPanel(){
  carePanelTitle.textContent="おもちゃをえらぶ";
  carePanelKicker.textContent="PLAY";
  carePanelItems.innerHTML="";
  for(const [key,toy] of Object.entries(CARE_TOYS)){
    const unlocked=petState.level>=toy.level;
    const button=document.createElement("button");
    button.className="care-item-card";
    button.disabled=!unlocked;
    button.innerHTML=`<img loading="lazy" src="${toy.image}" alt=""><div><strong>${toy.name}</strong><small>${unlocked?`😊 +${toy.mood}　🍖 -6`:`Lv.${toy.level}で解放`}</small><span>${unlocked?"あそぶ":"🔒"}</span></div>`;
    if(unlocked)button.addEventListener("click",()=>playWithToy(key,toy));
    carePanelItems.appendChild(button);
  }
  carePanel.hidden=false;
}

function playWithToy(key,toy){
  const now=Date.now();
  if(now-careState.lastPlayAt<8000){setHomeSpeech("もうちょっとしたら、またあそぼう！");carePanel.hidden=true;return;}
  careState.lastPlayAt=now;
  careState.lastToy=key;
  careState.mood+=toy.mood;
  careState.hunger-=6;
  careState.moodAt=now;
  clampCare();
  saveCareState();
  carePanel.hidden=true;
  setHomeSpeech(`${toy.name}たのしい！`);
  homeTiranon?.classList.add("care-wiggle");
  setTimeout(()=>homeTiranon?.classList.remove("care-wiggle"),650);
  grantCareExp(1);
}

function petTiranon(){
  const now=Date.now();
  if(now-careState.lastPetAt<3000){setHomeSpeech("えへへ、くすぐったい！");return;}
  careState.lastPetAt=now;
  careState.mood+=7;
  careState.moodAt=now;
  clampCare();
  saveCareState();
  setHomeSpeech("なでなで、うれしい！");
  homeTiranon?.classList.add("care-wiggle");
  setTimeout(()=>homeTiranon?.classList.remove("care-wiggle"),550);
  renderCareHome();
}

feedButton?.addEventListener("click",renderFoodPanel);
playButton?.addEventListener("click",renderToyPanel);
petButton?.addEventListener("click",petTiranon);
homeTiranon?.addEventListener("pointerdown",petTiranon);
carePanelClose?.addEventListener("click",()=>carePanel.hidden=true);
carePanel.addEventListener("pointerdown",event=>{if(event.target===carePanel)carePanel.hidden=true;});

const endGameBeforeCare=endGame;
endGame=function(){
  const wasStage=typeof stageActive!=="undefined"&&stageActive;
  const wasClear=typeof stageCleared!=="undefined"&&stageCleared;
  endGameBeforeCare();
  if(wasStage){
    careState.hunger-=wasClear?10:7;
    careState.mood+=wasClear?8:3;
    careState.hungerAt=Date.now();
    careState.moodAt=Date.now();
    clampCare();
    saveCareState();
    renderHome();
  }
};

setInterval(()=>{if(!homeScreen.hidden)renderCareHome();},60000);
renderCareHome();
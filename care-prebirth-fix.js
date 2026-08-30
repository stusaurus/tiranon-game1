"use strict";

const PREBIRTH_EGG_IMAGE="9D04E449-4B60-4EC9-A5F1-C90CB338CEC1.jpeg";
const BIRTH_MOMENT_IMAGE="CD0AD315-5B4E-41A6-810F-89806D5C27F3.jpeg";

if(typeof CARE_GROWTH_V2_STAGES!=="undefined"){
  CARE_GROWTH_V2_STAGES[0].image=PREBIRTH_EGG_IMAGE;
  CARE_GROWTH_V2_STAGES[1].image=PREBIRTH_EGG_IMAGE;
}

const eggCracks=document.createElement("div");
eggCracks.className="egg-cracks";
eggCracks.setAttribute("aria-hidden","true");
eggCracks.innerHTML="<i></i><i></i><i></i><i></i>";
if(typeof homeRoom!=="undefined"&&homeRoom)homeRoom.appendChild(eggCracks);

function applyPrebirthVisualFix(){
  if(typeof careGrowthV2==="undefined")return;
  const preBirth=careGrowthV2.stageIndex<2;
  const cracked=careGrowthV2.stageIndex===1;

  homeScreen?.classList.toggle("home-prebirth-fixed",preBirth);
  homeRoom?.classList.toggle("home-egg-cracked",cracked);

  if(preBirth&&homeTiranon){
    homeTiranon.src=`${PREBIRTH_EGG_IMAGE}?v=20260830-eggfix1`;
    homeTiranon.dataset.growth=cracked?"hatch":"egg";
    homeTiranon.classList.add("home-egg-visual");
  }else{
    homeTiranon?.classList.remove("home-egg-visual");
  }

  const growthName=document.querySelector(".home-growth-head > div > span");
  if(preBirth){
    if(growthName)growthName.textContent="たまご";
    if(homeLevelText)homeLevelText.textContent="";
  }
}

const renderCareHomeBeforePrebirthFix=renderCareHome;
renderCareHome=function(){
  renderCareHomeBeforePrebirthFix();
  applyPrebirthVisualFix();
};

const renderHomeBeforePrebirthFix=renderHome;
renderHome=function(){
  renderHomeBeforePrebirthFix();
  applyPrebirthVisualFix();
};

/* 誕生前はティラノンLvを上げない。EXPは誕生後からスタート。 */
const addPetExpBeforePrebirthFix=addPetExp;
addPetExp=function(amount){
  if(typeof careGrowthV2!=="undefined"&&careGrowthV2.stageIndex<2)return false;
  return addPetExpBeforePrebirthFix(amount);
};

/* 「誕生」の瞬間だけ殻から顔を出す絵を見せる。通常表示には使わない。 */
const maybeShowEvolutionBeforePrebirthFix=maybeShowEvolution;
maybeShowEvolution=function(){
  maybeShowEvolutionBeforePrebirthFix();
  if(careGrowthV2.pendingEvolution===2&&evolutionImage){
    evolutionImage.src=`${BIRTH_MOMENT_IMAGE}?v=20260830-birth1`;
  }
};

/* 生まれた瞬間にティラノンLv.1として育成を開始する。 */
const tryAdvanceGrowthBeforePrebirthFix=tryAdvanceGrowthV2;
tryAdvanceGrowthV2=function(){
  const before=careGrowthV2.stageIndex;
  const advanced=tryAdvanceGrowthBeforePrebirthFix();
  if(advanced&&before<2&&careGrowthV2.stageIndex>=2){
    petState.level=1;
    petState.exp=0;
    petState.totalExp=0;
    savePetState();
    renderHome();
  }
  applyPrebirthVisualFix();
  return advanced;
};

/* 結果画面も誕生前だけEXPではなく、たまごの育成として表示する。 */
const endGameBeforePrebirthFix=endGame;
endGame=function(){
  const wasPreBirth=typeof careGrowthV2!=="undefined"&&careGrowthV2.stageIndex<2;
  const wasClear=typeof stageCleared!=="undefined"&&stageCleared;
  endGameBeforePrebirthFix();
  if(wasPreBirth){
    const label=document.querySelector(".result-growth span");
    const value=document.getElementById("result-exp-earned");
    const message=document.getElementById("rank-message");
    if(label)label.textContent="たまごのげんき";
    if(value)value.textContent=wasClear?"+5":"+0";
    if(message)message.textContent=wasClear?"草原のげんきを、たまごに届けたよ！":"たまごを休ませて、また行こう！";
  }
};

applyPrebirthVisualFix();

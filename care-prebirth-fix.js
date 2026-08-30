"use strict";

/* 育成用の卵は、GitHubに元からあるこの素材だけを使う。 */
const PREBIRTH_EGG_IMAGE="50DFE3E9-7F3D-4F43-904D-80FCC956FE8D.jpeg";
const BIRTH_MOMENT_IMAGE="CD0AD315-5B4E-41A6-810F-89806D5C27F3.jpeg";

if(typeof CARE_GROWTH_V2_STAGES!=="undefined"){
  CARE_GROWTH_V2_STAGES[0].image=PREBIRTH_EGG_IMAGE;
  CARE_GROWTH_V2_STAGES[1].image=PREBIRTH_EGG_IMAGE;
}

function applyPrebirthVisualFix(){
  if(typeof careGrowthV2==="undefined")return;
  const preBirth=careGrowthV2.stageIndex<2;

  homeScreen?.classList.toggle("home-prebirth-fixed",preBirth);
  homeRoom?.classList.remove("home-egg-cracked");

  if(preBirth&&homeTiranon){
    homeTiranon.src=`${PREBIRTH_EGG_IMAGE}?v=20260830-restore`;
    homeTiranon.dataset.growth="egg";
    homeTiranon.classList.add("home-egg-visual");
    homeTiranon.alt="ティラノンのたまご";
  }else{
    homeTiranon?.classList.remove("home-egg-visual");
    if(homeTiranon)homeTiranon.alt="ティラノン";
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

const addPetExpBeforePrebirthFix=addPetExp;
addPetExp=function(amount){
  if(typeof careGrowthV2!=="undefined"&&careGrowthV2.stageIndex<2)return false;
  return addPetExpBeforePrebirthFix(amount);
};

const maybeShowEvolutionBeforePrebirthFix=maybeShowEvolution;
maybeShowEvolution=function(){
  maybeShowEvolutionBeforePrebirthFix();
  if(careGrowthV2.pendingEvolution===2&&evolutionImage){
    evolutionImage.src=`${BIRTH_MOMENT_IMAGE}?v=20260830-birth2`;
  }
};

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

"use strict";

const growthNameLabel=document.querySelector(".home-growth-head > div > span");

function renderPhaseCopy(){
  if(typeof careGrowthV2==="undefined"||typeof growthStage!=="function")return;
  const stage=growthStage();
  const preBirth=careGrowthV2.stageIndex<2;

  if(growthNameLabel){
    growthNameLabel.textContent=preBirth?"たまご":"ティラノン";
  }

  if(!preBirth||!homeSpeech)return;

  if(typeof careState!=="undefined"&&careState.hunger<=25){
    homeSpeech.textContent="たまごが少しひんやりしてる…あたためてあげよう";
  }else if(typeof careState!=="undefined"&&careState.mood<=25){
    homeSpeech.textContent="今日は中の音が静かみたい。そっと見守ろう";
  }else{
    homeSpeech.textContent=stage.speech;
  }
}

const renderCareHomeBeforePhaseCopy=renderCareHome;
renderCareHome=function(){
  renderCareHomeBeforePhaseCopy();
  renderPhaseCopy();
};

/* あたためる・みまもるの直後は、その反応メッセージを優先する。 */
const warmEggBeforePhaseCopy=typeof warmEgg==="function"?warmEgg:null;
if(warmEggBeforePhaseCopy){
  warmEgg=function(){
    const beforePoints=careGrowthV2.carePoints;
    warmEggBeforePhaseCopy();
    if(careGrowthV2.carePoints!==beforePoints){
      setHomeSpeech(careGrowthV2.stageIndex===0?"ぽかぽか…たまごが少し動いた！":"あったかい！中からコツンって聞こえた！");
    }
  };
}

const observeEggBeforePhaseCopy=typeof observeEgg==="function"?observeEgg:null;
if(observeEggBeforePhaseCopy){
  observeEgg=function(){
    observeEggBeforePhaseCopy();
    const messages=careGrowthV2.stageIndex===0
      ?["コトコト…中で動いた気がする！","耳をすますと、小さな音がするよ。","たまごは元気そう！"]
      :["ピシッ…！ヒビが少し広がったかな？","コツン！もうすぐ会えそう！","中から元気な音が聞こえる！"];
    setHomeSpeech(messages[Math.floor(Math.random()*messages.length)]);
  };
}

renderPhaseCopy();

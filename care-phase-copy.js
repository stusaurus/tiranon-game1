"use strict";

const growthNameLabel=document.querySelector(".home-growth-head > div > span");

function renderPhaseCopy(){
  if(typeof careGrowthV2==="undefined"||typeof growthStage!=="function")return;
  const stage=growthStage();
  const preBirth=careGrowthV2.stageIndex<2;
  const swaddledBaby=careGrowthV2.stageIndex===2||stage.key==="baby";

  if(growthNameLabel){
    growthNameLabel.textContent=preBirth?"たまご":"ティラノン";
  }

  /* おくるみ期は、まだ文章で話さず赤ちゃん言葉を中心にする。 */
  if(swaddledBaby&&homeSpeech){
    if(typeof careState!=="undefined"&&careState.hunger<=25){
      homeSpeech.textContent="ばぶぅ…まんま…";
    }else if(typeof careState!=="undefined"&&careState.mood<=25){
      homeSpeech.textContent="ばぶぅ…だっこ…";
    }else{
      homeSpeech.textContent="ばぶばぶ♪";
    }
    return;
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

/* home-mode側が名前を書き戻しても、最後に成長段階のコピーを確定させる。 */
const renderHomeBeforePhaseCopy=renderHome;
renderHome=function(){
  renderHomeBeforePhaseCopy();
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

/*
 * 永久強化とRUN強化の役割を分離する。
 * 永久：アイテム本体の基礎性能
 * RUN：そのプレイだけの別方向の強化
 */
if(typeof RUN_SKILLS!=="undefined"){
  if(RUN_SKILLS.magnetBoost){
    RUN_SKILLS.magnetBoost={
      icon:"🧲",
      name:"マグネット範囲",
      description(level){return `吸引範囲 +${level*45}`;}
    };
  }
  if(RUN_SKILLS.shieldBoost){
    RUN_SKILLS.shieldBoost={
      icon:"🛡️",
      name:"シールド補給",
      description(){return "選ぶとシールド +1";}
    };
  }
  if(RUN_SKILLS.clockBoost){
    RUN_SKILLS.clockBoost={
      icon:"❤️",
      name:"ハート運",
      description(level){return `ハートが出やすくなる Lv.${level}`;}
    };
  }
}

/* RUNマグネットは時間ではなく吸引範囲を広げる。 */
if(typeof applyMagnetPull==="function"){
  applyMagnetPull=function(dt,currentTime){
    if(!magnetIsActive(currentTime))return;

    const runLevel=typeof runSkillLevels!=="undefined"?runSkillLevels.magnetBoost:0;
    const radius=ITEM_MAGNET_RADIUS+runLevel*45;
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
      if(distance>radius||Math.abs(dx)<1)return;

      const strength=1+(1-distance/radius)*.8;
      const step=Math.min(Math.abs(dx),ITEM_MAGNET_PULL_SPEED*strength*dt);
      const maxX=Math.max(0,playArea.clientWidth-starRect.width);
      const nextX=Math.max(0,Math.min(maxX,Number(star.dataset.x)+Math.sign(dx)*step));
      star.dataset.x=String(nextX);
    });
  };
}

/* RUNハートは回復量ではなく、ハートの出現しやすさを上げる。 */
randomItemType=function(){
  const runHeartLevel=typeof runSkillLevels!=="undefined"?runSkillLevels.clockBoost:0;
  const weights={
    magnet:29,
    shield:26,
    clock:heartWeightForLives(lives)+runHeartLevel*10,
    double:24
  };
  const total=weights.magnet+weights.shield+weights.clock+weights.double;
  let roll=Math.random()*total;
  for(const type of ["magnet","shield","clock","double"]){
    roll-=weights[type];
    if(roll<0)return type;
  }
  return "double";
};

/* アイテム取得時は永久強化だけを適用。RUN強化の同一効果は重ねない。 */
collectItem=function(item,currentTime){
  const type=item.dataset.type;
  showItemPopup(item,type);
  const permanentLevel=typeof itemLevel==="function"?itemLevel(type):1;

  if(type==="magnet"){
    magnetUntil=currentTime+(typeof magnetDurationForLevel==="function"?magnetDurationForLevel(permanentLevel):ITEM_MAGNET_DURATION);
    game.classList.add("magnet-active");
  }else if(type==="shield"){
    const base=typeof shieldChargesForLevel==="function"?shieldChargesForLevel(permanentLevel):1;
    shieldCharges=Math.max(1,base);
    player.classList.add("shield-active");
  }else if(type==="clock"){
    const heal=Math.max(1,heartHealForLevel(permanentLevel));
    const before=lives;
    lives=Math.min(LIFE_MAX,lives+heal);
    const healed=lives-before;
    const invincibleMs=heartInvincibleMsForLevel(permanentLevel);
    if(invincibleMs>0)invincibleUntil=Math.max(invincibleUntil,currentTime+invincibleMs);
    renderLives();
    showLifePopup(healed>0?`❤️ +${healed}`:"❤️ FULL","life-popup--heal");
  }else if(type==="double"){
    doubleUntil=currentTime+(typeof doubleDurationForLevel==="function"?doubleDurationForLevel(permanentLevel):ITEM_DOUBLE_DURATION);
    game.classList.add("double-active");
  }

  item.remove();
  renderItemStatus(currentTime);
};

renderPhaseCopy();

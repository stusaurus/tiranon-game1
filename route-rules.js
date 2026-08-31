"use strict";

/*
 * Distinct route gameplay rules.
 * Each rule triggers only from ordinary collected stars. Bonus stars created by
 * these rules still count toward stage progress, but never trigger another rule.
 */
(()=>{
  if(typeof ADVENTURE_ROUTES==="undefined")return;

  ADVENTURE_ROUTES.forest.description="🌰多め／5⭐ごとにボーナス⭐";
  ADVENTURE_ROUTES.river.description="ゆっくり／8⭐ごとに岩を流す";
  ADVENTURE_ROUTES.volcano.description="高速・SCORE+40%／5⭐で噴火";
  ADVENTURE_ROUTES.night.description="SCORE+30%／7⭐でSTAR RUSH";

  let routeRuleProgress=0;
  let routeRuleKey="meadow";

  function routeRulePopup(text,duration=900){
    if(typeof adventureShowPopup==="function")adventureShowPopup(text,duration);
  }

  function makeBonusStar(x,y=12){
    if(!isPlaying)return null;
    const star=document.createElement("div");
    star.className="star route-bonus-star";
    star.textContent="★";
    star.dataset.type="normal";
    star.dataset.routeBonus="1";
    star.setAttribute("aria-hidden","true");
    const maxX=Math.max(0,playArea.clientWidth-38);
    const safeX=Math.max(0,Math.min(maxX,x));
    star.dataset.x=String(safeX);
    star.dataset.y=String(y);
    star.style.transform=`translate(${safeX}px, ${y}px)`;
    playArea.appendChild(star);
    return star;
  }

  function spawnBonusStars(count,spread=76){
    const maxX=Math.max(0,playArea.clientWidth-38);
    const playerCenter=Math.max(0,Math.min(maxX,playerX+player.offsetWidth/2-17));
    const offsets=count===1?[0]:count===2?[-spread/2,spread/2]:[-spread,0,spread];
    offsets.slice(0,count).forEach((offset,index)=>{
      setTimeout(()=>{
        if(!isPlaying)return;
        makeBonusStar(playerCenter+offset,10+index*18);
      },index*130);
    });
  }

  function triggerForest(){
    routeRulePopup("🌳 実り！ BONUS ⭐",850);
    spawnBonusStars(1);
  }

  function triggerRiver(){
    const rocks=[...playArea.querySelectorAll(".rock")];
    if(rocks.length){
      // Clear at most two existing ground hazards; future hazards keep spawning normally.
      rocks.slice(0,2).forEach(rock=>rock.remove());
      routeRulePopup("🌊 水流！ 岩を流した",850);
    }else{
      // If there is nothing to wash away, the safe route still grants a brief calm window.
      invincibleUntil=Math.max(invincibleUntil,performance.now()+800);
      routeRulePopup("🌊 おだやかな流れ",850);
    }
  }

  function triggerVolcano(){
    score+=10;
    scoreDisplay.textContent=`SCORE ${score}`;
    routeRulePopup("🌋 噴火！ +10 SCORE",900);

    // Risk immediately follows the reward. Use existing hazards only.
    setTimeout(()=>{if(isPlaying&&typeof createRock==="function")createRock();},120);
    if(stageStars>=30){
      setTimeout(()=>{if(isPlaying&&typeof createDangerStar==="function")createDangerStar();},380);
    }
  }

  function triggerNight(){
    routeRulePopup("🌙 STAR RUSH!",950);
    spawnBonusStars(3,72);
    // From the normal bomb-unlock range onward, the rush carries visible risk too.
    if(stageStars>=30){
      setTimeout(()=>{if(isPlaying&&typeof createDangerStar==="function")createDangerStar();},520);
    }
  }

  function thresholdForRoute(key){
    if(key==="forest")return 5;
    if(key==="river")return 8;
    if(key==="volcano")return 5;
    if(key==="night")return 7;
    return Infinity;
  }

  function triggerCurrentRouteRule(){
    if(routeRuleKey==="forest")triggerForest();
    else if(routeRuleKey==="river")triggerRiver();
    else if(routeRuleKey==="volcano")triggerVolcano();
    else if(routeRuleKey==="night")triggerNight();
  }

  /* Reset the local counter every time the player chooses a new route. */
  if(typeof adventureChooseRoute==="function"){
    const chooseRouteBeforeRules=adventureChooseRoute;
    adventureChooseRoute=function(key){
      chooseRouteBeforeRules(key);
      routeRuleKey=ADVENTURE_ROUTES[key]?key:"meadow";
      routeRuleProgress=0;
    };
  }

  /* Run after all existing score/stage wrappers so this only adds the route event. */
  if(typeof collectStar==="function"){
    const collectStarBeforeRouteRules=collectStar;
    collectStar=function(star,now){
      const isBonus=star?.dataset?.routeBonus==="1";
      collectStarBeforeRouteRules(star,now);

      if(!stageActive||stageFinishing||isBonus)return;
      const current=typeof adventureRouteKey!=="undefined"?adventureRouteKey:"meadow";
      if(current!==routeRuleKey){
        routeRuleKey=current;
        routeRuleProgress=0;
      }
      if(!ADVENTURE_ROUTES[current])return;

      routeRuleProgress++;
      const target=thresholdForRoute(current);
      if(routeRuleProgress<target)return;
      routeRuleProgress=0;
      triggerCurrentRouteRule();
    };
  }
})();

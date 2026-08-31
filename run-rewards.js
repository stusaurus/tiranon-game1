"use strict";

/*
 * BONUS RUN treasure chests + persistent route collection.
 * No new image assets are used. Test mode never writes reward progress.
 */
(()=>{
  if(typeof game==="undefined"||typeof playArea==="undefined")return;

  const REWARD_STORAGE_KEY="tiranon-route-collection-v1";
  const REWARD_MILESTONES=[100,120,150];
  const REWARD_TEST_MODE=new URLSearchParams(location.search).get("run-test")==="1";

  const ROUTE_COLLECTIONS={
    forest:{
      icon:"🌳",name:"木の実の森",
      regular:[
        {id:"forest-leaf",icon:"🍃",name:"森の葉っぱ飾り"},
        {id:"forest-pot",icon:"🪴",name:"森の鉢植え"},
        {id:"forest-acorn",icon:"🌰",name:"木の実オブジェ"},
        {id:"forest-bench",icon:"🪵",name:"丸太ベンチ"}
      ],
      rare:[
        {id:"forest-lamp",icon:"✨",name:"ひかる木の実ランプ"},
        {id:"forest-mobile",icon:"🦋",name:"森のモビール"}
      ]
    },
    river:{
      icon:"🌊",name:"川辺",
      regular:[
        {id:"river-shell",icon:"🐚",name:"川辺の貝がら飾り"},
        {id:"river-drop",icon:"💧",name:"水晶のしずく"},
        {id:"river-stone",icon:"🪨",name:"青い川石"},
        {id:"river-rug",icon:"🟦",name:"水色のラグ"}
      ],
      rare:[
        {id:"river-mirror",icon:"🪞",name:"水面ミラー"},
        {id:"river-lamp",icon:"💡",name:"しずくランプ"}
      ]
    },
    volcano:{
      icon:"🌋",name:"火山道",
      regular:[
        {id:"volcano-rock",icon:"🪨",name:"火山石オブジェ"},
        {id:"volcano-brick",icon:"🧱",name:"黒いレンガ飾り"},
        {id:"volcano-flame",icon:"🔥",name:"炎のオブジェ"},
        {id:"volcano-rug",icon:"🟥",name:"マグマラグ"}
      ],
      rare:[
        {id:"volcano-crystal",icon:"💎",name:"マグマ結晶"},
        {id:"volcano-lamp",icon:"💡",name:"溶岩ランプ"}
      ]
    },
    night:{
      icon:"🌙",name:"星降る夜",
      regular:[
        {id:"night-star",icon:"⭐",name:"星の壁飾り"},
        {id:"night-moon",icon:"🌙",name:"月のクッション"},
        {id:"night-planet",icon:"🪐",name:"惑星オブジェ"},
        {id:"night-rug",icon:"🌌",name:"星空ラグ"}
      ],
      rare:[
        {id:"night-scope",icon:"🔭",name:"天体望遠鏡"},
        {id:"night-projector",icon:"✨",name:"星座プロジェクター"}
      ]
    }
  };

  function defaultRewardState(){
    return {owned:[],chests:{common:0,route:0,rare:0}};
  }

  function loadRewardState(){
    try{
      const raw=JSON.parse(localStorage.getItem(REWARD_STORAGE_KEY)||"null");
      const base=defaultRewardState();
      if(!raw||typeof raw!=="object")return base;
      const validIds=new Set(Object.values(ROUTE_COLLECTIONS).flatMap(route=>[...route.regular,...route.rare].map(item=>item.id)));
      base.owned=Array.isArray(raw.owned)?[...new Set(raw.owned.filter(id=>validIds.has(id)))]:[];
      base.chests.common=Math.max(0,Math.floor(Number(raw.chests?.common)||0));
      base.chests.route=Math.max(0,Math.floor(Number(raw.chests?.route)||0));
      base.chests.rare=Math.max(0,Math.floor(Number(raw.chests?.rare)||0));
      return base;
    }catch(error){
      return defaultRewardState();
    }
  }

  let rewardState=loadRewardState();
  let rewardedThisRun=new Set();
  let lastSeenStageStars=0;
  let rewardOwnsPause=false;

  function saveRewardState(){
    if(REWARD_TEST_MODE)return;
    try{localStorage.setItem(REWARD_STORAGE_KEY,JSON.stringify(rewardState));}catch(error){}
  }

  function routeFromRun(){
    try{
      if(typeof adventureRouteKey!=="undefined"&&ROUTE_COLLECTIONS[adventureRouteKey])return adventureRouteKey;
      if(typeof adventureRouteHistory!=="undefined"&&Array.isArray(adventureRouteHistory)){
        for(let i=adventureRouteHistory.length-1;i>=0;i--){
          if(ROUTE_COLLECTIONS[adventureRouteHistory[i]])return adventureRouteHistory[i];
        }
      }
    }catch(error){}
    return null;
  }

  function owned(item){return rewardState.owned.includes(item.id);}
  function routeOwnedCount(route){return [...route.regular,...route.rare].filter(owned).length;}
  function totalOwnedCount(){return rewardState.owned.length;}

  function addCoins(amount){
    const safe=Math.max(0,Math.floor(Number(amount)||0));
    if(safe<=0||REWARD_TEST_MODE)return;
    if(typeof progressionState!=="undefined"&&progressionState){
      progressionState.coins=Math.max(0,Math.floor(Number(progressionState.coins)||0))+safe;
      if(typeof saveProgressionState==="function")saveProgressionState();
      if(typeof renderShop==="function")renderShop();
      if(typeof renderHome==="function")renderHome();
    }
  }

  function awardMissing(routeKey,rarity){
    const route=ROUTE_COLLECTIONS[routeKey];
    if(!route)return null;
    const pool=route[rarity]||[];
    const missing=pool.filter(item=>!owned(item));
    if(!missing.length)return null;
    const item=missing[Math.floor(Math.random()*missing.length)];
    rewardState.owned.push(item.id);
    saveRewardState();
    return item;
  }

  const style=document.createElement("style");
  style.textContent=`
    .reward-next{opacity:.94;font-size:11px;white-space:nowrap;}
    .reward-overlay{position:absolute;inset:0;z-index:29;display:grid;place-items:center;padding:20px;background:rgba(18,31,41,.56);backdrop-filter:blur(2px);}
    .reward-overlay[hidden]{display:none;}
    .reward-card{width:min(92%,390px);padding:22px 18px 18px;border:3px solid rgba(255,255,255,.92);border-radius:26px;background:rgba(255,253,240,.98);box-shadow:0 12px 30px rgba(0,0,0,.24);text-align:center;color:#294d45;}
    .reward-kicker{margin:0;color:#8a7040;font-size:12px;font-weight:1000;letter-spacing:.16em;}
    .reward-chest{margin:6px 0 2px;font-size:58px;line-height:1;}
    .reward-card h2{margin:4px 0 8px;font-size:25px;}
    .reward-main{margin:0;padding:12px;border-radius:16px;background:#f4ead0;font-size:18px;font-weight:1000;line-height:1.45;}
    .reward-sub{margin:9px 0 0;color:#63786f;font-size:13px;font-weight:800;line-height:1.45;}
    .reward-continue{width:100%;min-height:48px;margin-top:15px;border:0;border-radius:16px;color:#fff;background:linear-gradient(145deg,#42ad68,#287a4b);box-shadow:0 4px 0 #205d3b;font-size:16px;font-weight:1000;}
    .reward-continue:active{transform:translateY(3px);box-shadow:0 1px 0 #205d3b;}

    .home-collection-button{min-height:52px;border:2px solid #dce8f3;border-radius:18px;color:#38566b;background:rgba(255,255,255,.92);box-shadow:0 4px 10px rgba(35,69,87,.10);font-size:16px;font-weight:1000;}
    .collection-panel{position:absolute;inset:0;z-index:60;padding:18px 14px;overflow:auto;background:rgba(239,248,246,.98);color:#2d554c;}
    .collection-panel[hidden]{display:none;}
    .collection-card{max-width:520px;margin:0 auto;padding-bottom:24px;}
    .collection-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 2px 13px;background:rgba(239,248,246,.96);}
    .collection-head p{margin:0;color:#668078;font-size:11px;font-weight:1000;letter-spacing:.14em;}
    .collection-head h2{margin:2px 0 0;font-size:24px;}
    .collection-close{width:44px;height:44px;border:0;border-radius:50%;background:#fff;color:#355f56;font-size:25px;font-weight:1000;box-shadow:0 3px 8px rgba(0,0,0,.10);}
    .collection-summary{margin-bottom:12px;padding:12px 14px;border-radius:17px;background:#fff;font-weight:1000;box-shadow:0 3px 10px rgba(35,85,72,.08);}
    .collection-route{margin:10px 0;padding:13px;border:2px solid rgba(255,255,255,.92);border-radius:20px;background:rgba(255,255,255,.76);box-shadow:0 4px 10px rgba(35,85,72,.08);}
    .collection-route__head{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:9px;font-weight:1000;}
    .collection-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}
    .collection-item{min-height:86px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:8px 4px;border-radius:14px;background:#f8fbfa;text-align:center;}
    .collection-item__icon{font-size:27px;line-height:1;}
    .collection-item strong{font-size:11px;line-height:1.25;}
    .collection-item.is-locked{filter:grayscale(1);opacity:.42;}
    .collection-item.is-rare{outline:2px solid rgba(207,162,55,.28);}
    @media(max-width:360px){.collection-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
  `;
  document.head.appendChild(style);

  const rewardOverlay=document.createElement("section");
  rewardOverlay.className="reward-overlay";
  rewardOverlay.hidden=true;
  rewardOverlay.setAttribute("aria-label","宝箱の報酬");
  rewardOverlay.innerHTML=`
    <div class="reward-card">
      <p class="reward-kicker">BONUS TREASURE</p>
      <div class="reward-chest">🎁</div>
      <h2 id="reward-title">宝箱！</h2>
      <p id="reward-main" class="reward-main"></p>
      <p id="reward-sub" class="reward-sub"></p>
      <button class="reward-continue" type="button">冒険をつづける</button>
    </div>
  `;
  game.appendChild(rewardOverlay);
  const rewardTitle=rewardOverlay.querySelector("#reward-title");
  const rewardMain=rewardOverlay.querySelector("#reward-main");
  const rewardSub=rewardOverlay.querySelector("#reward-sub");
  const rewardContinue=rewardOverlay.querySelector(".reward-continue");

  function pauseForReward(){
    rewardOwnsPause=false;
    if(typeof runPauseGame==="function"&&typeof runDraftPaused!=="undefined"&&!runDraftPaused&&isPlaying){
      runPauseGame();
      if(typeof runLevelOverlay!=="undefined")runLevelOverlay.hidden=true;
      rewardOwnsPause=true;
    }
  }

  function closeReward(){
    rewardOverlay.hidden=true;
    if(rewardOwnsPause&&typeof runResumeGame==="function"&&typeof runDraftPaused!=="undefined"&&runDraftPaused&&isPlaying){
      runResumeGame();
    }
    rewardOwnsPause=false;
  }
  rewardContinue.addEventListener("click",closeReward);

  function nextRewardText(stars){
    const next=REWARD_MILESTONES.find(target=>stars<target);
    return next?`🎁 あと${next-stars}⭐`:`🎁 COMPLETE`;
  }

  if(typeof renderStageHud==="function"){
    const renderStageHudBeforeRewards=renderStageHud;
    renderStageHud=function(){
      renderStageHudBeforeRewards();
      if(!stageCleared||!stageHud||stageHud.hidden)return;
      const badge=document.createElement("span");
      badge.className="reward-next";
      badge.textContent=nextRewardText(stageStars);
      stageHud.appendChild(badge);
    };
  }

  const home=document.querySelector(".tiranon-home");
  const collectionButton=document.createElement("button");
  collectionButton.type="button";
  collectionButton.className="home-collection-button";
  if(home)home.appendChild(collectionButton);

  const collectionPanel=document.createElement("section");
  collectionPanel.className="collection-panel";
  collectionPanel.hidden=true;
  collectionPanel.setAttribute("aria-label","ルートコレクション");
  collectionPanel.innerHTML=`
    <div class="collection-card">
      <div class="collection-head">
        <div><p>ROUTE COLLECTION</p><h2>📖 コレクション</h2></div>
        <button class="collection-close" type="button" aria-label="コレクションを閉じる">×</button>
      </div>
      <div class="collection-summary"></div>
      <div class="collection-routes"></div>
    </div>
  `;
  game.appendChild(collectionPanel);
  const collectionSummary=collectionPanel.querySelector(".collection-summary");
  const collectionRoutes=collectionPanel.querySelector(".collection-routes");
  const collectionClose=collectionPanel.querySelector(".collection-close");

  function renderCollection(){
    const total=Object.values(ROUTE_COLLECTIONS).reduce((sum,route)=>sum+route.regular.length+route.rare.length,0);
    if(collectionButton)collectionButton.textContent=`📖 コレクション ${totalOwnedCount()}/${total}`;
    if(collectionSummary)collectionSummary.textContent=`集めたもの ${totalOwnedCount()} / ${total}`;
    if(!collectionRoutes)return;
    collectionRoutes.innerHTML="";

    for(const route of Object.values(ROUTE_COLLECTIONS)){
      const section=document.createElement("section");
      section.className="collection-route";
      section.innerHTML=`<div class="collection-route__head"><strong>${route.icon} ${route.name}</strong><span>${routeOwnedCount(route)}/6</span></div><div class="collection-grid"></div>`;
      const grid=section.querySelector(".collection-grid");
      for(const item of [...route.regular,...route.rare]){
        const unlocked=owned(item);
        const cell=document.createElement("div");
        cell.className=`collection-item${unlocked?"":" is-locked"}${route.rare.includes(item)?" is-rare":""}`;
        cell.innerHTML=`<span class="collection-item__icon">${unlocked?item.icon:"❔"}</span><strong>${unlocked?item.name:"？？？"}</strong>`;
        grid.appendChild(cell);
      }
      collectionRoutes.appendChild(section);
    }
  }

  collectionButton.addEventListener("click",()=>{renderCollection();collectionPanel.hidden=false;});
  collectionClose.addEventListener("click",()=>collectionPanel.hidden=true);

  function showReward(title,main,sub){
    rewardTitle.textContent=title;
    rewardMain.textContent=main;
    rewardSub.textContent=sub;
    pauseForReward();
    rewardOverlay.hidden=false;
  }

  function rewardAt100(){
    rewardState.chests.common++;
    saveRewardState();
    addCoins(20);
    const testNote=REWARD_TEST_MODE?"（テスト中は保存しない）":"";
    showReward("⭐100 共通宝箱","🪙 +20 コイン",`次は⭐120でルート宝箱！${testNote}`);
  }

  function rewardAt120(){
    const routeKey=routeFromRun();
    rewardState.chests.route++;
    const route=routeKey?ROUTE_COLLECTIONS[routeKey]:null;
    const item=routeKey?awardMissing(routeKey,"regular"):null;
    saveRewardState();

    if(route&&item){
      showReward(`${route.icon} ${route.name}の宝箱`,`${item.icon} ${item.name} GET!`,`コレクションに追加！ 次は⭐150でレア宝箱`);
    }else if(route){
      addCoins(15);
      showReward(`${route.icon} ${route.name}の宝箱`,`通常コレクション COMPLETE！ 🪙 +15`,`次は⭐150でレア宝箱`);
    }else{
      addCoins(15);
      showReward("⭐120 ルート宝箱","🪙 +15 コイン","ルート未設定のためコイン報酬になったよ");
    }
    renderCollection();
  }

  function rewardAt150(){
    const routeKey=routeFromRun();
    rewardState.chests.rare++;
    const route=routeKey?ROUTE_COLLECTIONS[routeKey]:null;
    const item=routeKey?awardMissing(routeKey,"rare"):null;
    saveRewardState();

    if(route&&item){
      showReward(`✨ ${route.name} レア宝箱`,`${item.icon} ${item.name} GET!`,`レアコレクション獲得！`);
    }else if(route){
      addCoins(30);
      showReward(`✨ ${route.name} レア宝箱`,`レアコレクション COMPLETE！ 🪙 +30`,`⭐150まで到達！`);
    }else{
      addCoins(30);
      showReward("✨ ⭐150 レア宝箱","🪙 +30 コイン","ルート未設定のためコイン報酬になったよ");
    }
    renderCollection();
  }

  function resetRunRewards(){
    rewardedThisRun.clear();
    lastSeenStageStars=0;
    rewardOverlay.hidden=true;
    rewardOwnsPause=false;
  }

  const playButton=document.getElementById("home-play-button");
  if(playButton)playButton.addEventListener("click",()=>setTimeout(resetRunRewards,0));
  if(typeof restartButton!=="undefined"&&restartButton)restartButton.addEventListener("click",()=>setTimeout(resetRunRewards,0));

  if(typeof collectStar==="function"){
    const collectStarBeforeRewards=collectStar;
    collectStar=function(star,now){
      collectStarBeforeRewards(star,now);
      if(typeof stageStars!=="number")return;

      if(stageStars<lastSeenStageStars)resetRunRewards();
      lastSeenStageStars=stageStars;
      if(!stageActive||stageFinishing||rewardedThisRun.has(stageStars))return;
      if(!REWARD_MILESTONES.includes(stageStars))return;

      rewardedThisRun.add(stageStars);
      if(stageStars===100)rewardAt100();
      else if(stageStars===120)rewardAt120();
      else if(stageStars===150)rewardAt150();
    };
  }

  renderCollection();
})();

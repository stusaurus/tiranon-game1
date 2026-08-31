"use strict";

/* Random S/U/P/E/R collection -> SUPER FEVER. */
(()=>{
  if(typeof game==="undefined"||typeof playArea==="undefined"||typeof player==="undefined")return;

  const LETTERS=[
    {key:"S",color:"#ef3f47"},
    {key:"U",color:"#ff69b4"},
    {key:"P",color:"#9b59d0"},
    {key:"E",color:"#62c7e8"},
    {key:"R",color:"#3977d8"}
  ];
  const SPAWN_MIN=4000;
  const SPAWN_MAX=6000;
  const FALL_SPEED=105;
  const FEVER_DURATION=8000;
  const MAGNET_RADIUS=310;
  const MAGNET_SPEED=520;
  const DUPLICATE_BONUS=50;

  let collected=new Set();
  let superEndsAt=0;
  let nextSpawnTimer=0;
  let previousTime=performance.now();
  let lastPlaying=Boolean(typeof isPlaying!=="undefined"&&isPlaying);

  const style=document.createElement("style");
  style.textContent=`
    .super-word{position:absolute;z-index:31;top:54px;left:50%;display:flex;gap:4px;transform:translateX(-50%);padding:4px 8px;border:2px solid rgba(255,255,255,.9);border-radius:999px;background:rgba(31,55,55,.70);box-shadow:0 3px 8px rgba(0,0,0,.16);pointer-events:none;}
    .super-word[hidden]{display:none;}
    .super-word__letter{min-width:19px;text-align:center;font-size:17px;line-height:1;font-weight:1000;opacity:.22;filter:grayscale(.65);transition:opacity .18s ease,filter .18s ease,transform .18s ease;}
    .super-word__letter.is-collected{opacity:1;filter:none;transform:scale(1.08);text-shadow:0 1px 0 #fff,0 0 7px currentColor;}
    .super-letter{position:absolute;z-index:16;width:42px;height:42px;display:grid;place-items:center;border:3px solid #fff;border-radius:14px;background:rgba(255,255,255,.94);box-shadow:0 5px 0 rgba(44,63,60,.18),0 7px 14px rgba(0,0,0,.15);font-size:27px;line-height:1;font-weight:1000;text-shadow:0 1px 0 #fff;will-change:transform;}
    .super-letter::after{content:"";position:absolute;inset:3px;border:2px solid currentColor;border-radius:9px;opacity:.26;}
    .super-letter.is-wanted{animation:super-letter-pulse .65s ease-in-out infinite alternate;}
    .super-fever-banner{position:absolute;z-index:45;left:50%;top:34%;transform:translate(-50%,-50%);padding:12px 18px;border:3px solid #fff;border-radius:999px;background:rgba(30,51,72,.88);color:#fff;font-size:clamp(24px,7vw,38px);font-weight:1000;letter-spacing:.02em;white-space:nowrap;text-shadow:0 2px 2px rgba(0,0,0,.35);box-shadow:0 8px 24px rgba(0,0,0,.26);pointer-events:none;animation:super-fever-pop .75s ease both;}
    .super-fever-timer{position:absolute;z-index:32;top:88px;left:50%;transform:translateX(-50%);padding:5px 10px;border-radius:999px;color:#fff;background:linear-gradient(90deg,#ef3f47,#ff69b4,#9b59d0,#62c7e8,#3977d8);font-size:12px;font-weight:1000;letter-spacing:.04em;box-shadow:0 3px 9px rgba(0,0,0,.18);pointer-events:none;}
    .game.super-fever-active .player{filter:drop-shadow(0 0 9px #fff) drop-shadow(0 0 16px #62c7e8);}
    .game.super-fever-active .play-area{box-shadow:inset 0 0 30px rgba(255,255,255,.28);}
    @keyframes super-letter-pulse{from{transform:scale(1)}to{transform:scale(1.13)}}
    @keyframes super-fever-pop{0%{opacity:0;transform:translate(-50%,-50%) scale(.55)}55%{opacity:1;transform:translate(-50%,-50%) scale(1.13)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
    @media(max-width:520px){.super-word{top:50px;gap:3px;padding:4px 7px}.super-word__letter{min-width:17px;font-size:15px}.super-fever-timer{top:80px}}
    @media(prefers-reduced-motion:reduce){.super-letter.is-wanted,.super-fever-banner{animation:none!important}}
  `;
  document.head.appendChild(style);

  const hud=document.createElement("div");
  hud.className="super-word";
  hud.hidden=true;
  hud.setAttribute("aria-label","SUPER文字コレクション");
  hud.innerHTML=LETTERS.map(letter=>`<span class="super-word__letter" data-super-hud="${letter.key}" style="color:${letter.color}">${letter.key}</span>`).join("");
  game.appendChild(hud);

  const timer=document.createElement("div");
  timer.className="super-fever-timer";
  timer.hidden=true;
  game.appendChild(timer);

  const now=()=>performance.now();
  function canRun(){
    if(typeof isPlaying==="undefined"||!isPlaying)return false;
    if(typeof stageActive!=="undefined"&&!stageActive)return false;
    if(typeof stageFinishing!=="undefined"&&stageFinishing)return false;
    if(typeof runDraftPaused!=="undefined"&&runDraftPaused)return false;
    return true;
  }
  function superActive(time=now()){return time<superEndsAt;}
  function renderHud(){
    hud.hidden=!canRun();
    for(const letter of LETTERS){
      const cell=hud.querySelector(`[data-super-hud="${letter.key}"]`);
      if(cell)cell.classList.toggle("is-collected",collected.has(letter.key));
    }
  }
  function popup(text,color="#fff"){
    const node=document.createElement("div");
    node.className="item-popup";
    node.textContent=text;
    node.style.color=color;
    const pr=player.getBoundingClientRect();
    const ar=playArea.getBoundingClientRect();
    node.style.left=`${pr.left-ar.left+pr.width/2}px`;
    node.style.top=`${Math.max(76,pr.top-ar.top-10)}px`;
    playArea.appendChild(node);
    setTimeout(()=>node.remove(),850);
  }
  function showBanner(){
    const banner=document.createElement("div");
    banner.className="super-fever-banner";
    banner.textContent="SUPER FEVER!!";
    game.appendChild(banner);
    setTimeout(()=>banner.remove(),1200);
  }
  function updateWantedClasses(){
    const missing=LETTERS.filter(letter=>!collected.has(letter.key)).map(letter=>letter.key);
    playArea.querySelectorAll(".super-letter").forEach(node=>{
      node.classList.toggle("is-wanted",missing.length===1&&node.dataset.superLetter===missing[0]);
    });
  }

  function triggerSuperFever(time){
    if(superActive(time))return;
    superEndsAt=time+FEVER_DURATION;
    game.classList.add("super-fever-active");
    showBanner();
    playArea.querySelectorAll(".super-letter").forEach(node=>node.remove());

    if(typeof invincibleUntil!=="undefined")invincibleUntil=Math.max(invincibleUntil,superEndsAt);
    if(typeof magnetUntil!=="undefined")magnetUntil=Math.max(magnetUntil,superEndsAt);
    if(typeof doubleUntil!=="undefined")doubleUntil=Math.max(doubleUntil,superEndsAt);
    game.classList.add("magnet-active","double-active");
    timer.hidden=false;
    renderHud();
  }

  function finishSuperFever(){
    if(!game.classList.contains("super-fever-active"))return;
    game.classList.remove("super-fever-active");
    timer.hidden=true;
    collected.clear();
    renderHud();
  }

  function randomLetter(){return LETTERS[Math.floor(Math.random()*LETTERS.length)];}
  function spawnLetter(){
    if(!canRun()||superActive())return;
    const letter=randomLetter();
    const node=document.createElement("div");
    node.className="super-letter";
    node.dataset.superLetter=letter.key;
    node.textContent=letter.key;
    node.style.color=letter.color;
    node.setAttribute("aria-hidden","true");
    const maxX=Math.max(16,playArea.clientWidth-52);
    node.dataset.x=String(8+Math.random()*Math.max(8,maxX-8));
    node.dataset.y="60";
    node.style.transform=`translate(${node.dataset.x}px,60px)`;
    playArea.appendChild(node);
    updateWantedClasses();
  }

  function scheduleNext(){
    clearTimeout(nextSpawnTimer);
    const delay=SPAWN_MIN+Math.random()*(SPAWN_MAX-SPAWN_MIN);
    nextSpawnTimer=setTimeout(()=>{
      if(canRun()&&!superActive())spawnLetter();
      scheduleNext();
    },delay);
  }

  function collectLetter(node,time){
    const key=node.dataset.superLetter;
    const def=LETTERS.find(letter=>letter.key===key);
    node.remove();
    if(!key||!def)return;

    if(collected.has(key)){
      if(typeof score!=="undefined"){
        score+=DUPLICATE_BONUS;
        if(typeof scoreDisplay!=="undefined")scoreDisplay.textContent=`SCORE ${score}`;
      }
      popup(`${key} BONUS +${DUPLICATE_BONUS}`,def.color);
    }else{
      collected.add(key);
      popup(`${key} GET!`,def.color);
    }
    renderHud();
    updateWantedClasses();
    if(collected.size===LETTERS.length)triggerSuperFever(time);
  }

  function pullTowardPlayer(node,dt){
    if(!node.dataset||!Number.isFinite(Number(node.dataset.x))||!Number.isFinite(Number(node.dataset.y)))return;
    const area=playArea.getBoundingClientRect();
    const pr=player.getBoundingClientRect();
    const nr=node.getBoundingClientRect();
    const targetX=pr.left-area.left+pr.width/2;
    const targetY=pr.top-area.top+pr.height/2;
    const nodeX=nr.left-area.left+nr.width/2;
    const nodeY=nr.top-area.top+nr.height/2;
    const dx=targetX-nodeX,dy=targetY-nodeY;
    const distance=Math.hypot(dx,dy);
    if(distance<=1||distance>MAGNET_RADIUS)return;
    const step=Math.min(distance,MAGNET_SPEED*dt*(1+(1-distance/MAGNET_RADIUS)*.7));
    const nx=Number(node.dataset.x)+dx/distance*step;
    const ny=Number(node.dataset.y)+dy/distance*step;
    node.dataset.x=String(nx);
    node.dataset.y=String(ny);
  }

  function updateLetters(dt,time){
    const pr=player.getBoundingClientRect();
    const bottom=game.getBoundingClientRect().bottom;
    playArea.querySelectorAll(".super-letter").forEach(node=>{
      let y=Number(node.dataset.y)+FALL_SPEED*dt;
      node.dataset.y=String(y);
      node.style.transform=`translate(${node.dataset.x}px,${y}px)`;
      const rect=node.getBoundingClientRect();
      if(rectanglesOverlap(pr,rect)){
        collectLetter(node,time);
        return;
      }
      if(rect.top>=bottom)node.remove();
    });
  }

  function updateSuperEffects(dt,time){
    if(!superActive(time)){
      if(superEndsAt>0){superEndsAt=0;finishSuperFever();}
      return;
    }
    if(typeof invincibleUntil!=="undefined")invincibleUntil=Math.max(invincibleUntil,superEndsAt);
    if(typeof magnetUntil!=="undefined")magnetUntil=Math.max(magnetUntil,superEndsAt);
    if(typeof doubleUntil!=="undefined")doubleUntil=Math.max(doubleUntil,superEndsAt);
    const remaining=Math.max(1,Math.ceil((superEndsAt-time)/1000));
    timer.textContent=`SUPER ${remaining}s  🛡️  ×3  🧲`;

    playArea.querySelectorAll(".star,.game-item").forEach(node=>pullTowardPlayer(node,dt));
  }

  const collectStarBeforeSuper=typeof collectStar==="function"?collectStar:null;
  if(collectStarBeforeSuper){
    collectStar=function(star,time){
      const before=Number(score)||0;
      collectStarBeforeSuper(star,time);
      if(!superActive(time))return;
      const gained=Math.max(0,(Number(score)||0)-before);
      if(gained<=0)return;
      const extra=Math.max(1,Math.round(gained*.5));
      score+=extra;
      scoreDisplay.textContent=`SCORE ${score}`;
    };
  }

  function resetRound(){
    collected.clear();
    superEndsAt=0;
    game.classList.remove("super-fever-active");
    timer.hidden=true;
    playArea.querySelectorAll(".super-letter").forEach(node=>node.remove());
    renderHud();
  }

  const endGameBeforeSuper=typeof endGame==="function"?endGame:null;
  if(endGameBeforeSuper){
    endGame=function(){
      resetRound();
      endGameBeforeSuper();
    };
  }

  if(typeof homePlayButton!=="undefined")homePlayButton.addEventListener("click",()=>setTimeout(()=>{if(isPlaying)resetRound();},0));
  if(typeof restartButton!=="undefined")restartButton.addEventListener("click",()=>setTimeout(()=>{if(isPlaying)resetRound();},0));
  if(typeof homeReturnButton!=="undefined")homeReturnButton.addEventListener("click",resetRound);

  function loop(time){
    const dt=Math.min(Math.max(0,(time-previousTime)/1000),.05);
    previousTime=time;
    const playing=Boolean(typeof isPlaying!=="undefined"&&isPlaying);
    if(playing&&!lastPlaying)resetRound();
    lastPlaying=playing;
    if(canRun()){
      renderHud();
      updateLetters(dt,time);
      updateSuperEffects(dt,time);
    }else{
      hud.hidden=true;
    }
    requestAnimationFrame(loop);
  }

  window.TIRANON_SUPER_FEVER={
    letters:LETTERS.map(letter=>letter.key),
    status(){return {collected:[...collected],active:superActive(),remaining:Math.max(0,superEndsAt-now())};},
    spawn:spawnLetter,
    reset:resetRound
  };

  resetRound();
  scheduleNext();
  requestAnimationFrame(loop);
})();

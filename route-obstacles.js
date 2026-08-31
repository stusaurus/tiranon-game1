"use strict";

/*
 * Route-specific obstacle visuals.
 * Gameplay rules, speed and collision stay unchanged; only the presentation changes.
 * No new image assets are used.
 */
(()=>{
  const style=document.createElement("style");
  style.textContent=`
    /* Keep the same physical box for every route so difficulty stays fair. */
    .rock.route-obstacle{
      transition:background .22s ease,border-color .22s ease,filter .22s ease,clip-path .22s ease;
    }

    /* FOREST: a short log with a visible cut end and moss. */
    .rock.route-obstacle-forest{
      border-color:#5b3a22;
      border-radius:40% 46% 38% 44% / 48% 50% 42% 45%;
      background:
        repeating-linear-gradient(7deg,rgba(68,39,20,.26) 0 2px,transparent 2px 8px),
        linear-gradient(90deg,#8d542d 0%,#a96837 45%,#754126 100%);
      box-shadow:inset 0 5px 0 rgba(255,211,138,.16),0 4px 4px rgba(0,0,0,.22);
    }
    .rock.route-obstacle-forest::before{
      top:3px;left:2px;width:15px;height:24px;
      border:2px solid #77502f;border-radius:50%;
      background:radial-gradient(circle,#95643a 0 18%,#d8a664 20% 38%,#aa7744 40% 45%,#e4bd78 47% 100%);
      transform:rotate(-5deg);
    }
    .rock.route-obstacle-forest::after{
      top:-3px;right:7px;bottom:auto;width:20px;height:8px;border-radius:55% 45% 60% 40%;
      background:#5e9b45;box-shadow:7px 3px 0 #76ad4f;transform:rotate(-8deg);
    }

    /* RIVER: pale driftwood, smoother and water-worn. */
    .rock.route-obstacle-river{
      border-color:#667b78;
      border-radius:52% 42% 54% 38% / 58% 48% 55% 44%;
      background:
        repeating-linear-gradient(-8deg,rgba(65,94,91,.18) 0 2px,transparent 2px 9px),
        linear-gradient(145deg,#a69a78 0%,#7d8777 50%,#69756e 100%);
      box-shadow:inset 6px 6px 0 rgba(225,255,248,.16),0 4px 4px rgba(0,0,0,.2);
    }
    .rock.route-obstacle-river::before{
      top:6px;left:7px;width:21px;height:7px;border-radius:999px;
      background:rgba(198,240,231,.35);transform:rotate(-12deg);box-shadow:none;
    }
    .rock.route-obstacle-river::after{
      right:4px;bottom:3px;width:18px;height:9px;border:0;border-radius:50%;
      color:#d7fbff;background:transparent;content:"≈";font-size:20px;line-height:8px;font-weight:1000;transform:none;
    }

    /* VOLCANO: jagged charcoal rock with glowing lava cracks. */
    .rock.route-obstacle-volcano{
      border-color:#3f2925;
      border-radius:35% 52% 33% 47% / 50% 42% 58% 38%;
      clip-path:polygon(5% 78%,13% 34%,31% 15%,48% 30%,65% 11%,84% 31%,96% 70%,83% 94%,24% 96%);
      background:
        linear-gradient(72deg,transparent 0 42%,#ff8b2d 44% 48%,transparent 50% 100%),
        linear-gradient(-48deg,transparent 0 54%,#ffb13c 56% 60%,transparent 62% 100%),
        linear-gradient(145deg,#59413a 0%,#392b2b 52%,#221d20 100%);
      box-shadow:inset 4px 4px 0 rgba(255,150,78,.12),0 4px 5px rgba(45,17,13,.3);
    }
    .rock.route-obstacle-volcano::before{
      top:7px;left:11px;width:8px;height:8px;border:0;border-radius:50%;background:#ff7b26;
      box-shadow:16px 11px 0 #ffb032,24px -1px 0 rgba(255,104,31,.7);transform:none;
    }
    .rock.route-obstacle-volcano::after{display:none;}

    /* NIGHT: cool moonstone / meteor fragment with tiny glints. */
    .rock.route-obstacle-night{
      border-color:#46548d;
      border-radius:46% 38% 50% 34% / 42% 52% 38% 50%;
      clip-path:polygon(7% 75%,18% 31%,39% 17%,57% 29%,75% 10%,94% 47%,86% 91%,24% 96%);
      background:
        radial-gradient(circle at 30% 32%,rgba(214,230,255,.62) 0 2px,transparent 3px),
        radial-gradient(circle at 72% 55%,rgba(255,239,174,.72) 0 2px,transparent 3px),
        linear-gradient(145deg,#6f79aa 0%,#4a548d 48%,#343c70 100%);
      box-shadow:inset 5px 5px 0 rgba(216,230,255,.13),0 4px 6px rgba(17,24,61,.35);
    }
    .rock.route-obstacle-night::before{
      top:5px;left:9px;width:5px;height:5px;border:0;border-radius:50%;background:#f6edb3;
      box-shadow:18px 8px 0 #dce9ff,28px -2px 0 #fff4b8;transform:none;
    }
    .rock.route-obstacle-night::after{display:none;}

    /* Falling hazards keep their size/hitbox but visually belong to the route. */
    .danger-star.route-hazard-forest{border-color:#d7ee9a;background:radial-gradient(circle,#a7ca63 0 24%,#628e43 26% 58%,#355f34 60%);box-shadow:0 0 10px rgba(97,143,64,.45),0 4px 8px rgba(0,0,0,.18);}
    .danger-star.route-hazard-river{border-color:#d9fbff;background:radial-gradient(circle at 38% 31%,#d8fbff 0 12%,#62c5de 14% 53%,#347fa5 55%);box-shadow:0 0 12px rgba(102,211,235,.56),0 4px 8px rgba(0,0,0,.16);}
    .danger-star.route-hazard-volcano{border-color:#ffd28a;background:radial-gradient(circle,#ffd45b 0 18%,#ff7a24 20% 52%,#7b3028 54%);box-shadow:0 0 14px rgba(255,112,37,.72),0 4px 8px rgba(0,0,0,.2);}
    .danger-star.route-hazard-night{border-color:#b8c6ff;background:radial-gradient(circle,#cfd8ff 0 18%,#6572b1 20% 53%,#2d356b 55%);box-shadow:0 0 12px rgba(162,183,255,.55),0 4px 8px rgba(0,0,0,.22);}
    .danger-star.route-themed::after{display:none;}

    /* Side hazards use familiar symbols; rules and path are unchanged. */
    .air-hazard.route-air-forest{filter:drop-shadow(0 4px 3px rgba(69,38,8,.3));}
    .air-hazard.route-air-river{filter:drop-shadow(0 3px 4px rgba(20,101,135,.28));}
    .air-hazard.route-air-volcano{filter:drop-shadow(0 3px 5px rgba(147,54,20,.44));}
    .air-hazard.route-air-night{filter:drop-shadow(0 3px 5px rgba(37,46,106,.5));}

    .game.route-forest .air-warning{background:#6b9a45;border-color:#ecffc8;box-shadow:0 0 12px rgba(102,151,70,.6),0 4px 8px rgba(0,0,0,.16);}
    .game.route-river .air-warning{background:#3b9fc1;border-color:#e0fbff;box-shadow:0 0 12px rgba(66,181,216,.62),0 4px 8px rgba(0,0,0,.16);}
    .game.route-volcano .air-warning{background:#d85827;border-color:#ffe2a8;box-shadow:0 0 14px rgba(255,101,38,.72),0 4px 8px rgba(0,0,0,.18);}
    .game.route-night .air-warning{background:#485a9d;border-color:#dce5ff;box-shadow:0 0 12px rgba(119,144,238,.65),0 4px 8px rgba(0,0,0,.18);}
  `;
  document.head.appendChild(style);

  const routeClasses=["forest","river","volcano","night"];

  function currentRoute(){
    try{
      return typeof adventureRouteKey!=="undefined"&&routeClasses.includes(adventureRouteKey)
        ? adventureRouteKey
        : "meadow";
    }catch(error){
      return "meadow";
    }
  }

  function clearClasses(element,prefix){
    for(const route of routeClasses)element.classList.remove(`${prefix}-${route}`);
  }

  function decorateRock(rock){
    if(!rock||!rock.classList?.contains("rock"))return;
    clearClasses(rock,"route-obstacle");
    rock.classList.add("route-obstacle");
    const route=currentRoute();
    if(route!=="meadow")rock.classList.add(`route-obstacle-${route}`);
  }

  const fallingSymbols={forest:"🍂",river:"💧",volcano:"🔥",night:"◆",meadow:"✹"};
  function decorateFalling(hazard){
    if(!hazard||!hazard.classList?.contains("danger-star"))return;
    clearClasses(hazard,"route-hazard");
    hazard.classList.remove("route-themed");
    const route=currentRoute();
    hazard.textContent=fallingSymbols[route]||"✹";
    if(route!=="meadow"){
      hazard.classList.add("route-themed",`route-hazard-${route}`);
    }
  }

  const airSymbols={forest:"🌰",river:"🫧",volcano:"🔥",night:"☄",meadow:"🌰"};
  function decorateAir(hazard){
    if(!hazard||!hazard.classList?.contains("air-hazard"))return;
    clearClasses(hazard,"route-air");
    const route=currentRoute();
    hazard.textContent=airSymbols[route]||"🌰";
    if(route!=="meadow")hazard.classList.add(`route-air-${route}`);
  }

  function decorateElement(element){
    if(!(element instanceof Element))return;
    if(element.matches(".rock"))decorateRock(element);
    if(element.matches(".danger-star"))decorateFalling(element);
    if(element.matches(".air-hazard"))decorateAir(element);
    element.querySelectorAll?.(".rock").forEach(decorateRock);
    element.querySelectorAll?.(".danger-star").forEach(decorateFalling);
    element.querySelectorAll?.(".air-hazard").forEach(decorateAir);
  }

  function redecorateAll(){
    playArea.querySelectorAll(".rock").forEach(decorateRock);
    playArea.querySelectorAll(".danger-star").forEach(decorateFalling);
    playArea.querySelectorAll(".air-hazard").forEach(decorateAir);
  }

  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes)decorateElement(node);
    }
  });
  observer.observe(playArea,{childList:true,subtree:false});

  /* Existing obstacles also switch look at the instant a new route is chosen. */
  try{
    if(typeof adventureApplyRouteTheme==="function"){
      const applyRouteThemeBeforeObstacleSkin=adventureApplyRouteTheme;
      adventureApplyRouteTheme=function(key,announce=false){
        applyRouteThemeBeforeObstacleSkin(key,announce);
        setTimeout(redecorateAll,0);
      };
    }
  }catch(error){}

  redecorateAll();
})();

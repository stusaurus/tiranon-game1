"use strict";

/*
 * Make special hazards read as "avoid me" at a glance.
 * Items and stars are untouched. Hazard dimensions are kept unchanged so collision stays fair.
 */
(()=>{
  const style=document.createElement("style");
  style.textContent=`
    .danger-star.hazard-danger,
    .air-hazard.hazard-danger{
      box-sizing:border-box;
      border-color:#3c2027 !important;
      outline:2px solid rgba(116,31,43,.64);
      outline-offset:1px;
      animation:hazard-danger-pulse .58s ease-in-out infinite alternate;
    }

    .danger-star.hazard-danger::after,
    .air-hazard.hazard-danger::after{
      position:absolute;
      top:-7px;
      right:-7px;
      z-index:2;
      display:grid !important;
      place-items:center;
      width:18px;
      height:18px;
      content:"!" !important;
      border:2px solid #fff1d9;
      border-radius:50%;
      color:#fff;
      background:#d83b36 !important;
      box-shadow:0 2px 5px rgba(71,18,22,.42),0 0 0 2px rgba(84,25,30,.38) !important;
      font-size:12px;
      font-weight:1000;
      line-height:1;
      transform:none !important;
      pointer-events:none;
    }

    .danger-star.hazard-danger::before{
      position:absolute;
      inset:5px;
      content:"";
      border:2px dashed rgba(255,247,221,.58);
      border-radius:38%;
      pointer-events:none;
    }

    /* Horizontal special hazards get a dark hazard plate so emoji never looks collectible. */
    .air-hazard.hazard-danger{
      border:3px solid #3c2027;
      border-radius:38% 46% 35% 48% / 43% 36% 48% 40%;
      font-size:30px;
      text-shadow:0 2px 2px rgba(0,0,0,.38);
      background:radial-gradient(circle at 38% 30%,#8c6b4a 0 20%,#584538 22% 58%,#312b2d 60% 100%);
      box-shadow:inset 3px 3px 0 rgba(255,255,255,.10),0 0 0 2px rgba(111,31,40,.36),0 4px 7px rgba(0,0,0,.28);
    }

    .air-hazard.hazard-danger.route-air-forest{
      background:radial-gradient(circle at 38% 30%,#947044 0 20%,#665037 22% 58%,#343126 60% 100%);
    }
    .air-hazard.hazard-danger.route-air-river{
      background:radial-gradient(circle at 38% 30%,#76b8ca 0 18%,#3f7892 20% 56%,#24465d 58% 100%);
    }
    .air-hazard.hazard-danger.route-air-volcano{
      background:radial-gradient(circle at 38% 30%,#ff9a39 0 17%,#b84b29 19% 54%,#4f2929 56% 100%);
    }
    .air-hazard.hazard-danger.route-air-night{
      background:radial-gradient(circle at 38% 30%,#8b96d3 0 18%,#515d9a 20% 56%,#29335f 58% 100%);
    }

    /* Route-colored falling hazards keep their identity, but all share one danger language. */
    .danger-star.hazard-danger.route-hazard-forest{filter:drop-shadow(0 0 5px rgba(111,145,67,.58));}
    .danger-star.hazard-danger.route-hazard-river{filter:drop-shadow(0 0 6px rgba(64,164,203,.58));}
    .danger-star.hazard-danger.route-hazard-volcano{filter:drop-shadow(0 0 7px rgba(255,91,31,.66));}
    .danger-star.hazard-danger.route-hazard-night{filter:drop-shadow(0 0 6px rgba(121,145,235,.62));}

    @keyframes hazard-danger-pulse{
      from{outline-color:rgba(116,31,43,.46);filter:brightness(.96)}
      to{outline-color:rgba(210,57,55,.92);filter:brightness(1.10)}
    }

    @media(prefers-reduced-motion:reduce){
      .danger-star.hazard-danger,.air-hazard.hazard-danger{animation:none;}
    }
  `;
  document.head.appendChild(style);

  function markHazard(element){
    if(!(element instanceof Element))return;
    if(element.matches(".danger-star,.air-hazard"))element.classList.add("hazard-danger");
    element.querySelectorAll?.(".danger-star,.air-hazard").forEach(hazard=>hazard.classList.add("hazard-danger"));
  }

  playArea.querySelectorAll(".danger-star,.air-hazard").forEach(hazard=>hazard.classList.add("hazard-danger"));

  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes)markHazard(node);
    }
  });
  observer.observe(playArea,{childList:true,subtree:false});
})();

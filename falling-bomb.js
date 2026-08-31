"use strict";

/*
 * All falling hazards use one universal visual language: BOMB.
 * Movement, spawn timing, damage, size, and collision are unchanged.
 */
(()=>{
  const routeClasses=["forest","river","volcano","night"];

  function makeBomb(hazard){
    if(!(hazard instanceof Element)||!hazard.classList.contains("danger-star"))return;
    for(const route of routeClasses)hazard.classList.remove(`route-hazard-${route}`);
    hazard.classList.remove("route-themed");
    hazard.textContent="💣";
  }

  playArea.querySelectorAll(".danger-star").forEach(makeBomb);

  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(!(node instanceof Element))continue;
        if(node.matches(".danger-star"))makeBomb(node);
        node.querySelectorAll?.(".danger-star").forEach(makeBomb);
      }
    }
  });
  observer.observe(playArea,{childList:true,subtree:false});
})();

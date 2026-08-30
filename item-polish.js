"use strict";

let itemClockUses=0;

const originalRandomItemTypeForPolish=randomItemType;
const originalCollectItemForPolish=collectItem;
const originalBeginItemRoundForPolish=beginItemRound;

randomItemType=function(){
  if(itemClockUses<2)return originalRandomItemTypeForPolish();

  const roll=Math.random();
  if(roll<.37)return "magnet";
  if(roll<.70)return "shield";
  return "double";
};

showItemPopup=function(item,type){
  const labels={
    magnet:"MAGNET!",
    shield:"SHIELD!",
    clock:"+3 SEC",
    double:"SCORE ×2!"
  };

  const popup=document.createElement("div");
  popup.className=`item-popup item-popup--${type} item-popup--pickup`;
  popup.textContent=labels[type]||"ITEM!";

  const playerRect=player.getBoundingClientRect();
  const areaRect=playArea.getBoundingClientRect();
  const centerX=playerRect.left-areaRect.left+playerRect.width/2;
  const topY=Math.max(92,playerRect.top-areaRect.top-16);

  popup.style.left=`${centerX}px`;
  popup.style.top=`${topY}px`;
  playArea.appendChild(popup);
  setTimeout(()=>popup.remove(),700);
};

collectItem=function(item,currentTime){
  const type=item.dataset.type;

  if(type==="clock"){
    if(itemClockUses>=2){
      item.remove();
      return;
    }
    itemClockUses++;
  }

  originalCollectItemForPolish(item,currentTime);
};

beginItemRound=function(){
  itemClockUses=0;
  originalBeginItemRoundForPolish();
};

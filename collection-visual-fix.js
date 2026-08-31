"use strict";

/* Make white-backed collection art blend into the game's soft illustrated world. */
(()=>{
  const style=document.createElement("style");
  style.textContent=`
    /* Collection route cards: soft route-tinted paper instead of hard white. */
    .collection-route:nth-child(1){background:rgba(238,247,224,.92);border-color:rgba(174,205,150,.42);}
    .collection-route:nth-child(2){background:rgba(226,244,249,.92);border-color:rgba(148,199,214,.42);}
    .collection-route:nth-child(3){background:rgba(250,235,218,.92);border-color:rgba(218,169,124,.40);}
    .collection-route:nth-child(4){background:rgba(235,232,248,.92);border-color:rgba(171,163,211,.40);}

    .collection-route:nth-child(1) .collection-item{background:rgba(246,251,238,.84);}
    .collection-route:nth-child(2) .collection-item{background:rgba(239,249,252,.84);}
    .collection-route:nth-child(3) .collection-item{background:rgba(253,244,234,.84);}
    .collection-route:nth-child(4) .collection-item{background:rgba(244,242,252,.84);}

    .collection-route:nth-child(1) .collection-item__image-wrap{background:#eef6df;}
    .collection-route:nth-child(2) .collection-item__image-wrap{background:#e4f4f8;}
    .collection-route:nth-child(3) .collection-item__image-wrap{background:#f8e9d8;}
    .collection-route:nth-child(4) .collection-item__image-wrap{background:#ece9f7;}

    .collection-item__image-wrap{box-shadow:inset 0 0 0 1px rgba(70,89,79,.06)!important;}
    .collection-item__image{mix-blend-mode:multiply;}
    .collection-item.is-rare{background:rgba(255,248,224,.90)!important;}

    /* Treasure preview also avoids a floating white square. */
    .reward-item-preview{background:#f3ead2!important;mix-blend-mode:multiply;box-shadow:none!important;}

    /* Room decorations: blend paper-white asset backgrounds into the cave scene. */
    .home-room-decor-slot--lamp img,
    .home-room-decor-slot--decor img,
    .home-room-decor-slot--floor img,
    .home-room-decor-slot--rug img{mix-blend-mode:multiply;}

    /* Wall memories are intentionally framed like photographs. */
    .home-room-decor-slot--wall{background:rgba(255,248,228,.92)!important;border-color:rgba(238,222,190,.95)!important;}
    .home-room-decor-slot--wall img{mix-blend-mode:normal;}

    /* Decor choice preview uses warm paper rather than pure white. */
    .decor-dialog__preview{background:#f4edda!important;}
    .decor-dialog__preview img{mix-blend-mode:multiply;}
  `;
  document.head.appendChild(style);
})();

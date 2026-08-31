"use strict";
(()=>{
  const api=window.TIRANON_COLLECTION_V2;
  if(!api)return;
  const item=(api.items||[]).find(x=>x.id==="night-baby-memory");
  if(!item)return;
  item.name="あかちゃんのおもいで";
  item.slot="wall";
  item.image="F9654502-543D-425D-B99D-905B707420CB.jpeg";
  api.render?.();
  queueMicrotask(()=>window.TIRANON_ROOM_DECOR_V2?.render?.());
})();

"use strict";

/*
 * Convert only edge-connected paper-white pixels to transparency at display time.
 * The original repository images are never modified. This is mainly for JPEG
 * collection/decor art that otherwise appears as a white square on iOS Safari.
 */
(()=>{
  const collectionItems=window.TIRANON_COLLECTION_V2?.items||[];
  if(!collectionItems.length)return;

  const itemById=new Map(collectionItems.map(item=>[item.id,item]));
  const itemByImage=new Map(collectionItems.map(item=>[item.image,item]));
  const cache=new Map();
  const MAX_SIDE=512;

  const style=document.createElement("style");
  style.textContent=`
    .paper-cutout-pending{opacity:0!important;}
    .paper-cutout-ready{opacity:1!important;mix-blend-mode:normal!important;background:transparent!important;}
  `;
  document.head.appendChild(style);

  function filename(value){
    if(!value||value.startsWith("data:"))return "";
    try{return new URL(value,location.href).pathname.split("/").pop()||"";}
    catch(error){return value.split("/").pop()||"";}
  }

  function itemForImage(img,source){
    const cell=img.closest?.(".collection-item");
    const byCell=cell?.dataset?.collectionId?itemById.get(cell.dataset.collectionId):null;
    if(byCell)return byCell;
    return itemByImage.get(filename(source))||null;
  }

  function shouldKeepPaper(img,source){
    if(img.closest?.(".home-room-decor-slot--wall"))return true;
    const item=itemForImage(img,source);
    return item?.slot==="wall";
  }

  function isTarget(img){
    if(!(img instanceof HTMLImageElement))return false;
    return Boolean(img.matches(
      ".collection-item__image,.reward-item-preview,.home-room-decor-slot img,.decor-dialog__preview img"
    ));
  }

  function isPaperWhite(r,g,b){
    const min=Math.min(r,g,b);
    const max=Math.max(r,g,b);
    return min>=220&&max-min<=46&&r>=g-8;
  }

  function makeTransparent(source){
    if(cache.has(source))return cache.get(source);

    const promise=new Promise(resolve=>{
      const image=new Image();
      image.onload=()=>{
        try{
          const scale=Math.min(1,MAX_SIDE/Math.max(image.naturalWidth||1,image.naturalHeight||1));
          const width=Math.max(1,Math.round(image.naturalWidth*scale));
          const height=Math.max(1,Math.round(image.naturalHeight*scale));
          const canvas=document.createElement("canvas");
          canvas.width=width;
          canvas.height=height;
          const context=canvas.getContext("2d",{willReadFrequently:true});
          context.drawImage(image,0,0,width,height);
          const frame=context.getImageData(0,0,width,height);
          const pixels=frame.data;
          const count=width*height;
          const visited=new Uint8Array(count);
          const queue=new Int32Array(count);
          let head=0;
          let tail=0;

          function eligible(index){
            const p=index*4;
            return isPaperWhite(pixels[p],pixels[p+1],pixels[p+2]);
          }
          function add(index){
            if(index<0||index>=count||visited[index]||!eligible(index))return;
            visited[index]=1;
            queue[tail++]=index;
          }

          for(let x=0;x<width;x++){
            add(x);
            add((height-1)*width+x);
          }
          for(let y=1;y<height-1;y++){
            add(y*width);
            add(y*width+width-1);
          }

          while(head<tail){
            const index=queue[head++];
            const x=index%width;
            const y=(index/width)|0;
            if(x>0)add(index-1);
            if(x+1<width)add(index+1);
            if(y>0)add(index-width);
            if(y+1<height)add(index+width);
          }

          for(let index=0;index<count;index++){
            if(visited[index])pixels[index*4+3]=0;
          }

          /* Feather very light pixels immediately touching the removed paper. */
          const feather=new Uint8Array(count);
          for(let index=0;index<count;index++){
            if(visited[index])continue;
            const x=index%width;
            const y=(index/width)|0;
            const touches=(x>0&&visited[index-1])||(x+1<width&&visited[index+1])||(y>0&&visited[index-width])||(y+1<height&&visited[index+width]);
            if(!touches)continue;
            const p=index*4;
            const min=Math.min(pixels[p],pixels[p+1],pixels[p+2]);
            const max=Math.max(pixels[p],pixels[p+1],pixels[p+2]);
            if(min>=195&&max-min<=60)feather[index]=1;
          }
          for(let index=0;index<count;index++){
            if(!feather[index])continue;
            const p=index*4;
            const brightness=(pixels[p]+pixels[p+1]+pixels[p+2])/3;
            const keep=Math.max(.12,Math.min(1,(235-brightness)/40));
            pixels[p+3]=Math.round(pixels[p+3]*keep);
          }

          context.putImageData(frame,0,0);
          resolve(canvas.toDataURL("image/png"));
        }catch(error){
          resolve(source);
        }
      };
      image.onerror=()=>resolve(source);
      image.src=source;
    });

    cache.set(source,promise);
    return promise;
  }

  async function processImage(img){
    if(!isTarget(img))return;
    const current=img.getAttribute("src")||"";
    if(!current)return;
    if(current.startsWith("data:")&&img.dataset.paperCutoutDone==="1")return;

    const source=current.startsWith("data:")?(img.dataset.paperCutoutOriginal||""):current;
    if(!source)return;
    img.dataset.paperCutoutOriginal=source;

    if(shouldKeepPaper(img,source)){
      img.classList.remove("paper-cutout-pending","paper-cutout-ready");
      img.dataset.paperCutoutDone="photo";
      return;
    }

    img.dataset.paperCutoutDone="0";
    img.classList.add("paper-cutout-pending");
    img.classList.remove("paper-cutout-ready");
    const transparent=await makeTransparent(source);

    /* A room slot may have changed to a different item while processing. */
    const latest=img.getAttribute("src")||"";
    if(!latest.startsWith("data:")&&latest!==source){
      img.classList.remove("paper-cutout-pending");
      processImage(img);
      return;
    }

    img.src=transparent;
    img.dataset.paperCutoutDone="1";
    img.classList.remove("paper-cutout-pending");
    img.classList.add("paper-cutout-ready");
  }

  function scan(root=document){
    if(root instanceof HTMLImageElement)processImage(root);
    root.querySelectorAll?.(".collection-item__image,.reward-item-preview,.home-room-decor-slot img,.decor-dialog__preview img").forEach(processImage);
  }

  scan();
  const observer=new MutationObserver(records=>{
    for(const record of records){
      if(record.type==="attributes"&&record.target instanceof HTMLImageElement){
        const img=record.target;
        const src=img.getAttribute("src")||"";
        if(src&&!src.startsWith("data:")){
          img.dataset.paperCutoutDone="0";
          img.dataset.paperCutoutOriginal=src;
          processImage(img);
        }
      }
      for(const node of record.addedNodes){
        if(node instanceof Element)scan(node);
      }
    }
  });
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["src"]});

  window.TIRANON_PAPER_CUTOUT={scan};
})();

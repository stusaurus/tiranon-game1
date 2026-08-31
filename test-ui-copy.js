"use strict";

/* Clearer labels for the unified test panel. Normal game URL: no-op. */
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get("run-test")!=="1")return;

  const actions=document.getElementById("game-test-actions");
  if(!actions)return;

  const buttons=[...actions.querySelectorAll("button")];
  const rename=new Map([
    ["📕 0 / 24","📕 全部未収集にする"],
    ["🌳 森 6/6","🌳 森だけ収集済みにする"],
    ["🌊 川 6/6","🌊 川だけ収集済みにする"],
    ["🌋 火山 6/6","🌋 火山だけ収集済みにする"],
    ["🌙 夜 6/6","🌙 夜だけ収集済みにする"],
    ["🏆 全部 24/24","🏆 全部収集済みにする"],
    ["↩ 実データへ戻す","↩ テスト表示をやめる"]
  ]);

  for(const button of buttons){
    const next=rename.get(button.textContent.trim());
    if(!next)continue;
    button.textContent=next;
    if(next.includes("全部収集済み")||next.includes("全部未収集")){
      button.style.gridColumn="1 / -1";
    }
  }

  const headings=[...actions.children].filter(node=>node.tagName==="DIV");
  const collectionHeading=headings.find(node=>node.textContent.trim()==="コレクション");
  if(collectionHeading){
    collectionHeading.textContent="📖 コレクション状態を変更";
    const hint=document.createElement("div");
    hint.textContent="↓ 押した状態に切り替わり、そのままコレクション画面が開きます";
    Object.assign(hint.style,{
      gridColumn:"1 / -1",
      margin:"0 0 3px",
      padding:"7px 8px",
      borderRadius:"9px",
      background:"rgba(185,232,213,.12)",
      color:"#dff8ed",
      fontSize:"11px",
      fontWeight:"750",
      lineHeight:"1.4"
    });
    collectionHeading.insertAdjacentElement("afterend",hint);
  }
})();

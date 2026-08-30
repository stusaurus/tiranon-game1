"use strict";

const RESULT_BEST_KEY="tiranon-adventure-best-score-v1";
const resultRankDisplay=document.getElementById("result-rank");
const rankMessageDisplay=document.getElementById("rank-message");
const bestScoreDisplay=document.getElementById("best-score");
const newBestDisplay=document.getElementById("new-best");
const originalEndGameForResults=endGame;

function readBestScore(){
  try{
    const value=Number(localStorage.getItem(RESULT_BEST_KEY));
    return Number.isFinite(value)&&value>=0?value:0;
  }catch(error){
    return 0;
  }
}

function saveBestScore(value){
  try{
    localStorage.setItem(RESULT_BEST_KEY,String(value));
  }catch(error){
    // Storage can be unavailable in some private browsing modes; the game still works.
  }
}

function rankForScore(value){
  if(value>=180)return {rank:"S",message:"すごい！ティラノンマスター！"};
  if(value>=120)return {rank:"A",message:"大活躍！もう一回でSランク！"};
  if(value>=60)return {rank:"B",message:"いい調子！コンボを狙おう！"};
  return {rank:"C",message:"ナイスチャレンジ！もう一度！"};
}

function restartRankAnimation(){
  if(!resultRankDisplay)return;
  resultRankDisplay.style.animation="none";
  void resultRankDisplay.offsetWidth;
  resultRankDisplay.style.animation="";
}

endGame=function(){
  const previousBest=readBestScore();
  const isNewBest=score>previousBest;
  const best=Math.max(previousBest,score);

  originalEndGameForResults();

  if(typeof cleanupFeverVisuals==="function")cleanupFeverVisuals();

  if(isNewBest)saveBestScore(best);

  const result=rankForScore(score);
  finalScoreDisplay.textContent=String(score);

  if(bestScoreDisplay)bestScoreDisplay.textContent=String(best);
  if(newBestDisplay)newBestDisplay.hidden=!isNewBest;

  if(resultRankDisplay){
    resultRankDisplay.textContent=result.rank;
    resultRankDisplay.dataset.rank=result.rank;
    resultRankDisplay.setAttribute("aria-label",`ランク${result.rank}`);
    restartRankAnimation();
  }

  if(rankMessageDisplay)rankMessageDisplay.textContent=result.message;
};

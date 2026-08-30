"use strict";

// ゲームで使うHTML要素
const game = document.getElementById("game");
const playArea = document.getElementById("play-area");
const player = document.getElementById("player");
const scoreDisplay = document.getElementById("score");
const timeDisplay = document.getElementById("time");
const gameOverScreen = document.getElementById("game-over");
const finalScoreDisplay = document.getElementById("final-score");
const restartButton = document.getElementById("restart-button");
const leftButton = document.getElementById("left-button");
const rightButton = document.getElementById("right-button");

// Ver.1のゲーム設定
const GAME_TIME = 30;
const PLAYER_SPEED = 320;
const STAR_SPEED = 165;
const STAR_INTERVAL = 700;

// プレイ中に変わる値
let score = 0;
let timeLeft = GAME_TIME;
let playerX = 0;
let movingLeft = false;
let movingRight = false;
let isPlaying = false;
let animationId = 0;
let timerId = 0;
let starTimerId = 0;
let previousTime = 0;

// プレイヤーの位置を画面中央に戻す
function resetPlayerPosition() {
  playerX = (playArea.clientWidth - player.offsetWidth) / 2;
  drawPlayer();
}

// プレイヤーの現在位置を画面に反映する
function drawPlayer() {
  player.style.left = `${playerX}px`;
  player.style.transform = "none";
}

// 画面の見える範囲内に新しい星を作る
function createStar() {
  if (!isPlaying) return;

  const star = document.createElement("div");
  star.className = "star";
  star.textContent = "★";
  star.setAttribute("aria-hidden", "true");

  const starWidth = 34;
  const maximumX = Math.max(0, playArea.clientWidth - starWidth);
  star.dataset.x = String(Math.random() * maximumX);
  star.dataset.y = "0";
  star.style.transform = `translate(${star.dataset.x}px, 0px)`;
  playArea.appendChild(star);
}

// 2つの四角形が実際に重なっているか調べる
function rectanglesOverlap(first, second) {
  return (
    first.left < second.right &&
    first.right > second.left &&
    first.top < second.bottom &&
    first.bottom > second.top
  );
}

// 星を取った場所の近くに「+1」を短時間表示する
function showPointPopup(star) {
  const popup = document.createElement("div");
  popup.className = "point-popup";
  popup.textContent = "+1";
  popup.style.left = `${Number(star.dataset.x)}px`;
  popup.style.top = `${Number(star.dataset.y)}px`;
  playArea.appendChild(popup);
  window.setTimeout(() => popup.remove(), 650);
}

// すべての星を落下させ、接触と画面外への落下を確認する
function updateStars(deltaTime) {
  const playerRect = player.getBoundingClientRect();
  const stars = playArea.querySelectorAll(".star");

  stars.forEach((star) => {
    const nextY = Number(star.dataset.y) + STAR_SPEED * deltaTime;
    star.dataset.y = String(nextY);
    star.style.transform = `translate(${star.dataset.x}px, ${nextY}px)`;

    const starRect = star.getBoundingClientRect();

    // 見えている星がプレイヤーに接触した場合だけ得点する
    if (rectanglesOverlap(playerRect, starRect)) {
      score += 1;
      scoreDisplay.textContent = `SCORE ${score}`;
      showPointPopup(star);
      star.remove();
      return;
    }

    // 地面より下（ゲーム画面の下端）に落ちた星を削除する
    if (starRect.top >= game.getBoundingClientRect().bottom) {
      star.remove();
    }
  });
}

// 毎フレーム、移動と星の落下を更新する
function gameLoop(currentTime) {
  if (!isPlaying) return;

  const deltaTime = Math.min((currentTime - previousTime) / 1000, 0.05);
  previousTime = currentTime;

  if (movingLeft) playerX -= PLAYER_SPEED * deltaTime;
  if (movingRight) playerX += PLAYER_SPEED * deltaTime;

  const maximumX = playArea.clientWidth - player.offsetWidth;
  playerX = Math.max(0, Math.min(playerX, maximumX));
  drawPlayer();
  updateStars(deltaTime);

  animationId = window.requestAnimationFrame(gameLoop);
}

// 30秒経過したら、すべてのゲーム処理を停止する
function endGame() {
  isPlaying = false;
  movingLeft = false;
  movingRight = false;
  window.cancelAnimationFrame(animationId);
  window.clearInterval(timerId);
  window.clearInterval(starTimerId);
  finalScoreDisplay.textContent = `最終スコア ${score}`;
  gameOverScreen.hidden = false;
}

// スコア、時間、星、位置を初期化してゲームを始める
function startGame() {
  window.cancelAnimationFrame(animationId);
  window.clearInterval(timerId);
  window.clearInterval(starTimerId);

  playArea.querySelectorAll(".star, .point-popup").forEach((item) => item.remove());
  score = 0;
  timeLeft = GAME_TIME;
  movingLeft = false;
  movingRight = false;
  scoreDisplay.textContent = "SCORE 0";
  timeDisplay.textContent = `TIME ${GAME_TIME}`;
  gameOverScreen.hidden = true;
  resetPlayerPosition();
  isPlaying = true;

  // 開始直後から星が見えるよう、最初の1個をすぐに作る
  createStar();
  starTimerId = window.setInterval(createStar, STAR_INTERVAL);

  // 表示時間を1秒ごとに減らす
  timerId = window.setInterval(() => {
    timeLeft -= 1;
    timeDisplay.textContent = `TIME ${timeLeft}`;
    if (timeLeft === 0) endGame();
  }, 1000);

  previousTime = performance.now();
  animationId = window.requestAnimationFrame(gameLoop);
}

// PCの左右キーとA・Dキーを押している間だけ移動する
window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(event.code)) {
    event.preventDefault();
  }
  if (event.code === "ArrowLeft" || event.code === "KeyA") movingLeft = true;
  if (event.code === "ArrowRight" || event.code === "KeyD") movingRight = true;
});

window.addEventListener("keyup", (event) => {
  if (event.code === "ArrowLeft" || event.code === "KeyA") movingLeft = false;
  if (event.code === "ArrowRight" || event.code === "KeyD") movingRight = false;
});

// 画面外へ切り替えたときに移動し続けないようにする
window.addEventListener("blur", () => {
  movingLeft = false;
  movingRight = false;
});

// スマホのボタンを押している間だけ移動する
function addHoldControls(button, direction) {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    if (direction === "left") movingLeft = true;
    if (direction === "right") movingRight = true;
  });

  const stopMoving = () => {
    if (direction === "left") movingLeft = false;
    if (direction === "right") movingRight = false;
  };

  button.addEventListener("pointerup", stopMoving);
  button.addEventListener("pointercancel", stopMoving);
  button.addEventListener("lostpointercapture", stopMoving);
}

addHoldControls(leftButton, "left");
addHoldControls(rightButton, "right");

// 画面幅が変わったらプレイヤーを見える範囲に収める
window.addEventListener("resize", () => {
  playerX = Math.max(0, Math.min(playerX, playArea.clientWidth - player.offsetWidth));
  drawPlayer();
});

restartButton.addEventListener("click", startGame);

// ページを開いたら最初のゲームを開始する
startGame();

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth * 0.8;
canvas.height = window.innerHeight * 0.8;

const ball = { x: canvas.width / 2, y: canvas.height - 50, radius: 15, dy: 0, gravity: 0.6, jump: -12 };
let tiles = [];
let score = 0;
let isPlaying = false;
const music = document.getElementById("music");

function createTile() {
  const width = 100;
  const x = Math.random() * (canvas.width - width);
  const y = tiles.length ? tiles[tiles.length - 1].y - 150 : canvas.height - 100;
  tiles.push({ x, y, width, height: 20 });
}

function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ball.dy += ball.gravity;
  ball.y += ball.dy;

  if (ball.y + ball.radius > canvas.height) {
    gameOver();
  }

  for (let tile of tiles) {
    ctx.fillStyle = "#00e5ff";
    ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
    tile.y += 3;

    if (
      ball.x > tile.x &&
      ball.x < tile.x + tile.width &&
      ball.y + ball.radius >= tile.y &&
      ball.y + ball.radius <= tile.y + 10 &&
      ball.dy > 0
    ) {
      ball.dy = ball.jump;
      score++;
    }
  }

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#ff9800";
  ctx.fill();
  ctx.closePath();

  tiles = tiles.filter(t => t.y < canvas.height);
  if (tiles[tiles.length - 1].y > 200) createTile();

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + score, 20, 30);

  if (isPlaying) requestAnimationFrame(update);
}

function startGame() {
  if (!isPlaying) {
    isPlaying = true;
    score = 0;
    ball.y = canvas.height - 100;
    ball.dy = 0;
    tiles = [];
    createTile();
    music.play();
    update();
  }
}

function gameOver() {
  isPlaying = false;
  alert("Game Over! Score: " + score);
  music.pause();
  music.currentTime = 0;
}

canvas.addEventListener("click", () => {
  ball.x += 50 - Math.random() * 100;
});

document.body.addEventListener("keydown", e => {
  if (e.code === "Space") startGame();
});

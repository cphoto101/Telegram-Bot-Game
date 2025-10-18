const addBtn = document.getElementById("addTextBtn");
const newText = document.getElementById("newText");
const textList = document.getElementById("textList");

// Load texts from localStorage
let texts = JSON.parse(localStorage.getItem("texts")) || [];

// Display texts
function renderTexts() {
  textList.innerHTML = "";
  texts.forEach((txt, i) => {
    const div = document.createElement("div");
    div.className = "text-item";
    div.textContent = txt;
    textList.appendChild(div);
  });
}

// Add new text
addBtn.addEventListener("click", () => {
  const content = newText.value.trim();
  if (content === "") return alert("စာရေးပါ!");
  texts.push(content);
  localStorage.setItem("texts", JSON.stringify(texts));
  newText.value = "";
  renderTexts();
});

// Initial render
renderTexts();      ball.y + ball.radius <= tile.y + 10 &&
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

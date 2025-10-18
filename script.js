let score = 0;
const btn = document.getElementById("clickBtn");
const scoreDisplay = document.getElementById("score");

btn.addEventListener("click", () => {
  score++;
  scoreDisplay.textContent = score;
});

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
renderTexts();

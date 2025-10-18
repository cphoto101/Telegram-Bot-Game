const tg = window.Telegram.WebApp;
tg.expand(); // fullscreen open in Telegram

const user = tg.initDataUnsafe?.user;
const username = user?.username || "Guest";

document.querySelector(".welcome").innerText = `👋 Welcome, ${username}`;
const textList = document.getElementById("textList");
const addBtn = document.getElementById("addBtn");
const newText = document.getElementById("newText");

const ADMIN = "admin"; // Change to your Telegram username

// Add new text
addBtn.addEventListener("click", () => {
  const text = newText.value.trim();
  if (!text) return tg.showAlert("စာရေးပါနော်!");

  const id = Date.now();
  db.ref("texts/" + id).set({
    username: username,
    content: text,
    timestamp: new Date().toISOString()
  });
  newText.value = "";
});

// Show all texts (real-time)
db.ref("texts").on("value", (snapshot) => {
  const data = snapshot.val();
  textList.innerHTML = "";
  if (!data) return;
  Object.entries(data).reverse().forEach(([id, obj]) => {
    const div = document.createElement("div");
    div.classList.add("text-item");
    if (username === ADMIN) div.classList.add("admin");

    div.innerHTML = `
      <p>${obj.content}</p>
      <div class="author">✍️ ${obj.username}</div>
      <button class="delete-btn" onclick="deleteText('${id}')">ဖျက်</button>
    `;
    textList.appendChild(div);
  });
});

// Delete text (admin only)
function deleteText(id) {
  if (username !== ADMIN) return tg.showAlert("Admin မဟုတ်ပါ!");
  db.ref("texts/" + id).remove();
}

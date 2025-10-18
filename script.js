const textList = document.getElementById("textList");
const addBtn = document.getElementById("addBtn");
const usernameInput = document.getElementById("username");
const newText = document.getElementById("newText");

// 🔐 Admin username
const ADMIN = "admin"; // ဒီနာမည်နဲ့ဝင်ရင်ပဲ ဖျက်ခလုတ်ပေါ်မယ်

// Add new text
addBtn.addEventListener("click", () => {
  const user = usernameInput.value.trim();
  const text = newText.value.trim();
  if (!user || !text) return alert("Username နဲ့ စာလိုအပ်ပါတယ်!");

  const id = Date.now();
  db.ref("texts/" + id).set({
    username: user,
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
    if (usernameInput.value === ADMIN) div.classList.add("admin");

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
  if (usernameInput.value !== ADMIN) return alert("Admin မဟုတ်ပါ!");
  db.ref("texts/" + id).remove();
}

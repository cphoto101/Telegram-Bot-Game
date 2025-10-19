// Tab Switching
const mainTab = document.getElementById("main");
const profileTab = document.getElementById("profile");
const tabMain = document.getElementById("tabMain");
const tabProfile = document.getElementById("tabProfile");

tabMain.addEventListener("click", () => {
  mainTab.classList.add("active");
  profileTab.classList.remove("active");
  tabMain.classList.add("active");
  tabProfile.classList.remove("active");
});

tabProfile.addEventListener("click", () => {
  mainTab.classList.remove("active");
  profileTab.classList.add("active");
  tabProfile.classList.add("active");
  tabMain.classList.remove("active");
});

// Music Data
const songs = [
  { title: "Dreams - Chill Mix", file: "music1.mp3" },
  { title: "Skyline - Ambient", file: "music2.mp3" },
  { title: "Night Drive - Synthwave", file: "music3.mp3" }
];

const musicList = document.getElementById("musicList");
songs.forEach(song => {
  const div = document.createElement("div");
  div.className = "song";
  div.innerHTML = `
    <span>${song.title}</span>
    <button onclick="playMusic('${song.file}')">▶️ Play</button>
  `;
  musicList.appendChild(div);
});

let audioPlayer = new Audio();
function playMusic(file) {
  audioPlayer.src = file;
  audioPlayer.play();
}

// ✅ Telegram + Browser Unified Login Logic
function getTelegramUser() {
  try {
    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe.user) {
      return Telegram.WebApp.initDataUnsafe.user;
    }
  } catch (e) {
    console.warn("Telegram WebApp not detected");
  }
  // fallback data (GitHub or normal browser)
  return {
    first_name: "Zaro QT",
    username: "@zaroqt",
    id: "123456789",
    photo_url: "https://cdn-icons-png.flaticon.com/512/147/147144.png"
  };
}

const user = getTelegramUser();

document.getElementById("profilePic").src = user.photo_url;
document.getElementById("name").innerText = "Name: " + (user.first_name || "Unknown");
document.getElementById("username").innerText = "Username: " + (user.username || "N/A");
document.getElementById("chatid").innerText = "Chat ID: " + (user.id || "N/A");

// If Telegram WebApp detected, set theme
if (window.Telegram && Telegram.WebApp) {
  Telegram.WebApp.expand();
  document.body.style.backgroundColor = Telegram.WebApp.themeParams.bg_color || "#121212";
}

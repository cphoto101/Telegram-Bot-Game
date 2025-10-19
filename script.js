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

// Mock Music Data
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

// Mock Telegram Info (replace with real Telegram WebApp data)
const user = {
  name: "Zaro QT",
  username: "@zaroqt",
  chatId: "123456789",
  photo: "https://cdn-icons-png.flaticon.com/512/147/147144.png"
};

document.getElementById("profilePic").src = user.photo;
document.getElementById("name").innerText = "Name: " + user.name;
document.getElementById("username").innerText = "Username: " + user.username;
document.getElementById("chatid").innerText = "Chat ID: " + user.chatId;

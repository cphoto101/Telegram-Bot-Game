// Tabs
const mainTab = document.getElementById("mainTab");
const profileTab = document.getElementById("profileTab");
const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");

homeBtn.onclick = () => {
  mainTab.classList.add("active");
  profileTab.classList.remove("active");
  homeBtn.classList.add("active");
  profileBtn.classList.remove("active");
};

profileBtn.onclick = () => {
  profileTab.classList.add("active");
  mainTab.classList.remove("active");
  profileBtn.classList.add("active");
  homeBtn.classList.remove("active");
};

// Telegram Info
const tg = window.Telegram?.WebApp;
if (tg?.initDataUnsafe?.user) {
  const user = tg.initDataUnsafe.user;
  document.getElementById("profileName").innerText = user.first_name + " " + (user.last_name || "");
  document.getElementById("profileUsername").innerText = "@" + (user.username || "unknown");
  document.getElementById("profilePhoto").src = user.photo_url || "https://via.placeholder.com/100";
  document.getElementById("profileChatID").innerText = user.id;
} else {
  // fallback for browser testing
  document.getElementById("profileName").innerText = "Test User";
  document.getElementById("profileUsername").innerText = "@testuser";
  document.getElementById("profilePhoto").src = "https://via.placeholder.com/100";
  document.getElementById("profileChatID").innerText = "123456";
}

// Music Modal
const modal = document.getElementById("musicModal");
const musicBtn = document.getElementById("musicBtn");
const closeModal = document.getElementById("closeModal");
const musicPlayer = document.getElementById("musicPlayer");

musicBtn.onclick = () => (modal.style.display = "flex");
closeModal.onclick = () => (modal.style.display = "none");

// Default music
document.getElementById("defaultMusic").onclick = () => {
  musicPlayer.src = "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Scott_Holmes_Music/Happy_Music/Scott_Holmes_Music_-_Upbeat_Party.mp3";
  musicPlayer.play();
  modal.style.display = "none";
};

// Custom URL
document.getElementById("urlMusic").onclick = () => {
  const url = prompt("Enter your music file URL:");
  if (url) {
    musicPlayer.src = url;
    musicPlayer.play();
  }
  modal.style.display = "none";
};

// Upload file
document.getElementById("uploadMusic").onclick = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "audio/*";
  input.onchange = e => {
    const file = e.target.files[0];
    if (file) {
      const src = URL.createObjectURL(file);
      musicPlayer.src = src;
      musicPlayer.play();
    }
  };
  input.click();
  modal.style.display = "none";
};

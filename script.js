const db = firebase.database();

const loginPage = document.getElementById('loginPage');
const profilePage = document.getElementById('profilePage');
const tgLoginBtn = document.getElementById('tgLoginBtn');

const profileName = document.getElementById('profileName');
const profileUsername = document.getElementById('profileUsername');
const profileChatID = document.getElementById('profileChatID');
const profilePhoto = document.getElementById('profilePhoto');

tgLoginBtn.addEventListener('click', () => {
  const tg = window.Telegram.WebApp;
  tg.expand();

  const user = tg.initDataUnsafe?.user;
  if (!user) return alert("Telegram login failed!");

  // Extract info
  const chatId = user.id;
  const username = user.username || "";
  const firstName = user.first_name || "";
  const lastName = user.last_name || "";
  const photo = user.photo_url || "";

  // Save to Firebase
  db.ref('users/' + chatId).set({
    chat_id: chatId,
    username,
    first_name: firstName,
    last_name: lastName,
    photo_url: photo,
    timestamp: new Date().toISOString()
  });

  // Show profile page
  profileName.innerText = firstName + " " + lastName;
  profileUsername.innerText = username;
  profileChatID.innerText = chatId;
  if(photo) profilePhoto.src = photo;

  loginPage.classList.add('hidden');
  profilePage.classList.remove('hidden');
});

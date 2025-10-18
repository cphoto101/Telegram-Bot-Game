const db = firebase.database();

const profilePage = document.getElementById('profilePage');

const profileName = document.getElementById('profileName');
const profileUsername = document.getElementById('profileUsername');
const profileChatID = document.getElementById('profileChatID');
const profilePhoto = document.getElementById('profilePhoto');

const newText = document.getElementById('newText');
const addBtn = document.getElementById('addBtn');
const textList = document.getElementById('textList');

let chatId, username;

// Auto login with Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

const user = tg.initDataUnsafe?.user || {
  id: 123456,               // Browser testing fallback
  username: "testuser",
  first_name: "Test",
  last_name: "User",
  photo_url: "https://via.placeholder.com/100"
};

chatId = user.id;
username = user.username || "";
const firstName = user.first_name || "";
const lastName = user.last_name || "";
const photo = user.photo_url || "";

// Save profile
db.ref('users/' + chatId).set({
  chat_id: chatId,
  username,
  first_name: firstName,
  last_name: lastName,
  photo_url: photo,
  timestamp: new Date().toISOString()
});

// Display profile
profileName.innerText = firstName + " " + lastName;
profileUsername.innerText = username;
profileChatID.innerText = chatId;
if(photo) profilePhoto.src = photo;

// Load posts
loadPosts();

// Add post
addBtn.addEventListener('click', ()=>{
  const text = newText.value.trim();
  if(!text) return;
  const postRef = db.ref('posts').push();
  postRef.set({
    user: username,
    chat_id: chatId,
    text,
    time: new Date().toLocaleString()
  });
  newText.value = "";
});

function loadPosts(){
  db.ref('posts').on('value', (snapshot)=>{
    textList.innerHTML = "";
    const data = snapshot.val();
    if(!data) return;
    for(let id in data){
      const p = data[id];
      const div = document.createElement('div');
      div.className = "text-item";
      div.innerHTML = `<p>${p.text}</p><p class="author">✍ ${p.user} | ${p.time}</p>`;
      textList.appendChild(div);
    }
  });
}

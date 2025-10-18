const db = firebase.database();
let username = "";
const loginBtn = document.getElementById('loginBtn');
const addBtn = document.getElementById('addBtn');
const logoutBtn = document.getElementById('logoutBtn');

loginBtn.addEventListener('click', ()=>{
  username = document.getElementById('loginName').value.trim();
  if(!username) return alert("အမည်ထည့်ပါ!");
  db.ref('logs/logins').push().set({username,time:new Date().toLocaleString()});
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('appPage').classList.remove('hidden');
  document.querySelector('.welcome').innerText = `👋 Hi ${username}`;
  loadPosts();
});

addBtn.addEventListener('click', ()=>{
  const text = document.getElementById('newText').value.trim();
  if(!text) return;
  db.ref('posts').push().set({user:username,text,time:new Date().toLocaleString()});
  document.getElementById('newText').value="";
});

logoutBtn.addEventListener('click',()=>{
  username="";
  document.getElementById('appPage').classList.add('hidden');
  document.getElementById('loginPage').classList.remove('hidden');
});

function loadPosts(){
  db.ref('posts').on('value',(snapshot)=>{
    const list=document.getElementById('textList');
    list.innerHTML="";
    const data=snapshot.val();
    for(let id in data){
      const p=data[id];
      const div=document.createElement('div');
      div.className="text-item";
      div.innerHTML=`<p>${p.text}</p><p class="author">✍ ${p.user} | ${p.time}</p>`;
      list.appendChild(div);
    }
  });
}

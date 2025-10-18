import TelegramBot from 'node-telegram-bot-api';
import admin from 'firebase-admin';
const TOKEN='8193181296:AAHopgtWFIhRFSJ6_D3QQBMpNjbQn_UT2Fc';
const ADMIN_CHAT_ID=1924452453;
const bot=new TelegramBot(TOKEN,{polling:true});
const serviceAccount=require('./serviceAccountKey.json');

admin.initializeApp({credential:admin.credential.cert(serviceAccount), databaseURL:"https://zaroqt101-default-rtdb.firebaseio.com"});
const db=admin.database();

db.ref('logs/logins').on('child_added',(snap)=>{
  const login=snap.val();
  bot.sendMessage(ADMIN_CHAT_ID,`👤 New Login: ${login.username}`);
});

db.ref('posts').on('child_added',(snap)=>{
  const post=snap.val();
  bot.sendMessage(ADMIN_CHAT_ID,`📝 New Post by ${post.user}: ${post.text}`);
});

bot.onText(/\/delete (\S+)/,(msg,match)=>{
  const chatId=msg.chat.id;
  const postId=match[1];
  if(chatId!==ADMIN_CHAT_ID)return bot.sendMessage(chatId,"❌ You are not admin!");
  db.ref('posts/'+postId).remove().then(()=>bot.sendMessage(chatId,`✅ Deleted post: ${postId}`));
});

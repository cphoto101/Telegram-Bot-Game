import TelegramBot from 'node-telegram-bot-api';
import admin from 'firebase-admin';

// Telegram Bot Token
const TOKEN = '8193181296:AAHopgtWFIhRFSJ6_D3QQBMpNjbQn_UT2Fc';
const bot = new TelegramBot(TOKEN, { polling: true });

// Admin Chat ID (သာ post delete လုပ်နိုင်)
const ADMIN_CHAT_ID = 1924452453;

// Firebase Admin SDK (Server Side)
const serviceAccount = require('./serviceAccountKey.json'); // Firebase private key

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://zaroqt101-default-rtdb.firebaseio.com"
});

const db = admin.database();

// 🔔 Monitor logins
db.ref('logs/logins').on('child_added', (snapshot) => {
  const login = snapshot.val();
  bot.sendMessage(ADMIN_CHAT_ID, `👤 New Login: ${login.username}`);
});

// 🔔 Monitor posts
db.ref('posts').on('child_added', (snapshot) => {
  const post = snapshot.val();
  bot.sendMessage(ADMIN_CHAT_ID, `📝 New Post by ${post.user}: ${post.text}`);
});

// 🗑️ Delete post (admin only)
bot.onText(/\/delete (\S+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const postId = match[1];

  if (chatId !== ADMIN_CHAT_ID) return bot.sendMessage(chatId, "❌ You are not admin!");

  db.ref('posts/' + postId).remove()
    .then(() => bot.sendMessage(chatId, `✅ Deleted post: ${postId}`))
    .catch(err => bot.sendMessage(chatId, `❌ Error: ${err}`));
});

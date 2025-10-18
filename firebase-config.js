// သင်ရဲ့ Firebase Console မှာပြထားတဲ့ config ကိုထည့်ပါ
const firebaseConfig = {
  apiKey: "AIzaSyDpuDVZXdT6CZ6MlgRAd8bbVYtuIVevzlI",
  authDomain: "zaroqt101.firebaseapp.com",
  databaseURL: "https://zaroqt101-default-rtdb.firebaseio.com",
  projectId: "zaroqt101",
  storageBucket: "zaroqt101.firebasestorage.app",
  messagingSenderId: "141083314351",
  appId: "1:141083314351:web:e7f7ce068c0c2c34a7ec5a"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

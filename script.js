document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------
    // 1. Telegram Mini App (TMA) Integration Logic
    // ---------------------------------------------

    // Telegram WebApp Object ကို ရယူခြင်း
    if (typeof window.Telegram.WebApp !== 'undefined') {
        const tg = window.Telegram.WebApp;

        // WebApp ကို စတင်ခြင်း
        tg.ready();

        // ဝင်လာသူ၏ အချက်အလက်များကို ရယူခြင်း
        const user = tg.initDataUnsafe.user;
        const mainButton = document.getElementById('tma-close-btn');

        if (user) {
            const firstName = user.first_name || '';
            const lastName = user.last_name || '';
            const username = user.username ? `@${user.username}` : 'N/A';
            
            // Profile Screen ထဲမှာ Telegram အချက်အလက် ဖြည့်သွင်းခြင်း
            document.getElementById('telegram-name').textContent = `${firstName} ${lastName}`;
            document.getElementById('telegram-username').textContent = username;
            
            // NOTE: Telegram Web App API မှ Profile Photo တိုက်ရိုက်မရနိုင်ပါ။
            // User photo ကိုရယူရန် Bot API သို့မဟုတ် TMA ၏ getProfilePhotos ကို သုံးရန် လိုအပ်သည်။ 
            // ဤနေရာတွင်တော့ ပုံသေထားလိုက်ပါမည်။
            
            // Logout ခလုတ်ကို TMA App ပိတ်ရန် ပြောင်းလဲခြင်း
            mainButton.addEventListener('click', () => {
                tg.close(); // Telegram Mini App ကို ပိတ်သည်
            });
            mainButton.textContent = 'Close Mini App';
        } else {
            document.getElementById('telegram-name').textContent = 'Guest User (No Telegram Data)';
            document.getElementById('telegram-username').textContent = 'N/A';
        }

        // UI Customization: TMA အရောင်များနှင့် လိုက်ဖက်အောင် ပြောင်းလဲနိုင်သည်။
        tg.setHeaderColor('secondary_bg_color');
        tg.setBackgroundColor('bg_color');
        
    } else {
        // Telegram App ထဲမှ မဟုတ်လျှင်
        console.warn("Not running inside Telegram Mini App.");
        document.getElementById('telegram-name').textContent = 'External Access (Hardcoded)';
        document.getElementById('telegram-username').textContent = '@user_mini_myid';
        
        // Logout ခလုတ်ကို Web Link အဖြစ် ဆက်လက်ထားရှိခြင်း
        document.getElementById('tma-close-btn').addEventListener('click', () => {
             alert('Closing app simulation...');
        });
    }

    // ---------------------------------------------
    // 2. Music Player & UI Logic (from script.js)
    // ---------------------------------------------
    // NOTE: ဤနေရာတွင် ယခင် script.js မှ Logic အားလုံးကို ထည့်သွင်းရပါမည်။ 
    // Example: 
    // const musicButton = document.getElementById('music-button');
    // musicButton.addEventListener('click', () => { ... });
    // ...
});

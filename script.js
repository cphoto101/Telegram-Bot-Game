document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    const screens = document.querySelectorAll('.content .screen');
    const musicButton = document.getElementById('music-button');
    const musicModal = document.getElementById('music-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const musicOptions = document.querySelectorAll('.music-option');
    const urlInputModal = document.getElementById('url-input-modal');
    const playUrlBtn = document.getElementById('play-url-btn');
    const musicUrlInput = document.getElementById('music-url-input');
    const currentMusicStatus = document.getElementById('current-music-status');
    const audioPlayer = document.getElementById('audio-player');
    const telegramUsernameCard = document.getElementById('telegram-username-card');
    const volumeToggle = document.getElementById('volume-toggle'); // Music Mute/Unmute Button

    let isMusicOn = true; // Music ဖွင့်ထားခြင်း ရှိ/မရှိ စစ်ဆေးရန်

    // ---------------------------------------------
    // 1. Telegram Mini App (TMA) Integration Logic
    // ---------------------------------------------
    if (typeof window.Telegram.WebApp !== 'undefined') {
        const tg = window.Telegram.WebApp;
        tg.ready();
        const user = tg.initDataUnsafe.user;

        if (user) {
            const firstName = user.first_name || '';
            const lastName = user.last_name || '';
            const username = user.username ? `@${user.username}` : 'N/A';
            const userId = user.id || 'N/A'; // Chat ID / User ID

            // Profile Screen ထဲမှာ Telegram အချက်အလက် ဖြည့်သွင်းခြင်း
            document.getElementById('telegram-name').textContent = `${firstName} ${lastName}`;
            document.getElementById('telegram-username').textContent = username;
            document.getElementById('telegram-chat-id').textContent = userId.toString();
            
            // NOTE: Profile Photo API မှ တိုက်ရိုက်မရသော်လည်း TMA ၏ Default PFP URL ကို အသုံးပြုနိုင်သည်
            // ဤဥပမာတွင်တော့ Placeholder ကိုပဲ သုံးလိုက်ပါမည်။
            
            // Close App Button Logic
            document.getElementById('tma-close-btn').addEventListener('click', () => {
                tg.close();
            });
            
        } else {
            document.getElementById('telegram-name').textContent = 'Guest User';
            document.getElementById('telegram-username').textContent = 'N/A';
            document.getElementById('telegram-chat-id').textContent = 'N/A';
            document.getElementById('tma-close-btn').addEventListener('click', () => alert('Closing App...'));
        }
    } else {
        // External Access
        document.getElementById('telegram-name').textContent = 'Hardcoded Name';
        document.getElementById('telegram-username').textContent = '@hardcoded_user';
        document.getElementById('telegram-chat-id').textContent = '123456789';
        document.getElementById('tma-close-btn').addEventListener('click', () => alert('Closing App...'));
    }

    // ---------------------------------------------
    // 2. UI Navigation Logic
    // ---------------------------------------------
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetScreenId = item.getAttribute('data-screen');

            document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));

            document.getElementById(targetScreenId).classList.add('active');
            item.classList.add('active');
        });
    });

    // ---------------------------------------------
    // 3. Music Player & Modal Logic
    // ---------------------------------------------

    // Music Mute/Unmute Logic
    volumeToggle.addEventListener('click', () => {
        if (isMusicOn) {
            audioPlayer.pause();
            volumeToggle.classList.replace('fa-volume-up', 'fa-volume-off');
            currentMusicStatus.textContent = currentMusicStatus.textContent.replace('(ON)', '(OFF)');
            isMusicOn = false;
        } else {
            audioPlayer.play();
            volumeToggle.classList.replace('fa-volume-off', 'fa-volume-up');
            currentMusicStatus.textContent = currentMusicStatus.textContent.replace('(OFF)', '(ON)');
            isMusicOn = true;
        }
    });

    // Music Modal Display
    musicButton.addEventListener('click', () => {
        musicModal.style.display = 'block';
    });

    closeModalBtn.addEventListener('click', () => {
        musicModal.style.display = 'none';
        urlInputModal.style.display = 'none';
    });

    // Music Options Logic
    musicOptions.forEach(option => {
        option.addEventListener('click', () => {
            const type = option.getAttribute('data-music-type');
            musicModal.style.display = 'none';

            // Music ကို Default အနေဖြင့် ဖွင့်ပြီးသား ဖြစ်စေရန်
            isMusicOn = true; 
            volumeToggle.classList.replace('fa-volume-off', 'fa-volume-up');

            switch (type) {
                case 'default':
                    audioPlayer.pause();
                    audioPlayer.removeAttribute('src'); 
                    currentMusicStatus.textContent = 'Default Music (ON)';
                    // Default music ကို ဒီနေရာမှာ ဖွင့်ဖို့ (e.g. audioPlayer.src = 'assets/default.mp3'; audioPlayer.play();)
                    break;
                case 'url':
                    urlInputModal.style.display = 'block';
                    break;
                case 'upload':
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = 'audio/*';
                    
                    fileInput.onchange = (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            const fileURL = URL.createObjectURL(file);
                            audioPlayer.src = fileURL;
                            audioPlayer.play();
                            currentMusicStatus.textContent = `Local File: ${file.name} (ON)`;
                        }
                    };
                    fileInput.click();
                    break;
            }
        });
    });

    // URL Input Modal Play Button Logic
    playUrlBtn.addEventListener('click', () => {
        const url = musicUrlInput.value.trim();
        if (url) {
            audioPlayer.src = url;
            audioPlayer.play()
                .then(() => {
                    currentMusicStatus.textContent = 'Custom URL Music (ON)';
                    urlInputModal.style.display = 'none';
                })
                .catch(error => {
                    alert('Error playing music from URL. Please ensure the URL is a direct link to a file.');
                });
        }
    });

    // Telegram Profile Link Logic (Username ကို နှိပ်လျှင် Chat ဖွင့်ရန်)
    telegramUsernameCard.addEventListener('click', () => {
        const username = document.getElementById('telegram-username').textContent.replace('@', '');
        if (username && username !== 'Loading...') {
            window.open(`https://t.me/${username}`, '_blank');
        } else {
            alert('Telegram Username is not available.');
        }
    });
});

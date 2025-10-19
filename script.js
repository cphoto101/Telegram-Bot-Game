document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    const screens = document.querySelectorAll('.screen');
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
    const telegramUsername = document.getElementById('telegram-username').textContent.replace('@', '');

    // 1. Bottom Navigation Logic
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetScreenId = item.getAttribute('data-screen');

            // Deactivate all screens and nav items
            screens.forEach(screen => screen.classList.remove('active'));
            navItems.forEach(nav => nav.classList.remove('active'));

            // Activate the target screen and nav item
            document.getElementById(targetScreenId).classList.add('active');
            item.classList.add('active');
        });
    });

    // 2. Music Player Modal Logic
    musicButton.addEventListener('click', () => {
        musicModal.style.display = 'block';
    });

    closeModalBtn.addEventListener('click', () => {
        musicModal.style.display = 'none';
        urlInputModal.style.display = 'none'; // URL modal ပါ ပိတ်ရန်
    });

    window.addEventListener('click', (event) => {
        // Modal အပြင်ဘက်ကို နှိပ်ရင် ပိတ်ရန်
        if (event.target === musicModal) {
            musicModal.style.display = 'none';
        }
    });

    // 3. Music Options Logic
    musicOptions.forEach(option => {
        option.addEventListener('click', () => {
            const type = option.getAttribute('data-music-type');

            switch (type) {
                case 'default':
                    musicModal.style.display = 'none';
                    audioPlayer.pause();
                    audioPlayer.removeAttribute('src');
                    currentMusicStatus.textContent = 'Default Music';
                    // NOTE: Default Music ကို တကယ်ဖွင့်ချင်ရင် audioPlayer.src ကို local asset နဲ့ ချိတ်ရပါမယ်။
                    // For example: audioPlayer.src = 'assets/default.mp3'; audioPlayer.play();
                    break;
                case 'url':
                    musicModal.style.display = 'none';
                    urlInputModal.style.display = 'block';
                    break;
                case 'upload':
                    musicModal.style.display = 'none';
                    // ဖိုင်ရွေးချယ်ရန် input ကို ဖန်တီးပြီး နှိပ်ရန် (JS ဖြင့် file picker ကို ဖွင့်ခြင်း)
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = 'audio/*';
                    fileInput.id = 'file-upload-input';
                    
                    fileInput.onchange = (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            const fileURL = URL.createObjectURL(file);
                            audioPlayer.src = fileURL;
                            audioPlayer.play();
                            currentMusicStatus.textContent = `Local File: ${file.name}`;
                        }
                    };
                    fileInput.click();
                    break;
            }
        });
    });

    // URL Input Modal Play Button
    playUrlBtn.addEventListener('click', () => {
        const url = musicUrlInput.value.trim();
        if (url) {
            audioPlayer.src = url;
            audioPlayer.play()
                .then(() => {
                    currentMusicStatus.textContent = 'Custom URL Music';
                    urlInputModal.style.display = 'none';
                })
                .catch(error => {
                    alert('Error playing music from URL. Check if the URL is valid and directly links to an audio file.');
                    console.error('Audio play error:', error);
                });
        }
    });

    // 4. Telegram Profile Link Logic
    telegramUsernameCard.addEventListener('click', () => {
        if (telegramUsername) {
            // Telegram app သို့မဟုတ် web သို့ ဖွင့်ရန်
            window.open(`https://t.me/${telegramUsername}`, '_system');
        } else {
            alert('Telegram Username not found.');
        }
    });
});
                         

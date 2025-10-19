// Helper function for random color generation based on user ID
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
}


document.addEventListener('DOMContentLoaded', () => {
    // UI Elements များကို ရယူခြင်း
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
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
    const volumeToggle = document.getElementById('volume-toggle');
    const profileImg = document.getElementById('profile-img');

    let isMusicOn = false; // စစချင်းတွင် Autoplay ကြောင့် ဖွင့်မည်

    // Default Music Link (SoundHelix ဖြင့် ပြောင်းလဲထားသည်)
    const DEFAULT_MUSIC_SRC = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'; 

    // ---------------------------------------------
    // 1. TMA Integration & Profile Data Filling Logic
    // ---------------------------------------------
    let currentUserId = 'N/A';
    
    if (typeof window.Telegram.WebApp !== 'undefined') {
        const tg = window.Telegram.WebApp;
        tg.ready();
        const user = tg.initDataUnsafe.user;

        if (user) {
            const firstName = user.first_name || '';
            const lastName = user.last_name || '';
            const username = user.username ? `@${user.username}` : 'N/A (No Username)';
            const userId = user.id || 'N/A';
            const fullName = `${firstName} ${lastName}`.trim();
            currentUserId = userId.toString();

            // Profile Screen ထဲမှာ Telegram အချက်အလက် ဖြည့်သွင်းခြင်း
            document.getElementById('telegram-name').textContent = fullName || 'No Name Provided';
            document.getElementById('telegram-username').textContent = username;
            document.getElementById('telegram-chat-id').textContent = currentUserId;
            
            // Profile Picture Placeholder (User ID ကိုသုံး၍ Dynamic Color ပေးခြင်း)
            if (currentUserId !== 'N/A') {
                const userColor = stringToColor(currentUserId);
                // Placeholder တွင် စာသားနှင့် နောက်ခံအရောင်ကို User ID ပေါ်မူတည်၍ ပြောင်းလဲသည်
                profileImg.src = `https://via.placeholder.com/120/${userColor.substring(1)}/FFFFFF?text=${fullName.charAt(0) || 'U'}`;
            }

            // Close App Button Logic
            document.getElementById('tma-close-btn').addEventListener('click', () => {
                tg.close();
            });
            
        } else {
            // TMA ထဲတွင် User Data မရပါက
            document.getElementById('telegram-name').textContent = 'Guest User (No Data)';
            document.getElementById('telegram-username').textContent = 'N/A';
            document.getElementById('telegram-chat-id').textContent = 'N/A';
        }
    } else {
        // External Access
        document.getElementById('telegram-name').textContent = 'Sample Name';
        document.getElementById('telegram-username').textContent = '@sample_user';
        document.getElementById('telegram-chat-id').textContent = '123456789';
        // Placeholder အတွက် Sample ID
        profileImg.src = `https://via.placeholder.com/120/4682B4/FFFFFF?text=S`; 
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
    // 3. Music Auto Play & Toggle Logic (FIXED)
    // ---------------------------------------------
    
    // Music Auto Play Logic
    function initializeAudio() {
        audioPlayer.src = DEFAULT_MUSIC_SRC;
        audioPlayer.volume = 0.5;
        
        // Autoplay ကို ချက်ချင်းစတင်ရန် ကြိုးစားသည်
        audioPlayer.play()
            .then(() => {
                isMusicOn = true;
                volumeToggle.classList.replace('fa-volume-off', 'fa-volume-up');
                currentMusicStatus.textContent = 'Default Music (ON)';
            })
            .catch(e => {
                // Autoplay အဆင်မပြေပါက Silent Mode တွင် စောင့်နေမည်
                isMusicOn = false;
                volumeToggle.classList.replace('fa-volume-up', 'fa-volume-off');
                currentMusicStatus.textContent = 'Default Music (OFF)';
                console.log("Autoplay failed. User interaction required.");
            });
    }

    // App စတင်သည်နှင့် Audio ကို ဖွင့်ပါ
    initializeAudio();


    // Music Mute/Unmute Logic
    volumeToggle.addEventListener('click', () => {
        if (isMusicOn) {
            audioPlayer.pause();
            volumeToggle.classList.replace('fa-volume-up', 'fa-volume-off');
            currentMusicStatus.textContent = currentMusicStatus.textContent.replace('(ON)', '(OFF)');
            isMusicOn = false;
        } else {
            audioPlayer.play().catch(e => {
                console.error("Error playing audio:", e);
                alert("Music playback failed. Please try Custom URL.");
            });
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

            // Music ကို ပြန်ဖွင့်ပြီး ON အခြေအနေသို့ ပြန်ထားပါ
            isMusicOn = true; 
            volumeToggle.classList.replace('fa-volume-off', 'fa-volume-up');

            switch (type) {
                case 'default':
                    audioPlayer.src = DEFAULT_MUSIC_SRC; 
                    audioPlayer.play();
                    currentMusicStatus.textContent = 'Default Music (ON)';
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

    // Telegram Profile Link Logic
    telegramUsernameCard.addEventListener('click', () => {
        const usernameText = document.getElementById('telegram-username').textContent;
        const username = usernameText.replace('@', '').trim();
        if (username && username !== 'N/A (No Username)') {
            window.open(`https://t.me/${username}`, '_blank');
        } else {
            alert('Telegram Username is not available.');
        }
    });
});

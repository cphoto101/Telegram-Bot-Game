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

// Helper function to create a new post element
function createPostElement(author, content, time) {
    const postCard = document.createElement('div');
    postCard.className = 'post-card';
    postCard.innerHTML = `
        <div class="post-header">
            <span class="post-author"><i class="fas fa-user-circle"></i> ${author}</span>
            <span class="post-time">${time}</span>
        </div>
        <p class="post-content">${content}</p>
        <div class="post-actions">
            <button><i class="fas fa-thumbs-up"></i> Like (0)</button>
            <button><i class="fas fa-comment"></i> Comment</button>
        </div>
    `;
    return postCard;
}

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements များကို ရယူခြင်း
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    const musicButton = document.getElementById('music-button');
    const musicModal = document.getElementById('music-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const urlInputModal = document.getElementById('url-input-modal');
    const playUrlBtn = document.getElementById('play-url-btn');
    const musicUrlInput = document.getElementById('music-url-input');
    const currentMusicStatus = document.getElementById('current-music-status');
    const audioPlayer = document.getElementById('audio-player');
    const volumeToggle = document.getElementById('volume-toggle');
    const profileImg = document.getElementById('profile-img');

    // Home Feed Elements
    const submitPostBtn = document.getElementById('submit-post-btn');
    const postInput = document.getElementById('post-input');
    const postsContainer = document.getElementById('posts-container');
    const telegramUsernameCardProfile = document.getElementById('telegram-username-card-profile');


    let isMusicOn = false;
    const DEFAULT_MUSIC_SRC = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'; 

    let currentUserName = 'Guest';

    // ---------------------------------------------
    // 1. TMA Integration & Profile Data Filling Logic
    // ---------------------------------------------
    if (typeof window.Telegram.WebApp !== 'undefined') {
        const tg = window.Telegram.WebApp;
        tg.ready();
        const user = tg.initDataUnsafe.user;

        if (user) {
            const firstName = user.first_name || '';
            const lastName = user.last_name || '';
            const username = user.username ? `@${user.username}` : 'N/A';
            const userId = user.id || 'N/A';
            const fullName = `${firstName} ${lastName}`.trim();
            
            currentUserName = fullName || 'User'; // Global variable for posting

            // Profile Data Filling
            document.getElementById('profile-display-name').textContent = fullName || 'No Name Provided';
            document.getElementById('profile-display-username').textContent = username;
            document.getElementById('telegram-chat-id').textContent = userId.toString();
            
            // Profile Picture Placeholder
            if (userId !== 'N/A') {
                const userColor = stringToColor(userId.toString());
                profileImg.src = `https://via.placeholder.com/120/${userColor.substring(1)}/FFFFFF?text=${(fullName.charAt(0) || 'U').toUpperCase()}`;
            }

            // Close App Button Logic
            document.getElementById('tma-close-btn').addEventListener('click', () => {
                tg.close();
            });
            
        } else {
            // TMA ထဲတွင် User Data မရပါက
            document.getElementById('profile-display-name').textContent = 'Guest User';
            document.getElementById('profile-display-username').textContent = 'N/A';
            document.getElementById('telegram-chat-id').textContent = 'N/A';
        }
    } else {
        // External Access
        document.getElementById('profile-display-name').textContent = 'Sample User';
        document.getElementById('profile-display-username').textContent = '@sample_user';
        document.getElementById('telegram-chat-id').textContent = '123456789 (Sample)';
        profileImg.src = `https://via.placeholder.com/120/4682B4/FFFFFF?text=S`;
    }

    // ---------------------------------------------
    // 2. Music Auto Play & Toggle Logic
    // ---------------------------------------------
    
    // Music Auto Play Logic
    function initializeAudio() {
        audioPlayer.src = DEFAULT_MUSIC_SRC;
        audioPlayer.volume = 0.5;
        
        audioPlayer.play()
            .then(() => {
                isMusicOn = true;
                volumeToggle.classList.replace('fa-volume-off', 'fa-volume-up');
                currentMusicStatus.textContent = 'Default Music (ON)';
            })
            .catch(e => {
                isMusicOn = false;
                volumeToggle.classList.replace('fa-volume-up', 'fa-volume-off');
                currentMusicStatus.textContent = 'Default Music (OFF)';
            });
    }
    initializeAudio(); // App စတင်သည်နှင့် ဖွင့်ပါ

    // Music Mute/Unmute Logic
    volumeToggle.addEventListener('click', () => {
        if (isMusicOn) {
            audioPlayer.pause();
            volumeToggle.classList.replace('fa-volume-up', 'fa-volume-off');
            currentMusicStatus.textContent = currentMusicStatus.textContent.replace('(ON)', '(OFF)');
            isMusicOn = false;
        } else {
            audioPlayer.play().catch(e => alert("Music playback failed."));
            volumeToggle.classList.replace('fa-volume-off', 'fa-volume-up');
            currentMusicStatus.textContent = currentMusicStatus.textContent.replace('(OFF)', '(ON)');
            isMusicOn = true;
        }
    });

    // ... (Music Modal Logic များသည် ယခင်အတိုင်း ဆက်လက်ရှိသည်)
    // ---------------------------------------------

    // ---------------------------------------------
    // 3. Social Feed (Post) Logic
    // ---------------------------------------------
    submitPostBtn.addEventListener('click', () => {
        const postContent = postInput.value.trim();
        if (postContent.length > 0) {
            const newPost = createPostElement(
                currentUserName, 
                postContent, 
                'Just now'
            );
            // ပို့စ်အသစ်ကို အပေါ်ဆုံးတွင် ထည့်သွင်းရန်
            postsContainer.prepend(newPost);
            postInput.value = '';
        } else {
            alert('Post content cannot be empty.');
        }
    });

    // ---------------------------------------------
    // 4. Navigation & Profile Link Logic
    // ---------------------------------------------
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const targetScreenId = item.getAttribute('data-screen');
            document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            document.getElementById(targetScreenId).classList.add('active');
            item.classList.add('active');
        });
    });

    // Telegram Profile Link Logic (New UI Item)
    telegramUsernameCardProfile.addEventListener('click', () => {
        const usernameText = document.getElementById('profile-display-username').textContent;
        const username = usernameText.replace('@', '').trim();
        if (username && username !== 'N/A') {
            window.open(`https://t.me/${username}`, '_blank');
        } else {
            alert('Telegram Username is not available.');
        }
    });
});

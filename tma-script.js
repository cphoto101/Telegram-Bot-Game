// Helper function for dynamic color generation based on user ID
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

// Helper function to format time (e.g., "Just now" or "2 minutes ago")
function formatTime(timestamp) {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + (interval === 1 ? " year ago" : " years ago");
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + (interval === 1 ? " month ago" : " months ago");
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + (interval === 1 ? " day ago" : " days ago");
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + (interval === 1 ? " hour ago" : " hours ago");
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + (interval === 1 ? " minute ago" : " minutes ago");
    return "Just now";
}

// Helper function to create a new post element
function createPostElement(post) {
    const postCard = document.createElement('div');
    postCard.className = 'post-card';
    postCard.innerHTML = `
        <div class="post-header">
            <span class="post-author"><i class="fas fa-user-circle"></i> ${post.author}</span>
            <span class="post-time">${formatTime(post.timestamp)}</span>
        </div>
        <p class="post-content">${post.content}</p>
        <div class="post-actions">
            <button><i class="fas fa-thumbs-up"></i> Like (0)</button>
            <button><i class="fas fa-comment"></i> Comment</button>
        </div>
    `;
    return postCard;
}

// --- LOCAL STORAGE POSTS MANAGEMENT ---
const STORAGE_KEY = 'tma_community_posts';

function loadPosts() {
    const posts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    // Display posts in reverse chronological order
    postsContainer.innerHTML = ''; 
    posts.slice().reverse().forEach(post => {
        postsContainer.appendChild(createPostElement(post));
    });
}

function savePost(post) {
    const posts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    posts.push(post);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements များကို ရယူခြင်း
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    const screens = document.querySelectorAll('.content .screen'); // Tab Switch Fix အတွက် screens ကို ရယူသည်
    // ... (music modal/input elements)
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
    // 1. TMA Integration & Profile Data Filling Logic (Profile Picture Fix)
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
            
            // Profile Picture Placeholder FIX: User ID ကို အခြေခံပြီး dynamic ပုံထည့်သည်
            if (userId !== 'N/A') {
                const userIdStr = userId.toString();
                const userColor = stringToColor(userIdStr);
                const initial = (fullName.charAt(0) || 'U').toUpperCase();
                
                // Placeholder တွင် စာသားကို Initial Letter + User ID ၏ နောက်ဆုံးဂဏန်း ၃ လုံး ပြသသည်
                profileImg.src = `https://via.placeholder.com/120/${userColor.substring(1)}/FFFFFF?text=${initial}${userIdStr.slice(-3)}`;
            }

            // Close App Button Logic
            document.getElementById('tma-close-btn').addEventListener('click', () => {
                tg.close();
            });
            
        } else {
            // ... (Guest User Logic)
            document.getElementById('profile-display-name').textContent = 'Guest User';
            document.getElementById('profile-display-username').textContent = 'N/A';
            document.getElementById('telegram-chat-id').textContent = 'N/A';
        }
    } else {
        // External Access
        document.getElementById('profile-display-name').textContent = 'Sample User';
        document.getElementById('profile-display-username').textContent = '@sample_user';
        document.getElementById('telegram-chat-id').textContent = '123456789 (Sample)';
        profileImg.src = `https://via.placeholder.com/120/4682B4/FFFFFF?text=S123`;
    }

    // ---------------------------------------------
    // 2. Navigation Logic (Tab Click Fix)
    // ---------------------------------------------
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


    // ---------------------------------------------
    // 3. Social Feed (Post) Logic (Multi-user visibility)
    // ---------------------------------------------
    loadPosts(); // Start by loading existing posts

    submitPostBtn.addEventListener('click', () => {
        const postContent = postInput.value.trim();
        if (postContent.length > 0) {
            const newPostData = {
                author: currentUserName,
                content: postContent,
                timestamp: new Date().toISOString()
            };
            
            savePost(newPostData); // Save to Local Storage
            loadPosts(); // Re-render posts to show the new one
            postInput.value = '';
        } else {
            alert('Post content cannot be empty.');
        }
    });

    // ---------------------------------------------
    // 4. Music Auto Play & Toggle Logic (Re-checked)
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
    initializeAudio(); 

    // Music Mute/Unmute Logic
    volumeToggle.addEventListener('click', () => {
        // (Music logic remains the same)
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

    // Telegram Profile Link Logic
    telegramUsernameCardProfile.addEventListener('click', () => {
        const usernameText = document.getElementById('profile-display-username').textContent;
        const username = usernameText.replace('@', '').trim();
        if (username && username !== 'N/A') {
            window.open(`https://t.me/${username}`, '_blank');
        } else {
            alert('Telegram Username is not available.');
        }
    });
    
    // ... (Music Modal Logic များသည် အလုပ်လုပ်ပြီးဖြစ်သောကြောင့် ထပ်မံထည့်သွင်းခြင်းမရှိပါ)
});
                  

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

// --- LOCAL STORAGE POSTS MANAGEMENT (for Multi-user visibility) ---
const STORAGE_KEY = 'tma_community_posts';

function loadPosts() {
    const postsContainer = document.getElementById('posts-container');
    const posts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    
    postsContainer.innerHTML = ''; 
    // Newest posts on top
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
    const screens = document.querySelectorAll('.content .screen');
    const musicButton = document.getElementById('music-button');
    const musicModal = document.getElementById('music-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const urlInputModal = document.getElementById('url-input-modal');
    const playUrlBtn = document.getElementById('play-url-btn');
    const musicUrlInput = document.getElementById('music-url-input');
    const currentMusicStatus = document.getElementById('current-music-status');
    const audioPlayer = document.getElementById('audio-player');
    const volumeToggle = document.getElementById('volume-toggle');
    const profileAvatarPlaceholder = document.getElementById('profile-avatar-placeholder');
    const submitPostBtn = document.getElementById('submit-post-btn');
    const postInput = document.getElementById('post-input');
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
            
            currentUserName = fullName || 'User'; 

            // Profile Data Filling
            document.getElementById('profile-display-name').textContent = fullName || 'No Name Provided';
            document.getElementById('profile-display-username').textContent = username;
            document.getElementById('telegram-chat-id').textContent = userId.toString();
            
            // Profile Picture Placeholder Logic
            if (userId !== 'N/A') {
                const userIdStr = userId.toString();
                const userColor = stringToColor(userIdStr);
                const initial = (fullName.charAt(0) || 'U').toUpperCase();
                
                profileAvatarPlaceholder.style.backgroundColor = userColor;
                profileAvatarPlaceholder.textContent = initial;
            } else {
                 profileAvatarPlaceholder.textContent = 'P';
            }

            // Close App Button Logic
            document.getElementById('tma-close-btn').addEventListener('click', () => {
                tg.close();
            });
            
        } else {
            profileAvatarPlaceholder.textContent = 'G';
        }
    } else {
        // External Access / Sample Data
        profileAvatarPlaceholder.textContent = 'S';
    }

    // ---------------------------------------------
    // 2. Navigation Logic (Tab Click Fix)
    // ---------------------------------------------
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetScreenId = item.getAttribute('data-screen');

            screens.forEach(screen => screen.classList.remove('active'));
            navItems.forEach(nav => nav.classList.remove('active'));

            document.getElementById(targetScreenId).classList.add('active');
            item.classList.add('active');
        });
    });


    // ---------------------------------------------
    // 3. Social Feed (Post) Logic
    // ---------------------------------------------
    loadPosts(); 

    submitPostBtn.addEventListener('click', () => {
        const postContent = postInput.value.trim();
        if (postContent.length > 0) {
            const newPostData = {
                author: currentUserName,
                content: postContent,
                timestamp: new Date().toISOString()
            };
            
            savePost(newPostData); 
            loadPosts(); 
            postInput.value = '';
        } else {
            alert('Post content cannot be empty.');
        }
    });

    // ---------------------------------------------
    // 4. Music Auto Play & Toggle Logic
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
    
    // Music Modal Display
    musicButton.addEventListener('click', () => {
        musicModal.style.display = 'block';
    });

    closeModalBtn.addEventListener('click', () => {
        musicModal.style.display = 'none';
        urlInputModal.style.display = 'none';
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
                    musicModal.style.display = 'none';
                })
                .catch(error => {
                    alert('Error playing music from URL.');
                });
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
});
            

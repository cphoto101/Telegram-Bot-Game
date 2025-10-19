// ********** SET YOUR ADMIN CHAT ID HERE **********
// ဤနံပါတ်ကို သင့်ရဲ့ Telegram ID ဖြင့် မဖြစ်မနေ အစားထိုးပါ။
const ADMIN_CHAT_ID = 1924452453; 
// *************************************************

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

// Helper function to format time (e.g., "Just now")
function formatTime(timestamp) {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    let interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + (interval === 1 ? " hour ago" : " hours ago");
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + (interval === 1 ? " minute ago" : " minutes ago");
    if (seconds > 5) return "Few seconds ago";
    return "Just now";
}

// Helper function to create a new post element
function createPostElement(post, currentUserId) {
    const isAdminPost = (post.authorId === ADMIN_CHAT_ID);
    const postCard = document.createElement('div');
    postCard.className = 'post-card';
    postCard.setAttribute('data-post-id', post.id);

    // Admin Post အတွက် Author Name ကို ပြင်ဆင်ခြင်း
    const authorClass = isAdminPost ? 'post-author admin' : 'post-author';
    const authorIcon = isAdminPost ? 'fas fa-crown' : 'fas fa-user-circle';
    const authorLabel = isAdminPost ? ` (Admin)` : '';
    const authorName = `<span class="${authorClass}"><i class="${authorIcon}"></i> ${post.author}${authorLabel}</span>`;
    
    // Delete Button Logic (Admin မှသာ ဖျက်ခွင့်ရှိသည်)
    const deleteButton = (currentUserId === ADMIN_CHAT_ID) ? 
        `<button class="delete-btn" data-post-id="${post.id}"><i class="fas fa-trash-alt"></i> Delete</button>` : '';

    postCard.innerHTML = `
        <div class="post-header">
            ${authorName}
            <span class="post-time">${formatTime(post.timestamp)}</span>
        </div>
        <p class="post-content">${post.content}</p>
        <div class="post-actions">
            <button><i class="fas fa-thumbs-up"></i> Like (0)</button>
            ${deleteButton}
        </div>
    `;
    return postCard;
}

// --- LOCAL STORAGE POSTS MANAGEMENT ---
const POSTS_STORAGE_KEY = 'tma_community_posts_v2'; 

function loadPosts(currentUserId) {
    const postsContainer = document.getElementById('posts-container');
    const posts = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || '[]');
    
    postsContainer.innerHTML = ''; 
    posts.slice().reverse().forEach(post => {
        postsContainer.appendChild(createPostElement(post, currentUserId));
    });
    
    // Delete Button Event Listeners ကို ထည့်သွင်းရန်
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const postId = e.currentTarget.getAttribute('data-post-id');
            deletePost(postId, currentUserId);
        });
    });
}

function savePost(post) {
    const posts = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || '[]');
    post.id = Date.now().toString(); 
    posts.push(post);
    localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
}

function deletePost(postId, currentUserId) {
    if (currentUserId !== ADMIN_CHAT_ID) {
        alert("Permission denied. Only the Admin can delete posts.");
        return;
    }

    if (!confirm("Are you sure you want to delete this post?")) {
        return;
    }

    let posts = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || '[]');
    posts = posts.filter(post => post.id !== postId);
    localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
    loadPosts(currentUserId); 
}

// --- MUSIC PLAYER & MODAL LOGIC ---
let isMusicOn = false;
const DEFAULT_MUSIC_SRC = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'; 

// Function to safely start/stop music with a new URL
function toggleMusic(audioPlayer, volumeToggle, currentMusicStatus, src = DEFAULT_MUSIC_SRC) {
    if (isMusicOn && audioPlayer.src === src) {
        // Stop current if playing the same source
        audioPlayer.pause();
        isMusicOn = false;
        volumeToggle.classList.replace('fa-volume-up', 'fa-volume-off');
        currentMusicStatus.textContent = 'Music Paused';
        return;
    } 

    // Always pause before changing source
    audioPlayer.pause();
    
    // Set new source and attempt to play
    audioPlayer.src = src;
    audioPlayer.load();
    audioPlayer.volume = 0.5;
    
    audioPlayer.play()
        .then(() => {
            isMusicOn = true;
            volumeToggle.classList.replace('fa-volume-off', 'fa-volume-up');
            const songName = src.includes('soundhelix') ? 'Default Music' : 'Custom URL';
            currentMusicStatus.textContent = `${songName} (ON)`;
        })
        .catch(e => {
            // Autoplay failed - ask user to click volume icon
            console.error("Autoplay prevented:", e);
            isMusicOn = false;
            volumeToggle.classList.replace('fa-volume-up', 'fa-volume-off');
            currentMusicStatus.textContent = 'Playback Failed. Tap volume icon to retry.';
            
            // Store the source so the retry button knows what to play
            audioPlayer.setAttribute('data-last-src', src);
        });
}

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements များကို ရယူခြင်း
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    const screens = document.querySelectorAll('.content .screen');
    const volumeToggle = document.getElementById('volume-toggle');
    const musicButton = document.getElementById('music-button');
    const currentMusicStatus = document.getElementById('current-music-status');
    const audioPlayer = document.getElementById('audio-player');
    const profileAvatarPlaceholder = document.getElementById('profile-avatar-placeholder');
    const submitPostBtn = document.getElementById('submit-post-btn');
    const postInput = document.getElementById('post-input');
    const adminPostBox = document.getElementById('admin-post-box');
    const adminMessage = document.getElementById('admin-message');
    const adminStatusDiv = document.getElementById('admin-status');
    const profileUsernameCard = document.getElementById('telegram-username-card-profile');
    
    // Modal Elements
    const musicModal = document.getElementById('music-modal');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');
    const urlInputModal = document.getElementById('url-input-modal');
    const closeUrlModalBtn = document.getElementById('close-url-modal-btn');
    const playUrlBtn = document.getElementById('play-url-btn');
    const musicUrlInput = document.getElementById('music-url-input');
    const musicOptions = document.querySelectorAll('.music-option');


    let currentUserId = 0; 
    let currentUserName = 'Guest';
    let currentUsernameLink = '';
    
    // ---------------------------------------------
    // 1. TMA Integration & Profile Data Filling Logic (Admin Check)
    // ---------------------------------------------
    if (typeof window.Telegram.WebApp !== 'undefined') {
        const tg = window.Telegram.WebApp;
        tg.ready();
        const user = tg.initDataUnsafe.user;

        if (user) {
            currentUserId = user.id || 0;
            const firstName = user.first_name || '';
            const lastName = user.last_name || '';
            const username = user.username ? `@${user.username}` : 'N/A';
            const fullName = `${firstName} ${lastName}`.trim();
            
            currentUserName = fullName || 'User'; 
            currentUsernameLink = user.username;
            const isAdmin = (currentUserId === ADMIN_CHAT_ID);

            // Profile Data Filling & Admin Check
            document.getElementById('profile-display-name').textContent = fullName || 'No Name Provided';
            document.getElementById('profile-display-username').textContent = username;
            document.getElementById('telegram-chat-id').textContent = currentUserId.toString();
            
            if (isAdmin) {
                adminStatusDiv.textContent = 'Administrator';
                adminPostBox.style.display = 'block';
            } else {
                adminStatusDiv.textContent = 'Regular User';
                adminPostBox.style.display = 'none';
                adminMessage.textContent = 'Only the Admin can post announcements.';
                adminMessage.style.display = 'block';
            }

            // Profile Picture Placeholder Logic
            const userIdStr = currentUserId.toString();
            const userColor = stringToColor(userIdStr);
            const initial = (fullName.charAt(0) || 'U').toUpperCase();
            profileAvatarPlaceholder.style.backgroundColor = userColor;
            profileAvatarPlaceholder.textContent = initial;

            document.getElementById('tma-close-btn').addEventListener('click', () => {
                tg.close();
            });
            
        } 
    } else {
        // External Access / Sample Data
        adminPostBox.style.display = 'none';
        adminMessage.textContent = 'Running outside TMA. Posts are read-only.';
        adminMessage.style.display = 'block';
    }

    // ---------------------------------------------
    // 2. Initial Load and Logic Execution
    // ---------------------------------------------
    loadPosts(currentUserId); 

    // ---------------------------------------------
    // 3. Post Submission Logic (Admin Only)
    // ---------------------------------------------
    submitPostBtn.addEventListener('click', () => {
        if (currentUserId !== ADMIN_CHAT_ID) {
            alert("Permission denied. Only the Admin can submit posts.");
            return;
        }

        const postContent = postInput.value.trim();
        if (postContent.length > 0) {
            const newPostData = {
                author: currentUserName,
                authorId: currentUserId, 
                content: postContent,
                timestamp: new Date().toISOString()
            };
            
            savePost(newPostData); 
            loadPosts(currentUserId); 
            postInput.value = '';
            
            if (window.Telegram.WebApp && window.Telegram.WebApp.showAlert) {
                window.Telegram.WebApp.showAlert('Announcement posted successfully!');
            } else {
                alert('Announcement posted successfully!');
            }
        } else {
            alert('Post content cannot be empty.');
        }
    });

    // ---------------------------------------------
    // 4. Navigation & Music Modal Logic FIX
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

    // --- Music Modal Control ---
    musicButton.addEventListener('click', () => {
        musicModal.style.display = 'flex';
    });

    cancelModalBtn.addEventListener('click', () => {
        musicModal.style.display = 'none';
    });

    closeUrlModalBtn.addEventListener('click', () => {
        urlInputModal.style.display = 'none';
    });
    
    // Close Modals when clicking outside the content area
    musicModal.addEventListener('click', (e) => {
        if (e.target.id === 'music-modal') {
            musicModal.style.display = 'none';
        }
    });
    urlInputModal.addEventListener('click', (e) => {
        if (e.target.id === 'url-input-modal') {
            urlInputModal.style.display = 'none';
        }
    });

    // --- Music Option Select Logic ---
    musicOptions.forEach(option => {
        option.addEventListener('click', () => {
            const type = option.getAttribute('data-music-type');
            musicModal.style.display = 'none'; // Close main modal

            if (type === 'default') {
                toggleMusic(audioPlayer, volumeToggle, currentMusicStatus, DEFAULT_MUSIC_SRC);
            } else if (type === 'url') {
                urlInputModal.style.display = 'flex'; // Open URL input modal
                musicUrlInput.value = ''; // Clear previous input
            } else if (type === 'upload') {
                alert("File Upload requires a Backend Server (e.g., Node.js/Firebase) and is not supported in this Frontend-only version.");
            }
        });
    });

    // --- Play Custom URL Button ---
    playUrlBtn.addEventListener('click', () => {
        const url = musicUrlInput.value.trim();
        // Basic check for music file extensions
        if (url && (url.endsWith('.mp3') || url.endsWith('.ogg') || url.endsWith('.wav'))) {
            urlInputModal.style.display = 'none';
            toggleMusic(audioPlayer, volumeToggle, currentMusicStatus, url); 
        } else {
            alert("Please enter a valid direct music URL (ending in .mp3, .ogg, or .wav).");
        }
    });


    // --- Volume Toggle (Primary Play/Pause/Retry Button) ---
    volumeToggle.addEventListener('click', () => {
        if (isMusicOn) {
            // Pause
            toggleMusic(audioPlayer, volumeToggle, currentMusicStatus, audioPlayer.src);
        } else {
            // Play/Retry
            const lastSrc = audioPlayer.getAttribute('data-last-src') || DEFAULT_MUSIC_SRC;
            toggleMusic(audioPlayer, volumeToggle, currentMusicStatus, lastSrc);
        }
    });


    // --- Telegram Profile Link ---
    profileUsernameCard.addEventListener('click', () => {
        if (currentUsernameLink) {
            window.open(`https://t.me/${currentUsernameLink}`, '_blank');
        } else {
            alert('Telegram Username is not available to create a direct link.');
        }
    });
});
            

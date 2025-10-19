// ********** SET YOUR ADMIN CHAT ID HERE **********
const ADMIN_CHAT_ID = 1924452453; 
// *************************************************

// --- LOCAL STORAGE KEYS ---
const POSTS_STORAGE_KEY = 'tma_community_posts_v3'; // Increased version for like logic
const LIKES_STORAGE_KEY = 'tma_user_likes'; 

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
function createPostElement(post, currentUserId, userLikes) {
    const isAdminPost = (post.authorId === ADMIN_CHAT_ID);
    const postCard = document.createElement('div');
    postCard.className = 'post-card';
    postCard.setAttribute('data-post-id', post.id);

    // Check if the current user has liked this post
    const isLiked = userLikes.includes(post.id);
    const likeClass = isLiked ? 'like-btn liked' : 'like-btn';

    const authorClass = isAdminPost ? 'post-author admin' : 'post-author';
    const authorIcon = isAdminPost ? 'fas fa-crown' : 'fas fa-user-circle';
    const authorLabel = isAdminPost ? ` (Admin)` : '';
    const authorName = `<span class="${authorClass}"><i class="${authorIcon}"></i> ${post.author}${authorLabel}</span>`;
    
    const deleteButton = (currentUserId === ADMIN_CHAT_ID) ? 
        `<button class="delete-btn" data-post-id="${post.id}"><i class="fas fa-trash-alt"></i> Delete</button>` : '';

    postCard.innerHTML = `
        <div class="post-header">
            ${authorName}
            <span class="post-time">${formatTime(post.timestamp)}</span>
        </div>
        <p class="post-content">${post.content}</p>
        <div class="post-actions">
            <button class="${likeClass}" data-post-id="${post.id}">
                <i class="fas fa-thumbs-up"></i> 
                Like (<span class="like-count">${post.likes || 0}</span>)
            </button>
            ${deleteButton}
        </div>
    `;
    return postCard;
}

// --- LOCAL STORAGE POSTS MANAGEMENT ---

function loadPosts(currentUserId) {
    const postsContainer = document.getElementById('posts-container');
    const posts = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || '[]');
    const userLikes = JSON.parse(localStorage.getItem(LIKES_STORAGE_KEY) || '[]');
    
    postsContainer.innerHTML = ''; 
    posts.slice().reverse().forEach(post => {
        postsContainer.appendChild(createPostElement(post, currentUserId, userLikes));
    });
    
    // Add event listeners for new elements
    addPostEventListeners(currentUserId);
}

function savePost(post) {
    const posts = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || '[]');
    post.id = Date.now().toString(); 
    post.likes = 0; // Initialize likes count
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
    
    // Also remove from user likes
    let userLikes = JSON.parse(localStorage.getItem(LIKES_STORAGE_KEY) || '[]');
    userLikes = userLikes.filter(id => id !== postId);
    localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(userLikes));
    
    loadPosts(currentUserId); 
}

// --- LIKE LOGIC (NEW) ---
function toggleLike(postId, button, currentUserId) {
    if (currentUserId === 0) {
        alert("You must be logged in via Telegram Mini App to like posts.");
        return;
    }
    
    let posts = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || '[]');
    let userLikes = JSON.parse(localStorage.getItem(LIKES_STORAGE_KEY) || '[]');
    const postIndex = posts.findIndex(p => p.id === postId);

    if (postIndex === -1) return; 

    const isLiked = userLikes.includes(postId);
    
    if (isLiked) {
        // Unlike the post
        posts[postIndex].likes = Math.max(0, posts[postIndex].likes - 1); // Decrease like count
        userLikes = userLikes.filter(id => id !== postId); // Remove from user's liked list
        button.classList.remove('liked');
        button.querySelector('.like-count').textContent = posts[postIndex].likes;
    } else {
        // Like the post
        posts[postIndex].likes = (posts[postIndex].likes || 0) + 1; // Increase like count
        userLikes.push(postId); // Add to user's liked list
        button.classList.add('liked');
        button.querySelector('.like-count').textContent = posts[postIndex].likes;
    }
    
    // Save changes back to Local Storage
    localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
    localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(userLikes));
}

function addPostEventListeners(currentUserId) {
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const postId = e.currentTarget.getAttribute('data-post-id');
            deletePost(postId, currentUserId);
        });
    });
    
    document.querySelectorAll('.like-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const postId = e.currentTarget.getAttribute('data-post-id');
            toggleLike(postId, e.currentTarget, currentUserId);
        });
    });
}


// --- MUSIC PLAYER & MODAL LOGIC (Same as previous version) ---
let isMusicOn = false;
const DEFAULT_MUSIC_SRC = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'; 

function toggleMusic(audioPlayer, volumeToggle, currentMusicStatus, src = DEFAULT_MUSIC_SRC, songName = 'Default Music') {
    if (isMusicOn && audioPlayer.src === src) {
        audioPlayer.pause();
        isMusicOn = false;
        volumeToggle.classList.replace('fa-volume-up', 'fa-volume-off');
        currentMusicStatus.textContent = 'Music Paused';
        return;
    } 

    audioPlayer.pause();
    audioPlayer.src = src;
    audioPlayer.load();
    audioPlayer.volume = 0.5;
    
    audioPlayer.play()
        .then(() => {
            isMusicOn = true;
            volumeToggle.classList.replace('fa-volume-off', 'fa-volume-up');
            currentMusicStatus.textContent = `${songName} (ON)`;
        })
        .catch(e => {
            console.error("Autoplay prevented:", e);
            isMusicOn = false;
            volumeToggle.classList.replace('fa-volume-up', 'fa-volume-off');
            currentMusicStatus.textContent = 'Playback Failed. Tap volume icon to retry.';
            
            audioPlayer.setAttribute('data-last-src', src);
            audioPlayer.setAttribute('data-last-name', songName);
        });
}


document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const volumeToggle = document.getElementById('volume-toggle');
    const musicButton = document.getElementById('music-button');
    const currentMusicStatus = document.getElementById('current-music-status');
    const audioPlayer = document.getElementById('audio-player');
    const profileAvatarPlaceholder = document.getElementById('profile-avatar-placeholder');
    const adminPostBox = document.getElementById('admin-post-box');
    const adminMessage = document.getElementById('admin-message');
    const adminStatusDiv = document.getElementById('admin-status');
    
    // Post Elements
    const submitPostBtn = document.getElementById('submit-post-btn');
    const postInput = document.getElementById('post-input');
    
    // Modal Elements
    const musicModal = document.getElementById('music-modal');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');
    const urlInputModal = document.getElementById('url-input-modal');
    const playUrlBtn = document.getElementById('play-url-btn');
    const musicUrlInput = document.getElementById('music-url-input');
    const uploadMusicInput = document.getElementById('music-upload-input'); 
    
    let currentUserId = 0; 
    let currentUserName = 'Guest';
    let currentUsernameLink = '';
    
    // ---------------------------------------------
    // 1. TMA Integration & Profile Data Filling Logic (Photo Logic Included)
    // ---------------------------------------------
    if (typeof window.Telegram.WebApp !== 'undefined') {
        const tg = window.Telegram.WebApp;
        tg.ready();
        const user = tg.initDataUnsafe.user;
        
        // Telegram initDataUnsafe မှာ photo_url ပါလာနိုင်ပေမယ့် တရားဝင်အမြဲတမ်းမဟုတ်ပါ
        const photoUrl = user.photo_url; 

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
            
            // Admin Status Logic
            if (isAdmin) {
                adminStatusDiv.textContent = 'Administrator';
                adminPostBox.style.display = 'block';
            } else {
                adminStatusDiv.textContent = 'Regular User';
                adminPostBox.style.display = 'none';
                adminMessage.textContent = 'Only the Admin can post announcements.';
                adminMessage.style.display = 'block';
            }

            // 🚨 Profile Photo Logic (CSS style ကို တိုက်ရိုက်ပြောင်း)
            if (photoUrl) {
                profileAvatarPlaceholder.innerHTML = `<img src="${photoUrl}" style="width: 100%; height: 100%; border-radius: 50%;">`;
                profileAvatarPlaceholder.style.backgroundColor = 'transparent';
                profileAvatarPlaceholder.textContent = '';
            } else {
                const userIdStr = currentUserId.toString();
                const userColor = stringToColor(userIdStr);
                const initial = (fullName.charAt(0) || 'U').toUpperCase();
                profileAvatarPlaceholder.style.backgroundColor = userColor;
                profileAvatarPlaceholder.textContent = initial;
            }

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
    // 4. Navigation & Music Modal Logic 
    // ---------------------------------------------
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const targetScreenId = item.getAttribute('data-screen');

            document.querySelectorAll('.content .screen').forEach(screen => screen.classList.remove('active'));
            document.querySelectorAll('.bottom-nav .nav-item').forEach(nav => nav.classList.remove('active'));

            document.getElementById(targetScreenId).classList.add('active');
            item.classList.add('active');
        });
    });

    // --- Music Modal Control ---
    musicButton.addEventListener('click', () => { musicModal.style.display = 'flex'; });
    cancelModalBtn.addEventListener('click', () => { musicModal.style.display = 'none'; });
    document.getElementById('close-url-modal-btn').addEventListener('click', () => { urlInputModal.style.display = 'none'; });
    
    musicModal.addEventListener('click', (e) => {
        if (e.target.id === 'music-modal') { musicModal.style.display = 'none'; }
    });
    urlInputModal.addEventListener('click', (e) => {
        if (e.target.id === 'url-input-modal') { urlInputModal.style.display = 'none'; }
    });

    // --- Music Option Select Logic ---
    document.querySelectorAll('.music-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const type = e.currentTarget.getAttribute('data-music-type');
            if (type === 'default') {
                musicModal.style.display = 'none'; 
                toggleMusic(audioPlayer, volumeToggle, currentMusicStatus, DEFAULT_MUSIC_SRC, 'Default Music');
            } else if (type === 'url') {
                musicModal.style.display = 'none'; 
                urlInputModal.style.display = 'flex'; 
                musicUrlInput.value = ''; 
            }
        });
    });

    // --- Play Custom URL Button ---
    playUrlBtn.addEventListener('click', () => {
        const url = musicUrlInput.value.trim();
        if (url && (url.endsWith('.mp3') || url.endsWith('.ogg') || url.endsWith('.wav'))) {
            urlInputModal.style.display = 'none';
            toggleMusic(audioPlayer, volumeToggle, currentMusicStatus, url, 'Custom URL Music'); 
        } else {
            alert("Please enter a valid direct music URL (ending in .mp3, .ogg, or .wav).");
        }
    });

    // --- Upload Music File Handler ---
    uploadMusicInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        musicModal.style.display = 'none'; 
        
        if (file && file.type.startsWith('audio/')) {
            const localUrl = URL.createObjectURL(file);
            const songName = `Uploaded: ${file.name}`;
            
            toggleMusic(audioPlayer, volumeToggle, currentMusicStatus, localUrl, songName);
            
            audioPlayer.addEventListener('ended', () => {
                URL.revokeObjectURL(localUrl);
            }, { once: true });
            
        } else if (file) {
             alert("Please select an audio file.");
        }
        e.target.value = null; 
    });


    // --- Volume Toggle (Primary Play/Pause/Retry Button) ---
    volumeToggle.addEventListener('click', () => {
        const lastSrc = audioPlayer.getAttribute('data-last-src') || DEFAULT_MUSIC_SRC;
        const lastName = audioPlayer.getAttribute('data-last-name') || 'Default Music';
        
        toggleMusic(audioPlayer, volumeToggle, currentMusicStatus, isMusicOn ? audioPlayer.src : lastSrc, isMusicOn ? currentMusicStatus.textContent.replace(' (ON)', '') : lastName);
    });

    // --- Telegram Profile Link ---
    document.getElementById('telegram-username-card-profile').addEventListener('click', () => {
        if (currentUsernameLink) {
            window.open(`https://t.me/${currentUsernameLink}`, '_blank');
        } else {
            alert('Telegram Username is not available to create a direct link.');
        }
    });
});
        

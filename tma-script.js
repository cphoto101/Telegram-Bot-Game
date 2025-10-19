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

// Helper function to create a new post element (Same as before)
function createPostElement(post, currentUserId) {
    const isAdminPost = (post.authorId === ADMIN_CHAT_ID);
    const postCard = document.createElement('div');
    postCard.className = 'post-card';
    postCard.setAttribute('data-post-id', post.id);

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
            <button><i class="fas fa-thumbs-up"></i> Like (0)</button>
            ${deleteButton}
        </div>
    `;
    return postCard;
}

// --- LOCAL STORAGE POSTS MANAGEMENT (Same as before) ---
const POSTS_STORAGE_KEY = 'tma_community_posts_v2'; 

function loadPosts(currentUserId) {
    const postsContainer = document.getElementById('posts-container');
    const posts = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || '[]');
    
    postsContainer.innerHTML = ''; 
    posts.slice().reverse().forEach(post => {
        postsContainer.appendChild(createPostElement(post, currentUserId));
    });
    
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

// --- MUSIC PLAYER & MODAL LOGIC (Modified for Upload) ---
let isMusicOn = false;
const DEFAULT_MUSIC_SRC = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'; 

// Function to safely start/stop music with a new URL
function toggleMusic(audioPlayer, volumeToggle, currentMusicStatus, src = DEFAULT_MUSIC_SRC, songName = 'Default Music') {
    if (isMusicOn && audioPlayer.src === src) {
        // Stop current if playing the same source
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
            
            // Store the source for retry button
            audioPlayer.setAttribute('data-last-src', src);
            audioPlayer.setAttribute('data-last-name', songName);
        });
}


document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    const screens = document.querySelectorAll('.content .screen');
    const volumeToggle = document.getElementById('volume-toggle');
    const musicButton = document.getElementById('music-button');
    const currentMusicStatus = document.getElementById('current-music-status');
    const audioPlayer = document.getElementById('audio-player');
    const profileAvatarPlaceholder = document.getElementById('profile-avatar-placeholder');
    // ... (other post/admin elements)
    const profileUsernameCard = document.getElementById('telegram-username-card-profile');
    
    // Modal Elements
    const musicModal = document.getElementById('music-modal');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');
    const urlInputModal = document.getElementById('url-input-modal');
    const closeUrlModalBtn = document.getElementById('close-url-modal-btn');
    const playUrlBtn = document.getElementById('play-url-btn');
    const musicUrlInput = document.getElementById('music-url-input');
    const uploadMusicInput = document.getElementById('music-upload-input'); // New
    const musicOptions = document.querySelectorAll('.music-option');


    let currentUserId = 0; 
    let currentUserName = 'Guest';
    let currentUsernameLink = '';
    
    // ---------------------------------------------
    // 1. TMA Integration & Profile Data Filling Logic (Admin Check & Photo Logic)
    // ---------------------------------------------
    if (typeof window.Telegram.WebApp !== 'undefined') {
        const tg = window.Telegram.WebApp;
        tg.ready();
        const user = tg.initDataUnsafe.user;
        const photoUrl = user.photo_url; // TMA initData မှာ photo_url ပါလာနိုင်သည်

        if (user) {
            currentUserId = user.id || 0;
            const firstName = user.first_name || '';
            const lastName = user.last_name || '';
            const username = user.username ? `@${user.username}` : 'N/A';
            const fullName = `${firstName} ${lastName}`.trim();
            
            currentUserName = fullName || 'User'; 
            currentUsernameLink = user.username;
            const isAdmin = (currentUserId === ADMIN_CHAT_ID);

            // Profile Data Filling & Admin Check (Same as before)
            document.getElementById('profile-display-name').textContent = fullName || 'No Name Provided';
            document.getElementById('profile-display-username').textContent = username;
            document.getElementById('telegram-chat-id').textContent = currentUserId.toString();
            
            // ... (Admin Status Logic) ...

            // 🚨 Profile Photo Logic (FIXED)
            if (photoUrl) {
                // If photo_url is available in initDataUnsafe (rarely available)
                profileAvatarPlaceholder.innerHTML = `<img src="${photoUrl}" style="width: 100%; height: 100%; border-radius: 50%;">`;
                profileAvatarPlaceholder.style.backgroundColor = 'transparent';
                profileAvatarPlaceholder.textContent = '';
            } else {
                // Use initials and generated color if no photo_url (Normal TMA behavior)
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
        // ... (External Access Logic - Same as before) ...
    }

    // ---------------------------------------------
    // 2. Initial Load and Logic Execution (Same as before)
    // ---------------------------------------------
    loadPosts(currentUserId); 

    // ---------------------------------------------
    // 3. Post Submission Logic (Same as before)
    // ---------------------------------------------
    // ... (submitPostBtn event listener) ...

    // ---------------------------------------------
    // 4. Navigation & Music Modal Logic FIX
    // ---------------------------------------------
    // ... (Navigation logic - Same as before) ...

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
        // Default and URL options are handled by JS, Upload is handled by <label>
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

    // --- 🚨 Upload Music File Handler (NEW) ---
    uploadMusicInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        musicModal.style.display = 'none'; // Close modal
        
        if (file && file.type.startsWith('audio/')) {
            // Create a temporary URL for the file in the browser's memory
            const localUrl = URL.createObjectURL(file);
            const songName = `Uploaded: ${file.name}`;
            
            toggleMusic(audioPlayer, volumeToggle, currentMusicStatus, localUrl, songName);
            
            // Clean up the URL when audio finishes to save memory
            audioPlayer.addEventListener('ended', () => {
                URL.revokeObjectURL(localUrl);
            }, { once: true });
            
        } else if (file) {
             alert("Please select an audio file.");
        }
        // Clear input value to allow selecting the same file again
        e.target.value = null; 
    });


    // --- Volume Toggle (Primary Play/Pause/Retry Button) ---
    volumeToggle.addEventListener('click', () => {
        if (isMusicOn) {
            toggleMusic(audioPlayer, volumeToggle, currentMusicStatus, audioPlayer.src, currentMusicStatus.textContent.replace(' (ON)', ''));
        } else {
            const lastSrc = audioPlayer.getAttribute('data-last-src') || DEFAULT_MUSIC_SRC;
            const lastName = audioPlayer.getAttribute('data-last-name') || 'Default Music';
            toggleMusic(audioPlayer, volumeToggle, currentMusicStatus, lastSrc, lastName);
        }
    });

    // --- Telegram Profile Link (Same as before) ---
    profileUsernameCard.addEventListener('click', () => {
        if (currentUsernameLink) {
            window.open(`https://t.me/${currentUsernameLink}`, '_blank');
        } else {
            alert('Telegram Username is not available to create a direct link.');
        }
    });
});
                          

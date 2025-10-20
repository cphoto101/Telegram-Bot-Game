// ********** SET YOUR ADMIN CHAT ID HERE **********
// ဤနေရာတွင် သင်၏ Telegram Chat ID ကို ထည့်သွင်းပါ။ (ဥပမာ: 123456789)
const ADMIN_CHAT_ID = 1924452453; 
// *************************************************

// --- LOCAL STORAGE KEYS ---
const POSTS_STORAGE_KEY = 'tma_community_posts_v4'; 
const LIKES_STORAGE_KEY = 'tma_user_likes_v4'; 
const TEMP_MUSIC_KEY = 'tma_temp_music_url_v4'; // Temporary music key

// --- Global Variables ---
// Default Music URL ကို hardcode လုပ်ထားခြင်း
const INITIAL_DEFAULT_URL = 'https://archive.org/download/lofi-chill-1-20/lofi_chill_03_-_sleepwalker.mp3'; 

let audioPlayer;
let musicStatusSpan;
let volumeToggleIcon;
let currentUserId = 0; 
let currentUserName = 'Guest';
let is_admin = false; 
let currentPostFilter = 'new-posts'; 
const NEW_POSTS_LIMIT = 50; 

// Telegram Web App Global Reference
let tg = null;

// ===========================================
//          HELPER FUNCTIONS
// ===========================================

/**
 * Chat ID ပေါ်မူတည်၍ ရောင်စုံဖန်တီးပေးခြင်း (Profile Avatar အတွက်)
 */
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

/**
 * Custom Toast Notification (for copy feedback)
 */
function showToast(message) {
    const toast = document.getElementById('custom-toast');
    if (toast) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

/**
 * Chat ID Copy Function: One-Tap Copy
 */
function copyChatId(chatId) {
    const tempInput = document.createElement('textarea');
    tempInput.value = chatId.toString();
    document.body.appendChild(tempInput);
    tempInput.select();
    
    try {
        // Use modern clipboard API if available, fallback to execCommand
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(chatId.toString()).then(() => {
                showToast('Chat ID ကူးယူပြီးပါပြီ။');
            }).catch(() => {
                // Fallback attempt
                if (document.execCommand('copy')) {
                    showToast('Chat ID ကူးယူပြီးပါပြီ။ (Legacy Copy)');
                } else {
                    showToast('ကူးယူမရပါ၊ စာသားကို ကိုယ်တိုင်ရွေးချယ်ကူးယူပေးပါ။');
                }
            });
        } else if (document.execCommand('copy')) {
             showToast('Chat ID ကူးယူပြီးပါပြီ။');
        } else {
             showToast('ကူးယူမရပါ၊ စာသားကို ကိုယ်တိုင်ရွေးချယ်ကူးယူပေးပါ။');
        }
    } catch (err) {
        showToast('ကူးယူမရပါ၊ စာသားကို ကိုယ်တိုင်ရွေးချယ်ကူးယူပေးပါ။');
    }
    document.body.removeChild(tempInput);
}

// ===========================================
//          DATA STORAGE HANDLERS (with error handling)
// ===========================================

function getPosts() {
    try {
        const posts = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || '[]');
        return Array.isArray(posts) ? posts : []; // Ensure it returns an array
    } catch (e) {
        console.error("Error loading posts:", e);
        return [];
    }
}

function savePosts(posts) {
    try {
        localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
    } catch (e) {
        console.error("Error saving posts:", e);
        showToast("Error saving data. Storage full?");
    }
}

function getLikes() {
    try {
        const likes = JSON.parse(localStorage.getItem(LIKES_STORAGE_KEY) || '{}');
        return typeof likes === 'object' && likes !== null ? likes : {}; // Ensure it returns an object
    } catch (e) {
        console.error("Error loading likes:", e);
        return {};
    }
}

function saveLikes(likes) {
    try {
        localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(likes));
    } catch (e) {
        console.error("Error saving likes:", e);
        showToast("Error saving likes. Storage full?");
    }
}

// ===========================================
//          POSTS & LIKES LOGIC
// ===========================================

function createPostElement(post, currentUserId) {
    const likes = getLikes();
    const userIdStr = currentUserId.toString(); 
    // likes[postId] is an array of user IDs who liked it
    const postLikesArray = likes[post.id] ? likes[post.id].map(String) : [];
    const isLiked = postLikesArray.includes(userIdStr);
    const isAdmin = (currentUserId === ADMIN_CHAT_ID);
    
    const postElement = document.createElement('div');
    postElement.className = 'post-card';
    postElement.setAttribute('data-post-id', post.id);

    // Update the displayed like count based on the array length (most accurate)
    const displayLikesCount = postLikesArray.length; 

    const deleteButton = isAdmin 
        ? `<button class="delete-btn" data-post-id="${post.id}"><i class="fas fa-trash"></i> Delete</button>` 
        : '';

    postElement.innerHTML = `
        <p class="post-content">${post.content}</p>
        <div class="post-actions">
            <button class="like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post.id}">
                <i class="fas fa-heart"></i> 
                Like (${displayLikesCount})
            </button>
            ${deleteButton}
        </div>
    `;
    return postElement;
}

function loadPosts(userId) {
    currentUserId = userId; 
    let posts = getPosts();
    const container = document.getElementById('posts-container');
    
    if (!container) return;

    if (currentPostFilter === 'new-posts') {
        posts.sort((a, b) => b.timestamp - a.timestamp); 
        posts = posts.slice(0, NEW_POSTS_LIMIT);
    } else if (currentPostFilter === 'old-posts') {
        posts.sort((a, b) => a.timestamp - b.timestamp); 
    }
    
    container.innerHTML = ''; 
    if (posts.length === 0) {
         container.innerHTML = '<p style="text-align: center; color: var(--tg-theme-hint-color); padding: 20px;">ဤနေရာတွင် Post မရှိသေးပါ။</p>';
    } else {
        posts.forEach(post => {
            container.appendChild(createPostElement(post, userId));
        });
    }
    addPostEventListeners(userId);
}

function performDeletePost(postId, userId) {
    if (userId !== ADMIN_CHAT_ID) {
        showToast("Admin သာ ဖျက်ခွင့်ရှိပါသည်။");
        return;
    }
    
    let posts = getPosts();
    const updatedPosts = posts.filter(p => p.id !== postId);
    savePosts(updatedPosts);

    let likes = getLikes();
    delete likes[postId];
    saveLikes(likes);
    
    showToast(`Post ID ${postId} ကို ဖျက်လိုက်ပါပြီ။`);
    loadPosts(userId); 
}

function addPostEventListeners(userId) {
    document.querySelectorAll('.like-btn').forEach(button => {
        button.onclick = (e) => toggleLike(e, userId);
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.onclick = (e) => {
            const postId = parseInt(e.currentTarget.getAttribute('data-post-id'));
            
            // Use TMA confirmation dialog
            if (tg && tg.showConfirm) {
                tg.showConfirm('ဤ Post ကို ဖျက်ရန် သေချာပါသလား?', (ok) => {
                    if (ok) performDeletePost(postId, userId);
                });
            } else {
                // Fallback for non-TMA environment
                if (confirm('Delete this post?')) performDeletePost(postId, userId);
            }
        };
    });
}

function toggleLike(e, userId) {
    const postId = parseInt(e.currentTarget.getAttribute('data-post-id'));
    const userIdStr = userId.toString();
    
    let posts = getPosts();
    let likes = getLikes();
    const postIndex = posts.findIndex(p => p.id === postId);

    if (postIndex === -1) return;

    // likes[postId] is expected to be an array of user IDs (strings)
    likes[postId] = likes[postId] ? likes[postId].map(String) : []; 
    const isLiked = likes[postId].includes(userIdStr);

    if (isLiked) {
        // Unlike
        likes[postId] = likes[postId].filter(id => id !== userIdStr);
        showToast("Like ဖျက်လိုက်ပါပြီ။");
    } else {
        // Like
        likes[postId].push(userIdStr);
        showToast("Like ပေးလိုက်ပါပြီ။");
    }
    
    // Update the post's likesCount property based on the canonical source (likes object)
    posts[postIndex].likesCount = likes[postId].length; 

    saveLikes(likes);
    savePosts(posts);
    
    // Refresh the view
    loadPosts(currentUserId); 
}

function setupPostFilters() {
    const tabs = document.querySelectorAll('.filter-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const filter = tab.getAttribute('data-filter');
            
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            if (currentPostFilter !== filter) {
                currentPostFilter = filter;
                loadPosts(currentUserId); 
            }
        });
    });
}

// ===========================================
//          MODAL & MUSIC LOGIC (SIMPLE VERSION)
// ===========================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        // Add a slight delay for better transition visual
        setTimeout(() => modal.classList.add('active'), 10); 
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        // Remove display after transition
        setTimeout(() => modal.style.display = 'none', 300); 
    }
}

function updateMusicStatus(isPlaying) {
    if (musicStatusSpan) {
        const url = audioPlayer.src;
        let statusText;
        
        if (isPlaying) {
            statusText = 'Music Playing';
        } else {
            statusText = 'Music Paused (Tap to Start)';
        }
        
        musicStatusSpan.textContent = statusText;
        
        if(volumeToggleIcon) {
            volumeToggleIcon.classList.toggle('fa-volume-up', isPlaying);
            volumeToggleIcon.classList.toggle('fa-volume-off', !isPlaying);
        }
    }
}

/**
 * Music Player ကို စတင်သတ်မှတ်ခြင်း (Autoplay မလုပ်ရ)
 */
function setupMusicPlayer() { 
    audioPlayer = document.getElementById('audio-player');
    musicStatusSpan = document.getElementById('current-music-status');
    volumeToggleIcon = document.getElementById('volume-toggle');
    const musicStatusBar = document.querySelector('.music-status-bar');

    if (!audioPlayer) return;

    // Get last temporary URL, fallback to default
    let initialUrl = localStorage.getItem(TEMP_MUSIC_KEY) || INITIAL_DEFAULT_URL;
    audioPlayer.src = initialUrl;
    audioPlayer.loop = true;
    
    // Play/Pause ကို Status Bar နှင့် Volume Icon နှစ်ခုလုံးက နေ control လုပ်နိုင်သည်
    if(musicStatusBar) musicStatusBar.onclick = toggleVolume; 
    if(volumeToggleIcon) volumeToggleIcon.onclick = toggleVolume; 
    
    audioPlayer.onplay = () => {
        updateMusicStatus(true);
        if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    };
    audioPlayer.onpause = () => {
        updateMusicStatus(false);
        if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    };
    audioPlayer.onerror = (e) => {
        console.error("Audio error:", e);
        audioPlayer.pause();
        updateMusicStatus(false);
        musicStatusSpan.textContent = 'Error: Failed to load music. Check URL.';
        showToast("Music Load Error. Playing stopped.");
    };

    // Initial state setup
    updateMusicStatus(false); 
}

function toggleVolume() {
    if (!audioPlayer) return;

    if (audioPlayer.paused) {
        // Play() returns a Promise which might reject if user interaction is missing.
        audioPlayer.play().then(() => {
            // Success: updateMusicStatus is handled by onplay event
        }).catch(e => {
            console.error("Failed to play on user click:", e);
            musicStatusSpan.textContent = 'Error: Cannot play without direct user interaction.';
            showToast('Media Playback Error: Please tap the screen first to allow playback.');
        });
    } else {
        audioPlayer.pause();
    }
}

/**
 * Music URL သတ်မှတ်ခြင်း (Temporary Only, Autoplay No)
 */
function setMusicUrl(url, sourceName) {
    if (!url || !audioPlayer) return;
    
    // Temporary URL ကို သိမ်းထား (Next session အတွက် default အနေနဲ့ မှတ်ထားဖို့)
    localStorage.setItem(TEMP_MUSIC_KEY, url); 
    
    audioPlayer.src = url;
    audioPlayer.load();

    // URL အသစ်ပြောင်းရင် ဖွင့်မထားရ၊ Pause ပေးထားရမည်။
    audioPlayer.pause(); 
    
    closeModal('music-modal');
    closeModal('url-input-modal');
    showToast(`${sourceName} အသစ် သတ်မှတ်ပြီးပါပြီ။ Play Icon ကို နှိပ်ပြီး ဖွင့်ပါ။`);
}


function addMusicEventListeners() {
    // Music Button: Open Music Modal
    document.getElementById('music-button').onclick = () => {
         openModal('music-modal');
    }
    
    document.getElementById('cancel-music-modal-btn').onclick = () => closeModal('music-modal');
    
    // Music Option Clicks (Default & URL)
    document.querySelectorAll('.music-option-list .music-option').forEach(option => {
        option.onclick = (e) => {
            const type = e.currentTarget.getAttribute('data-music-type');
            
            if (type === 'default') {
                // Default ကို ဖွင့်လျှင် Temporary URL ကိုလည်း default URL အဖြစ် ပြောင်းလဲသတ်မှတ်
                setMusicUrl(INITIAL_DEFAULT_URL, "Default Track"); 
            } else if (type === 'url') {
                closeModal('music-modal'); 
                openModal('url-input-modal'); 
                // Input ကို ရှင်းပေး
                const urlInput = document.getElementById('music-url-input');
                if (urlInput) urlInput.value = ''; 
            }
        };
    });

    // Temporary URL Input Modal Logic
    document.getElementById('close-url-modal-btn').onclick = () => {
        closeModal('url-input-modal');
        openModal('music-modal'); 
    };
    document.getElementById('play-url-btn').onclick = () => {
        const urlInput = document.getElementById('music-url-input');
        const url = urlInput ? urlInput.value.trim() : '';
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            setMusicUrl(url, "Custom URL"); 
        } else {
            showToast("မှန်ကန်သော URL လင့်ခ် ထည့်ပါ။");
        }
    };
    
    // File Upload Logic
    const fileInput = document.getElementById('music-upload-input');
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setMusicUrl(url, file.name); 
        }
        // Input ကို ရှင်းပေးခြင်းဖြင့် တူညီသောဖိုင်ကို ထပ်ရွေးနိုင်မည်
        e.target.value = null; 
    };
}

// ===========================================
//          ADMIN POST LOGIC
// ===========================================

function setupAdminPostLogic(isAdmin) {
    const postAddButton = document.getElementById('post-add-button');
    const submitPostBtn = document.getElementById('submit-post-btn');
    const cancelPostBtn = document.getElementById('cancel-post-btn');
    const postInput = document.getElementById('post-input');

    if (isAdmin) {
        if (postAddButton) postAddButton.style.display = 'inline-block';

        if (postAddButton) postAddButton.onclick = () => openModal('post-modal');
        if (cancelPostBtn) cancelPostBtn.onclick = () => closeModal('post-modal');

        if (submitPostBtn && postInput) {
            submitPostBtn.onclick = () => {
                const content = postInput.value.trim();
                if (content.length > 5) { // Minimum post length
                    let posts = getPosts();
                    const newPost = {
                        id: Date.now(), // Use timestamp as unique ID
                        authorId: currentUserId,
                        authorName: currentUserName, 
                        isAdmin: true,
                        content: content,
                        timestamp: Date.now(), 
                        likesCount: 0
                    };
                    posts.push(newPost);
                    savePosts(posts);
                    postInput.value = ''; 
                    
                    // Post အသစ်တင်ရင် New Posts tab ကို ပြန်ပြမည်
                    if (currentPostFilter !== 'new-posts') {
                        document.getElementById('new-posts-tab').click(); 
                    } else {
                        loadPosts(currentUserId);
                    }
                    closeModal('post-modal'); 
                    showToast("Post တင်ပြီးပါပြီ။");
                } else {
                    showToast("Post content သည် အနည်းဆုံး စာလုံး ၅ လုံး ရှိရပါမည်။");
                }
            };
        }
    } else {
         if (postAddButton) postAddButton.style.display = 'none';
    }
}


// ===========================================
//          PROFILE PHOTO LOGIC
// ===========================================

function updateProfileDisplay(userId, fullName, is_admin) {
    const tgUser = tg ? tg.initDataUnsafe.user : null;
    const username = tgUser ? tgUser.username : null;
    
    if (document.getElementById('profile-display-name')) document.getElementById('profile-display-name').textContent = fullName || 'Name Not Available';
    if (document.getElementById('profile-display-username')) document.getElementById('profile-display-username').textContent = username ? `@${username}` : 'N/A';
    // Chat ID ကို update
    if (document.getElementById('telegram-chat-id')) document.getElementById('telegram-chat-id').textContent = userId.toString();
    
    const adminStatusEl = document.getElementById('admin-status');
    if (adminStatusEl) adminStatusEl.textContent = is_admin ? 'Administrator' : 'Regular User';
    if (adminStatusEl) adminStatusEl.style.backgroundColor = is_admin ? '#ff8a00' : 'var(--tg-theme-link-color)'; // Admin Color: Orange
    
    const tgPhotoUrl = tgUser ? tgUser.photo_url : null;
    const profileAvatarPlaceholder = document.getElementById('profile-avatar-placeholder');

    if (profileAvatarPlaceholder) {
        if (tgPhotoUrl) {
            // Image found, load it
            profileAvatarPlaceholder.innerHTML = `<img src="${tgPhotoUrl}" alt="${fullName || 'Profile Photo'}" onerror="this.onerror=null; this.src='https://placehold.co/80x80/333/fff?text=${(fullName.charAt(0) || 'U').toUpperCase()}'">`;
            profileAvatarPlaceholder.style.backgroundColor = 'transparent';
            profileAvatarPlaceholder.textContent = '';
        } else {
            // No image, use color/initials fallback
            const userIdStr = userId.toString();
            const userColor = stringToColor(userIdStr);
            const initial = (fullName.charAt(0) || 'U').toUpperCase();
            profileAvatarPlaceholder.innerHTML = ''; 
            profileAvatarPlaceholder.style.backgroundColor = userColor;
            profileAvatarPlaceholder.textContent = initial;
        }
    }
}


// ===========================================
//          NAVIGATION & MAIN ENTRY
// ===========================================

function switchScreen(targetScreenId) {
    document.querySelectorAll('.content .screen').forEach(screen => screen.classList.remove('active'));
    
    const targetScreen = document.getElementById(targetScreenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
    
    // Fixed Header ၏ Visibility ကို Home Screen အတွက်သာ ဖွင့်/ပိတ်
    const fixedHeader = document.querySelector('.fixed-header-area');
    if (fix

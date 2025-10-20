// ********** SET YOUR ADMIN CHAT ID HERE **********
// ဤနေရာတွင် သင်၏ Telegram Chat ID ကို ထည့်သွင်းပါ။ (ဥပမာ: 123456789)
const ADMIN_CHAT_ID = 1924452453; 
// *************************************************

// --- LOCAL STORAGE KEYS ---
const POSTS_STORAGE_KEY = 'tma_community_posts_v4'; 
const LIKES_STORAGE_KEY = 'tma_user_likes_v4'; 
const TEMP_MUSIC_KEY = 'tma_temp_music_url_v4'; 

// --- Global Variables ---
// Default Music URL (Ensure it's a direct link to an audio file)
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
        // Clear existing timeout if it exists
        clearTimeout(toast.timeoutId);
        
        toast.textContent = message;
        toast.classList.add('show');
        
        toast.timeoutId = setTimeout(() => {
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
    
    // Check if execCommand is available (fallback method)
    let success = false;
    try {
        success = document.execCommand('copy');
    } catch (err) {
        /* ignore */
    }
    
    // Use modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(chatId.toString()).then(() => {
            showToast('Chat ID ကူးယူပြီးပါပြီ။');
        }).catch(() => {
            // Fallback
            if (success) {
                showToast('Chat ID ကူးယူပြီးပါပြီ။ (Legacy Copy)');
            } else {
                showToast('ကူးယူမရပါ၊ စာသားကို ကိုယ်တိုင်ရွေးချယ်ကူးယူပေးပါ။');
            }
        });
    } else if (success) {
        showToast('Chat ID ကူးယူပြီးပါပြီ။');
    } else {
        showToast('ကူးယူမရပါ၊ စာသားကို ကိုယ်တိုင်ရွေးချယ်ကူးယူပေးပါ။');
    }
    
    document.body.removeChild(tempInput);
}

// ===========================================
//          DATA STORAGE HANDLERS
// ===========================================

function getPosts() {
    try {
        const posts = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || '[]');
        return Array.isArray(posts) ? posts : []; 
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
        // Inform user if storage quota exceeded (common in sandboxed environments)
        showToast("Error saving data. Storage full?"); 
    }
}

function getLikes() {
    try {
        const likes = JSON.parse(localStorage.getItem(LIKES_STORAGE_KEY) || '{}');
        return typeof likes === 'object' && likes !== null ? likes : {}; 
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
    }
}

// ===========================================
//          POSTS & LIKES LOGIC
// ===========================================

function createPostElement(post, currentUserId) {
    const likes = getLikes();
    const userIdStr = currentUserId.toString(); 
    // Likes array: ensure all IDs are strings for consistent comparison
    const postLikesArray = likes[post.id] ? likes[post.id].map(String) : [];
    const isLiked = postLikesArray.includes(userIdStr);
    const isAdmin = (currentUserId === ADMIN_CHAT_ID);
    
    const postElement = document.createElement('div');
    postElement.className = 'post-card';
    postElement.setAttribute('data-post-id', post.id);

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

    // Apply sorting based on filter
    if (currentPostFilter === 'new-posts') {
        posts.sort((a, b) => b.timestamp - a.timestamp); 
        posts = posts.slice(0, NEW_POSTS_LIMIT);
    } else if (currentPostFilter === 'old-posts') {
        posts.sort((a, b) => a.timestamp - b.timestamp); 
    }
    
    container.innerHTML = ''; 
    if (posts.length === 0) {
         container.innerHTML = '<p class="loading-text">ဤနေရာတွင် Post မရှိသေးပါ။</p>';
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
        // Use a function wrapper to ensure correct userId is passed
        button.onclick = (e) => toggleLike(e, userId); 
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.onclick = (e) => {
            const postId = parseInt(e.currentTarget.getAttribute('data-post-id'));
            
            // Use TMA confirmation dialog (if available)
            if (tg && tg.showConfirm) {
                tg.showConfirm('ဤ Post ကို ဖျက်ရန် သေချာပါသလား?', (ok) => {
                    if (ok) performDeletePost(postId, userId);
                });
            } else {
                // Fallback (Note: The canvas environment generally discourages `confirm()`)
                console.warn("TMA Confirm not available. Using fallback.");
                performDeletePost(postId, userId);
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

    likes[postId] = likes[postId] ? likes[postId].map(String) : []; 
    const isLiked = likes[postId].includes(userIdStr);

    if (isLiked) {
        likes[postId] = likes[postId].filter(id => id !== userIdStr);
        showToast("Like ဖျက်လိုက်ပါပြီ။");
    } else {
        likes[postId].push(userIdStr);
        showToast("Like ပေးလိုက်ပါပြီ။");
    }
    
    // Update the post's likesCount (redundant but useful for data integrity)
    posts[postIndex].likesCount = likes[postId].length; 

    saveLikes(likes);
    savePosts(posts);
    
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
                // Force scroll to top when changing filters for better UX
                const contentArea = document.querySelector('.content');
                if (contentArea) contentArea.scrollTop = 0;
                loadPosts(currentUserId); 
            }
        });
    });
}

// ===========================================
//          MODAL & MUSIC LOGIC
// ===========================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        // Use requestAnimationFrame for next tick CSS transition application
        requestAnimationFrame(() => modal.classList.add('active')); 
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        // Wait for CSS transition (300ms) before hiding display
        setTimeout(() => modal.style.display = 'none', 300); 
    }
}

function updateMusicStatus(isPlaying) {
    if (musicStatusSpan) {
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
            // Vibrate on state change if haptic feedback is available
            if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light'); 
        }
    }
}

/**
 * Music Player ကို စတင်သတ်မှတ်ခြင်း
 */
function setupMusicPlayer() { 
    audioPlayer = document.getElementById('audio-player');
    musicStatusSpan = document.getElementById('current-music-status');
    volumeToggleIcon = document.getElementById('volume-toggle');
    const musicStatusBar = document.querySelector('.music-status-bar');

    if (!audioPlayer) return;

    let initialUrl = localStorage.getItem(TEMP_MUSIC_KEY) || INITIAL_DEFAULT_URL;
    audioPlayer.src = initialUrl;
    audioPlayer.loop = true;
    
    if(musicStatusBar) musicStatusBar.onclick = toggleVolume; 
    if(volumeToggleIcon) volumeToggleIcon.onclick = toggleVolume; 
    
    // Event listeners to keep status in sync
    audioPlayer.onplay = () => updateMusicStatus(true);
    audioPlayer.onpause = () => updateMusicStatus(false);
    audioPlayer.onerror = (e) => {
        console.error("Audio error:", e);
        audioPlayer.pause();
        updateMusicStatus(false);
        musicStatusSpan.textContent = 'Error: Failed to load music.';
        showToast("Music Load Error. Playing stopped.");
    };

    updateMusicStatus(false); 
}

function toggleVolume() {
    if (!audioPlayer) return;

    if (audioPlayer.paused) {
        audioPlayer.play().catch(e => {
            console.error("Failed to play on user click (browser policy):", e);
            musicStatusSpan.textContent = 'Error: Tap to Play blocked.';
            showToast('Media Playback Error: Please tap the screen first to allow playback.');
        });
    } else {
        audioPlayer.pause();
    }
}

function setMusicUrl(url, sourceName) {
    if (!url || !audioPlayer) return;
    
    // Validate URL format (simple check)
    if (!url.match(/^https?:\/\/.+\..+$/)) {
        showToast("URL format မမှန်ပါ၊ http/https လိုအပ်ပါသည်။");
        return;
    }

    localStorage.setItem(TEMP_MUSIC_KEY, url); 
    
    audioPlayer.src = url;
    audioPlayer.load();

    audioPlayer.pause(); // Reset to paused when changing source
    
    closeModal('music-modal');
    closeModal('url-input-modal');
    showToast(`${sourceName} အသစ် သတ်မှတ်ပြီးပါပြီ။ Play Icon ကို နှိပ်ပြီး ဖွင့်ပါ။`);
}


function addMusicEventListeners() {
    document.getElementById('music-button').onclick = () => openModal('music-modal');
    document.getElementById('cancel-music-modal-btn').onclick = () => closeModal('music-modal');
    
    document.querySelectorAll('.music-option-list .music-option').forEach(option => {
        option.onclick = (e) => {
            const type = e.currentTarget.getAttribute('data-music-type');
            
            if (type === 'default') {
                setMusicUrl(INITIAL_DEFAULT_URL, "Default Track"); 
            } else if (type === 'url') {
                closeModal('music-modal'); 
                openModal('url-input-modal'); 
                const urlInput = document.getElementById('music-url-input');
                if (urlInput) urlInput.value = localStorage.getItem(TEMP_MUSIC_KEY) === INITIAL_DEFAULT_URL ? '' : localStorage.getItem(TEMP_MUSIC_KEY) || ''; 
            }
        };
    });

    document.getElementById('close-url-modal-btn').onclick = () => {
        closeModal('url-input-modal');
        openModal('music-modal'); 
    };
    document.getElementById('play-url-btn').onclick = () => {
        const urlInput = document.getElementById('music-url-input');
        const url = urlInput ? urlInput.value.trim() : '';
        if (url) {
            setMusicUrl(url, "Custom URL"); 
        } else {
            showToast("Music URL လင့်ခ် ထည့်ပါ။");
        }
    };
    
    const fileInput = document.getElementById('music-upload-input');
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setMusicUrl(url, file.name); 
        }
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
                if (content.length > 5 && content.length <= 500) { // Max 500 characters
                    let posts = getPosts();
                    const newPost = {
                        id: Date.now(), 
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
                    
                    if (currentPostFilter !== 'new-posts') {
                        document.getElementById('new-posts-tab').click(); 
                    } else {
                        loadPosts(currentUserId);
                    }
                    closeModal('post-modal'); 
                    showToast("Post တင်ပြီးပါပြီ။");
                } else {
                    showToast("Post content သည် စာလုံး ၅ လုံး မှ ၅၀၀ အထိသာ ရှိရပါမည်။");
                }
            };
        }
    } else {
         if (postAddButton) postAddButton.style.display = 'none';
    }
}


// ===========================================
//          PROFILE LOGIC
// ===========================================

function updateProfileDisplay(userId, fullName, is_admin) {
    const tgUser = tg ? tg.initDataUnsafe.user : null;
    const username = tgUser ? tgUser.username : null;
    
    // Update text elements
    if (document.getElementById('profile-display-name')) document.getElementById('profile-display-name').textContent = fullName || 'User';
    if (document.getElementById('profile-display-username')) document.getElementById('profile-display-username').textContent = username ? `@${username}` : 'N/A';
    if (document.getElementById('telegram-chat-id')) document.getElementById('telegram-chat-id').textContent = userId.toString();
    
    // Update status badge
    const adminStatusEl = document.getElementById('admin-status');
    if (adminStatusEl) adminStatusEl.textContent = is_admin ? 'Administrator' : 'Regular User';
    if (adminStatusEl) adminStatusEl.style.backgroundColor = is_admin ? 'var(--tg-theme-accent)' : 'var(--tg-theme-link-color)'; 
    
    // Update Avatar (Photo or Initials)
    const tgPhotoUrl = tgUser ? tgUser.photo_url : null;
    const profileAvatarPlaceholder = document.getElementById('profile-avatar-placeholder');

    if (profileAvatarPlaceholder) {
        if (tgPhotoUrl) {
            // Use Telegram photo if available
            profileAvatarPlaceholder.innerHTML = `<img src="${tgPhotoUrl}" alt="${fullName || 'Profile Photo'}">`;
            profileAvatarPlaceholder.style.backgroundColor = 'transparent';
            profileAvatarPlaceholder.textContent = '';
        } else {
            // Use colored initials fallback
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
//          CORE NEW FEATURE: INVITE FRIENDS
// ===========================================

function setupInviteFriendsLogic() {
    const inviteBtn = document.getElementById('invite-friends-btn');
    if (inviteBtn) {
        inviteBtn.addEventListener('click', () => {
            if (tg && tg.showInvitePopup) {
                // This call opens the native Telegram Share/Invite dialog
                tg.showInvitePopup(); 
            } else {
                showToast("Telegram Invite Feature ကို အသုံးပြုနိုင်ရန် TMA တွင် ဖွင့်ပါ။");
            }
        });
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
        // Scroll content to top when switching screens
        const contentArea = document.querySelector('.content');
        if (contentArea) contentArea.scrollTop = 0;
    }
    
    // Fixed Header ၏ Visibility ကို Home Sc

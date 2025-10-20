// ********** SET YOUR ADMIN CHAT ID HERE **********
const ADMIN_CHAT_ID = 1924452453; 
// *************************************************

// --- LOCAL STORAGE KEYS ---
const POSTS_STORAGE_KEY = 'tma_community_posts_v4'; 
const LIKES_STORAGE_KEY = 'tma_user_likes_v4'; 
const TEMP_MUSIC_KEY = 'tma_temp_music_url_v4'; 

// --- Global Variables ---
const INITIAL_DEFAULT_URL = 'https://archive.org/download/lofi-chill-1-20/lofi_chill_03_-_sleepwalker.mp3'; 

let audioPlayer;
let musicStatusSpan;
let volumeToggleIcon;
let currentUserId = 0; 
let currentUserName = 'Guest';
let is_admin = false; 
let currentPostFilter = 'new-posts'; 
const NEW_POSTS_LIMIT = 50; 
let isMusicMuted = false; // NEW Mute/Unmute state

// Telegram Web App Global Reference
let tg = null;

// ===========================================
//          HELPER FUNCTIONS
// ===========================================

/**
 * Generates a color based on a string for avatar backgrounds.
 * @param {string} str 
 * @returns {string} Hex color code.
 */
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        // Adjusted for better pastel-like colors
        const brightened = Math.floor(value * 0.7 + 0x55); 
        color += ('00' + brightened.toString(16)).substr(-2);
    }
    return color;
}

/**
 * Displays a custom toast notification.
 * @param {string} message 
 */
function showToast(message) {
    const toast = document.getElementById('custom-toast');
    if (!toast) return;

    clearTimeout(toast.timeoutId);
    toast.textContent = message;
    toast.classList.add('show');
    
    toast.timeoutId = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
    
    if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

/**
 * Copies a string to the clipboard.
 * @param {string} text 
 */
function copyToClipboard(text, successMsg = 'ကူးယူပြီးပါပြီ။') {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(successMsg);
        }).catch(() => {
            performLegacyCopy(text);
        });
    } else {
        performLegacyCopy(text);
    }
}

/**
 * Fallback for copying text.
 * @param {string} text 
 */
function performLegacyCopy(text) {
    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    tempInput.style.position = 'absolute';
    tempInput.style.left = '-9999px';
    document.body.appendChild(tempInput);
    
    tempInput.select();
    tempInput.setSelectionRange(0, 99999); 
    
    try {
        const success = document.execCommand('copy');
        if (success) {
            showToast('ကူးယူပြီးပါပြီ။');
        } else {
            showToast('ကူးယူမရပါ၊ စာသားကို ကိုယ်တိုင်ရွေးချယ်ကူးယူပေးပါ။');
        }
    } catch (err) {
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
        // Ensure posts are valid array objects
        return Array.isArray(posts) ? posts.filter(p => p && p.id && p.content) : []; 
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
//          POSTS & LIKES LOGIC (Refactored)
// ===========================================

/**
 * Creates the HTML element for a single post.
 * @param {object} post 
 * @param {number} userId 
 * @returns {HTMLElement}
 */
function createPostElement(post, userId) {
    const likes = getLikes();
    const userIdStr = userId.toString(); 
    // Ensure likes[post.id] is an array of strings
    const postLikesArray = Array.isArray(likes[post.id]) ? likes[post.id].map(String) : []; 
    const isLiked = postLikesArray.includes(userIdStr);
    const isAdmin = (userId === ADMIN_CHAT_ID); 
    
    const postElement = document.createElement('div');
    postElement.className = 'post-card';
    postElement.setAttribute('data-post-id', post.id);

    const displayLikesCount = postLikesArray.length; 

    // Date formatting (Myanmar style, simpler)
    const date = new Date(post.timestamp);
    const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeString = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const deleteButton = isAdmin 
        ? `<button class="delete-btn" data-post-id="${post.id}"><i class="fas fa-trash"></i> Delete</button>` 
        : '';

    postElement.innerHTML = `
        <p class="post-content">${post.content}</p>
        <div class="post-actions">
            <button class="like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post.id}" aria-label="${isLiked ? 'Unlike' : 'Like'} Post">
                <i class="fas fa-heart"></i> 
                ${displayLikesCount}
            </button>
            <span class="post-timestamp" style="font-size: 0.75rem; color: var(--tg-theme-hint-color); margin-left: auto;">
                ${dateString} ${timeString}
            </span>
            ${deleteButton}
        </div>
    `;
    return postElement;
}

/**
 * Loads and renders posts based on the current filter.
 * @param {number} userId 
 */
function loadPosts(userId) {
    currentUserId = userId; 
    let posts = getPosts();
    const container = document.getElementById('posts-container');
    
    if (!container) return;

    // Show initial loading text/spinner (if re-loading)
    container.innerHTML = '<p class="initial-loading-text">Post များအား ဖတ်နေပါသည်။...</p>'; 

    // Apply sorting based on filter
    if (currentPostFilter === 'new-posts') {
        posts.sort((a, b) => b.timestamp - a.timestamp); 
        posts = posts.slice(0, NEW_POSTS_LIMIT); 
    } else if (currentPostFilter === 'old-posts') {
        posts.sort((a, b) => a.timestamp - b.timestamp); 
    }
    
    // Clear the container before re-rendering
    container.innerHTML = ''; 

    if (posts.length === 0) {
         container.innerHTML = '<p class="initial-loading-text">ဤနေရာတွင် Post မရှိသေးပါ။ Admin က တင်ပေးပါလိမ့်မည်။</p>';
    } else {
        posts.forEach(post => {
            container.appendChild(createPostElement(post, userId));
        });
    }
    addPostEventListeners(userId);
}

/**
 * Permanently deletes a post and its associated likes.
 * @param {number} postId 
 * @param {number} userId 
 */
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
    
    showToast(`Post (ID: ${postId}) ကို ဖျက်လိုက်ပါပြီ။`);
    loadPosts(userId); 
}

/**
 * Toggles a like on a post.
 * @param {Event} e 
 * @param {number} userId 
 */
function toggleLike(e, userId) {
    // Ensure postId is a Number from the attribute
    const postId = parseInt(e.currentTarget.getAttribute('data-post-id')); 
    const userIdStr = userId.toString();
    
    let likes = getLikes();
    
    // Initialize post likes array if it doesn't exist
    likes[postId] = Array.isArray(likes[postId]) ? likes[postId].map(String) : []; 
    
    const isLiked = likes[postId].includes(userIdStr);

    if (isLiked) {
        // Unlike: remove userIdStr
        likes[postId] = likes[postId].filter(id => id !== userIdStr);
        showToast("Like ဖျက်လိုက်ပါပြီ။");
    } else {
        // Like: add userIdStr
        likes[postId].push(userIdStr);
        showToast("Like ပေးလိုက်ပါပြီ။");
    }
    
    saveLikes(likes);
    
    // Efficiently re-render posts without a full page refresh
    loadPosts(currentUserId); 
}

/**
 * Adds event listeners to all newly rendered posts.
 * @param {number} userId 
 */
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
                if (window.confirm('ဤ Post ကို ဖျက်ရန် သေချာပါသလား?')) {
                     performDeletePost(postId, userId);
                }
            }
        };
    });
}

/**
 * Sets up event listeners for post filter tabs.
 */
function setupPostFilters() {
    const tabs = document.querySelectorAll('.filter-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const filter = tab.getAttribute('data-filter');
            
            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            
            if (currentPostFilter !== filter) {
                currentPostFilter = filter;
                const contentArea = document.querySelector('.content');
                if (contentArea) contentArea.scrollTop = 0;
                loadPosts(currentUserId); 
            }
        });
    });
}

// ===========================================
//          MODAL & MUSIC LOGIC (Refactored & Fixed)
// ===========================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('active')); 
    
    // Hide FAB when modal opens
    const fab = document.getElementById('post-add-button');
    if (fab) fab.style.display = 'none';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
        
        // Show FAB back if we're on home screen and admin
        const homeScreen = document.getElementById('home-screen');
        if (homeScreen && homeScreen.classList.contains('active') && is_admin) {
            const fab = document.getElementById('post-add-button');
            if (fab) fab.style.display = 'flex'; 
        }
    }, 400); 
}

/**
 * Updates the visual status of the music player.
 * @param {boolean} isPlaying 
 */
function updateMusicStatus(isPlaying) {
    if (!musicStatusSpan || !volumeToggleIcon) return;

    let statusText = isPlaying ? '🎶 Music Playing 🎶' : 'Music Paused (Tap Volume Icon to Start)';
    musicStatusSpan.textContent = statusText;
    
    // Always show the correct volume icon based on mute state
    if (isPlaying) {
        volumeToggleIcon.classList.toggle('fa-volume-up', !isMusicMuted);
        volumeToggleIcon.classList.toggle('fa-volume-off', isMusicMuted);
    } else {
        // If paused, always show volume-off icon (or just music icon, but off is clearer)
        volumeToggleIcon.classList.remove('fa-volume-up');
        volumeToggleIcon.classList.add('fa-volume-off');
    }
}

/**
 * Handles playing and muting logic.
 */
function toggleVolume() {
    if (!audioPlayer) return;

    if (audioPlayer.paused) {
        // Try to play
        audioPlayer.volume = isMusicMuted ? 0 : 1; // Apply mute state before playing
        audioPlayer.play().then(() => {
             showToast(isMusicMuted ? "Music Muted ဖြင့် စတင်ဖွင့်ပါသည်။" : "Music စတင်ဖွင့်ပါသည်။");
        }).catch(e => {
            console.error("Failed to play on user click:", e);
            musicStatusSpan.textContent = 'Error: Tap to Play blocked.';
            showToast('Media Playback Error: Please tap the screen first to allow playback.');
        });
    } else {
        // Toggle mute state (only affects volume, not play/pause state)
        isMusicMuted = !isMusicMuted;
        audioPlayer.volume = isMusicMuted ? 0 : 1;

        if (isMusicMuted) {
            showToast("Music Muted.");
        } else {
            showToast("Music Unmuted.");
        }
        updateMusicStatus(true); // Still playing, but mute state changed
    }
}


function setupMusicPlayer() { 
    audioPlayer = document.getElementById('audio-player');
    musicStatusSpan = document.getElementById('current-music-status');
    volumeToggleIcon = document.getElementById('volume-toggle');

    if (!audioPlayer) return;

    let initialUrl = localStorage.getItem(TEMP_MUSIC_KEY) || INITIAL_DEFAULT_URL;
    audioPlayer.src = initialUrl;
    audioPlayer.loop = true;
    audioPlayer.volume = isMusicMuted ? 0 : 1; 
    
    // Only volumeToggleIcon will handle click (Cleaner logic)
    if(volumeToggleIcon) volumeToggleIcon.onclick = toggleVolume; 
    
    // Music status bar is for display, not primary control
    const musicStatusBar = document.querySelector('.music-status-bar');
    if (musicStatusBar) musicStatusBar.onclick = () => showToast("Volume Icon တွင် နှိပ်ပြီး Music ကို ထိန်းချုပ်ပါ။");

    // Events
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

function setMusicUrl(url, sourceName) {
    if (!url || !audioPlayer) return;
    
    if (!url.match(/^https?:\/\/.+\..+$/) && url !== INITIAL_DEFAULT_URL && !url.startsWith('blob:')) {
        showToast("URL format မမှန်ပါ၊ http/https လိုအပ်ပါသည်။");
        return;
    }

    localStorage.setItem(TEMP_MUSIC_KEY, url); 
    
    audioPlayer.src = url;
    audioPlayer.load();

    audioPlayer.pause(); 
    
    closeModal('music-modal');
    closeModal('url-input-modal');
    showToast(`${sourceName} အသစ် သတ်မှတ်ပြီးပါပြီ။ Volume Icon ကို နှိပ်ပြီး ဖွင့်ပါ။`);
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
//          ADMIN POST LOGIC (Fixed)
// ===========================================

function setupAdminPostLogic(isAdmin) {
    const postAddButton = document.getElementById('post-add-button');
    const submitPostBtn = document.getElementById('submit-post-btn');
    const cancelPostBtn = document.getElementById('cancel-post-btn');
    const postInput = document.getElementById('post-input');

    if (isAdmin) {
        // Show FAB only if it's an admin
        if (postAddButton) postAddButton.style.display = 'flex'; 

        if (postAddButton) postAddButton.onclick = () => openModal('post-modal');
        if (cancelPostBtn) cancelPostBtn.onclick = () => closeModal('post-modal');

        if (submitPostBtn && postInput) {
            submitPostBtn.onclick = () => {
                const content = postInput.value.trim();
                if (content.length > 5 && content.length <= 500) { 
                    let posts = getPosts();
                    const newPost = {
                        // Use Date.now() for unique ID and timestamp
                        id: Date.now(), 
                        authorId: currentUserId,
                        authorName: currentUserName, 
                        isAdmin: true,
                        content: content,
                        timestamp: Date.now(), 
                    };
                    posts.push(newPost);
                    savePosts(posts);
                    postInput.value = ''; 
                    
                    // Switch to New Posts tab if a new post is made
                    const newPostsTab = document.getElementById('new-posts-tab');
                    if (currentPostFilter !== 'new-posts' && newPostsTab) {
                        newPostsTab.click(); 
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
    
    document.getElementById('profile-display-name').textContent = fullName || 'User';
    document.getElementById('profile-display-username').textContent = username ? `@${username}` : 'N/A';
    document.getElementById('telegram-chat-id').textContent = userId.toString();
    
    const adminStatusEl = document.getElementById('admin-status');
    adminStatusEl.textContent = is_admin ? 'Administrator' : 'Regular User';
    adminStatusEl.style.backgroundColor = is_admin ? 'var(--tg-theme-accent)' : 'var(--tg-theme-link-color)'; 
    
    const tgPhotoUrl = tgUser ? tgUser.photo_url : null;
    const profileAvatarPlaceholder = document.getElementById('profile-avatar-placeholder');

    if (profileAvatarPlaceholder) {
        if (tgPhotoUrl) {
            profileAvatarPlaceholder.innerHTML = `<img src="${tgPhotoUrl}" alt="${fullName || 'Profile Photo'}">`;
            profileAvatarPlaceholder.style.backgroundColor = 'transparent';
            profileAvatarPlaceholder.textContent = '';
        } else {
            const userIdStr = userId.toString();
            const userColor = stringToColor(userIdStr);
            const initial = (fullName.charAt(0) || 'U').toUpperCase();
            profileAvatarPlaceholder.innerHTML = ''; 
            profileAvatarPlaceholder.style.backgroundColor = userColor;
            profileAvatarPlaceholder.textContent = initial;
        }
    }
}

function setupProfileListeners() {
    // 1. Chat ID Copy Button
    const copyBtn = document.getElementById('chat-id-copy-btn');
    if (copyBtn) {
        copyBtn.onclick = () => copyToClipboard(currentUserId.toString(), 'Chat ID ကူးယူပြီးပါပြီ။');
    }
    
    // 2. TMA Close Button
    const closeBtn = document.getElementById('tma-close-btn');
    if (closeBtn) {
        closeBtn.onclick = () => {
            if (tg && tg.close) {
                tg.close();
            } else {
                showToast("Mini App Close API Not Available.");
            }
        };
    }
    
    // 3. Invite Friends Logic 
    const inviteBtn = document.getElementById('invite-friends-btn');
    if (inviteBtn) {
        inviteBtn.addEventListener('click', () => {
            if (tg && tg.showInvitePopup) {
                tg.showInvitePopup(); 
            } else {
                showToast("Telegram Invite Feature ကို အသုံးပြုနိုင်ရန် TMA တွင် ဖွင့်ပါ။");
            }
        });
    }
}


// ===========================================
//          NAVIGATION & MAIN ENTRY (Fixed)
// ===========================================

function switchScreen(targetScreenId) {
    document.querySelectorAll('.content .screen').forEach(screen => screen.classList.remove('active'));
    
    const targetScreen = document.getElementById(targetScreenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        const contentArea = document.querySelector('.content');
        if (contentArea) contentArea.scrollTop = 0;
    }
    
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
        if (item.getAttribute('data-screen') === targetScreenId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Header Visibility & FAB Logic (FIXED: Handles FAB visibility based on screen)
    const fixedHeaderArea = document.querySelector('.fixed-header-area');
    const fab = document.getElementById('post-add-button');
    const contentArea = document.querySelector('.content');

    if (targetScreenId === 'profile-screen') {
        if (fixedHeaderArea) fixedHeaderArea.style.display = 'none';
        if (contentArea) contentArea.style.paddingTop = '20px'; // Adjusted padding for profile screen
        if (fab) fab.style.display = 'none';
    } else { // home-screen
        if (fixedHeaderArea) fixedHeaderArea.style.display = 'block';
        if (contentArea) contentArea.style.paddingTop = '145px'; // Space for the fixed header height
        if (fab && is_admin) fab.style.display = 'flex'; // Show FAB for admin on home
    }
}

function addNavigationListeners() {
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const screenId = e.currentTarget.getAttribute('data-screen');
            if (screenId) {
                switchScreen(screenId);
            }
        });
    });
}

function main() {
    // 1. Determine User Info and Admin Status (Ensure ID is an integer)
    const user = tg.initDataUnsafe.user;
    if (user && user.id) {
        currentUserId = parseInt(user.id); 
        currentUserName = user.first_name || 'User'; 
        is_admin = currentUserId === ADMIN_CHAT_ID;
    }
    
    // 2. Setup Core Components
    addNavigationListeners();
    setupPostFilters();
    setupMusicPlayer();
    addMusicEventListeners();
    setupProfileListeners();
    setupAdminPostLogic(is_admin);
    
    // 3. Load Data & Update UI
    updateProfileDisplay(currentUserId, currentUserName, is_admin);
    loadPosts(currentUserId); 
    
    // 4. Set Initial Screen Padding (Home Screen is default active)
    switchScreen('home-screen');

    // 5. Signal TMA is ready
    if (tg.MainButton) tg.MainButton.hide(); 
    tg.ready();
}

/**
 * Telegram Web App SDK ကို စနစ်တကျ စတင်ခြင်း (Theme Fix ပါဝင်သည်)
 */
function setupTMA() {
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;

        // Apply TMA theme colors for a native feel (Ensured all colors are set)
        const themeParams = tg.themeParams;
        if (themeParams) {
            const root = document.documentElement;
            const themeMap = {
                '--tg-theme-bg-color': themeParams.bg_color,
                '--tg-theme-text-color': themeParams.text_color,
                '--tg-theme-link-color': themeParams.link_color,
                '--tg-theme-hint-color': themeParams.hint_color,
                '--tg-theme-button-color': themeParams.button_color,
                '--tg-theme-button-text-color': themeParams.button_text_color,
                '--tg-theme-secondary-bg-color': themeParams.secondary_bg_color,
                '--tg-theme-destructive-text-color': themeParams.destructive_text_color
            };
            
            for (const [prop, value] of Object.entries(themeMap)) {
                if (value) root.style.setProperty(prop, value);
            }
            
            // Apply background color directly to body for immediate effect
            document.body.style.backgroundColor = themeParams.bg_color || 'var(--tg-theme-bg-color)';
        }

        // Initialize Main App Logic
        main();
        
    } else {
        // Fallback for testing outside Telegram (Mock Data)
        console.warn("Telegram WebApp SDK not found. Running in fallback mode.");
        
        const mockUserId = ADMIN_CHAT_ID + 100; 
        
        tg = {
            initDataUnsafe: { user: { id: mockUserId, first_name: "Local", username: "local_tester", photo_url: null } },
            themeParams: {},
            ready: () => console.log('TMA Mock Ready'),
            close: () => console.log('TMA Mock Close'),
            showInvitePopup: () => showToast("Invite Popup (Mock): TMA Environment တွင်သာ အလုပ်လုပ်ပါမည်။"),
            showConfirm: (msg, callback) => callback(window.confirm(msg)),
            HapticFeedback: { impactOccurred: () => console.log('Haptic: Light') },
            MainButton: { hide: () => console.log('MainButton: Hide') }
        };
        document.body.style.backgroundColor = 'var(--tg-theme-bg-color)';

        main();
    }
}

// Start the entire application logic after DOM is fully loaded
document.addEventListener('DOMContentLoaded', setupTMA); 

// ********** SET YOUR ADMIN CHAT ID HERE **********
// ဤနေရာတွင် သင်၏ Telegram Chat ID ကို ထည့်သွင်းပါ။ (ဥပမာ: 123456789)
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

// Telegram Web App Global Reference
let tg = null;

// ===========================================
//          HELPER FUNCTIONS
// ===========================================

function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        const brightened = Math.floor(value * 0.7 + 0x33); 
        color += ('00' + brightened.toString(16)).substr(-2);
    }
    return color;
}

function showToast(message) {
    const toast = document.getElementById('custom-toast');
    if (toast) {
        clearTimeout(toast.timeoutId);
        toast.textContent = message;
        toast.classList.add('show');
        
        toast.timeoutId = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
        
        // Haptic feedback (subtle)
        if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    }
}

function copyChatId(chatId) {
    const chatIdStr = chatId.toString();
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(chatIdStr).then(() => {
            showToast('Chat ID ကူးယူပြီးပါပြီ။');
        }).catch(() => {
            performLegacyCopy(chatIdStr);
        });
    } else {
        performLegacyCopy(chatIdStr);
    }
}

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
//          DATA STORAGE HANDLERS (No Change)
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
//          POSTS & LIKES LOGIC (Cleaned)
// ===========================================

function createPostElement(post, currentUserId) {
    const likes = getLikes();
    const userIdStr = currentUserId.toString(); 
    const postLikesArray = likes[post.id] ? likes[post.id].map(String) : [];
    const isLiked = postLikesArray.includes(userIdStr);
    // Use strict equality for admin check
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
                ${displayLikesCount}
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
    // Ensure userId is Number for comparison
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
    
    showToast(`Post ကို ဖျက်လိုက်ပါပြီ။`);
    loadPosts(userId); 
}

function addPostEventListeners(userId) {
    document.querySelectorAll('.like-btn').forEach(button => {
        button.onclick = (e) => toggleLike(e, userId); 
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.onclick = (e) => {
            const postId = parseInt(e.currentTarget.getAttribute('data-post-id'));
            
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
    
    saveLikes(likes);
    
    // Re-render the posts to update the like count and state
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
                const contentArea = document.querySelector('.content');
                if (contentArea) contentArea.scrollTop = 0;
                loadPosts(currentUserId); 
            }
        });
    });
}

// ===========================================
//          MODAL & MUSIC LOGIC (No Change)
// ===========================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        requestAnimationFrame(() => modal.classList.add('active')); 
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 400); // Increased timeout for smoother transition
    }
}

function updateMusicStatus(isPlaying) {
    if (musicStatusSpan) {
        let statusText = isPlaying ? '🎶 Music Playing 🎶' : 'Music Paused (Tap to Start)';
        
        musicStatusSpan.textContent = statusText;
        
        if(volumeToggleIcon) {
            volumeToggleIcon.classList.toggle('fa-volume-up', isPlaying);
            volumeToggleIcon.classList.toggle('fa-volume-off', !isPlaying);
            if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light'); 
        }
    }
}

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
//          ADMIN POST LOGIC (Cleaned)
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
                if (content.length > 5 && content.length <= 500) { 
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
//          PROFILE LOGIC (Cleaned)
// ===========================================

function updateProfileDisplay(userId, fullName, is_admin) {
    const tgUser = tg ? tg.initDataUnsafe.user : null;
    const username = tgUser ? tgUser.username : null;
    
    if (document.getElementById('profile-display-name')) document.getElementById('profile-display-name').textContent = fullName || 'User';
    if (document.getElementById('profile-display-username')) document.getElementById('profile-display-username').textContent = username ? `@${username}` : 'N/A';
    // Ensure ID is displayed as string
    if (document.getElementById('telegram-chat-id')) document.getElementById('telegram-chat-id').textContent = userId.toString();
    
    const adminStatusEl = document.getElementById('admin-status');
    if (adminStatusEl) adminStatusEl.textContent = is_admin ? 'Administrator' : 'Regular User';
    if (adminStatusEl) adminStatusEl.style.backgroundColor = is_admin ? 'var(--tg-theme-accent)' : 'var(--tg-theme-link-color)'; 
    
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
        copyBtn.onclick = () => copyChatId(currentUserId);
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
    
    // 3. Invite Friends Logic (FIXED/ENSURED)
    const inviteBtn = document.getElementById('invite-friends-btn');
    if (inviteBtn) {
        inviteBtn.addEventListener('click', () => {
            if (tg && tg.showInvitePopup) {
                // This is the correct method for the invite function
                tg.showInvitePopup(); 
            } else {
                showToast("Telegram Invite Feature ကို အသုံးပြုနိုင်ရန် TMA တွင် ဖွင့်ပါ။");
            }
        });
    }
}


// ===========================================
//          NAVIGATION & MAIN ENTRY (FIXED)
// ===========================================

function switchScreen(targetScreenId) {
    document.querySelectorAll('.content .screen').forEach(screen => screen.classList.remove('active'));
    
    const targetScreen = document.getElementById(targetScreenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        const contentArea = document.querySelector('.content');
        if (contentArea) contentArea.scrollTop = 0;
    }
    
    // 2. Navigation Button Active State
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
        if (item.getAttribute('data-screen') === targetScreenId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // 3. Header Visibility & Content Padding Logic (FIXED)
    const fixedHeaderArea = document.querySelector('.fixed-header-area');
    const contentArea = document.querySelector('.content');
    
    if (fixedHeaderArea && contentArea) {
        if (targetScreenId === 'profile-screen') {
            fixedHeaderArea.style.display = 'none';
            contentArea.style.paddingTop = '10px'; // Minimal padding at top
        } else {
            fixedHeaderArea.style.display = 'block';
            contentArea.style.paddingTop = '130px'; // Space for the fixed header
        }
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
    // 1. Determine User Info and Admin Status
    const user = tg.initDataUnsafe.user;
    if (user && user.id) {
        // IMPORTANT: Ensure ID is an integer for comparison
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
    
    // 4. Signal TMA is ready
    if (tg.MainButton) tg.MainButton.hide(); 
    tg.ready();
}

/**
 * Telegram Web App SDK ကို စနစ်တကျ စတင်ခြင်း (Theme Fix ပါဝင်သည်)
 */
function setupTMA() {
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;

        // Apply TMA theme colors for a native feel (FIXED)
        const themeParams = tg.themeParams;
        if (themeParams) {
            const root = document.documentElement;
            // Set CSS Variables from TMA Theme
            if (themeParams.bg_color) root.style.setProperty('--tg-theme-bg-color', themeParams.bg_color);
            if (themeParams.text_color) root.style.setProperty('--tg-theme-text-color', themeParams.text_color);
            if (themeParams.link_color) root.style.setProperty('--tg-theme-link-color', themeParams.link_color);
            if (themeParams.hint_color) root.style.setProperty('--tg-theme-hint-color', themeParams.hint_color);
            if (themeParams.button_color) root.style.setProperty('--tg-theme-button-color', themeParams.button_color);
            if (themeParams.button_text_color) root.style.setProperty('--tg-theme-button-text-color', themeParams.button_text_color);
            if (themeParams.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', themeParams.secondary_bg_color);
            if (themeParams.destructive_text_color) root.style.setProperty('--tg-theme-destructive-text-color', themeParams.destructive_text_color);
            
            // Apply background color directly to body for immediate effect
            document.body.style.backgroundColor = themeParams.bg_color || 'var(--tg-theme-bg-color)';
        }

        // Initialize Main App Logic
        main();
        
    } else {
        // Fallback for testing outside Telegram (Mock Data)
        console.warn("Telegram WebApp SDK not found. Running in fallback mode.");
        
        // Use a generic mock user and ensure ID is an integer
        const mockUserId = ADMIN_CHAT_ID + 100; // Mock user is not admin
        
        tg = {
            initDataUnsafe: { user: { id: mockUserId, first_name: "Local", username: "local_tester", photo_url: null } },
            themeParams: {},
            ready: () => console.log('TMA Mock Ready'),
            close: () => console.log('TMA Mock Close'),
            // Mock the invite popup to show a toast instead of crashing
            showInvitePopup: () => showToast("Invite Popup (Mock): TMA Environment တွင်သာ အလုပ်လုပ်ပါမည်။"),
            showConfirm: (msg, callback) => callback(window.confirm(msg)),
            HapticFeedback: { impactOccurred: () => console.log('Haptic: Light') },
            MainButton: { hide: () => console.log('MainButton: Hide') }
        };
        // Apply fallback colors for local testing
        document.body.style.backgroundColor = 'var(--tg-theme-bg-color)';

        main();
    }
}

// Start the entire application logic after DOM is fully loaded
document.addEventListener('DOMContentLoaded', setupTMA);
                                                  

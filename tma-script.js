// ********** SET YOUR ADMIN CHAT ID HERE **********
// Set your Telegram Chat ID for administrative privileges
const ADMIN_CHAT_ID = 1924452453; 
// *************************************************

// --- LOCAL STORAGE KEYS ---
const POSTS_STORAGE_KEY = 'tma_community_posts_v5'; // Bumped version for new post format
const LIKES_STORAGE_KEY = 'tma_user_likes_v5'; 
const TEMP_MUSIC_KEY = 'tma_temp_music_url_v5'; 

// --- Global Variables ---
const INITIAL_DEFAULT_URL = 'https://archive.org/download/lofi-chill-1-20/lofi_chill_03_-_sleepwalker.mp3'; 

let audioPlayer;
let musicStatusSpan;
let volumeToggleIcon;
let currentUserId = 0; 
let currentUserName = 'Guest';
let currentUserUsername = 'anonymous'; // Added username variable
let is_admin = false; 
let currentPostFilter = 'new-posts'; 
const NEW_POSTS_LIMIT = 50; 
let isMusicMuted = false; 

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
 * @param {string} successMsg 
 */
function copyToClipboard(text, successMsg = 'Copied successfully.') {
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
            showToast('Copied successfully.');
        } else {
            showToast('Copy failed, please select and copy manually.');
        }
    } catch (err) {
        showToast('Copy failed, please select and copy manually.');
    }
    
    document.body.removeChild(tempInput);
}

// ===========================================
//          DATA STORAGE HANDLERS
// ===========================================

function getPosts() {
    try {
        const posts = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || '[]');
        // Ensure posts is an array and each post has required fields (id, content)
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
        // Ensure likes is a non-null object
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
//          POSTS & LIKES LOGIC (Fixed Username Bug)
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
    
    // **FIXED: Ensure author name is displayed, defaulting to 'Anonymous User'**
    const authorName = post.authorName || 'Anonymous User';
    
    const date = new Date(post.timestamp);
    const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeString = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const deleteButton = isAdmin 
        ? `<button class="delete-btn" data-post-id="${post.id}"><i class="fas fa-trash"></i> Delete</button>` 
        : '';

    postElement.innerHTML = `
        <div class="post-header">
            <span class="post-author-name">${authorName}</span>
            ${post.isAdmin ? '<span style="font-size: 0.8rem; font-weight: 600; color: var(--tg-theme-accent);"><i class="fas fa-crown"></i> Admin</span>' : ''}
        </div>
        <p class="post-content">${post.content}</p>
        <div class="post-actions">
            <button class="like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post.id}" aria-label="${isLiked ? 'Unlike' : 'Like'} Post">
                <i class="fas fa-heart"></i> 
                ${displayLikesCount}
            </button>
            <span class="post-timestamp">
                ${dateString} at ${timeString}
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

    container.innerHTML = '<p class="initial-loading-text">Fetching posts...</p>'; 

    // Apply sorting based on filter
    if (currentPostFilter === 'new-posts') {
        posts.sort((a, b) => b.timestamp - a.timestamp); 
        posts = posts.slice(0, NEW_POSTS_LIMIT); 
    } else if (currentPostFilter === 'old-posts') {
        posts.sort((a, b) => a.timestamp - b.timestamp); 
    }
    
    container.innerHTML = ''; 

    if (posts.length === 0) {
         container.innerHTML = '<p class="initial-loading-text">No posts found yet. Be the first to post!</p>';
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
        showToast("Only Admin can delete posts.");
        return;
    }
    
    let posts = getPosts();
    const updatedPosts = posts.filter(p => p.id !== postId);
    savePosts(updatedPosts);

    let likes = getLikes();
    delete likes[postId];
    saveLikes(likes);
    
    showToast(`Post deleted successfully.`);
    loadPosts(userId); 
}

/**
 * Toggles a like on a post.
 * @param {Event} e 
 * @param {number} userId 
 */
function toggleLike(e, userId) {
    const postId = parseInt(e.currentTarget.getAttribute('data-post-id')); 
    const userIdStr = userId.toString();
    
    let likes = getLikes();
    
    likes[postId] = Array.isArray(likes[postId]) ? likes[postId].map(String) : []; 
    
    const isLiked = likes[postId].includes(userIdStr);

    if (isLiked) {
        likes[postId] = likes[postId].filter(id => id !== userIdStr);
        showToast("Unliked.");
    } else {
        likes[postId].push(userIdStr);
        showToast("Liked!");
    }
    
    saveLikes(likes);
    
    // Re-render only the posts that are currently visible
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
            
            if (tg && tg.showConfirm) {
                tg.showConfirm('Are you sure you want to delete this post?', (ok) => {
                    if (ok) performDeletePost(postId, userId);
                });
            } else {
                if (window.confirm('Are you sure you want to delete this post?')) {
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
//          MODAL & MUSIC LOGIC 
// ===========================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('active')); 
    
    const fab = document.getElementById('post-add-button');
    if (fab) fab.style.display = 'none';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
        
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

    let statusText = isPlaying ? `🎶 Music Playing ${isMusicMuted ? '(Muted)' : ''} 🎶` : 'Music Paused (Tap Icon to Play)';
    musicStatusSpan.textContent = statusText;
    
    if (isPlaying) {
        // Show volume-up if playing AND NOT muted, volume-off otherwise
        volumeToggleIcon.classList.toggle('fa-volume-up', !isMusicMuted);
        volumeToggleIcon.classList.toggle('fa-volume-off', isMusicMuted);
        volumeToggleIcon.title = isMusicMuted ? "Unmute Music" : "Mute Music";
    } else {
        // If paused, always show volume-off icon (or just music icon)
        volumeToggleIcon.classList.remove('fa-volume-up');
        volumeToggleIcon.classList.add('fa-volume-off');
        volumeToggleIcon.title = "Start Playing Music";
    }
}

/**
 * Toggles playing and muting logic.
 */
function toggleVolume() {
    if (!audioPlayer) return;

    if (audioPlayer.paused) {
        // Play logic
        audioPlayer.volume = isMusicMuted ? 0 : 1; 
        audioPlayer.play().then(() => {
             showToast(isMusicMuted ? "Music started (Muted)." : "Music started playing.");
        }).catch(e => {
            console.error("Failed to play on user click:", e);
            showToast('Playback Error: Tap the screen first to allow playback.');
        });
    } else {
        // Toggle mute state
        isMusicMuted = !isMusicMuted;
        audioPlayer.volume = isMusicMuted ? 0 : 1;

        if (isMusicMuted) {
            showToast("Music muted.");
        } else {
            showToast("Music unmuted.");
        }
        updateMusicStatus(true);
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
    
    if(volumeToggleIcon) volumeToggleIcon.onclick = toggleVolume; 
    
    const musicStatusBar = document.querySelector('.music-status-bar');
    if (musicStatusBar) musicStatusBar.onclick = () => showToast("Use the Volume Icon to control music playback.");

    audioPlayer.onplay = () => updateMusicStatus(true);
    audioPlayer.onpause = () => updateMusicStatus(false);
    audioPlayer.onerror = (e) => {
        console.error("Audio error:", e);
        audioPlayer.pause();
        updateMusicStatus(false);
        showToast("Music Load Error. Playing stopped.");
    };

    updateMusicStatus(false); 
}

function setMusicUrl(url, sourceName) {
    if (!url || !audioPlayer) return;
    
    if (!url.match(/^https?:\/\/.+\..+$/) && url !== INITIAL_DEFAULT_URL && !url.startsWith('blob:')) {
        showToast("Invalid URL format. http/https required.");
        return;
    }

    localStorage.setItem(TEMP_MUSIC_KEY, url); 
    
    audioPlayer.src = url;
    audioPlayer.load();

    audioPlayer.pause(); 
    
    closeModal('music-modal');
    closeModal('url-input-modal');
    showToast(`${sourceName} set. Tap the Volume Icon to play.`);
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
            showToast("Please enter a valid Music URL.");
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
        if (postAddButton) postAddButton.style.display = 'flex'; 

        if (postAddButton) postAddButton.onclick = () => openModal('post-modal');
        if (cancelPostBtn) cancelPostBtn.onclick = () => closeModal('post-modal');

        if (submitPostBtn && postInput) {
            submitPostBtn.onclick = () => {
                const content = postInput.value.trim();
                if (content.length >= 5 && content.length <= 500) { 
                    let posts = getPosts();
                    const newPost = {
                        id: Date.now(), 
                        authorId: currentUserId,
                        authorName: currentUserName, // Store current user name
                        isAdmin: true,
                        content: content,
                        timestamp: Date.now(), 
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
                    showToast("Announcement posted successfully!");
                } else {
                    showToast("Post must be between 5 and 500 characters.");
                }
            };
        }
    } else {
         if (postAddButton) postAddButton.style.display = 'none';
    }
}


// ===========================================
//          PROFILE LOGIC (Fixed Username)
// ===========================================

function updateProfileDisplay(userId, fullName, username, is_admin) {
    // FIX: Use the actual provided username or a placeholder
    const displayUsername = username ? `@${username}` : 'N/A';
    
    document.getElementById('profile-display-name').textContent = fullName || 'User';
    document.getElementById('profile-display-username').textContent = displayUsername;
    document.getElementById('telegram-chat-id').textContent = userId.toString();
    
    const adminStatusEl = document.getElementById('admin-status');
    adminStatusEl.textContent = is_admin ? 'Administrator' : 'Regular User';
    adminStatusEl.style.backgroundColor = is_admin ? 'var(--tg-theme-accent)' : 'var(--tg-theme-link-color)'; 
    
    const tgUser = tg ? tg.initDataUnsafe.user : null;
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
        copyBtn.onclick = () => copyToClipboard(currentUserId.toString(), 'User ID copied.');
    }
    
    // 2. TMA Close Button
    const closeBtn = document.getElementById('tma-close-btn');
    if (closeBtn) {
        closeBtn.onclick = () => {
            if (tg && tg.close) {
                tg.close();
            } else {
                showToast("Mini App Close API Not Available (Local Mock).");
            }
        };
    }
    
    // 3. Invite Friends Logic (FIXED: Ensure correct API usage)
    const inviteBtn = document.getElementById('invite-friends-btn');
    if (inviteBtn) {
        inviteBtn.addEventListener('click', () => {
            if (tg && tg.showInvitePopup) {
                tg.showInvitePopup(); 
                showToast("Invite link prepared for sharing.");
            } else {
                showToast("Invite Feature not available in this TMA environment.");
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

    // Header Visibility & FAB Logic
    const fixedHeaderArea = document.querySelector('.fixed-header-area');
    const fab = document.getElementById('post-add-button');
    const contentArea = document.querySelector('.content');

    // Calculate fixed header height dynamically
    const headerHeight = fixedHeaderArea.offsetHeight;

    if (targetScreenId === 'profile-screen') {
        if (fixedHeaderArea) fixedHeaderArea.style.display = 'none';
        if (contentArea) contentArea.style.paddingTop = '20px'; 
        if (fab) fab.style.display = 'none';
    } else { // home-screen
        if (fixedHeaderArea) fixedHeaderArea.style.display = 'block';
        if (contentArea) contentArea.style.paddingTop = `${headerHeight + 20}px`; // Add extra padding below the fixed header
        if (fab && is_admin) fab.style.display = 'flex'; 
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
        currentUserId = parseInt(user.id); 
        currentUserName = user.first_name || (user.last_name ? user.last_name : 'Anonymous User'); // FIX: Better name fallback
        currentUserUsername = user.username || null;
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
    updateProfileDisplay(currentUserId, currentUserName, currentUserUsername, is_admin);
    loadPosts(currentUserId); 
    
    // 4. Set Initial Screen Padding (Home Screen is default active)
    switchScreen('home-screen');

    // 5. Signal TMA is ready
    if (tg.MainButton) tg.MainButton.hide(); 
    tg.ready();
}

/**
 * Initializes Telegram Web App SDK and Theme
 */
function setupTMA() {
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;

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
            
            document.body.style.backgroundColor = themeParams.bg_color || 'var(--tg-theme-bg-color)';
        }

        main();
        
    } else {
        // Fallback for testing outside Telegram (Mock Data)
        console.warn("Telegram WebApp SDK not found. Running in fallback mode.");
        
        const mockUserId = ADMIN_CHAT_ID + 100; 
        
        tg = {
            initDataUnsafe: { user: { id: mockUserId, first_name: "Local", last_name: "Tester", username: "local_tester", photo_url: null } },
            themeParams: {},
            ready: () => console.log('TMA Mock Ready'),
            close: () => console.log('TMA Mock Close'),
            showInvitePopup: () => showToast("Invite Popup (Mock): Not available outside TMA."),
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

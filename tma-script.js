// ********** SET YOUR ADMIN CHAT ID HERE **********
const ADMIN_CHAT_ID = 1924452453; 
// *************************************************

// --- LOCAL STORAGE KEYS ---
const POSTS_STORAGE_KEY = 'tma_community_posts_v5'; 
const LIKES_STORAGE_KEY = 'tma_user_likes_v5'; 
const TEMP_MUSIC_KEY = 'tma_temp_music_url_v5'; 

// --- Global Variables ---
const INITIAL_DEFAULT_URL = 'https://archive.org/download/lofi-chill-1-20/lofi_chill_03_-_sleepwalker.mp3'; 
let audioPlayer;
let musicStatusSpan;
let volumeToggleIcon;
let currentUserId = 0; 
let currentUserName = 'Guest';
let currentUserUsername = 'anonymous'; 
let is_admin = false; 
let currentPostFilter = 'new-posts'; 
const NEW_POSTS_LIMIT = 50; 
let isMusicMuted = false; 
let tg = null;

// ===========================================
//          HELPER FUNCTIONS (UNCHANGED)
// ===========================================

/** Generates a color based on a string for avatar backgrounds. */
function stringToColor(str) {
    let hash = 0; for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        const brightened = Math.floor(value * 0.7 + 0x55); 
        color += ('00' + brightened.toString(16)).substr(-2);
    }
    return color;
}

/** Displays a custom toast notification. */
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

/** Copies a string to the clipboard (using modern API with fallback). */
function copyToClipboard(text, successMsg = 'Copied successfully.') {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => showToast(successMsg)).catch(() => performLegacyCopy(text));
    } else {
        performLegacyCopy(text);
    }
}

/** Fallback for copying text (legacy method). */
function performLegacyCopy(text) {
    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    tempInput.style.position = 'absolute';
    tempInput.style.left = '-9999px';
    document.body.appendChild(tempInput);
    tempInput.select();
    tempInput.setSelectionRange(0, 99999); 
    try {
        document.execCommand('copy');
        showToast('Copied successfully (Legacy).');
    } catch (err) {
        showToast('Copy failed, please select and copy manually.');
    }
    document.body.removeChild(tempInput);
}

// ===========================================
//          DATA STORAGE HANDLERS (UNCHANGED)
// ===========================================

function getPosts() {
    try {
        const posts = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || '[]');
        return Array.isArray(posts) ? posts.filter(p => p && p.id && p.content) : []; 
    } catch (e) {
        console.error("Error loading posts:", e);
        showToast("Error loading posts data.");
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
//          POSTS & LIKES LOGIC (Modified)
// ===========================================

/** Creates the HTML element for a single post. 
 * MODIFIED: Removed Author Name and Timestamp display.
 */
function createPostElement(post, userId) {
    const likes = getLikes();
    const userIdStr = userId.toString(); 
    // Ensure post ID is treated as a string key in the likes object
    const postLikesArray = Array.isArray(likes[post.id]) ? likes[post.id].map(String) : []; 
    const isLiked = postLikesArray.includes(userIdStr);
    const isAdmin = (userId === ADMIN_CHAT_ID); 
    
    const postElement = document.createElement('div');
    postElement.className = 'post-card';
    postElement.setAttribute('data-post-id', post.id);

    const displayLikesCount = postLikesArray.length; 
    
    // NOTE: Author name and timestamp removed as requested.
    const deleteButton = isAdmin 
        ? `<button class="delete-btn" data-post-id="${post.id}"><i class="fas fa-trash"></i> Delete</button>` 
        : '';

    postElement.innerHTML = `
        <div class="post-header">
            ${post.isAdmin ? '<span style="font-size: 0.8rem; font-weight: 600; color: var(--tg-theme-accent);"><i class="fas fa-crown"></i> Admin</span>' : ''}
        </div>
        <p class="post-content">${post.content}</p>
        <div class="post-actions">
            <button class="like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post.id}" aria-label="${isLiked ? 'Unlike' : 'Like'} Post">
                <i class="fas fa-heart"></i> 
                ${displayLikesCount}
            </button>
            ${deleteButton}
        </div>
    `;
    return postElement;
}

/** Loads and renders posts based on the current filter. (UNCHANGED) */
function loadPosts(userId) {
    currentUserId = userId; 
    let posts = getPosts();
    const container = document.getElementById('posts-container');
    
    if (!container) return;

    container.innerHTML = '<p class="initial-loading-text">Fetching posts...</p>'; 

    // Apply sorting
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
        posts.forEach(post => container.appendChild(createPostElement(post, userId)));
    }
    addPostEventListeners(userId);
}

/** Permanently deletes a post and its associated likes. (UNCHANGED) */
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

/** Toggles a like on a post. 
 * FIX: Ensures postId is a string key for the likes object.
 */
function toggleLike(e, userId) {
    // Ensure post ID is handled consistently as a number then converted to string key
    const postIdAttr = e.currentTarget.getAttribute('data-post-id');
    const postId = parseInt(postIdAttr); 
    if (isNaN(postId)) {
        console.error("Invalid postId for like toggle:", postIdAttr);
        return;
    }

    const postIdStr = postId.toString(); // Use string for likes object key consistency
    const userIdStr = userId.toString();
    
    let likes = getLikes();
    
    // Ensure the array exists and contains strings for this postId
    likes[postIdStr] = Array.isArray(likes[postIdStr]) ? likes[postIdStr].map(String) : []; 
    
    const isLiked = likes[postIdStr].includes(userIdStr);

    if (isLiked) {
        likes[postIdStr] = likes[postIdStr].filter(id => id !== userIdStr);
        showToast("Unliked.");
    } else {
        likes[postIdStr].push(userIdStr);
        showToast("Liked!");
    }
    
    saveLikes(likes);
    loadPosts(currentUserId); 
}

/** Adds event listeners to all newly rendered posts. (UNCHANGED) */
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

/** Sets up event listeners for post filter tabs. (UNCHANGED) */
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
//          MODAL & MUSIC LOGIC (UNCHANGED)
// ===========================================

/** Opens a modal window and disables body scroll. */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; 

    requestAnimationFrame(() => modal.classList.add('active')); 
    
    const fab = document.getElementById('post-add-button');
    if (fab) fab.style.display = 'none'; 
}

/** Closes a modal window and re-enables body scroll. */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.remove('active');
    
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = ''; 

        const homeScreen = document.getElementById('home-screen');
        if (homeScreen && homeScreen.classList.contains('active') && is_admin) {
            const fab = document.getElementById('post-add-button');
            if (fab) fab.style.display = 'flex'; 
        }
    }, 400); 
}

/** Updates the visual status of the music player. */
function updateMusicStatus(isPlaying) {
    if (!musicStatusSpan || !volumeToggleIcon) return;
    let statusText = isPlaying ? `🎶 Music Playing ${isMusicMuted ? '(Muted)' : ''} 🎶` : 'Music Paused (Tap Icon to Play)';
    musicStatusSpan.textContent = statusText;
    
    if (isPlaying) {
        volumeToggleIcon.classList.toggle('fa-volume-up', !isMusicMuted);
        volumeToggleIcon.classList.toggle('fa-volume-off', isMusicMuted);
        volumeToggleIcon.title = isMusicMuted ? "Unmute Music" : "Mute Music";
    } else {
        volumeToggleIcon.classList.remove('fa-volume-up');
        volumeToggleIcon.classList.add('fa-volume-off');
        volumeToggleIcon.title = "Start Playing Music";
    }
}

/** Toggles playing and muting logic. */
function toggleVolume() {
    if (!audioPlayer) return;

    if (audioPlayer.paused) {
        audioPlayer.volume = isMusicMuted ? 0 : 1; 
        audioPlayer.play().then(() => {
             showToast(isMusicMuted ? "Music started (Muted)." : "Music started playing.");
        }).catch(e => {
            console.error("Failed to play on user click:", e);
            showToast('Playback Error: Tap the screen first to allow playback.');
        });
    } else {
        isMusicMuted = !isMusicMuted;
        audioPlayer.volume = isMusicMuted ? 0 : 1;
        showToast(isMusicMuted ? "Music muted." : "Music unmuted.");
        updateMusicStatus(true);
    }
}

/** Initializes the audio player element. */
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

/** Loads a new music URL and prepares it for playing. */
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

/** Adds event listeners for music selection and modal controls. */
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
        const url = document.getElementById('music-url-input').value.trim();
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
//          ADMIN POST LOGIC (UNCHANGED)
// ===========================================

/** Sets up admin-specific functionality. */
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
                        authorName: currentUserName || 'Admin', 
                        isAdmin: true,
                        content: content,
                        timestamp: Date.now(), 
                    };
                    posts.push(newPost);
                    savePosts(posts);
                    postInput.value = ''; 
                    
                    const newPostsTab = document.getElementById('new-posts-tab');
                    if (newPostsTab) newPostsTab.click(); 
                    
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
//          PROFILE LOGIC (Modified: Invite Removed)
// ===========================================

/** Updates the display of user profile information. (UNCHANGED) */
function updateProfileDisplay(userId, fullName, username, is_admin) {
    const displayUsername = username ? `@${username}` : 'Username N/A';
    
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
            profileAvatarPlaceholder.innerHTML = `<img src="${tgPhotoUrl}" alt="${fullName || 'Profile Photo'}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
            profileAvatarPlaceholder.style.backgroundColor = 'transparent';
            profileAvatarPlaceholder.textContent = '';
        } else {
            const userColor = stringToColor(userId.toString());
            const initial = (fullName.charAt(0) || 'U').toUpperCase();
            profileAvatarPlaceholder.innerHTML = ''; 
            profileAvatarPlaceholder.style.backgroundColor = userColor;
            profileAvatarPlaceholder.textContent = initial;
            profileAvatarPlaceholder.style.fontSize = '1.5rem';
        }
    }
}

/** Sets up listeners for profile actio
TcopyTocopyTo
 * MODIFIED: Invite Friends logic removed.
 */
function setupProfileListeners() {
    const copyBtn = document.getElementById('chat-id-copy-btn');
    if (copyBtn) copyBtn.onclick = () => copyToClipboard(currentUserId.toString(), 'User ID copied.');
    
    const closeBtn = document.getElementById('tma-close-btn');
    if (closeBtn) closeBtn.onclick = () => tg && tg.close ? tg.close() : showToast("Mini App Close API Not Available.");
    
    // NOTE: Invite Friends logic was removed from both HTML and JS
}


// ===========================================
//          NAVIGATION & MAIN ENTRY (UNCHANGED)
// ===========================================

/** Switches the active content screen. */
function switchScreen(targetScreenId) {
    document.querySelectorAll('.content .screen').forEach(screen => screen.classList.remove('active'));
    
    const targetScreen = document.getElementById(targetScreenId);
    if (targetScreen) targetScreen.classList.add('active');
    
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-screen') === targetScreenId);
    });

    const fixedHeaderArea = document.querySelector('.fixed-header-area');
    const fab = document.getElementById('post-add-button');
    const contentArea = document.querySelector('.content');

    const headerHeight = fixedHeaderArea ? fixedHeaderArea.offsetHeight : 0;

    if (targetScreenId === 'profile-screen') {
        if (fixedHeaderArea) fixedHeaderArea.style.display = 'none';
        if (contentArea) contentArea.style.paddingTop = '20px'; 
        if (fab) fab.style.display = 'none';
    } else { // home-screen
        if (fixedHeaderArea) fixedHeaderArea.style.display = 'block';
        if (contentArea) contentArea.style.paddingTop = `${headerHeight + 20}px`; 
        if (fab && is_admin) fab.style.display = 'flex'; 
    }
    
    if (contentArea) contentArea.scrollTop = 0;
}

/** Adds event listeners for bottom navigation buttons. */
function addNavigationListeners() {
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
        item.addEventListener('click', (e) => switchScreen(e.currentTarget.getAttribute('data-screen')));
    });
}

/** Main function to initialize all components. */
function main() {
    const user = tg.initDataUnsafe.user;
    if (user && user.id) {
        currentUserId = parseInt(user.id); 
        const nameParts = [user.first_name, user.last_name].filter(Boolean);
        currentUserName = nameParts.length > 0 ? nameParts.join(' ') : 'Anonymous User';
        currentUserUsername = user.username || null;
        is_admin = currentUserId === ADMIN_CHAT_ID;
    }
    
    // Setup
    addNavigationListeners();
    setupPostFilters();
    setupMusicPlayer();
    addMusicEventListeners();
    setupProfileListeners();
    setupAdminPostLogic(is_admin);
    
    // Load Data & UI
    updateProfileDisplay(currentUserId, currentUserName, currentUserUsername, is_admin);
    loadPosts(currentUserId); 
    
    // Finalization
    switchScreen('home-screen');
    if (tg.MainButton) tg.MainButton.hide(); 
    tg.ready();
}

/** Initializes Telegram Web App SDK and Theme */
function setupTMA() {
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;

        // Apply theme parameters
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
        
        tg = {
            initDataUnsafe: { user: { id: ADMIN_CHAT_ID + 100, first_name: "Local", last_name: "Tester", username: "local_tester", photo_url: null } },
            themeParams: {},
            ready: () => console.log('TMA Mock Ready'),
            close: () => console.log('TMA Mock Close'),
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

// **********************************************
// ********** FIREBASE CONFIGURATION **********
// **********************************************
// *** ဤနေရာတွင် သင်၏ ကိုယ်ပိုင် Firebase Config ကို ထည့်သွင်းပါ။ ***
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDpuDVZXdT6CZ6MlgRAd8bbVYtuIVevzlI", // သင်၏ API Key
    authDomain: "zaroqt101.firebaseapp.com",
    projectId: "zaroqt101", // သင်၏ Project ID
    storageBucket: "zaroqt101.firebasestorage.app",
    messagingSenderId: "141083314351",
    appId: "1:141083314351:web:e7f7ce068c0c2c34a7ec5a"
  // measurementId: "G-XXXXXXXXXX" // မလိုပါက ဖယ်ရှားနိုင်သည်
};
// **********************************************
// **********************************************


// ********** SET YOUR ADMIN CHAT ID(s) HERE **********
const ADMIN_CHAT_IDS = [
    1924452453, // Admin 1: (Your current ID) - Please REPLACE this with your actual ID
    // 123456789, // Admin 2 ID example
]; 
// *************************************************

// --- LOCAL STORAGE KEYS (Only for Likes and Music) ---
const LIKES_STORAGE_KEY = 'tma_user_likes_v5'; 
const TEMP_MUSIC_KEY = 'tma_temp_music_url_v5'; 

// --- Firestore/Database Setup ---
const POSTS_COLLECTION = 'community_posts';
let db = null; // Firestore database instance

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
let isMusicMuted = false; 
let tg = null;


// ===========================================
//          FIREBASE INITIALIZATION
// ===========================================

function initializeFirebase() {
    try {
        if (!FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey === "YOUR_API_KEY") {
            throw new Error("Firebase configuration is not set. Using local storage fallback.");
        }
        const app = firebase.initializeApp(FIREBASE_CONFIG);
        db = firebase.firestore();
        console.log("Firebase initialized successfully.");
        return true;
    } catch (e) {
        console.error("Firebase Initialization Failed. Check FIREBASE_CONFIG:", e);
        showToast("Error: Database config missing. Cannot load/save posts globally.");
        db = null; // Ensure db is null if initialization fails
        return false;
    }
}


// ===========================================
//          HELPER FUNCTIONS
// ===========================================
// (No changes here, copied from previous script)

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

function copyToClipboard(text, successMsg = 'Copied successfully.') {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => showToast(successMsg)).catch(() => performLegacyCopy(text));
    } else {
        performLegacyCopy(text);
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
        document.execCommand('copy');
        showToast('Copied successfully (Legacy).');
    } catch (err) {
        showToast('Copy failed, please select and copy manually.');
    }
    document.body.removeChild(tempInput);
}


// ===========================================
//          DATA STORAGE HANDLERS (Local Only)
// ===========================================

// --- Only for Likes (User-specific data) ---
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
//          POSTS & LIKES LOGIC (FIREBASE INTEGRATED)
// ===========================================

function isAdminUser(userId) {
    return ADMIN_CHAT_IDS.includes(parseInt(userId));
}

function createPostElement(post, userId) {
    // Post ID from Firestore is used as ID
    const postIdStr = post.id.toString(); 
    
    // --- LIKES (Still using Local Storage for simplicity/no-auth needed) ---
    const likes = getLikes();
    const userIdStr = userId.toString(); 
    const postLikesArray = Array.isArray(likes[postIdStr]) ? likes[postIdStr].map(String) : []; 
    const isLiked = postLikesArray.includes(userIdStr);
    const displayLikesCount = postLikesArray.length; 
    // ----------------------------------------------------------------------
    
    const isAdmin = isAdminUser(userId); 
    
    const postElement = document.createElement('div');
    postElement.className = 'post-card';
    postElement.setAttribute('data-post-id', post.id);

    const deleteButton = isAdmin 
        ? `<button class="delete-btn" data-post-id="${post.id}"><i class="fas fa-trash"></i> Delete</button>` 
        : '';

    // post-header is hidden via CSS to remove Admin/Time display
    postElement.innerHTML = `
        <div class="post-header">
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

/** Loads posts from Firestore and renders them. */
async function loadPosts(userId) {
    currentUserId = userId; 
    const container = document.getElementById('posts-container');
    
    if (!container) return;

    container.innerHTML = '<p class="initial-loading-text">Fetching posts from database...</p>'; 

    if (!db) {
         container.innerHTML = '<p class="initial-loading-text">Database not connected. Please check Firebase configuration.</p>';
         return;
    }

    try {
        let query = db.collection(POSTS_COLLECTION);
        
        // Apply sorting based on currentPostFilter
        if (currentPostFilter === 'new-posts') {
            query = query.orderBy('timestamp', 'desc'); 
        } else if (currentPostFilter === 'old-posts') {
            query = query.orderBy('timestamp', 'asc'); 
        }

        const snapshot = await query.get();
        
        // Convert snapshot to a clean array of posts
        const posts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        container.innerHTML = ''; // Clear loading text
        
        if (posts.length === 0) {
             container.innerHTML = '<p class="initial-loading-text">No posts found yet. Be the first to post!</p>';
        } else {
            posts.forEach(post => container.appendChild(createPostElement(post, userId)));
        }
        addPostEventListeners(userId);
        
    } catch (error) {
        console.error("Error fetching posts from Firestore:", error);
        container.innerHTML = '<p class="initial-loading-text error-text">Failed to load posts due to a database error. Please check your network or configuration.</p>';
    }
}

/** Permanently deletes a post from Firestore. */
async function performDeletePost(postId, userId) {
    if (!isAdminUser(userId)) { 
        showToast("Only Admins can delete posts.");
        return;
    }
    
    if (!db) {
         showToast("Database not connected. Delete failed.");
         return;
    }

    try {
        await db.collection(POSTS_COLLECTION).doc(postId).delete();
        
        // Also clean up local likes data for this post
        let likes = getLikes();
        delete likes[postId];
        saveLikes(likes);
        
        showToast(`Post deleted successfully from database.`);
        loadPosts(userId); 
    } catch (error) {
        console.error("Error deleting post:", error);
        showToast("Failed to delete post from database.");
    }
}

/** Toggles a like on a post (Uses Local Storage only). */
function toggleLike(e, userId) {
    const postIdAttr = e.currentTarget.getAttribute('data-post-id');
    const postIdStr = postIdAttr.toString(); 
    const userIdStr = userId.toString();
    
    let likes = getLikes();
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
    // Reload posts to update the like count display
    loadPosts(currentUserId); 
}

function addPostEventListeners(userId) {
    document.querySelectorAll('.like-btn').forEach(button => {
        button.onclick = (e) => toggleLike(e, userId); 
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.onclick = (e) => {
            const postId = e.currentTarget.getAttribute('data-post-id'); // Use string ID from Firestore
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
// (No changes here, copied from previous script)

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = 'flex'; 
    document.body.style.overflow = 'hidden'; 
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
        document.body.style.overflow = ''; 
        const homeScreen = document.getElementById('home-screen');
        if (homeScreen && homeScreen.classList.contains('active') && is_admin) {
            const fab = document.getElementById('post-add-button');
            if (fab) fab.style.display = 'flex'; 
        }
    }, 400); 
}

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

function toggleVolume() {
    if (!audioPlayer) return;

    if (audioPlayer.paused) {
        audioPlayer.volume = isMusicMuted ? 0 : 1; 
        audioPlayer.play().then(() => {
             showToast(isMusicMuted ? "Music started (Muted)." : "Music started playing.");
        }).catch(e => {
            console.error("Failed to play on user click:", e);
            showToast('Playback Failed. Tap screen first, or check music link.');
        });
    } else {
        isMusicMuted = !isMusicMuted;
        audioPlayer.volume = isMusicMuted ? 0 : 1;
        showToast(isMusicMuted ? "Music muted." : "Music unmuted.");
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
//          ADMIN POST LOGIC (FIREBASE INTEGRATED)
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
            submitPostBtn.onclick = async () => {
                const content = postInput.value.trim();
                
                if (!db) {
                    showToast("Database not connected. Post cannot be saved globally.");
                    return;
                }

                if (content.length >= 5 && content.length <= 500) { 
                    try {
                        const newPost = {
                            authorId: currentUserId,
                            authorName: currentUserName || 'Admin', 
                            isAdmin: true,
                            content: content,
                            timestamp: Date.now(), 
                        };
                        
                        await db.collection(POSTS_COLLECTION).add(newPost);
                        
                        postInput.value = ''; 
                        
                        const newPostsTab = document.getElementById('new-posts-tab');
                        if (newPostsTab) newPostsTab.click(); // Reloads posts from DB
                        
                        closeModal('post-modal'); 
                        showToast("Announcement posted successfully to the database!");
                        
                    } catch (error) {
                        console.error("Error adding document to Firestore:", error);
                        showToast("Failed to post announcement due to a database error.");
                    }

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
//          PROFILE LOGIC
// ===========================================
// (No changes here, copied from previous script)

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

function setupProfileListeners() {
    const copyBtn = document.getElementById('chat-id-copy-btn');
    if (copyBtn) copyBtn.onclick = () => copyToClipboard(currentUserId.toString(), 'User ID copied.');
    
    const closeBtn = document.getElementById('tma-close-btn');
    if (closeBtn) closeBtn.onclick = () => tg && tg.close ? tg.close() : showToast("Mini App Close API Not Available.");
}


// ===========================================
//          NAVIGATION & MAIN ENTRY
// ===========================================

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

function addNavigationListeners() {
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
        item.addEventListener('click', (e) => switchScreen(e.currentTarget.getAttribute('data-screen')));
    });
}

function main() {
    // 1. Initialize Telegram WebApp SDK
    const user = tg.initDataUnsafe.user;
    if (user && user.id) {
        currentUserId = parseInt(user.id); 
        const nameParts = [user.first_name, user.last_name].filter(Boolean);
        currentUserName = nameParts.length > 0 ? nameParts.join(' ') : 'Anonymous User';
        currentUserUsername = user.username || null;
        is_admin = isAdminUser(currentUserId); 
    }

    // 2. Initialize Firebase (Firestore)
    initializeFirebase();

    // 3. Setup UI & Logic
    addNavigationListeners();
    setupPostFilters();
    setupMusicPlayer();
    addMusicEventListeners();
    setupProfileListeners();
    setupAdminPostLogic(is_admin);
    
    // 4. Load Data & UI
    updateProfileDisplay(currentUserId, currentUserName, currentUserUsername, is_admin);
    loadPosts(currentUserId); // Loads from Firestore
    
    // 5. Finalization
    switchScreen('home-screen');
    if (tg.MainButton) tg.MainButton.hide(); 
    tg.ready();
}

function setupTMA() {
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;

        // Apply theme parameters
        const themeParams = tg.themeParams;
        if (themeParams) {
            const root = document.documentElement;
            const themeMap = {
                '--tg-theme-bg-color': themeParams.bg_color || '#0d1117',
                '--tg-theme-text-color': themeParams.text_color || '#ffffff',
                '--tg-theme-link-color': themeParams.link_color || '#4c8cff',
                '--tg-theme-hint-color': themeParams.hint_color || '#90a4ae',
                '--tg-theme-button-color': themeParams.button_color || '#4c8cff',
                '--tg-theme-button-text-color': themeParams.button_text_color || '#ffffff',
                '--tg-theme-secondary-bg-color': themeParams.secondary_bg_color || '#1a202c',
                '--tg-theme-destructive-text-color': themeParams.destructive_text_color || '#ff5252'
            };
            
            for (const [prop, value] of Object.entries(themeMap)) {
                root.style.setProperty(prop, value);
            }
            document.body.style.backgroundColor = themeMap['--tg-theme-bg-color'];
        }

        main();
        
    } else {
        // Fallback for testing outside Telegram (Mock Data)
        console.warn("Telegram WebApp SDK not found. Running in fallback mode.");
        
        const mockAdminId = ADMIN_CHAT_IDS.length > 0 ? ADMIN_CHAT_IDS[0] : 123456789; 
        
        tg = {
            initDataUnsafe: { user: { id: mockAdminId, first_name: "Local", last_name: "Tester", username: "local_tester", photo_url: null } },
            themeParams: {},
            ready: () => console.log('TMA Mock Ready'),
            close: () => console.log('TMA Mock Close'),
            showConfirm: (msg, callback) => callback(window.confirm(msg)),
            HapticFeedback: { impactOccurred: () => console.log('Haptic: Light') },
            MainButton: { hide: () => console.log('MainButton: Hide') }
        };
        const root = document.documentElement;
        root.style.setProperty('--tg-theme-bg-color', '#0d1117');
        root.style.setProperty('--tg-theme-text-color', '#ffffff');
        root.style.setProperty('--tg-theme-secondary-bg-color', '#1a202c');
        root.style.setProperty('--tg-theme-link-color', '#4c8cff');
        document.body.style.backgroundColor = 'var(--tg-theme-bg-color)';

        main();
    }
}

// Start the entire application logic after DOM is fully loaded
document.addEventListener('DOMContentLoaded', setupTMA);

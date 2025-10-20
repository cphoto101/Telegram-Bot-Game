// ********** SET YOUR ADMIN CHAT ID HERE **********
// ဤနေရာတွင် သင်၏ Telegram Chat ID ကို ထည့်သွင်းပါ။ 
// Firestore UID ကို အသုံးပြုရန် ပိုကောင်းသော်လည်း၊ ဤနေရာတွင် Telegram Chat ID (number) ကို သုံးထားသည်
const ADMIN_CHAT_ID = 1924452453; 
// *************************************************

// --- FIREBASE REFERENCES (from index.html script module) ---
let db = window.db; 
let auth = window.auth;
let appId = window.appId;
let initialAuthToken = window.initialAuthToken;

// --- FIRESTORE COLLECTION/DOCUMENT PATHS ---
const POSTS_COLLECTION_PATH = `artifacts/${appId}/public/data/posts`;
// Music preference is private and tied to the user's authenticated ID (UID)
const MUSIC_PREF_DOC_PATH = (uid) => `artifacts/${appId}/users/${uid}/preferences/music`;

// --- Global Variables ---
const INITIAL_DEFAULT_URL = 'https://archive.org/download/lofi-chill-1-20/lofi_chill_03_-_sleepwalker.mp3'; 

let audioPlayer;
let musicStatusSpan;
let volumeToggleIcon;

// User identity variables (will be UID string after auth)
let currentUserId = 'anonymous'; // UID from Firebase Auth
let currentUserName = 'Guest';
let isAdmin = false; 
let currentPostFilter = 'new-posts'; 
const NEW_POSTS_LIMIT = 50; 

// Telegram Web App Global Reference
let tg = null;
let unsubscribePosts = null; // To hold the Firestore listener for posts

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
    // Use modern clipboard API if available
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(chatId.toString()).then(() => {
            showToast('User ID ကူးယူပြီးပါပြီ။');
        }).catch(() => {
            // Fallback to execCommand (deprecated but works in iframes)
            const tempInput = document.createElement('textarea');
            tempInput.value = chatId.toString();
            document.body.appendChild(tempInput);
            tempInput.select();
            if (document.execCommand('copy')) {
                 showToast('User ID ကူးယူပြီးပါပြီ။ (Legacy Copy)');
            } else {
                 showToast('ကူးယူမရပါ၊ စာသားကို ကိုယ်တိုင်ရွေးချယ်ကူးယူပေးပါ။');
            }
            document.body.removeChild(tempInput);
        });
    } else {
        showToast('ကူးယူမရပါ၊ စာသားကို ကိုယ်တိုင်ရွေးချယ်ကူးယူပေးပါ။');
    }
}

// ===========================================
//          FIRESTORE LOGIC
// ===========================================

/**
 * Real-time listener for posts.
 */
function setupPostsListener(filter) {
    if (!db) return; 

    // Unsubscribe from previous listener if exists
    if (unsubscribePosts) {
        unsubscribePosts();
        unsubscribePosts = null;
    }

    const postsRef = window.firebase_firestore.collection(db, POSTS_COLLECTION_PATH);
    let q;

    if (filter === 'new-posts') {
        // Sort by timestamp descending (newest first), limit to 50
        q = window.firebase_firestore.query(postsRef, window.firebase_firestore.orderBy('timestamp', 'desc'));
    } else if (filter === 'old-posts') {
        // Sort by timestamp ascending (oldest first) - no limit needed for now
        q = window.firebase_firestore.query(postsRef, window.firebase_firestore.orderBy('timestamp', 'asc'));
    }

    // Attach new listener
    unsubscribePosts = window.firebase_firestore.onSnapshot(q, (snapshot) => {
        const posts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        // Note: The sorting is primarily handled by the query, but we still ensure a clean display
        displayPosts(posts); 
    }, (error) => {
        console.error("Error listening to posts:", error);
        showToast("Posts များ fetch လုပ်ရာတွင် အမှားဖြစ်ပွားပါသည်။");
    });
}


/**
 * Renders the posts to the DOM.
 */
function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    if (!container) return;

    container.innerHTML = ''; 
    if (posts.length === 0) {
         container.innerHTML = '<p style="text-align: center; color: var(--tg-theme-hint-color); padding: 20px;">ဤနေရာတွင် Post မရှိသေးပါ။</p>';
    } else {
        posts.forEach(post => {
            container.appendChild(createPostElement(post));
        });
    }
    // Re-attach event listeners every time posts are re-rendered
    addPostEventListeners(); 
}


function createPostElement(post) {
    const userId = currentUserId.toString(); 
    // likes are stored as an array of UIDs in post.likedBy
    const likedByArray = post.likedBy || [];
    const isLiked = likedByArray.includes(userId);
    const postLikesCount = likedByArray.length; 
    const isPostAdmin = (post.authorTelegramId && post.authorTelegramId == ADMIN_CHAT_ID);

    const deleteButton = isAdmin 
        ? `<button class="delete-btn" data-post-id="${post.id}"><i class="fas fa-trash"></i> Delete</button>` 
        : '';

    const postElement = document.createElement('div');
    postElement.className = 'post-card';
    postElement.setAttribute('data-post-id', post.id);
    postElement.innerHTML = `
        <p class="post-content">${post.content}</p>
        <div class="post-actions">
            <button class="like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post.id}">
                <i class="fas fa-heart"></i> 
                Like (${postLikesCount})
            </button>
            ${deleteButton}
        </div>
    `;
    return postElement;
}

function addPostEventListeners() {
    document.querySelectorAll('.like-btn').forEach(button => {
        button.onclick = (e) => toggleLike(e);
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.onclick = (e) => {
            const postId = e.currentTarget.getAttribute('data-post-id');
            // Use TMA confirmation dialog
            if (tg && tg.showConfirm) {
                tg.showConfirm('ဤ Post ကို ဖျက်ရန် သေချာပါသလား?', (ok) => {
                    if (ok) performDeletePost(postId);
                });
            } else {
                // Fallback for non-TMA environment
                if (confirm('Delete this post?')) performDeletePost(postId);
            }
        };
    });
}

async function performDeletePost(postId) {
    if (!db || !auth.currentUser || !isAdmin) {
        showToast("Admin သာ ဖျက်ခွင့်ရှိပါသည်။");
        return;
    }
    
    try {
        const postDocRef = window.firebase_firestore.doc(db, POSTS_COLLECTION_PATH, postId);
        await window.firebase_firestore.deleteDoc(postDocRef);
        showToast(`Post ID ${postId} ကို ဖျက်လိုက်ပါပြီ။`);
    } catch (e) {
        console.error("Error deleting document:", e);
        showToast("Post ဖျက်ရာတွင် အမှားဖြစ်ပွားပါသည်။");
    }
}


async function toggleLike(e) {
    const postId = e.currentTarget.getAttribute('data-post-id');
    const userId = currentUserId.toString();
    if (!db || userId === 'anonymous') {
         showToast("Login ဝင်ရန် လိုအပ်ပါသည်။");
         return;
    }

    try {
        const postDocRef = window.firebase_firestore.doc(db, POSTS_COLLECTION_PATH, postId);
        
        // 1. Get current post data to check if liked
        const docSnap = await window.firebase_firestore.getDoc(postDocRef);
        if (!docSnap.exists()) return;
        
        const postData = docSnap.data();
        const likedByArray = postData.likedBy || [];
        const isLiked = likedByArray.includes(userId);

        // 2. Prepare update operation
        let updateAction;
        let toastMessage;
        
        if (isLiked) {
            // Unlike: Remove User ID from likedBy array
            updateAction = window.firebase_firestore.arrayRemove(userId);
            toastMessage = "Like ဖျက်လိုက်ပါပြီ။";
        } else {
            // Like: Add User ID to likedBy array
            updateAction = window.firebase_firestore.arrayUnion(userId);
            toastMessage = "Like ပေးလိုက်ပါပြီ။";
        }
        
        // 3. Perform the atomic update
        await window.firebase_firestore.updateDoc(postDocRef, {
            likedBy: updateAction
        });
        
        showToast(toastMessage);
    } catch (error) {
        console.error("Error toggling like:", error);
        showToast("Like လုပ်ဆောင်ရာတွင် အမှားဖြစ်ပွားပါသည်။");
    }
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
                setupPostsListener(currentPostFilter); // Restart listener with new query
            }
        });
    });
}

// ===========================================
//          MUSIC LOGIC (FIRESTORE PREFERENCE)
// ===========================================

/**
 * Music Player ကို စတင်သတ်မှတ်ခြင်း (Autoplay မလုပ်ရ)
 */
async function setupMusicPlayer() { 
    audioPlayer = document.getElementById('audio-player');
    musicStatusSpan = document.getElementById('current-music-status');
    volumeToggleIcon = document.getElementById('volume-toggle');
    const musicStatusBar = document.querySelector('.music-status-bar');

    if (!audioPlayer) return;

    // 1. Get user's last saved music URL from Firestore
    let initialUrl = INITIAL_DEFAULT_URL;
    try {
        if (db && currentUserId !== 'anonymous') {
            const prefDocRef = window.firebase_firestore.doc(db, MUSIC_PREF_DOC_PATH(currentUserId));
            const docSnap = await window.firebase_firestore.getDoc(prefDocRef);
            if (docSnap.exists() && docSnap.data().musicUrl) {
                initialUrl = docSnap.data().musicUrl;
            }
        }
    } catch (e) {
        console.error("Error fetching music pref:", e);
    }

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
        audioPlayer.play().catch(e => {
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
async function setMusicUrl(url, sourceName) {
    if (!url || !audioPlayer) return;
    
    // 1. Save preference to Firestore (if user is authenticated)
    if (db && currentUserId !== 'anonymous') {
        try {
            const prefDocRef = window.firebase_firestore.doc(db, MUSIC_PREF_DOC_PATH(currentUserId));
            await window.firebase_firestore.setDoc(prefDocRef, { musicUrl: url }, { merge: true });
            console.log("Music URL saved to Firestore.");
        } catch (e) {
            console.error("Error saving music pref to Firestore:", e);
        }
    }
    
    // 2. Update player
    audioPlayer.src = url;
    audioPlayer.load();

    // URL အသစ်ပြောင်းရင် ဖွင့်မထားရ၊ Pause ပေးထားရမည်။
    audioPlayer.pause(); 
    
    closeModal('music-modal');
    closeModal('url-input-modal');
    showToast(`${sourceName} အသစ် သတ်မှတ်ပြီးပါပြီ။ Play Icon ကို နှိပ်ပြီး ဖွင့်ပါ။`);
}

function addMusicEventListeners() {
    // Modal open/close logic
    document.getElementById('music-button').onclick = () => openModal('music-modal');
    document.getElementById('cancel-music-modal-btn').onclick = () => closeModal('music-modal');
    
    // Music Option Clicks (Default & URL)
    document.querySelectorAll('.music-option-list .music-option').forEach(option => {
        option.onclick = (e) => {
            const type = e.currentTarget.getAttribute('data-music-type');
            
            if (type === 'default') {
                setMusicUrl(INITIAL_DEFAULT_URL, "Default Track"); 
            } else if (type === 'url') {
                closeModal('music-modal'); 
                openModal('url-input-modal'); 
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
            // Revoke object URL after a short delay or when done (to prevent memory leaks)
            setMusicUrl(url, file.name).then(() => {
                // If you want to clean up the URL after setting the source
                // setTimeout(() => URL.revokeObjectURL(url), 1000); 
            }); 
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
            submitPostBtn.onclick = async () => {
                const content = postInput.value.trim();
                if (content.length > 5 && db) { // Minimum post length
                    try {
                        // Use Telegram User ID for admin check simplicity, but UID for data ownership
                        const postData = {
                            authorUid: currentUserId, 
                            authorTelegramId: tg.initDataUnsafe.user.id, // Store Telegram ID for admin verification
                            authorName: currentUserName, 
                            content: content,
                            timestamp: window.firebase_firestore.serverTimestamp(), 
                            likedBy: [] // Array of UIDs
                        };
                        
                        const postsRef = window.firebase_firestore.collection(db, POSTS_COLLECTION_PATH);
                        await window.firebase_firestore.addDoc(postsRef, postData);
                        
                        postInput.value = ''; 
                        
                        // Post အသစ်တင်ရင် New Posts tab ကို ပြန်ပြမည်
                        if (currentPostFilter !== 'new-posts') {
                            document.getElementById('new-posts-tab').click(); 
                        }
                        
                        closeModal('post-modal'); 
                        showToast("Post တင်ပြီးပါပြီ။");
                        
                    } catch (e) {
                        console.error("Error creating post:", e);
                        showToast("Post တင်ရာတွင် အမှားဖြစ်ပွားပါသည်။");
                    }
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
//          PROFILE PHOTO & NAVIGATION LOGIC
// ===========================================

function updateProfileDisplay(userId, fullName, is_admin) {
    const tgUser = tg ? tg.initDataUnsafe.user : null;
    const username = tgUser ? tgUser.username : null;
    
    if (document.getElementById('profile-display-name')) document.getElementById('profile-display-name').textContent = fullName || 'Anonymous User';
    if (document.getElementById('profile-display-username')) document.getElementById('profile-display-username').textContent = username ? `@${username}` : 'N/A';
    // Chat ID (Firebase UID) ကို update
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
            pr

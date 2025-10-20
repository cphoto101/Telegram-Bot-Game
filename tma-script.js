// ********** SET YOUR ADMIN CHAT ID HERE **********
// ဤနေရာတွင် သင်၏ Telegram Chat ID ကို ထည့်သွင်းပါ။ (ဥပမာ: 123456789)
const ADMIN_CHAT_ID = 1924452453; 
// *************************************************

// --- LOCAL STORAGE KEYS ---
const POSTS_STORAGE_KEY = 'tma_community_posts_v4'; 
const LIKES_STORAGE_KEY = 'tma_user_likes_v4'; 
const CUSTOM_MUSIC_KEY = 'tma_custom_music_url_v4'; 
const DEFAULT_MUSIC_URL_KEY = 'tma_default_music_url'; // Default music key

// --- Global Variables ---
const INITIAL_DEFAULT_URL = 'https://archive.org/download/lofi-chill-1-20/lofi_chill_03_-_sleepwalker.mp3';
// App စဖွင့်တိုင်း ဖွင့်မယ့် Music URL
let persistentDefaultMusicUrl = localStorage.getItem(DEFAULT_MUSIC_URL_KEY) || INITIAL_DEFAULT_URL;
// လက်ရှိဖွင့်နေတဲ့ Music URL (Temporary custom url ဖြစ်နိုင်၊ မဟုတ်ရင် persistent default)
let currentMusicUrl = localStorage.getItem(CUSTOM_MUSIC_KEY) || persistentDefaultMusicUrl; 

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
 * Chat ID Copy Function (NEW)
 */
function copyChatId(chatId) {
    const tempInput = document.createElement('textarea');
    // Chat ID ကိုပဲ ကူးရန်
    tempInput.value = chatId.toString();
    document.body.appendChild(tempInput);
    tempInput.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showToast('Chat ID ကူးယူပြီးပါပြီ။');
        } else {
            // Fallback for some environments
            showToast('ကူးယူမရပါ၊ စာသားကို ကိုယ်တိုင်ရွေးချယ်ကူးယူပေးပါ။');
        }
    } catch (err) {
        showToast('ကူးယူမရပါ၊ စာသားကို ကိုယ်တိုင်ရွေးချယ်ကူးယူပေးပါ။');
    }
    document.body.removeChild(tempInput);
}

// ===========================================
//          POSTS & LIKES LOGIC
// ===========================================

function savePosts(posts) {
    try {
        localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
    } catch (e) {
        console.error("Error saving posts:", e);
    }
}

function getLikes() {
    try {
        return JSON.parse(localStorage.getItem(LIKES_STORAGE_KEY) || '{}');
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

function createPostElement(post, currentUserId) {
    const likes = getLikes();
    const userIdStr = currentUserId.toString(); 
    const isLiked = likes[post.id] && likes[post.id].map(String).includes(userIdStr);
    const isAdmin = (currentUserId === ADMIN_CHAT_ID);
    const postElement = document.createElement('div');
    postElement.className = 'post-card';
    postElement.setAttribute('data-post-id', post.id);

    const deleteButton = isAdmin 
        ? `<button class="delete-btn" data-post-id="${post.id}"><i class="fas fa-trash"></i> Delete</button>` 
        : '';

    postElement.innerHTML = `
        <div class="post-header">
        </div>
        <p class="post-content">${post.content}</p>
        <div class="post-actions">
            <button class="like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post.id}">
                <i class="fas fa-heart"></i> 
                Like (${post.likesCount || 0})
            </button>
            ${deleteButton}
        </div>
    `;
    return postElement;
}

function loadPosts(userId) {
    currentUserId = userId; 
    try {
        let posts = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || '[]');
        const container = document.getElementById('posts-container');
        
        if (currentPostFilter === 'new-posts') {
            posts.sort((a, b) => b.timestamp - a.timestamp); 
            posts = posts.slice(0, NEW_POSTS_LIMIT);
        } else if (currentPostFilter === 'old-posts') {
            posts.sort((a, b) => a.timestamp - b.timestamp); 
        }
        
        if (container) {
            container.innerHTML = ''; 
            if (posts.length === 0) {
                 container.innerHTML = '<p style="text-align: center; color: var(--tg-theme-hint-color); padding: 20px;">No posts found in this view.</p>';
            } else {
                posts.forEach(post => {
                    container.appendChild(createPostElement(post, userId));
                });
            }
        }
        addPostEventListeners(userId);
    } catch (e) {
        console.error("Error loading posts:", e);
        const container = document.getElementById('posts-container');
        if (container) {
             container.innerHTML = '<p style="text-align: center; color: var(--tg-theme-link-color);">Error loading community posts.</p>';
        }
    }
}

function performDeletePost(postId, userId) {
    if (userId !== ADMIN_CHAT_ID) return; 
    
    let posts = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || '[]');
    const updatedPosts = posts.filter(p => p.id !== postId);
    savePosts(updatedPosts);

    let likes = getLikes();
    delete likes[postId];
    saveLikes(likes);

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
                console.warn("Using console confirmation fallback.");
                performDeletePost(postId, userId); 
            }
        };
    });
}

function toggleLike(e, userId) {
    const postId = parseInt(e.currentTarget.getAttribute('data-post-id'));
    const userIdStr = userId.toString();
    
    let posts = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || '[]');
    let likes = getLikes();
    const postIndex = posts.findIndex(p => p.id === postId);

    if (postIndex === -1) return;

    likes[postId] = likes[postId] ? likes[postId].map(String) : []; 
    const isLiked = likes[postId].includes(userIdStr);

    if (isLiked) {
        likes[postId] = likes[postId].filter(id => id !== userIdStr);
        posts[postIndex].likesCount = (posts[postIndex].likesCount || 1) - 1;
    } else {
        likes[postId].push(userIdStr);
        posts[postIndex].likesCount = (posts[postIndex].likesCount || 0) + 1;
    }

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
                loadPosts(currentUserId); 
            }
        });
    });
}

// ===========================================
//          MODAL & MUSIC LOGIC (REVISED)
// ===========================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active'); 
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

function updateMusicStatus(isPlaying) {
    if (musicStatusSpan) {
        musicStatusSpan.textContent = isPlaying ? 'Music Playing' : 'Music Paused (Tap to Play)';
    }
}

/**
 * Default URL ကို Update လုပ်ရန် UI ကိုလည်း Update လုပ်မည်။
 */
function updateDefaultMusicUrlDisplay() {
    const displayEl = document.getElementById('current-default-url-display');
    if (displayEl) {
        const urlDisplay = persistentDefaultMusicUrl.length > 50 
            ? persistentDefaultMusicUrl.substring(0, 47) + '...' 
            : persistentDefaultMusicUrl;
        displayEl.textContent = `Current Default: ${urlDisplay}`;
    }
}


function setupMusicPlayer(autoplayAttempt = false) {
    audioPlayer = document.getElementById('audio-player');
    musicStatusSpan = document.getElementById('current-music-status');
    volumeToggleIcon = document.getElementById('volume-toggle');

    if (!audioPlayer) return;

    // App စဖွင့်တိုင်း Temporary URL မရှိရင် Default Music URL ကို ယူမည်
    if (!localStorage.getItem(CUSTOM_MUSIC_KEY)) {
        currentMusicUrl = persistentDefaultMusicUrl;
    }
    
    audioPlayer.src = currentMusicUrl;
    audioPlayer.loop = true;

    if (autoplayAttempt) {
        // Music တန်းဖွင့်ပေးရန် Autoplay Attempt
        audioPlayer.play().then(() => {
            console.log("Autoplay successful.");
        }).catch(e => {
            console.warn("Autoplay was prevented. User must interact to start music.", e);
            updateMusicStatus(false);
        });
    }

    audioPlayer.onplay = () => {
        updateMusicStatus(true);
        if(volumeToggleIcon) {
            volumeToggleIcon.classList.remove('fa-volume-off');
            volumeToggleIcon.classList.add('fa-volume-up');
        }
    };
    audioPlayer.onpause = () => {
        updateMusicStatus(false);
        if(volumeToggleIcon) {
            volumeToggleIcon.classList.remove('fa-volume-up');
            volumeToggleIcon.classList.add('fa-volume-off');
        }
    };
    audioPlayer.onerror = (e) => {
        console.error("Audio error:", e);
        updateMusicStatus(false);
        musicStatusSpan.textContent = 'Error: Failed to load music.';
    };

    updateMusicStatus(!audioPlayer.paused); 
    updateDefaultMusicUrlDisplay(); 
}

function toggleVolume() {
    if (!audioPlayer) return;

    if (audioPlayer.paused) {
        audioPlayer.play().catch(e => {
            console.error("Failed to play on user click:", e);
            musicStatusSpan.textContent = 'Failed to Play! Check track.';
        });
    } else {
        audioPlayer.pause();
    }
}

/**
 * Temporary Music URL သတ်မှတ်ခြင်း (App ပိတ်ရင် ပျောက်သွားမည်)
 */
function setTemporaryMusic(url) {
    if (!url || !audioPlayer) return;
    
    currentMusicUrl = url;
    localStorage.setItem(CUSTOM_MUSIC_KEY, url); // Temporary URL ကို သိမ်းထား
    
    audioPlayer.src = url;
    audioPlayer.load();

    audioPlayer.play().catch(e => {
        console.error("Failed to play music immediately after setting URL:", e);
        updateMusicStatus(false);
        musicStatusSpan.textContent = 'Music updated. Tap to play.';
    });
    
    closeModal('music-modal');
    closeModal('url-input-modal');
}

/**
 * Permanent Default Music URL သတ်မှတ်ခြင်း (App ပိတ်ရင်လည်း မပျောက်ဘဲ Auto-play တွင် အသုံးပြုမည်)
 */
function setPermanentDefaultMusic(url) {
    if (!url || !audioPlayer) return;

    persistentDefaultMusicUrl = url;
    localStorage.setItem(DEFAULT_MUSIC_URL_KEY, url); // Default URL ကို Permanent သိမ်းထား
    localStorage.removeItem(CUSTOM_MUSIC_KEY); // Temporary custom URL ကို ဖျက်
    
    currentMusicUrl = url; // လက်ရှိဖွင့်မည့် URL ကို Default အသစ်ဖြင့် ပြောင်း
    
    audioPlayer.src = url;
    audioPlayer.load();

    audioPlayer.play().catch(e => {
        console.error("Failed to play music immediately after setting default URL:", e);
        updateMusicStatus(false);
        musicStatusSpan.textContent = 'Default music set. Tap to play.';
    });
    
    updateDefaultMusicUrlDisplay();
    closeModal('default-url-input-modal');
    closeModal('music-modal');
    showToast("Default Music URL ကို ပြောင်းလဲသတ်မှတ်ပြီးပါပြီ။");
}


function addMusicEventListeners() {
    document.getElementById('music-button').onclick = () => {
         updateDefaultMusicUrlDisplay(); // Modal ဖွင့်တိုင်း Default URL ကို Update လုပ်ပေး
         openModal('music-modal');
    }
    if(volumeToggleIcon) volumeToggleIcon.onclick = toggleVolume; 
    document.getElementById('cancel-music-modal-btn').onclick = () => closeModal('music-modal');
    
    document.querySelectorAll('.music-option-list .music-option').forEach(option => {
        option.onclick = (e) => {
            const type = e.currentTarget.getAttribute('data-music-type');
            
            if (type === 'change-default') {
                 closeModal('music-modal'); 
                 openModal('default-url-input-modal');
                 const input = document.getElementById('default-music-url-input');
                 if (input) input.value = persistentDefaultMusicUrl; 
            } else if (type === 'default') {
                setTemporaryMusic(persistentDefaultMusicUrl); 
                localStorage.removeItem(CUSTOM_MUSIC_KEY); 
            } else if (type === 'url') {
                closeModal('music-modal'); 
                openModal('url-input-modal'); 
            }
        };
    });

    // Temporary URL Input Modal
    document.getElementById('close-url-modal-btn').onclick = () => {
        closeModal('url-input-modal');
        openModal('music-modal'); 
    };
    document.getElementById('play-url-btn').onclick = () => {
        const urlInput = document.getElementById('music-url-input');
        const url = urlInput ? urlInput.value.trim() : '';
        if (url) {
            setTemporaryMusic(url);
            urlInput.value = ''; 
        } else {
            showToast("URL မထည့်ရသေးပါ!");
        }
    };
    
    // Default URL Input Modal (NEW)
    document.getElementById('close-default-url-modal-btn').onclick = () => {
        closeModal('default-url-input-modal');
        openModal('music-modal'); 
    };
    document.getElementById('set-default-url-btn').onclick = () => {
        const urlInput = document.getElementById('default-music-url-input');
        const url = urlInput ? urlInput.value.trim() : '';
        if (url) {
            setPermanentDefaultMusic(url);
        } else {
             showToast("URL မထည့်ရသေးပါ!");
        }
    };

    const fileInput = document.getElementById('music-upload-input');
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setTemporaryMusic(url);
        }
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
        if (postAddButton) postAddButton.style.display = 'block';

        if (postAddButton) postAddButton.onclick = () => openModal('post-modal');
        if (cancelPostBtn) cancelPostBtn.onclick = () => closeModal('post-modal');

        if (submitPostBtn && postInput) {
            submitPostBtn.onclick = () => {
                const content = postInput.value.trim();
                if (content) {
                    let posts = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || '[]');
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
                } else {
                    console.error("Post content cannot be empty.");
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

    const tgPhotoUrl = tgUser ? tgUser.photo_url : null;
    const profileAvatarPlaceholder = document.getElementById('profile-avatar-placeholder');

    if (profileAvatarPlaceholder) {
        if (tgPhotoUrl) {
            profileAvatarPlaceholder.innerHTML = `<img src="${tgPhotoUrl}" alt="${fullName || 'Profile Photo'}" onerror="this.onerror=null; this.src='https://placehold.co/80x80/333/fff?text=${(fullName.charAt(0) || 'U').toUpperCase()}'">`;
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


// ===========================================
//          NAVIGATION & MAIN ENTRY
// ===========================================

function switchScreen(targetScreenId) {
    document.querySelectorAll('.content .screen').forEach(screen => screen.classList.remove('active'));
    
    const targetScreen = document.getElementById(targetScreenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');

    navItems.forEach(item => {
        item.addEventListe

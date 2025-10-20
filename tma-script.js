// ********** SET YOUR ADMIN CHAT ID HERE **********
// ဤနေရာတွင် သင်၏ Telegram Chat ID ကို ထည့်သွင်းပါ။ (ဥပမာ: 123456789)
const ADMIN_CHAT_ID = 1924452453; 
// *************************************************

// --- LOCAL STORAGE KEYS ---
const POSTS_STORAGE_KEY = 'tma_community_posts_v4'; 
const LIKES_STORAGE_KEY = 'tma_user_likes_v4'; 
const CUSTOM_MUSIC_KEY = 'tma_custom_music_url_v4'; 

// --- Global Variables ---
const defaultMusicUrl = 'https://archive.org/download/lofi-chill-1-20/lofi_chill_03_-_sleepwalker.mp3';
let currentMusicUrl = localStorage.getItem(CUSTOM_MUSIC_KEY) || defaultMusicUrl;
let audioPlayer;
let musicStatusSpan;
let volumeToggleIcon;
let currentUserId = 0; 
let currentUserName = 'Guest';
let is_admin = false; 

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

// Time function is kept, but its output is NOT used in the post card HTML.
function formatTime(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ', ' + date.toLocaleDateString('en-US');
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

/**
 * Creates the post element: Name နှင့် Time ကို ဖယ်ရှားထားသည်။ Delete ခလုတ်ကို Admin အတွက်သာ ပြသမည်။
 */
function createPostElement(post, currentUserId) {
    const likes = getLikes();
    const userIdStr = currentUserId.toString(); 
    const isLiked = likes[post.id] && likes[post.id].map(String).includes(userIdStr);
    const isAdmin = (currentUserId === ADMIN_CHAT_ID);
    const postElement = document.createElement('div');
    postElement.className = 'post-card';
    postElement.setAttribute('data-post-id', post.id);

    // Delete ခလုတ်ကို Admin အတွက်သာ ပြသမည်
    const deleteButton = isAdmin 
        ? `<button class="delete-btn" data-post-id="${post.id}"><i class="fas fa-trash"></i> Delete</button>` 
        : '';

    postElement.innerHTML = `
        <div class="post-header">
            <!-- အသုံးပြုသူ တောင်းဆိုချက်အရ Name နှင့် Time ကို ဖယ်ရှားထားသည် -->
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
        const posts = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || '[]');
        const container = document.getElementById('posts-container');
        if (container) {
            container.innerHTML = ''; 
            posts.sort((a, b) => b.timestamp - a.timestamp); 
            posts.forEach(post => {
                container.appendChild(createPostElement(post, userId));
            });
        }
        addPostEventListeners(userId);
    } catch (e) {
        console.error("Error loading posts:", e);
        const container = document.getElementById('posts-container');
        if (container) {
             container.innerHTML = '<p style="text-align: center; color: var(--tg-theme-link-color);">No posts yet.</p>';
        }
    }
}

// --- Post Deletion Logic ---

function performDeletePost(postId, userId) {
    if (userId !== ADMIN_CHAT_ID) return; // Admin မှသာ ဖျက်နိုင်မည်
    
    let posts = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || '[]');
    const updatedPosts = posts.filter(p => p.id !== postId);
    savePosts(updatedPosts);

    let likes = getLikes();
    delete likes[postId];
    saveLikes(likes);

    loadPosts(userId); // UI ကို ပြန်လည်ပြသမည်
}

function addPostEventListeners(userId) {
    document.querySelectorAll('.like-btn').forEach(button => {
        button.onclick = (e) => toggleLike(e, userId);
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.onclick = (e) => {
            const postId = parseInt(e.currentTarget.getAttribute('data-post-id'));
            
            // TMA native confirmation ကို သုံးမည်
            if (tg && tg.showConfirm) {
                tg.showConfirm('ဤ Post ကို ဖျက်ရန် သေချာပါသလား?', (ok) => {
                    if (ok) performDeletePost(postId, userId);
                });
            } else {
                // Fallback (console သို့သာ ပို့ပါမည်၊ window.confirm ကို မသုံးပါ)
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

    // Likes များကို string အဖြစ် သိမ်းဆည်းထားရန်
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
    
    loadPosts(currentUserId); // UI ကို ပြန်လည်ပြသမည်
}


// ===========================================
//          MODAL & MUSIC LOGIC (No Changes)
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

function updateMusicStatus(status) {
    if (musicStatusSpan) {
        musicStatusSpan.textContent = status;
    }
}

function setupMusicPlayer(autoplayAttempt = false) {
    audioPlayer = document.getElementById('audio-player');
    musicStatusSpan = document.getElementById('current-music-status');
    volumeToggleIcon = document.getElementById('volume-toggle');

    if (!audioPlayer) return;

    audioPlayer.src = currentMusicUrl;
    audioPlayer.loop = true;

    if (autoplayAttempt) {
        audioPlayer.play().then(() => {
            // Success
        }).catch(e => {
            console.warn("Autoplay was prevented.", e);
            updateMusicStatus('Music Paused (Tap to Play)');
        });
    }

    audioPlayer.onplay = () => {
        const fileName = currentMusicUrl.split('/').pop().split('?')[0]; 
        updateMusicStatus(`Playing: ${fileName.substring(0, 30)}...`);
        if(volumeToggleIcon) {
            volumeToggleIcon.classList.remove('fa-volume-off');
            volumeToggleIcon.classList.add('fa-volume-up');
        }
    };
    audioPlayer.onpause = () => {
        updateMusicStatus('Music Paused (Tap to Play)');
        if(volumeToggleIcon) {
            volumeToggleIcon.classList.remove('fa-volume-up');
            volumeToggleIcon.classList.add('fa-volume-off');
        }
    };
    audioPlayer.onerror = (e) => {
        console.error("Audio error:", e);
        if (currentMusicUrl !== defaultMusicUrl) {
             updateMusicStatus('Error: Custom Music URL failed. Reverting to default.');
             setCustomMusic(defaultMusicUrl); 
        } else {
             updateMusicStatus('Error: Failed to play audio. (Check network)');
        }
    };

    if (audioPlayer.paused) {
        updateMusicStatus('Music Paused (Tap to Play)');
    }
}

function toggleVolume() {
    if (!audioPlayer) return;

    if (audioPlayer.paused) {
        audioPlayer.play().catch(e => {
            console.error("Failed to play on user click:", e);
            updateMusicStatus('Failed to Play! Check URL or select a different track.');
        });
    } else {
        audioPlayer.pause();
    }
}

function setCustomMusic(url) {
    if (!url || !audioPlayer) return;
    
    currentMusicUrl = url;
    localStorage.setItem(CUSTOM_MUSIC_KEY, url);
    
    audioPlayer.src = url;
    audioPlayer.load();

    audioPlayer.play().catch(e => {
        console.error("Failed to play music immediately after setting URL:", e);
        updateMusicStatus('Music track updated. Tap to play.');
    });
    
    closeModal('music-modal');
    closeModal('url-input-modal');
}

function addMusicEventListeners() {
    document.getElementById('music-button').onclick = () => openModal('music-modal');
    if(volumeToggleIcon) volumeToggleIcon.onclick = toggleVolume; 
    document.getElementById('cancel-music-modal-btn').onclick = () => closeModal('music-modal');
    
    document.querySelectorAll('.music-option-list .music-option').forEach(option => {
        option.onclick = (e) => {
            const type = e.currentTarget.getAttribute('data-music-type');
            if (type === 'default') {
                setCustomMusic(defaultMusicUrl);
            } else if (type === 'url') {
                closeModal('music-modal'); 
                openModal('url-input-modal'); 
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
            setCustomMusic(url);
            urlInput.value = ''; 
        } else {
            console.error("Please enter a music URL.");
        }
    };
    
    const fileInput = document.getElementById('music-upload-input');
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setCustomMusic(url);
        }
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
        // Admin များသာ Post ခလုတ်ကို မြင်ရမည်
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
                        authorName: currentUserName, // data သိမ်းဆည်းရန်အတွက်သာ
                        isAdmin: true,
                        content: content,
                        timestamp: Date.now(), // data သိမ်းဆည်းရန်အတွက်သာ
                        likesCount: 0
                    };
                    posts.push(newPost);
                    savePosts(posts);
                    postInput.value = ''; 
                    loadPosts(currentUserId);
                    closeModal('post-modal'); 
                } else {
                    console.error("Post content cannot be empty.");
                }
            };
        }
    } else {
         // Non-admin များအတွက် ခလုတ်ကို လုံးဝဖျောက်ထားသည်
         if (postAddButton) postAddButton.style.display = 'none';
    }
}

// ===========================================
//          PROFILE PHOTO LOGIC (No Changes)
// ===========================================

function updateProfileDisplay(userId, fullName, is_admin) {
    const tgUser = tg ? tg.initDataUnsafe.user : null;
    const username = tgUser ? tgUser.username : null;
    
    if (document.getElementById('profile-display-name')) document.getElementById('profile-display-name').textContent = fullName || 'Name Not Available';
    if (document.getElementById('profile-display-username')) document.getElementById('profile-display-username').textContent = username ? `@${username}` : 'N/A';
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
        item.addEventListener('click', (e) => {
            e.preventDefault(); 
            const targetScreenId = item.getAttribute('data-screen');
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            switchScreen(targetScreenId);
        });
    });
}


document.addEventListener('DOMContentLoaded', () => {
    
    // ---------------------------------------------
    // 1. TMA Integration & Profile Data Initialization
    // ---------------------------------------------
    
    if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp; 
        
        try {
            tg.ready();
            tg.expand(); 
            
            const user = tg.initDataUnsafe.user;
            
            if (user) {
                currentUserId = user.id || 0;
                const firstName = user.first_name || '';
                const lastName = user.last_name || '';
                const fullName = `${firstName} ${lastName}`.trim();
                
                currentUserName = fullName || 'User'; 
                is_admin = (currentUserId === ADMIN_CHAT_ID);

                const closeBtn = document.getElementById('tma-close-btn');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => tg.close());
                }
            } 
        } catch (e) {
             console.error("TMA Initialization Error:", e);
        }
    } else {
        console.warn("Mini App launched outside Telegram. Using default user ID 0.");
        // Non-admin mode for desktop testing
        is_admin = (currentUserId === ADMIN_CHAT_ID); 
    }

    // ---------------------------------------------
    // 2. Setup All Features
    // ---------------------------------------------
    
    updateProfileDisplay(currentUserId, currentUserName, is_admin); 
    loadPosts(currentUserId); 
    setupNavigation();
    
    setupMusicPlayer(true); 
    addMusicEventListeners();

    setupAdminPostLogic(is_admin);

    console.log("App loaded successfully. Post metadata hidden, admin posting restricted.");
});

// ********** SET YOUR ADMIN CHAT ID HERE **********
// ဤနေရာတွင် သင့်၏ Telegram Chat ID ကို ထည့်သွင်းပါ။
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

function formatTime(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'ယခုလေးတင်';
    if (diffInMinutes < 60) return `${diffInMinutes} မိနစ်ခန့်က`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} နာရီခန့်က`;
    
    return date.toLocaleTimeString('my-MM', { hour: '2-digit', minute: '2-digit' }) + ', ' + date.toLocaleDateString('my-MM');
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
    const isLiked = likes[post.id] && likes[post.id].includes(currentUserId);
    const isAdmin = (currentUserId === ADMIN_CHAT_ID);
    const postElement = document.createElement('div');
    postElement.className = 'post-card';
    postElement.setAttribute('data-post-id', post.id);

    const deleteButton = isAdmin 
        ? `<button class="delete-btn" data-post-id="${post.id}"><i class="fas fa-trash"></i> ဖျက်မည်</button>` 
        : '';

    postElement.innerHTML = `
        <div class="post-header">
            <span class="post-author ${post.isAdmin ? 'admin' : ''}">${post.authorName}</span>
            <span class="post-timestamp">${formatTime(post.timestamp)}</span>
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
    currentUserId = userId; // Update global user ID
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
             container.innerHTML = '<p style="text-align: center; color: #ff5252;">Post များတင်ရာတွင် အမှားအယွင်းရှိနေပါသည်။</p>';
        }
    }
}

function addPostEventListeners(userId) {
    document.querySelectorAll('.like-btn').forEach(button => {
        button.onclick = (e) => toggleLike(e, userId);
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.onclick = (e) => {
            if (window.Telegram.WebApp.showConfirm) {
                window.Telegram.WebApp.showConfirm('ဒီ Post ကို ဖျက်မှာ သေချာပါသလား?', (ok) => {
                    if (ok) deletePost(e, userId);
                });
            } else {
                // Fallback for non-TMA environment or older versions
                if (confirm('Are you sure you want to delete this post?')) {
                     deletePost(e, userId);
                }
            }
        };
    });
}

function toggleLike(e, userId) {
    const postId = parseInt(e.currentTarget.getAttribute('data-post-id'));
    let posts = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || '[]');
    let likes = getLikes();
    const postIndex = posts.findIndex(p => p.id === postId);

    if (postIndex === -1) return;

    likes[postId] = likes[postId] || []; 
    const isLiked = likes[postId].includes(userId);

    if (isLiked) {
        likes[postId] = likes[postId].filter(id => id !== userId);
        posts[postIndex].likesCount = (posts[postIndex].likesCount || 1) - 1;
    } else {
        likes[postId].push(userId);
        posts[postIndex].likesCount = (posts[postIndex].likesCount || 0) + 1;
    }

    saveLikes(likes);
    savePosts(posts);
    
    loadPosts(userId); 
}

function deletePost(e, userId) {
    if (userId !== ADMIN_CHAT_ID) return; 
    
    const postId = parseInt(e.currentTarget.getAttribute('data-post-id'));

    let posts = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || '[]');
    const updatedPosts = posts.filter(p => p.id !== postId);
    savePosts(updatedPosts);

    let likes = getLikes();
    delete likes[postId];
    saveLikes(likes);

    loadPosts(userId);
}

// ===========================================
//          MODAL & MUSIC LOGIC (FIXED)
// ===========================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active'); // Add active class for CSS transition
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

    // Autoplay attempt on app launch
    if (autoplayAttempt) {
        audioPlayer.play().then(() => {
            // Success
        }).catch(e => {
            console.warn("Autoplay was prevented. Tap volume icon to start.", e);
            updateMusicStatus('သီချင်းရပ်နားထားပါသည်။ (ဖွင့်ရန် နှိပ်ပါ)');
        });
    }

    // Event listeners for status update and error handling
    audioPlayer.onplay = () => {
        const fileName = currentMusicUrl.split('/').pop().split('?')[0]; 
        updateMusicStatus(`ဖွင့်နေသည်: ${fileName.substring(0, 30)}...`);
        if(volumeToggleIcon) {
            volumeToggleIcon.classList.remove('fa-volume-off');
            volumeToggleIcon.classList.add('fa-volume-up');
        }
    };
    audioPlayer.onpause = () => {
        updateMusicStatus('သီချင်းရပ်နားထားပါသည်။ (ဖွင့်ရန် နှိပ်ပါ)');
        if(volumeToggleIcon) {
            volumeToggleIcon.classList.remove('fa-volume-up');
            volumeToggleIcon.classList.add('fa-volume-off');
        }
    };
    audioPlayer.onerror = (e) => {
        console.error("Audio error:", e);
        if (currentMusicUrl !== defaultMusicUrl) {
             updateMusicStatus('Error: Custom Music URL အမှား။ မူလသီချင်းသို့ ပြောင်းလဲလိုက်ပါပြီ။');
             setCustomMusic(defaultMusicUrl); // Revert to default
        } else {
             updateMusicStatus('Error: သီချင်းဖွင့်မရပါ။ (ကွန်ယက်စစ်ပါ)');
        }
    };

    // Initial status 
    if (audioPlayer.paused) {
        updateMusicStatus('သီချင်းရပ်နားထားပါသည်။ (ဖွင့်ရန် နှိပ်ပါ)');
    }
}

function toggleVolume() {
    if (!audioPlayer) return;

    if (audioPlayer.paused) {
        audioPlayer.play().catch(e => {
            console.error("Failed to play on user click (Interaction needed):", e);
            // Show a temporary message if play fails after click
            updateMusicStatus('ဖွင့်မရပါ! URL စစ်ဆေးပါ သို့ ရွေးချယ်ပါ။');
        });
    } else {
        audioPlayer.pause();
    }
}

function setCustomMusic(url) {
    if (!url || !audioPlayer) {
        console.error("Invalid URL or audio player not found.");
        return;
    }
    
    currentMusicUrl = url;
    localStorage.setItem(CUSTOM_MUSIC_KEY, url);
    
    // Reset, Load, and Attempt to Play
    audioPlayer.src = url;
    audioPlayer.load();

    audioPlayer.play().catch(e => {
        console.error("Failed to play music immediately after setting URL:", e);
        updateMusicStatus('သီချင်းပြောင်းလဲပြီးပါပြီ။ ဖွင့်ရန် နှိပ်ပါ');
    });
    
    closeModal('music-modal');
    closeModal('url-input-modal');
}

function addMusicEventListeners() {
    document.getElementById('music-button').onclick = () => openModal('music-modal');
    volumeToggleIcon.onclick = toggleVolume;
    document.getElementById('cancel-music-modal-btn').onclick = () => closeModal('music-modal');
    
    // Music Options 
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

    // URL Modal Buttons
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
            console.error("သီချင်း URL ထည့်သွင်းပေးပါ။");
        }
    };
    
    // File Upload
    const fileInput = document.getElementById('music-upload-input');
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Note: createObjectURL URLs are temporary and local
            const url = URL.createObjectURL(file);
            setCustomMusic(url);
        }
    };
}

// ===========================================
//          ADMIN POST LOGIC (NEW)
// ===========================================

function setupAdminPostLogic(isAdmin) {
    const postAddButton = document.getElementById('post-add-button');
    const postModal = document.getElementById('post-modal');
    const submitPostBtn = document.getElementById('submit-post-btn');
    const cancelPostBtn = document.getElementById('cancel-post-btn');
    const postInput = document.getElementById('post-input');
    const adminMessageEl = document.getElementById('admin-message');

    if (isAdmin) {
        // Show the "+" icon for Admin
        if (postAddButton) postAddButton.style.display = 'block';
        if (adminMessageEl) adminMessageEl.style.display = 'none'; // Hide general message

        // Add event listeners for the new modal flow
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
                    postInput.value = ''; // Clear input
                    loadPosts(currentUserId);
                    closeModal('post-modal'); // Close after successful post
                } else {
                    console.error("Post content cannot be empty.");
                }
            };
        }
    } else {
         // Show the info message for Regular User
         if (postAddButton) postAddButton.style.display = 'none';
         if (adminMessageEl) adminMessageEl.style.display = 'flex'; 
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
    
    let is_admin = false;

    if (typeof window.Telegram.WebApp !== 'undefined') {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand(); // Ensure the app is fully expanded
        
        try {
            const user = tg.initDataUnsafe.user;
            
            if (user) {
                currentUserId = user.id || 0;
                const firstName = user.first_name || '';
                const lastName = user.last_name || '';
                const username = user.username;
                const photoUrl = user.photo_url; 
                const fullName = `${firstName} ${lastName}`.trim();
                
                currentUserName = fullName || 'User'; 
                is_admin = (currentUserId === ADMIN_CHAT_ID);

                // --- PROFILE DATA FILLING ---
                if (document.getElementById('profile-display-name')) document.getElementById('profile-display-name').textContent = fullName || 'အမည် မရရှိပါ';
                if (document.getElementById('profile-display-username')) document.getElementById('profile-display-username').textContent = username ? `@${username}` : 'N/A';
                if (document.getElementById('telegram-chat-id')) document.getElementById('telegram-chat-id').textContent = currentUserId.toString();
                
                const adminStatusEl = document.getElementById('admin-status');
                if (adminStatusEl) adminStatusEl.textContent = is_admin ? 'အုပ်ချုပ်သူ (Admin)' : 'ရိုးရိုးအသုံးပြုသူ';

                // **PROFILE PICTURE LOGIC (FIXED)**
                const profileAvatarPlaceholder = document.getElementById('profile-avatar-placeholder');
                if (profileAvatarPlaceholder) {
                    if (photoUrl) {
                        profileAvatarPlaceholder.innerHTML = `<img src="${photoUrl}" alt="${fullName || 'Profile Photo'}" onerror="this.onerror=null; this.src='https://placehold.co/80x80/333/fff?text=${(fullName.charAt(0) || 'U').toUpperCase()}'">`;
                        profileAvatarPlaceholder.style.backgroundColor = 'transparent';
                        profileAvatarPlaceholder.textContent = '';
                    } else {
                        // Fallback to initials and color
                        const userIdStr = currentUserId.toString();
                        const userColor = stringToColor(userIdStr);
                        const initial = (fullName.charAt(0) || 'U').toUpperCase();
                        profileAvatarPlaceholder.innerHTML = ''; 
                        profileAvatarPlaceholder.style.backgroundColor = userColor;
                        profileAvatarPlaceholder.textContent = initial;
                    }
                }

                // Close App Button
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
    }

    // ---------------------------------------------
    // 2. Setup All Features
    // ---------------------------------------------
    
    loadPosts(currentUserId); 
    setupNavigation();
    
    // Setup Music Player and attempt Autoplay
    setupMusicPlayer(true); 
    addMusicEventListeners();

    // Setup new Admin Post UI
    setupAdminPostLogic(is_admin);
});

// ********** SET YOUR ADMIN CHAT ID HERE **********
const ADMIN_CHAT_ID = 1924452453; 
// *************************************************

// --- LOCAL STORAGE KEYS ---
const POSTS_STORAGE_KEY = 'tma_community_posts_v3'; 
const LIKES_STORAGE_KEY = 'tma_user_likes'; 
const APP_USERS_STORAGE_KEY = 'tma_app_users'; 
const CUSTOM_MUSIC_KEY = 'tma_custom_music_url'; 

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
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    
    // Otherwise, show date/time
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

function loadPosts(currentUserId) {
    try {
        const posts = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || '[]');
        const container = document.getElementById('posts-container');
        if (container) {
            container.innerHTML = ''; 
            // Sort by latest first
            posts.sort((a, b) => b.timestamp - a.timestamp); 
            posts.forEach(post => {
                container.appendChild(createPostElement(post, currentUserId));
            });
        }
        addPostEventListeners(currentUserId);
    } catch (e) {
        console.error("Error loading posts:", e);
        // Fallback or error message to user
        const container = document.getElementById('posts-container');
        if (container) {
             container.innerHTML = '<p style="text-align: center; color: #ff5252;">Failed to load posts due to an error.</p>';
        }
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
        ? `<button class="delete-btn" data-post-id="${post.id}"><i class="fas fa-trash"></i> Delete</button>` 
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

function addPostEventListeners(currentUserId) {
    // Likes Listener
    document.querySelectorAll('.like-btn').forEach(button => {
        button.onclick = (e) => toggleLike(e, currentUserId);
    });

    // Delete Listener
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.onclick = (e) => deletePost(e, currentUserId);
    });
}

function toggleLike(e, currentUserId) {
    const postId = parseInt(e.currentTarget.getAttribute('data-post-id'));
    let posts = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || '[]');
    let likes = getLikes();
    const postIndex = posts.findIndex(p => p.id === postId);

    if (postIndex === -1) return;

    // Initialize like array if null
    likes[postId] = likes[postId] || []; 
    const isLiked = likes[postId].includes(currentUserId);

    if (isLiked) {
        // Unlike: remove user ID
        likes[postId] = likes[postId].filter(id => id !== currentUserId);
        posts[postIndex].likesCount = (posts[postIndex].likesCount || 1) - 1;
    } else {
        // Like: add user ID
        likes[postId].push(currentUserId);
        posts[postIndex].likesCount = (posts[postIndex].likesCount || 0) + 1;
    }

    saveLikes(likes);
    savePosts(posts);
    
    // UI Update (Re-render the list or just update the button for efficiency)
    loadPosts(currentUserId); // Full re-render is easier for complex UIs
}

function deletePost(e, currentUserId) {
    if (currentUserId !== ADMIN_CHAT_ID) return; // Security check
    
    const postId = parseInt(e.currentTarget.getAttribute('data-post-id'));
    if (!confirm('Are you sure you want to delete this post?')) return;

    let posts = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || '[]');
    const updatedPosts = posts.filter(p => p.id !== postId);
    savePosts(updatedPosts);

    // Also clean up likes
    let likes = getLikes();
    delete likes[postId];
    saveLikes(likes);

    loadPosts(currentUserId);
}

// ===========================================
//          USER LIST LOGIC
// ===========================================

function saveCurrentUser(user) {
    try {
        let users = JSON.parse(localStorage.getItem(APP_USERS_STORAGE_KEY) || '[]');
        const existingIndex = users.findIndex(u => u.id === user.id);

        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        const isCurrentUserAdmin = (user.id === ADMIN_CHAT_ID);

        const newUserData = {
            id: user.id,
            name: fullName || `User ${user.id}`,
            username: user.username || null,
            photoUrl: user.photo_url || null, 
            isAdmin: isCurrentUserAdmin,
            avatarInitial: (fullName.charAt(0) || (isCurrentUserAdmin ? 'A' : 'U')).toUpperCase(),
            avatarColor: stringToColor(user.id.toString()),
            lastSeen: Date.now() 
        };

        if (existingIndex > -1) {
            users[existingIndex] = newUserData;
        } else {
            users.push(newUserData);
        }

        localStorage.setItem(APP_USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
        console.error("Error saving current user data:", e);
    }
}

function createUserCardElement(user) {
    const card = document.createElement('div');
    card.className = 'user-card';

    let avatarHtml;
    if (user.photoUrl) {
         avatarHtml = `<div class="user-avatar"><img src="${user.photoUrl}" alt="${user.name}"></div>`;
    } else {
        avatarHtml = `<div class="user-avatar" style="background-color: ${user.avatarColor};">${user.avatarInitial}</div>`;
    }
    
    const adminTag = user.isAdmin ? ' (Admin)' : '';
    const usernameDisplay = user.username ? `@${user.username}` : 'No Username';
    const lastSeenTime = new Date(user.lastSeen).toLocaleDateString('en-US'); 

    card.innerHTML = `
        ${avatarHtml}
        <div class="user-info">
            <strong>${user.name} ${adminTag}</strong>
            <span>${usernameDisplay}</span>
            <span style="font-size: 11px; color: #555;">Last Opened: ${lastSeenTime}</span>
        </div>
    `;
    return card;
}

function renderUserList(containerId) {
    try {
        const container = document.getElementById(containerId);
        if (!container) return; 

        container.innerHTML = ''; 
        let allUsers = JSON.parse(localStorage.getItem(APP_USERS_STORAGE_KEY) || '[]');

        // Sort: Admin first, then by lastSeen
        allUsers.sort((a, b) => {
            if (a.isAdmin && !b.isAdmin) return -1;
            if (!a.isAdmin && b.isAdmin) return 1;
            return b.lastSeen - a.lastSeen; // Newest first
        });

        if (allUsers.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #aaa; padding-top: 20px;">No users found yet. Be the first!</p>';
            return;
        }

        allUsers.forEach(user => {
            container.appendChild(createUserCardElement(user));
        });
    } catch (e) {
        console.error("Error rendering user list:", e);
    }
}


// ===========================================
//          MUSIC & MODAL LOGIC
// ===========================================

const defaultMusicUrl = 'https://archive.org/download/lofi-chill-1-20/lofi_chill_03_-_sleepwalker.mp3';
let currentMusicUrl = localStorage.getItem(CUSTOM_MUSIC_KEY) || defaultMusicUrl;
let isMusicOn = true;
let audioPlayer;
let musicModal;
let urlInputModal;
let musicStatusSpan;
let volumeToggleIcon;


function setupMusicPlayer() {
    audioPlayer = document.getElementById('audio-player');
    musicModal = document.getElementById('music-modal');
    urlInputModal = document.getElementById('url-input-modal');
    musicStatusSpan = document.getElementById('current-music-status');
    volumeToggleIcon = document.getElementById('volume-toggle');

    if (!audioPlayer) return;

    audioPlayer.src = currentMusicUrl;
    audioPlayer.loop = true;

    // Attempt to auto-play when user is ready
    audioPlayer.oncanplay = () => {
        if (isMusicOn) {
            audioPlayer.play().catch(e => {
                console.warn("Autoplay failed:", e);
                updateMusicStatus('Music Paused (Tap to Start)');
            });
        }
    };
    
    // Update status bar on events
    audioPlayer.onplay = () => {
        updateMusicStatus(`Now Playing: ${currentMusicUrl.split('/').pop().substring(0, 30)}...`);
        volumeToggleIcon.classList.remove('fa-volume-off');
        volumeToggleIcon.classList.add('fa-volume-up');
    };
    audioPlayer.onpause = () => {
        updateMusicStatus('Music Paused (Tap to Start)');
        volumeToggleIcon.classList.remove('fa-volume-up');
        volumeToggleIcon.classList.add('fa-volume-off');
    };

    // Initial status
    audioPlayer.pause();
    updateMusicStatus('Music Paused (Tap to Start)');
}

function updateMusicStatus(status) {
    if (musicStatusSpan) {
        musicStatusSpan.textContent = status;
    }
}

function toggleVolume() {
    if (audioPlayer.paused) {
        audioPlayer.play();
        isMusicOn = true;
    } else {
        audioPlayer.pause();
        isMusicOn = false;
    }
}

function openModal(modal) {
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal(modal) {
    if (modal) {
        modal.style.display = 'none';
    }
}

function setCustomMusic(url) {
    currentMusicUrl = url;
    localStorage.setItem(CUSTOM_MUSIC_KEY, url);
    audioPlayer.src = url;
    audioPlayer.load();
    audioPlayer.play().catch(e => console.error("Play failed after setting URL:", e));
    closeModal(musicModal);
    closeModal(urlInputModal);
}

function addMusicEventListeners() {
    if (document.getElementById('music-button')) {
        document.getElementById('music-button').onclick = () => openModal(musicModal);
    }
    if (volumeToggleIcon) {
        volumeToggleIcon.onclick = toggleVolume;
    }
    if (document.getElementById('cancel-modal-btn')) {
        document.getElementById('cancel-modal-btn').onclick = () => closeModal(musicModal);
    }
    
    // Music Options
    document.querySelectorAll('.music-option').forEach(option => {
        option.onclick = (e) => {
            const type = e.currentTarget.getAttribute('data-music-type');
            if (type === 'default') {
                setCustomMusic(defaultMusicUrl);
            } else if (type === 'url') {
                openModal(urlInputModal);
            }
        };
    });

    // URL Modal Buttons
    if (document.getElementById('close-url-modal-btn')) {
        document.getElementById('close-url-modal-btn').onclick = () => closeModal(urlInputModal);
    }
    if (document.getElementById('play-url-btn')) {
        document.getElementById('play-url-btn').onclick = () => {
            const urlInput = document.getElementById('music-url-input');
            if (urlInput && urlInput.value) {
                setCustomMusic(urlInput.value);
                urlInput.value = ''; // Clear input
            }
        };
    }
    
    // File Upload
    const fileInput = document.getElementById('music-upload-input');
    if (fileInput) {
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const url = URL.createObjectURL(file);
                setCustomMusic(url);
            }
        };
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
        
        // Render user list when accessing the screen
        if (targetScreenId === 'user-list-screen') {
            renderUserList('users-container');
        }
    }
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    const backButtons = document.querySelectorAll('.back-button'); 
    const appUsersCard = document.getElementById('app-users-card');

    // Bottom Nav Click Listener
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetScreenId = item.getAttribute('data-screen');
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            switchScreen(targetScreenId);
        });
    });

    // Profile Screen -> App Users Click (Switch to new screen)
    if (appUsersCard) {
        appUsersCard.addEventListener('click', () => {
            switchScreen('user-list-screen');
        });
    }

    // Back Button Click (User List -> Profile)
    backButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetScreenId = button.getAttribute('data-target-screen');
            switchScreen(targetScreenId);
        });
    });
}


document.addEventListener('DOMContentLoaded', () => {
    
    let currentUserId = 0; 
    let currentUserName = 'Guest';

    // ---------------------------------------------
    // 1. TMA Integration & Profile Data Filling Logic 
    // ---------------------------------------------
    if (typeof window.Telegram.WebApp !== 'undefined') {
        const tg = window.Telegram.WebApp;
        tg.ready();
        
        // Use try-catch for safer initData parsing
        try {
            const user = tg.initDataUnsafe.user;
            const photoUrl = user.photo_url; 

            if (user) {
                currentUserId = user.id || 0;
                const firstName = user.first_name || '';
                const lastName = user.last_name || '';
                const username = user.username;
                const fullName = `${firstName} ${lastName}`.trim();
                
                currentUserName = fullName || 'User'; 
                const isAdmin = (currentUserId === ADMIN_CHAT_ID);

                saveCurrentUser(user); 

                // Fill Profile Data
                document.getElementById('profile-display-name').textContent = fullName || 'No Name Provided';
                document.getElementById('profile-display-username').textContent = username ? `@${username}` : 'N/A';
                document.getElementById('telegram-chat-id').textContent = currentUserId.toString();
                
                // Admin Status & Post Box Logic
                const adminStatusEl = document.getElementById('admin-status');
                const adminPostBoxEl = document.getElementById('admin-post-box');
                const adminMessageEl = document.getElementById('admin-message');

                if (isAdmin) {
                    if (adminStatusEl) adminStatusEl.textContent = 'Administrator';
                    if (adminPostBoxEl) adminPostBoxEl.style.display = 'block';
                    if (adminMessageEl) adminMessageEl.style.display = 'none';
                } else {
                    if (adminStatusEl) adminStatusEl.textContent = 'Regular User';
                    if (adminPostBoxEl) adminPostBoxEl.style.display = 'none';
                    if (adminMessageEl) {
                        adminMessageEl.textContent = 'Only the Admin can post announcements.';
                        adminMessageEl.style.display = 'block';
                    }
                }

                // Profile Photo Logic 
                const profileAvatarPlaceholder = document.getElementById('profile-avatar-placeholder');
                if (profileAvatarPlaceholder) {
                    if (photoUrl) {
                        profileAvatarPlaceholder.innerHTML = `<img src="${photoUrl}" alt="Profile Photo">`;
                        profileAvatarPlaceholder.style.backgroundColor = 'transparent';
                        profileAvatarPlaceholder.textContent = '';
                    } else {
                        const userIdStr = currentUserId.toString();
                        const userColor = stringToColor(userIdStr);
                        const initial = (fullName.charAt(0) || 'U').toUpperCase();
                        profileAvatarPlaceholder.style.backgroundColor = userColor;
                        profileAvatarPlaceholder.textContent = initial;
                    }
                }

                // Close App Button
                const closeBtn = document.getElementById('tma-close-btn');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => tg.close());
                }
                
                // Admin Post Submission Listener
                const submitPostBtn = document.getElementById('submit-post-btn');
                const postInput = document.getElementById('post-input');
                if (submitPostBtn && postInput && isAdmin) {
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
                            loadPosts(currentUserId);
                        }
                    };
        

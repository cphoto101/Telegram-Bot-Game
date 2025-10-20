// ********** SET YOUR ADMIN CHAT ID HERE **********
const ADMIN_CHAT_ID = 1924452453; 
// *************************************************

// --- LOCAL STORAGE KEYS ---
const POSTS_STORAGE_KEY = 'tma_community_posts_v3'; 
const LIKES_STORAGE_KEY = 'tma_user_likes'; 
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
    
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ', ' + date.toLocaleDateString('en-US');
}

// ===========================================
//          POSTS & LIKES LOGIC (Unchanged - Stable)
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
            posts.sort((a, b) => b.timestamp - a.timestamp); 
            posts.forEach(post => {
                container.appendChild(createPostElement(post, currentUserId));
            });
        }
        addPostEventListeners(currentUserId);
    } catch (e) {
        console.error("Error loading posts:", e);
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
    document.querySelectorAll('.like-btn').forEach(button => {
        button.onclick = (e) => toggleLike(e, currentUserId);
    });

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

    likes[postId] = likes[postId] || []; 
    const isLiked = likes[postId].includes(currentUserId);

    if (isLiked) {
        likes[postId] = likes[postId].filter(id => id !== currentUserId);
        posts[postIndex].likesCount = (posts[postIndex].likesCount || 1) - 1;
    } else {
        likes[postId].push(currentUserId);
        posts[postIndex].likesCount = (posts[postIndex].likesCount || 0) + 1;
    }

    saveLikes(likes);
    savePosts(posts);
    
    loadPosts(currentUserId); 
}

function deletePost(e, currentUserId) {
    if (currentUserId !== ADMIN_CHAT_ID) return; 
    
    const postId = parseInt(e.currentTarget.getAttribute('data-post-id'));
    if (!confirm('Are you sure you want to delete this post?')) return;

    let posts = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || '[]');
    const updatedPosts = posts.filter(p => p.id !== postId);
    savePosts(updatedPosts);

    let likes = getLikes();
    delete likes[postId];
    saveLikes(likes);

    loadPosts(currentUserId);
}


// ===========================================
//          MUSIC & MODAL LOGIC (FIXED)
// ===========================================

const defaultMusicUrl = 'https://archive.org/download/lofi-chill-1-20/lofi_chill_03_-_sleepwalker.mp3';
let currentMusicUrl = localStorage.getItem(CUSTOM_MUSIC_KEY) || defaultMusicUrl;
let isMusicOn = true;
let audioPlayer;
let musicModal;
let urlInputModal;
let musicStatusSpan;
let volumeToggleIcon;


function setupMusicPlayer(autoplay = false) {
    audioPlayer = document.getElementById('audio-player');
    musicModal = document.getElementById('music-modal');
    urlInputModal = document.getElementById('url-input-modal');
    musicStatusSpan = document.getElementById('current-music-status');
    volumeToggleIcon = document.getElementById('volume-toggle');

    if (!audioPlayer) return;

    audioPlayer.src = currentMusicUrl;
    audioPlayer.loop = true;

    if (autoplay) {
        audioPlayer.play().then(() => {
            isMusicOn = true;
        }).catch(e => {
            console.warn("Autoplay was prevented. User needs to interact.", e);
            isMusicOn = false;
            updateMusicStatus('Music Paused (Tap to Start)');
        });
    }

    // Event listeners for status update
    audioPlayer.onplay = () => {
        updateMusicStatus(`Now Playing: ${currentMusicUrl.split('/').pop().substring(0, 30)}...`);
        if(volumeToggleIcon) {
            volumeToggleIcon.classList.remove('fa-volume-off');
            volumeToggleIcon.classList.add('fa-volume-up');
        }
        isMusicOn = true;
    };
    audioPlayer.onpause = () => {
        updateMusicStatus('Music Paused (Tap to Start)');
        if(volumeToggleIcon) {
            volumeToggleIcon.classList.remove('fa-volume-up');
            volumeToggleIcon.classList.add('fa-volume-off');
        }
        isMusicOn = false;
    };
    audioPlayer.onerror = (e) => {
        console.error("Audio error:", e);
        updateMusicStatus('Error loading music. Tap to check.');
        isMusicOn = false;
    };

    // Initial status based on whether we attempted to autoplay or not
    if (!autoplay || audioPlayer.paused) {
        updateMusicStatus('Music Paused (Tap to Start)');
    }
}

function updateMusicStatus(status) {
    if (musicStatusSpan) {
        musicStatusSpan.textContent = status;
    }
}

function toggleVolume() {
    if (!audioPlayer) return;

    if (audioPlayer.paused) {
        audioPlayer.play().catch(e => {
            console.error("Failed to play on user click:", e);
            updateMusicStatus('Autoplay failed. Check URL.');
        });
    } else {
        audioPlayer.pause();
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
    if (!url || !audioPlayer) {
        console.error("Invalid URL or audio player not found.");
        return;
    }
    
    currentMusicUrl = url;
    localStorage.setItem(CUSTOM_MUSIC_KEY, url);
    
    // Reset and Load
    audioPlayer.src = url;
    audioPlayer.load();

    // Attempt to play immediately
    audioPlayer.play().then(() => {
        console.log("Music started playing successfully.");
    }).catch(e => {
        console.error("Failed to play music immediately after setting URL:", e);
        // Show an error or pause status if it fails
        updateMusicStatus('Failed to play. Tap to start.');
    });
    
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
    document.querySelectorAll('.music-option-list .music-option').forEach(option => {
        option.onclick = (e) => {
            const type = e.currentTarget.getAttribute('data-music-type');
            if (type === 'default') {
                setCustomMusic(defaultMusicUrl);
            } else if (type === 'url') {
                closeModal(musicModal); 
                openModal(urlInputModal); 
            }
        };
    });

    // URL Modal Buttons
    if (document.getElementById('close-url-modal-btn')) {
        document.getElementById('close-url-modal-btn').onclick = () => {
            closeModal(urlInputModal);
            openModal(musicModal); 
        };
    }
    if (document.getElementById('play-url-btn')) {
        document.getElementById('play-url-btn').onclick = () => {
            const urlInput = document.getElementById('music-url-input');
            const url = urlInput ? urlInput.value.trim() : '';
            if (url) {
                setCustomMusic(url);
                urlInput.value = ''; 
            } else {
                alert("Please enter a valid music URL.");
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
    }
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');

    // Bottom Nav Click Listener (Home/Profile only)
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
    
    let currentUserId = 0; 
    let currentUserName = 'Guest';

    // ---------------------------------------------
    // 1. TMA Integration & Profile Data Filling Logic 
    // ---------------------------------------------
    if (typeof window.Telegram.WebApp !== 'undefined') {
        const tg = window.Telegram.WebApp;
        tg.ready();
        
        try {
            const user = tg.initDataUnsafe.user;
            
            if (user) {
                currentUserId = user.id || 0;
                const firstName = user.first_name || '';
                const lastName = user.last_name || '';
                const username = user.username;
                const photoUrl = user.photo_url; // Directly use the photo URL from initDataUnsafe
                const fullName = `${firstName} ${lastName}`.trim();
                
                currentUserName = fullName || 'User'; 
                const isAdmin = (currentUserId === ADMIN_CHAT_ID);

                // --- PROFILE DATA FILLING ---
                if (document.getElementById('profile-display-name')) document.getElementById('profile-display-name').textContent = fullName || 'No Name Provided';
                if (document.getElementById('profile-display-username')) document.getElementById('profile-display-username').textContent = username ? `@${username}` : 'N/A';
                if (document.getElementById('telegram-chat-id')) document.getElementById('telegram-chat-id').textContent = currentUserId.toString();
                
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

                // **PROFILE PICTURE FIX: Use photoUrl if available**
                const profileAvatarPlaceholder = document.getElementById('profile-avatar-placeholder');
                if (profileAvatarPlaceholder) {
                    if (photoUrl) {
                        // Clear the content and insert the image tag directly
                        profileAvatarPlaceholder.innerHTML = `<img src="${photoUrl}" alt="${fullName || 'Profile Photo'}">`;
                        profileAvatarPlaceholder.style.backgroundColor = 'transparent';
                        profileAvatarPlaceholder.textContent = '';
                    } else {
                        // Fallback to initials and color
                        const userIdStr = currentUserId.toString();
                        const userColor = stringToColor(userIdStr);
                        const initial = (fullName.charAt(0) || 'U').toUpperCase();
                        profileAvatarPlaceholder.innerHTML = ''; // Ensure no img tag remains
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
    
    // **AUTOPLAY IMPLEMENTATION**: Call setupMusicPlayer with true to attempt autoplay
    setupMusicPlayer(true); 
    addMusicEventListeners();
});
        

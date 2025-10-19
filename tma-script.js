// ********** SET YOUR ADMIN CHAT ID HERE **********
const ADMIN_CHAT_ID = 123456789; // <-- ဤနံပါတ်ကို သင်၏ Telegram ID ဖြင့် အစားထိုးပါ။
// *************************************************

// Helper function for dynamic color generation based on user ID
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

// Helper function to format time (e.g., "Just now")
function formatTime(timestamp) {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    let interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + (interval === 1 ? " hour ago" : " hours ago");
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + (interval === 1 ? " minute ago" : " minutes ago");
    if (seconds > 5) return "Few seconds ago";
    return "Just now";
}

// Helper function to create a new post element
function createPostElement(post, currentUserId) {
    const isAdmin = (post.authorId === ADMIN_CHAT_ID);
    const postCard = document.createElement('div');
    postCard.className = 'post-card';
    postCard.setAttribute('data-post-id', post.id);

    // Admin Post အတွက် Author Name ကို ပြင်ဆင်ခြင်း
    const authorName = isAdmin ? `<span class="post-author admin"><i class="fas fa-crown"></i> ${post.author} (Admin)</span>` : `<span class="post-author"><i class="fas fa-user-circle"></i> ${post.author}</span>`;
    
    // Delete Button Logic (Admin မှသာ ဖျက်ခွင့်ရှိသည်)
    const deleteButton = (currentUserId === ADMIN_CHAT_ID) ? 
        `<button class="delete-btn" data-post-id="${post.id}"><i class="fas fa-trash-alt"></i> Delete</button>` : '';

    postCard.innerHTML = `
        <div class="post-header">
            ${authorName}
            <span class="post-time">${formatTime(post.timestamp)}</span>
        </div>
        <p class="post-content">${post.content}</p>
        <div class="post-actions">
            <button><i class="fas fa-thumbs-up"></i> Like (0)</button>
            ${deleteButton}
        </div>
    `;
    return postCard;
}

// --- LOCAL STORAGE POSTS MANAGEMENT ---
const STORAGE_KEY = 'tma_community_posts_v2';

function loadPosts(currentUserId) {
    const postsContainer = document.getElementById('posts-container');
    const posts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    
    postsContainer.innerHTML = ''; 
    posts.slice().reverse().forEach(post => {
        postsContainer.appendChild(createPostElement(post, currentUserId));
    });
    
    // Delete Button Event Listeners ကို ထည့်သွင်းရန်
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const postId = e.currentTarget.getAttribute('data-post-id');
            deletePost(postId, currentUserId);
        });
    });
}

function savePost(post) {
    const posts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    post.id = Date.now().toString() + Math.random().toString(36).substring(2, 5); // Unique ID
    posts.push(post);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function deletePost(postId, currentUserId) {
    if (currentUserId !== ADMIN_CHAT_ID) {
        alert("Permission denied. Only the Admin can delete posts.");
        return;
    }

    if (!confirm("Are you sure you want to delete this post?")) {
        return;
    }

    let posts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    posts = posts.filter(post => post.id !== postId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    loadPosts(currentUserId); // Reload to update UI
}

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements များကို ရယူခြင်း
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    const screens = document.querySelectorAll('.content .screen');
    const volumeToggle = document.getElementById('volume-toggle');
    const currentMusicStatus = document.getElementById('current-music-status');
    const audioPlayer = document.getElementById('audio-player');
    const profileAvatarPlaceholder = document.getElementById('profile-avatar-placeholder');
    const submitPostBtn = document.getElementById('submit-post-btn');
    const postInput = document.getElementById('post-input');
    const adminPostBox = document.getElementById('admin-post-box');
    const adminMessage = document.getElementById('admin-message');
    const adminStatusDiv = document.getElementById('admin-status');

    let currentUserId = 0; // 0 for safety/non-TMA
    let currentUserName = 'Guest';
    let isMusicOn = false;
    const DEFAULT_MUSIC_SRC = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'; 

    // ---------------------------------------------
    // 1. TMA Integration & Profile Data Filling Logic (Admin Check)
    // ---------------------------------------------
    if (typeof window.Telegram.WebApp !== 'undefined') {
        const tg = window.Telegram.WebApp;
        tg.ready();
        const user = tg.initDataUnsafe.user;

        if (user) {
            currentUserId = user.id || 0;
            const firstName = user.first_name || '';
            const lastName = user.last_name || '';
            const username = user.username ? `@${user.username}` : 'N/A';
            const fullName = `${firstName} ${lastName}`.trim();
            
            currentUserName = fullName || 'User'; 
            const isAdmin = (currentUserId === ADMIN_CHAT_ID);

            // Profile Data Filling
            document.getElementById('profile-display-name').textContent = fullName || 'No Name Provided';
            document.getElementById('profile-display-username').textContent = username;
            document.getElementById('telegram-chat-id').textContent = currentUserId.toString();
            
            // Admin Status & Profile Placeholder
            if (isAdmin) {
                adminStatusDiv.textContent = 'Administrator';
                adminStatusDiv.style.color = '#00BFFF';
                adminPostBox.style.display = 'block';
                adminMessage.style.display = 'none';
            } else {
                adminStatusDiv.textContent = 'Regular User';
                adminStatusDiv.style.color = '#fff';
                adminPostBox.style.display = 'none';
                adminMessage.textContent = 'Only the Admin can post announcements.';
                adminMessage.style.display = 'block';
            }

            // Profile Picture Placeholder Logic
            const userIdStr = currentUserId.toString();
            const userColor = stringToColor(userIdStr);
            const initial = (fullName.charAt(0) || 'U').toUpperCase();
            profileAvatarPlaceholder.style.backgroundColor = userColor;
            profileAvatarPlaceholder.textContent = initial;

            document.getElementById('tma-close-btn').addEventListener('click', () => {
                tg.close();
            });
            
        } 
    } else {
        // External Access / Sample Data
        adminPostBox.style.display = 'none';
        adminMessage.textContent = 'Running outside TMA. Posts are read-only.';
        adminMessage.style.display = 'block';
    }

    // ---------------------------------------------
    // 2. Initial Load and Logic Execution
    // ---------------------------------------------
    loadPosts(currentUserId); // Load posts with current user's ID for delete button logic
    initializeAudio(); 

    // ---------------------------------------------
    // 3. Post Submission Logic (Admin Only)
    // ---------------------------------------------
    submitPostBtn.addEventListener('click', () => {
        if (currentUserId !== ADMIN_CHAT_ID) {
            alert("Permission denied. Only the Admin can submit posts.");
            return;
        }

        const postContent = postInput.value.trim();
        if (postContent.length > 0) {
            const newPostData = {
                author: currentUserName,
                authorId: currentUserId, // Store ID to identify admin posts
                content: postContent,
                timestamp: new Date().toISOString()
            };
            
            savePost(newPostData); 
            loadPosts(currentUserId); // Reload with Admin ID
            postInput.value = '';
        } else {
            alert('Post content cannot be empty.');
        }
    });

    // ---------------------------------------------
    // 4. Navigation & Music Logic
    // ---------------------------------------------
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetScreenId = item.getAttribute('data-screen');

            screens.forEach(screen => screen.classList.remove('active'));
            navItems.forEach(nav => nav.classList.remove('active'));

            document.getElementById(targetScreenId).classList.add('active');
            item.classList.add('active');
        });
    });

    function initializeAudio() {
        audioPlayer.src = DEFAULT_MUSIC_SRC;
        audioPlayer.volume = 0.5;
        
        audioPlayer.play()
            .then(() => {
                isMusicOn = true;
                volumeToggle.classList.replace('fa-volume-off', 'fa-volume-up');
                currentMusicStatus.textContent = 'Default Music (ON)';
            })
            .catch(e => {
                isMusicOn = false;
                volumeToggle.classList.replace('fa-volume-up', 'fa-volume-off');
                currentMusicStatus.textContent = 'Default Music (OFF)';
            });
    }

    volumeToggle.addEventListener('click', () => {
        if (isMusicOn) {
            audioPlayer.pause();
            volumeToggle.classList.replace('fa-volume-up', 'fa-volume-off');
            currentMusicStatus.textContent = currentMusicStatus.textContent.replace('(ON)', '(OFF)');
            isMusicOn = false;
        } else {
            audioPlayer.play().catch(e => alert("Music playback failed."));
            volumeToggle.classList.replace('fa-volume-off', 'fa-volume-up');
            currentMusicStatus.textContent = currentMusicStatus.textContent.replace('(OFF)', '(ON)');
            isMusicOn = true;
        }
    });
    
    // ... (Music Modal Logic များသည် ယခင်အတိုင်း ဆက်လက်ရှိသည်)
    document.getElementById('music-button').addEventListener('click', () => { document.getElementById('music-modal').style.display = 'block'; });
    // ...
    document.getElementById('telegram-username-card-profile').addEventListener('click', () => {
        const usernameText = document.getElementById('profile-display-username').textContent;
        const username = usernameText.replace('@', '').trim();
        if (username && username !== 'N/A') {
            window.open(`https://t.me/${username}`, '_blank');
        } else {
            alert('Telegram Username is not available.');
        }
    });
});
                                   

// ********** SET YOUR ADMIN CHAT ID HERE **********
const ADMIN_CHAT_ID = 1924452453; 
// *************************************************

// --- LOCAL STORAGE KEYS ---
const POSTS_STORAGE_KEY = 'tma_community_posts_v3'; 
const LIKES_STORAGE_KEY = 'tma_user_likes'; 
// 🚨 NEW: Key to store all users who have opened the app
const APP_USERS_STORAGE_KEY = 'tma_app_users'; 

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

// ... (Rest of formatTime, createPostElement, loadPosts, savePost, deletePost, toggleLike, addPostEventListeners, Music Logic are the same) ...

// ===========================================
// 🚨 NEW LOGIC: User List Storage Management
// ===========================================

/**
 * App ကိုဖွင့်လိုက်သူတိုင်းရဲ့ data ကို Local Storage ထဲမှာ သိမ်းဆည်းသည်။
 * @param {object} user - Telegram User object
 */
function saveCurrentUser(user) {
    let users = JSON.parse(localStorage.getItem(APP_USERS_STORAGE_KEY) || '[]');
    const existingIndex = users.findIndex(u => u.id === user.id);

    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    const isCurrentUserAdmin = (user.id === ADMIN_CHAT_ID);

    const newUserData = {
        id: user.id,
        name: fullName || `User ${user.id}`,
        username: user.username || null,
        photoUrl: user.photo_url || null, // TMA မှာ ပါလာနိုင်သော photo_url ကို ယူသုံး
        isAdmin: isCurrentUserAdmin,
        // UI color/initials for fallback
        avatarInitial: (fullName.charAt(0) || (isCurrentUserAdmin ? 'A' : 'U')).toUpperCase(),
        avatarColor: stringToColor(user.id.toString()),
        lastSeen: Date.now() 
    };

    if (existingIndex > -1) {
        // Update existing user info
        users[existingIndex] = newUserData;
    } else {
        // Add new user
        users.push(newUserData);
    }

    localStorage.setItem(APP_USERS_STORAGE_KEY, JSON.stringify(users));
}

// --- NEW FUNCTION: Create User Card Element ---
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
    const lastSeenTime = new Date(user.lastSeen).toLocaleDateString('en-US'); // Simple date format

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

// --- NEW FUNCTION: Render User List from Local Storage ---
function renderUserList(containerId, currentUserId) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; 
    
    let allUsers = JSON.parse(localStorage.getItem(APP_USERS_STORAGE_KEY) || '[]');

    // Sort: Admin first, then by name alphabetically (or lastSeen if needed)
    allUsers.sort((a, b) => {
        if (a.isAdmin && !b.isAdmin) return -1;
        if (!a.isAdmin && b.isAdmin) return 1;
        return a.name.localeCompare(b.name);
    });

    if (allUsers.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #aaa; padding-top: 20px;">No users found yet. Be the first!</p>';
        return;
    }

    allUsers.forEach(user => {
        container.appendChild(createUserCardElement(user));
    });
}


document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    // ... (All existing UI elements) ...
    const appUsersCard = document.getElementById('app-users-card');
    const backButtons = document.querySelectorAll('.back-button'); 
    
    let currentUserId = 0; 
    let currentUserName = 'Guest';
    let currentUsernameLink = '';
    
    // ---------------------------------------------
    // 1. TMA Integration & Profile Data Filling Logic 
    // ---------------------------------------------
    if (typeof window.Telegram.WebApp !== 'undefined') {
        const tg = window.Telegram.WebApp;
        tg.ready();
        const user = tg.initDataUnsafe.user;
        const photoUrl = user.photo_url; 

        if (user) {
            currentUserId = user.id || 0;
            const firstName = user.first_name || '';
            const lastName = user.last_name || '';
            const username = user.username;
            const fullName = `${firstName} ${lastName}`.trim();
            
            currentUserName = fullName || 'User'; 
            currentUsernameLink = user.username;
            const isAdmin = (currentUserId === ADMIN_CHAT_ID);

            // 🚨 NEW LOGIC: Save current user to Local Storage
            saveCurrentUser(user); 

            // Profile Data Filling & Admin Check
            // ... (Same as before) ...
            document.getElementById('profile-display-name').textContent = fullName || 'No Name Provided';
            document.getElementById('profile-display-username').textContent = username ? `@${username}` : 'N/A';
            document.getElementById('telegram-chat-id').textContent = currentUserId.toString();
            
            if (isAdmin) {
                document.getElementById('admin-status').textContent = 'Administrator';
                document.getElementById('admin-post-box').style.display = 'block';
            } else {
                document.getElementById('admin-status').textContent = 'Regular User';
                document.getElementById('admin-post-box').style.display = 'none';
                document.getElementById('admin-message').textContent = 'Only the Admin can post announcements.';
                document.getElementById('admin-message').style.display = 'block';
            }

            // Profile Photo Logic 
            const profileAvatarPlaceholder = document.getElementById('profile-avatar-placeholder');
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

            document.getElementById('tma-close-btn').addEventListener('click', () => {
                tg.close();
            });
            
        } 
    } else {
        // ... (External Access Logic) ...
    }

    // ---------------------------------------------
    // 2. Initial Load and Logic Execution
    // ---------------------------------------------
    loadPosts(currentUserId); 
    // NOTE: User list is rendered when the screen is accessed (see below)

    // ---------------------------------------------
    // 3. Navigation Logic (Updated for New Screen)
    // ---------------------------------------------
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    const screens = document.querySelectorAll('.content .screen');

    function switchScreen(targetScreenId) {
        screens.forEach(screen => screen.classList.remove('active'));
        document.getElementById(targetScreenId).classList.add('active');
        
        // 🚨 NEW: Render User List when user-list-screen is active
        if (targetScreenId === 'user-list-screen') {
            renderUserList('users-container', currentUserId);
        }
    }

    // Bottom Nav Click
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetScreenId = item.getAttribute('data-screen');
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            switchScreen(targetScreenId);
        });
    });

    // Profile Screen -> App Users Click (Switch to new screen)
    appUsersCard.addEventListener('click', () => {
        switchScreen('user-list-screen');
    });

    // Back Button Click (User List -> Profile)
    document.querySelectorAll('.back-button').forEach(button => {
        button.addEventListener('click', () => {
            const targetScreenId = button.getAttribute('data-target-screen');
            switchScreen(targetScreenId);
        });
    });

    // ---------------------------------------------
    // 4. Post Submission, Music Logic, etc. (Same as before)
    // ---------------------------------------------
    // ... (Post Submission Logic) ...
    // ... (Music Modal & Player Logic) ...
});
                          

// ********** SET YOUR ADMIN CHAT ID HERE **********
const ADMIN_CHAT_ID = 1924452453; // <-- ဤနံပါတ်ကို သင်၏ Telegram ID ဖြင့် အစားထိုးပါ။
// *************************************************

const POSTS_STORAGE_KEY = 'tma_community_posts_v2';
const USERS_STORAGE_KEY = 'tma_mini_app_users'; // New storage key for users

// ... (stringToColor, formatTime functions - KEEP THEM) ...

// Helper function to create a new post element (KEEP IT)
function createPostElement(post, currentUserId) {
    // ... (Post creation logic remains the same) ...
}

// --- LOCAL STORAGE POSTS MANAGEMENT (KEEP THEM) ---
function loadPosts(currentUserId) {
    // ... (Post loading logic remains the same) ...
}

function savePost(post) {
    // ... (Post saving logic remains the same) ...
}

function deletePost(postId, currentUserId) {
    // ... (Post deleting logic remains the same) ...
}

// --- NEW USER MANAGEMENT LOGIC ---

// Helper function to save current user's data to local storage (simulated DB)
function saveOrUpdateUser(user) {
    let users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    const existingIndex = users.findIndex(u => u.id === user.id);

    if (existingIndex > -1) {
        // Update existing user (e.g., if they changed name)
        users[existingIndex] = user;
    } else {
        // Add new user
        users.push(user);
    }
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

// Helper function to display all users
function displayUsersList() {
    const usersListContainer = document.getElementById('users-list-container');
    const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    usersListContainer.innerHTML = ''; // Clear previous list

    if (users.length === 0) {
        usersListContainer.innerHTML = '<p style="text-align: center; color: #aaa; margin-top: 20px;">No users found in local storage.</p>';
        return;
    }

    users.forEach(user => {
        // Create initial letter placeholder style
        const initial = (user.name.charAt(0) || 'U').toUpperCase();
        const userColor = stringToColor(user.id.toString());

        const userCard = document.createElement('div');
        userCard.className = 'user-card';
        userCard.innerHTML = `
            <div class="user-photo" style="background-color: ${userColor};">${initial}</div>
            <div class="user-info">
                <h4>${user.name} ${user.id === ADMIN_CHAT_ID ? '(Admin)' : ''}</h4>
                <p>${user.username}</p>
            </div>
        `;
        usersListContainer.appendChild(userCard);
    });
}


document.addEventListener('DOMContentLoaded', () => {
    // ... (UI Elements initialization remains the same) ...
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    const screens = document.querySelectorAll('.content .screen');
    // ... (Other elements) ...
    const openUsersScreenButton = document.getElementById('open-users-screen');
    const backButtons = document.querySelectorAll('.back-button');

    let currentUserId = 0;
    let currentUserName = 'Guest';

    // ---------------------------------------------
    // 1. TMA Integration & Profile Data Filling Logic (Admin Check & User Save)
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

            // NEW: Save current user's details to local storage
            saveOrUpdateUser({
                id: currentUserId,
                name: fullName || 'No Name',
                username: username,
                isAdmin: isAdmin
            });

            // ... (Profile Data & Admin Status Filling Logic remains the same) ...
            // (The rest of TMA/Profile code from the previous answer remains here)
            // ...

            // Admin Status & Profile Placeholder (REMAINS)
            // ... (Code for adminStatusDiv, adminPostBox, adminMessage, profileAvatarPlaceholder) ...
            
        } 
    } else {
        // External Access / Sample Data
        // ... (Code for external access remains the same) ...
    }

    // ---------------------------------------------
    // 2. Initial Load and Logic Execution
    // ---------------------------------------------
    loadPosts(currentUserId); 
    // initializeAudio(); // Re-initialize audio logic
    // ... (Audio initialization code remains the same) ...

    // ---------------------------------------------
    // 3. Navigation Logic (Home, Profile, Users)
    // ---------------------------------------------

    // Main Bottom Nav
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetScreenId = item.getAttribute('data-screen');

            screens.forEach(screen => screen.classList.remove('active'));
            navItems.forEach(nav => nav.classList.remove('active'));

            document.getElementById(targetScreenId).classList.add('active');
            item.classList.add('active');
            
            // Special Action for Users Screen (if implemented here, but we use the link)
        });
    });

    // Profile to Users Screen Link (New)
    openUsersScreenButton.addEventListener('click', () => {
        // Change screen to users-screen
        document.getElementById('profile-screen').classList.remove('active');
        document.getElementById('users-screen').classList.add('active');
        displayUsersList(); // Load users when the screen is opened
    });

    // Back Button Logic (New)
    backButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const targetScreenId = e.currentTarget.getAttribute('data-target-screen');
            document.getElementById('users-screen').classList.remove('active');
            document.getElementById(targetScreenId).classList.add('active');
        });
    });

    // ---------------------------------------------
    // 4. Post Submission & Music Logic (REMAINS)
    // ---------------------------------------------
    // ... (Post Submission, Music Auto Play & Toggle, Modals, Profile Link Logic remains the same) ...
});

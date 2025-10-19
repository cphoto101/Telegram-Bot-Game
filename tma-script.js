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

// ... (formatTime, createPostElement, loadPosts, savePost functions) ... (Keep them from the previous answer)

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements များကို ရယူခြင်း
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    const screens = document.querySelectorAll('.content .screen'); 
    // ... (other elements)
    const profileAvatarPlaceholder = document.getElementById('profile-avatar-placeholder'); // Placeholder div ကို ရယူသည်

    // ... (Music and Post Feed related variables) ...
    let currentUserName = 'Guest';

    // ---------------------------------------------
    // 1. TMA Integration & Profile Data Filling Logic (Profile Picture Fix)
    // ---------------------------------------------
    if (typeof window.Telegram.WebApp !== 'undefined') {
        const tg = window.Telegram.WebApp;
        tg.ready();
        const user = tg.initDataUnsafe.user;

        if (user) {
            const firstName = user.first_name || '';
            const lastName = user.last_name || '';
            const username = user.username ? `@${user.username}` : 'N/A';
            const userId = user.id || 'N/A';
            const fullName = `${firstName} ${lastName}`.trim();
            
            currentUserName = fullName || 'User'; // Global variable for posting

            // Profile Data Filling
            document.getElementById('profile-display-name').textContent = fullName || 'No Name Provided';
            document.getElementById('profile-display-username').textContent = username;
            document.getElementById('telegram-chat-id').textContent = userId.toString();
            
            // Profile Picture Placeholder FIX: User ID ကို အခြေခံပြီး dynamic ပုံထည့်သည်
            if (userId !== 'N/A') {
                const userIdStr = userId.toString();
                const userColor = stringToColor(userIdStr);
                const initial = (fullName.charAt(0) || 'U').toUpperCase();
                
                // Profile Avatar Div ထဲတွင် စာသားကို ဖြည့်သွင်းခြင်း
                profileAvatarPlaceholder.style.backgroundColor = userColor;
                profileAvatarPlaceholder.textContent = initial;
            } else {
                 profileAvatarPlaceholder.textContent = 'P';
            }

            // ... (Close App Button Logic)
            
        } else {
            // ... (Guest User Logic)
            profileAvatarPlaceholder.textContent = 'G';
        }
    } else {
        // External Access
        // ... (Sample Data Logic)
        profileAvatarPlaceholder.textContent = 'S';
    }

    // ---------------------------------------------
    // 2. Navigation Logic (Tab Click Fix Re-check)
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

    // ... (The rest of the JS code for Music, Post Feed, and Profile Link should remain the same from the previous correct answer) ...

    // Start by loading existing posts
    loadPosts(); 

    // Music Auto Play 
    // initializeAudio(); 
});
    

// =======================================================
// Global Variables & Initialization
// =======================================================
let currentScore = 0;
let isGameRunning = false;
let tileMoveSpeed = 2; // Tiles များ ရွေ့လျားသော အရှိန် (အခက်အခဲ)
const GAME_AREA = document.getElementById('game-area');
const CURRENT_SCORE_SPAN = document.getElementById('current-score');
const USER_INFO_HEADER = document.getElementById('user-info');

const LANE_COUNT = 4;
const TILE_HEIGHT = 100;
let tileGenerationInterval; // Tiles တွေ ထုတ်လုပ်ရန် Interval

// Music နှင့် Beat Map များ (ရိုးရှင်းသော Timing)
const MUSIC_SPEEDS = [
    { name: "Slow Beat", speed: 2, interval: 1500 }, // လွယ်
    { name: "Medium Groove", speed: 4, interval: 1000 },
    { name: "Fast EDM", speed: 6, interval: 700 } // ခက်
];
let currentMusic = MUSIC_SPEEDS[0]; // အစပိုင်း အလွယ်ဆုံး

// =======================================================
// TELEGRAM MINI APP INTEGRATION
// =======================================================

function initTelegram() {
    // ... (ယခင် code အတိုင်းထားပါ) ...
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        
        const user = window.Telegram.WebApp.initDataUnsafe.user;
        let username = user ? (user.username || user.first_name) : "Guest Player";
        USER_INFO_HEADER.textContent = `User: ${username}`;

        window.Telegram.WebApp.onEvent('mainButtonClicked', () => {
            alert('Game ကို ပိတ်ပါမည်။');
            window.Telegram.WebApp.close();
        });
        startGame();
    } else {
        USER_INFO_HEADER.textContent = "Guest Mode (Not in Telegram)";
        startGame();
    }
}


// =======================================================
// GAME CORE LOGIC
// =======================================================

function startGame() {
    if (isGameRunning) {
        clearInterval(tileGenerationInterval);
        GAME_AREA.innerHTML = '';
    }

    isGameRunning = true;
    currentScore = 0;
    
    // ကျပန်း Music ရွေးချယ်ခြင်း
    const randomIndex = Math.floor(Math.random() * MUSIC_SPEEDS.length);
    currentMusic = MUSIC_SPEEDS[randomIndex];
    tileMoveSpeed = currentMusic.speed; 
    
    CURRENT_SCORE_SPAN.textContent = currentScore;
    
    // Lanes ၄ ခု ဖန်တီးခြင်း
    for (let i = 0; i < LANE_COUNT; i++) {
        const lane = document.createElement('div');
        lane.classList.add('lane');
        lane.setAttribute('data-lane', i);
        lane.addEventListener('mousedown', () => handleLaneClick(i));
        lane.addEventListener('touchstart', () => handleLaneClick(i));
        GAME_AREA.appendChild(lane);
    }
    
    // Game Over မျဉ်းနီ ဖန်တီးခြင်း
    const gameOverLine = document.createElement('div');
    gameOverLine.id = 'game-over-line';
    GAME_AREA.appendChild(gameOverLine);

    // Tiles များ စတင်ထုတ်လုပ်ရန်
    tileGenerationInterval = setInterval(generateTile, currentMusic.interval);
    
    // Game Loop စတင်ခြင်း
    requestAnimationFrame(updateGame);
}

function updateGame() {
    if (!isGameRunning) return;

    // Tiles များ ရွှေ့လျားခြင်း
    const tiles = GAME_AREA.querySelectorAll('.tile');
    let gameAreaHeight = GAME_AREA.clientHeight;

    tiles.forEach(tile => {
        let currentTop = parseFloat(tile.style.top);
        tile.style.top = (currentTop + tileMoveSpeed) + 'px';

        // Tile သည် မျက်နှာပြင်၏ အောက်ဆုံးကို ကျော်လွန်သွားပါက (Missed Tile)
        if (currentTop > gameAreaHeight && !tile.classList.contains('hit')) {
            gameOver();
        }
    });

    // အခက်အခဲ တိုးမြှင့်ခြင်း (ရမှတ်ပေါ်မူတည်၍)
    if (currentScore > 10 && currentScore < 30) {
        tileMoveSpeed = currentMusic.speed * 1.5; // အရှိန် မြှင့်
    } else if (currentScore > 30) {
        tileMoveSpeed = currentMusic.speed * 2; // ပိုမြန်အောင် မြှင့်
    }

    requestAnimationFrame(updateGame);
}

function generateTile() {
    // ကျပန်း Lane တစ်ခုကို ရွေးချယ်ခြင်း
    const laneIndex = Math.floor(Math.random() * LANE_COUNT);
    const selectedLane = GAME_AREA.querySelector(`.lane[data-lane="${laneIndex}"]`);
    
    if (!selectedLane) return;

    const tile = document.createElement('div');
    tile.classList.add('tile');
    tile.style.top = `-100px`; 
    tile.setAttribute('data-status', 'active');
    tile.setAttribute('data-lane', laneIndex);

    selectedLane.appendChild(tile);
}

function handleLaneClick(laneIndex) {
    if (!isGameRunning) {
        startGame();
        return;
    }

    const clickedLane = GAME_AREA.querySelector(`.lane[data-lane="${laneIndex}"]`);
    
    // Lane ၏ အောက်ဆုံးနားတွင်ရှိသော Tile ကို ရှာဖွေပါ
    let hitTile = null;
    clickedLane.querySelectorAll('.tile').forEach(tile => {
        const tileTop = parseFloat(tile.style.top);
        // Tile သည် နှိပ်ရမည့် ဧရိယာ (ဥပမာ- အောက်ဆုံး 150px) အတွင်း ရှိမရှိ စစ်ဆေးခြင်း
        if (tileTop > GAME_AREA.clientHeight - 150 && tileTop < GAME_AREA.clientHeight) {
             if (tile.getAttribute('data-status') === 'active') {
                hitTile = tile;
             }
        }
    });

    if (hitTile) {
        // Tile ကို နှိပ်မိပါက (SUCCESS)
        hitTile.classList.add('hit');
        hitTile.setAttribute('data-status', 'hit');
        currentScore++;
        CURRENT_SCORE_SPAN.textContent = currentScore;
    } else {
        // Tile မရှိတဲ့ နေရာကို နှိပ်မိပါက (FAIL)
        gameOver();
    }
}

function gameOver() {
    isGameRunning = false;
    clearInterval(tileGenerationInterval);
    
    alert(`Game Over! Final Score: ${currentScore}`);
    
    // ရမှတ်များကို Local Storage တွင် သိမ်းဆည်းခြင်း (Backend မပါသောကြောင့်)
    saveScore(currentScore);
    
    // Leaderboard ကို ပြန်လည်ပြသခြင်း
    renderLeaderboard();

    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.showAlert(`Score: ${currentScore} မှတ် ရရှိခဲ့ပါသည်။`);
    }
}

// =======================================================
// LEADERBOARD (Local Storage) - (ယခင် Code အတိုင်းထားပါ)
// =======================================================
// ... getScores, saveScore, renderLeaderboard, resetScores functions များကို ယခင်ပေးပို့ခဲ့သော game.js မှ ကူးထည့်ပါ ...

// =======================================================
// Start Application
// =======================================================
initTelegram();
// renderLeaderboard(); // ဂိမ်းစစချင်းမှာ Leaderboard ကို ချက်ချင်းမပြတော့ဘဲ Game Over မှသာ ပြပါမည်။

        // Backend မပါသောကြောင့် User ကို တိုက်ရိုက် ဂိမ်းစတင်ခွင့် ပေးခြင်း
        startGame();

    } else {
        USER_INFO_HEADER.textContent = "Guest Mode (Not in Telegram)";
        startGame();
    }
}


// =======================================================
// GAME LOGIC
// =======================================================

function startGame() {
    if (isGameRunning) return;

    isGameRunning = true;
    currentScore = 0;
    ballX = 0;
    tileMoveSpeed = 3; // အစပိုင်း အခက်အခဲ
    CURRENT_SCORE_SPAN.textContent = currentScore;
    
    // နေရာအဟောင်းများ ရှင်းထုတ်ခြင်း
    GAME_AREA.innerHTML = '<div id="ball"></div>';

    // ကျပန်း Music ရွေးချယ်ခြင်း
    currentMusic = MUSIC_LIST[Math.floor(Math.random() * MUSIC_LIST.length)];
    tileMoveSpeed = currentMusic.speed; // Music Speed အလိုက် အခက်အခဲ သတ်မှတ်ခြင်း

    // ဘောလုံးကို အလယ်တည့်တည့် ပြန်ထားခြင်း
    document.getElementById('ball').style.left = '50%';
    
    // Game Loop စတင်ခြင်း
    requestAnimationFrame(updateGame);
    
    // Tiles များ စတင်ထုတ်လုပ်ခြင်း
    setTimeout(generateTile, 500);
}

function updateGame() {
    if (!isGameRunning) return;

    // Tiles များ ရွှေ့လျားခြင်း
    let tiles = document.querySelectorAll('.tile');
    let gameAreaHeight = GAME_AREA.clientHeight;

    tiles.forEach(tile => {
        let currentBottom = parseFloat(tile.style.bottom);
        tile.style.bottom = (currentBottom + tileMoveSpeed) + 'px';

        // Tiles များ အပေါ်သို့ ရောက်သွားပါက
        if (currentBottom > gameAreaHeight) {
            tile.remove();
        }
    });

    // အခက်အခဲ တိုးမြှင့်ခြင်း (ရမှတ်ပေါ်မူတည်၍)
    if (currentScore > 50 && tileMoveSpeed < 8) {
        tileMoveSpeed += 0.005; 
    }

    // Tiles အသစ် ထပ်ထုတ်လုပ်ခြင်း (Beat Interval ပုံစံတူ)
    if (tiles.length === 0 || parseFloat(tiles[tiles.length - 1].style.bottom) > 150) {
        generateTile();
    }

    requestAnimationFrame(updateGame);
}

function generateTile() {
    let tile = document.createElement('div');
    tile.classList.add('tile');
    
    // Tiles Hop ပုံစံအတိုင်း ဘယ်/ညာ ကို ကျပန်းထုတ်ခြင်း
    let position = Math.random() < 0.5 ? '40%' : '60%'; 
    tile.style.left = position;
    tile.style.bottom = '0px';

    // နောက်ပိုင်း ပိုခက်ခဲစေရန် Tile အရွယ်အစား လျှော့ချခြင်း
    if (tileMoveSpeed > 5) {
        tile.classList.add('hard-tile');
    }

    GAME_AREA.appendChild(tile);
    tile.setAttribute('data-position', position === '40%' ? 'left' : 'right');
}

function handleJump() {
    if (!isGameRunning) {
        startGame();
        return;
    }

    // ဘောလုံးကို ဘယ် သို့မဟုတ် ညာသို့ ခုန်စေခြင်း
    ballX = ballX === 0 ? 1 : 0;
    let newPosition = ballX === 0 ? '40%' : '60%';
    let ballElement = document.getElementById('ball');
    ballElement.style.left = newPosition;
    
    // Hit Check
    checkHit(newPosition);
}

function checkHit(newPosition) {
    let ballElement = document.getElementById('ball');
    let ballRect = ballElement.getBoundingClientRect();

    let isHit = false;
    document.querySelectorAll('.tile').forEach(tile => {
        let tileRect = tile.getBoundingClientRect();
        let tileDataPos = tile.getAttribute('data-position');
        
        // Tiles နှင့် ဘောလုံး ထိတွေ့မှု အခြေအနေ
        if (
            ballRect.bottom >= tileRect.top && 
            ballRect.top <= tileRect.bottom &&
            newPosition === (tileDataPos === 'left' ? '40%' : '60%')
        ) {
            // Hit ပြီးသော Tile များကို ဖျက်ခြင်း/အမှတ်ပေးခြင်း
            if (!tile.classList.contains('hit')) {
                currentScore++;
                CURRENT_SCORE_SPAN.textContent = currentScore;
                tile.classList.add('hit');
                // tile.remove(); // ပိုမိုခက်ခဲစေရန် ချက်ချင်းမဖျက်ဘဲ အောက်မှ ရွေ့လျားသွားစေရန်
            }
            isHit = true;
        }
    });

    // Missed Tile (Game Over)
    if (!isHit && currentScore > 0) { // အစမစရသေးဘဲ ကစားလျှင် ဂိမ်းမပြီးစေရန်
        gameOver();
    }
}

function gameOver() {
    isGameRunning = false;
    alert(`Game Over! Final Score: ${currentScore}`);
    
    // ရမှတ်များကို Local Storage တွင် သိမ်းဆည်းခြင်း
    saveScore(currentScore);
    
    // Leaderboard ကို ပြန်လည်ပြသခြင်း
    renderLeaderboard();
    
    // Telegram Mini App တွင် Feedback ပေးနိုင်ရန်
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.showAlert(`Score: ${currentScore} မှတ် ရရှိခဲ့ပါသည်။`);
    }
}

// =======================================================
// LEADERBOARD (Local Storage)
// =======================================================

function getScores() {
    let scores = localStorage.getItem('tilesHopScores');
    return scores ? JSON.parse(scores) : [];
}

function saveScore(score) {
    let scores = getScores();
    let user = window.Telegram && window.Telegram.WebApp.initDataUnsafe.user ? 
               (window.Telegram.WebApp.initDataUnsafe.user.username || window.Telegram.WebApp.initDataUnsafe.user.first_name) : 
               'Guest';
               
    scores.push({ username: user, score: score, date: new Date().toLocaleDateString() });
    
    // Top Scores 10 ခုသာ သိမ်းဆည်းရန်
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem('tilesHopScores', JSON.stringify(scores.slice(0, 10)));
}

function renderLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';
    const scores = getScores();

    if (scores.length === 0) {
        list.innerHTML = '<li>ရမှတ်မှတ်တမ်း မရှိသေးပါ။</li>';
        return;
    }

    scores.forEach((item, index) => {
        const li = document.createElement('li');
        li.textContent = `#${index + 1}: ${item.username} - ${item.score} points`;
        list.appendChild(li);
    });
}

function resetScores() {
    if(confirm("ရမှတ်မှတ်တမ်း အားလုံးကို ဖျက်ပစ်မှာ သေချာပါသလား?")) {
        localStorage.removeItem('tilesHopScores');
        renderLeaderboard();
    }
}

// Start the whole application
initTelegram();
renderLeaderboard();
      

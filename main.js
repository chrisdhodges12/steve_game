// === Inject CSS for scoreDisplay and moneyDisplay ===
const style = document.createElement('style');
style.textContent = `
#scoreDisplay, #moneyDisplay {
    font-size: 20px;
    margin: 2px 0;
    padding: 2px 4px;
}`;
document.head.appendChild(style);

// === DOM Elements & Canvas Context ===
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// === Helper: Show/Hide Multiple Elements ===
function showElems(ids, show = true) {
    ids.forEach(id => showElem(id, show));
}

// === Helper: Clear Text Content of Elements ===
function clearText(...ids) {
    ids.forEach(id => {
        const elem = document.getElementById(id);
        if (elem) elem.textContent = "";
    });
}

// === Game State ===
let isPaused = false;

// Hide certain UI elements initially
showElems(['upgradesBtn', 'joystickArea', 'scoreMoneyContainer'], false);

// === Asset Loading ===
const backgroundImg = (() => {
    const img = new Image(); img.src = "assets/background.jpg"; return img;
})();
const playerFrames = [
    (() => { const i = new Image(); i.src = "assets/player.png"; return i; })(),
    (() => { const i = new Image(); i.src = "assets/bloodshot.png"; return i; })(),
    (() => { const i = new Image(); i.src = "assets/eyesClosed.png"; return i; })(),
    (() => { const i = new Image(); i.src = "assets/hurt.png"; return i; })()
];
const truckImg = (() => { const i = new Image(); i.src = "assets/truck.png"; return i; })();
const enemyImg = (() => { const i = new Image(); i.src = "assets/shannon.png"; return i; })();
const coinImg = (() => { const i = new Image(); i.src = "assets/coin.png"; return i; })();
const moneyBagImg = (() => { const i = new Image(); i.src = "assets/money.png"; return i; })();

// === Audio Assets ===
const bgMusic = (() => { const a = new Audio("assets/bg.mp3"); a.volume = 0.2; a.loop = true; a.preload = 'auto'; return a; })();
const coinSound = (() => { const a = new Audio("assets/sniff.mp3"); a.volume = 0.3; a.preload = 'auto'; return a; })();
const enemyHitSound1 = (() => { const a = new Audio("assets/yell1.mp3"); a.volume = 0.3; a.preload = 'auto'; return a; })();
const moneySound = (() => { const a = new Audio("assets/moneySound.wav"); a.volume = 0.3; a.preload = 'auto'; return a; })();
const womanScream = (() => { const a = new Audio("assets/womanScream.mp3"); a.volume = 0.2; a.preload = 'auto'; return a; })();
const truckSound = (() => { const a = new Audio("assets/truck.mp3"); a.volume = 0.3; a.preload = 'auto'; return a; })();
const vacuumSound = (() => { const a = new Audio("assets/vacuum.mp3"); a.volume = 0.03; a.preload = 'auto'; return a; })();

// === Player State ===
let playerX = canvas.width / 2, playerY = canvas.height / 2;
let playerRadius = 40;
let velX = 0, velY = 0;
const acceleration = 0.5, maxSpeed = 10, friction = 0.95;
let currentFrame = 0, playerScale = 1.8, playerScaleVel = 0.0;
const targetScale = 1.0, bounceStiffness = 0.5, bounceDamping = 0.2;
let score = 0, money = 0;
let animationSequence = [], sequenceIndex = 0, frameTimer = 0, isAnimating = false;
const frameInterval = 20;

// === Coin State ===
let coinX = 0, coinY = 0, coinTimer = 0;
const coinRadius = 15, coinLifetime = 4.5 * 60;

// === Money Bag State ===
const moneyBag = { x: 0, y: 0, active: false, timer: 0 };
const moneyBagSpawnInterval = 200, moneyBagLifetime = 100;
let moneyBagSpawnTimer = 0;

// === Enemy State ===
const enemy = { x: 0, y: 0, vx: 0, vy: 0, active: false };
const enemySize = 100;
const topMargin = 80, bottomMargin = 100;
let enemyTimer = 0, nextEnemyTime = getNextEnemyTime();

// === Upgrades State ===
let vacuumActive = false, vacuumTimer = 0;
const vacuumDuration = 7 * 60, vacuumCost = 100;
let invincible = false, invincibleTimer = 0;
const invincibleDuration = 9 * 60, invincibleCost = 100;

// === Input State ===
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };
let joystickInputX = 0, joystickInputY = 0;

// Init
function init() {
    spawnCoin();
    gameLoop();
    playSound(bgMusic);
}

function playSound(audio) {
    if (!audio) return;
    audio.currentTime = 0;
    audio.play();
}

function updateGameLogic() {
    handlePlayerInput();
    updateCoin();
    updateMoneyBag();
    updateEnemy();
    updateUpgrades();
}

function handlePlayerInput() {
    if (keys.ArrowUp || keys.w) velY -= acceleration;
    if (keys.ArrowDown || keys.s) velY += acceleration;
    if (keys.ArrowLeft || keys.a) velX -= acceleration;
    if (keys.ArrowRight || keys.d) velX += acceleration;

    velX += joystickInputX * acceleration;
    velY += joystickInputY * acceleration;

    velX *= friction; velY *= friction;
    velX = Math.max(-maxSpeed, Math.min(maxSpeed, velX));
    velY = Math.max(-maxSpeed, Math.min(maxSpeed, velY));

    playerX += velX; playerY += velY;

    if (playerX - playerRadius < 0) { playerX = playerRadius; velX *= -0.5; }
    if (playerX + playerRadius > canvas.width) { playerX = canvas.width - playerRadius; velX *= -0.5; }
    if (playerY - playerRadius < 0) { playerY = playerRadius; velY *= -0.5; }
    if (playerY + playerRadius > canvas.height) { playerY = canvas.height - playerRadius; velY *= -0.5; }
}

function updateCoin() {
    coinTimer++;
    if (coinTimer >= coinLifetime) spawnCoin();

    const dx = playerX - coinX, dy = playerY - coinY, dist = Math.hypot(dx, dy);
    if (vacuumActive && dist > 1) {
        const pull = 4;
        coinX += (dx / dist) * pull;
        coinY += (dy / dist) * pull;
    }

    if (dist < playerRadius + coinRadius) {
        spawnCoin(); score += 100; playSound(coinSound);
        animateBounce();
    }

    updatePlayerScaleBounce();
}

function animatePlayer(seq) {
    animationSequence = seq; sequenceIndex = 0; currentFrame = seq[0];
    isAnimating = true; frameTimer = 0;
}

function animateBounce() {
    animatePlayer([1,2,1,0]);
    playerScale = 1.6;
    playerScaleVel = 1.0;
}

function updatePlayerScaleBounce() {
    const force = (targetScale - playerScale) * bounceStiffness;
    playerScaleVel += force;
    playerScaleVel *= bounceDamping;
    playerScale += playerScaleVel;
}

function updateMoneyBag() {
    if (!moneyBag.active) {
        if (++moneyBagSpawnTimer > moneyBagSpawnInterval) spawnMoneyBag();
    } else if (++moneyBag.timer > moneyBagLifetime) {
        moneyBag.active = false; moneyBagSpawnTimer = 0;
    }
    if (moneyBag.active) {
        const dx = playerX - moneyBag.x, dy = playerY - moneyBag.y, dist = Math.hypot(dx, dy);
        if (dist < playerRadius + 20) {
            money += 100; score += 100; playSound(moneySound);
            animateBounce();
            currentFrame = 0;
            moneyBag.active = false; moneyBagSpawnTimer = 0;
        }
    }
}

function updateEnemy() {
    if (!enemy.active) {
        if (++enemyTimer > nextEnemyTime) spawnEnemy();
        return;
    }

    const dxCoin = coinX - enemy.x, dyCoin = coinY - enemy.y, distCoin = Math.hypot(dxCoin, dyCoin);
    if (distCoin > 0) {
        const pull = 0.1;
        enemy.vx += (dxCoin / distCoin) * pull;
        enemy.vy += (dyCoin / distCoin) * pull;
    }

    const speed = Math.hypot(enemy.vx, enemy.vy), maxSpeed = 1.5;
    if (speed > maxSpeed) {
        enemy.vx = (enemy.vx / speed) * maxSpeed;
        enemy.vy = (enemy.vy / speed) * maxSpeed;
    }

    enemy.x += enemy.vx; enemy.y += enemy.vy;

    const dxPlayer = playerX - enemy.x, dyPlayer = playerY - enemy.y, distPlayer = Math.hypot(dxPlayer, dyPlayer);
    if (distPlayer < playerRadius + enemySize/2) {
        enemy.active = false; enemyTimer = 0; nextEnemyTime = getNextEnemyTime();
        if (invincible) {
            playSound(womanScream); score += 250;
            animateBounce();
        } else {
            playSound(enemyHitSound1); currentFrame = 3;
            score -= 200; if (score < 0) score = 0;
        }
    }
    if (enemy.x < -50 || enemy.x > canvas.width+50 || enemy.y < -50 || enemy.y > canvas.height+50) {
        enemy.active = false; enemyTimer = 0; nextEnemyTime = getNextEnemyTime();
    }
}

function updateUpgrades() {
    if (vacuumActive && ++vacuumTimer >= vacuumDuration) vacuumActive = false;
    if (invincible && ++invincibleTimer >= invincibleDuration) invincible = false;
}

// Render
function renderGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);

    const isMobileTall = canvas.height > canvas.width;
    const widthMultiplier = isMobileTall ? 1.5 : 1;

    // Coin
    const coinW = coinRadius * 2 * 2;
    const coinH = coinRadius * 2;
    ctx.drawImage(coinImg, coinX - coinW/2, coinY - coinH/2, coinW, coinH);

    // Money Bag
    if (moneyBag.active) {
        const bagW = 40 * 2;
        const bagH = 40;
        ctx.drawImage(moneyBagImg, moneyBag.x - bagW/2, moneyBag.y - bagH/2, bagW, bagH);
    }

    // Player
    const playerImg = invincible ? truckImg : playerFrames[currentFrame];
    const playerWidth = playerRadius * 2 * playerScale * widthMultiplier;
    const playerHeight = playerRadius * 2 * playerScale;
    ctx.drawImage(playerImg, playerX - playerWidth/2, playerY - playerHeight/2, playerWidth, playerHeight);

    // Enemy
    if (enemy.active) {
        const enemyW = enemySize * 1.0;
        const enemyH = enemySize;
        ctx.drawImage(enemyImg, enemy.x - enemyW/2, enemy.y - enemyH/2, enemyW, enemyH);
    }
}

// --- Helpers ---
function spawnCoin() {
    const p = coinRadius + 10;
    coinX = Math.random() * (canvas.width - 2 * p) + p;
    coinY = Math.random() * (canvas.height - 2 * p - topMargin - bottomMargin) + (p + topMargin);
    coinTimer = 0;
}

function spawnMoneyBag() {
    const p = 20;
    moneyBag.x = Math.random() * (canvas.width - 2 * p) + p;
    moneyBag.y = Math.random() * (canvas.height - 2 * p - topMargin - bottomMargin) + (p + topMargin);
    moneyBag.active = true;
    moneyBag.timer = 0;
}

function spawnEnemy() {
    enemy.active = true;
    const side = Math.floor(Math.random()*4), speed = 2+Math.random()*2;
    let angle;
    switch(side) {
        case 0: enemy.x=Math.random()*canvas.width; enemy.y=-30; angle=Math.random()*Math.PI/2+Math.PI/4; break;
        case 1: enemy.x=canvas.width+30; enemy.y=Math.random()*canvas.height; angle=Math.random()*Math.PI/2+3*Math.PI/4; break;
        case 2: enemy.x=Math.random()*canvas.width; enemy.y=canvas.height+30; angle=Math.random()*Math.PI/2+5*Math.PI/4; break;
        case 3: enemy.x=-30; enemy.y=Math.random()*canvas.height; angle=Math.random()*Math.PI/2-Math.PI/4; break;
    }
    enemy.vx=Math.cos(angle)*speed; enemy.vy=Math.sin(angle)*speed;
}

function getNextEnemyTime() {
    return Math.random()*30;
}

// --- Controls ---
window.addEventListener("keydown", e => { if(e.key in keys) keys[e.key]=true; });
window.addEventListener("keyup", e => { if(e.key in keys) keys[e.key]=false; });

const joystickArea = document.getElementById("joystickArea");
const joystickKnob = document.getElementById("joystickKnob");
let isDragging = false;

joystickArea.addEventListener("touchstart", (e) => {
  isDragging = true;
  handleJoystickMove(e.touches[0]);
});
joystickArea.addEventListener("touchmove", (e) => {
  if (!isDragging) return;
  handleJoystickMove(e.touches[0]);
});
joystickArea.addEventListener("touchend", () => {
  isDragging = false;
  setJoystickKnob(30, 30);
  velX = 0;
  velY = 0;
  joystickInputX = 0;
  joystickInputY = 0;
});

function handleJoystickMove(touch) {
  const rect = joystickArea.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  let dx = touch.clientX - centerX;
  let dy = touch.clientY - centerY;
  const maxDist = 40;
  const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDist);
  const angle = Math.atan2(dy, dx);
  const offsetX = Math.cos(angle) * dist;
  const offsetY = Math.sin(angle) * dist;
  setJoystickKnob(30 + offsetX, 30 + offsetY);
  joystickInputX = Math.cos(angle);
  joystickInputY = Math.sin(angle);
  const scale = dist / maxDist;
  joystickInputX *= scale;
  joystickInputY *= scale;
}

function setJoystickKnob(left, top) {
    if (joystickKnob) {
        joystickKnob.style.left = `${left}px`;
        joystickKnob.style.top = `${top}px`;
    }
}

// --- DOM helpers for UI show/hide ---
function showElem(id, show = true) {
    const elem = document.getElementById(id);
    if (elem) elem.style.display = show ? 'block' : 'none';
}

// --- Start the game ---
document.getElementById('startBtn').addEventListener('click', () => {
    playSound(bgMusic);
    showElems(['startBtn', 'gameRules'], false);
    showElems(['gameCanvas', 'upgradesBtn', 'joystickArea', 'scoreMoneyContainer'], true);
    init();
});

// --- Upgrade menu functionality ---
const upgradesBtn = document.getElementById("upgradesBtn");
const upgradeMenu = document.getElementById("upgradeMenu");
const closeUpgradesBtn = document.getElementById("closeUpgradesBtn");
if (upgradeMenu) upgradeMenu.style.display = "none";

function toggleUpgradeMenu(show) {
    isPaused = !!show;
    showElem("upgradeMenu", show);
    showElem("upgradesBtn", !show);
    if (!show) clearText("vacuumStatus", "invincibleStatus");
}

if (upgradesBtn) upgradesBtn.addEventListener("click", () => toggleUpgradeMenu(true));
if (closeUpgradesBtn) closeUpgradesBtn.addEventListener("click", () => toggleUpgradeMenu(false));

// --- Vacuum Upgrade Functionality ---
const vacuumUpgrade = document.getElementById("vacuumUpgrade");
if (vacuumUpgrade) {
    vacuumUpgrade.addEventListener("click", () => {
        const status = document.getElementById("vacuumStatus");
        if (money >= vacuumCost) {
            money -= vacuumCost;
            vacuumActive = true;
            vacuumTimer = 0;
            playSound(vacuumSound);
            toggleUpgradeMenu(false);
            if (status) status.textContent = "";
        } else {
            if (status) status.textContent = "Not enough money!";
        }
    });
}

// --- Invincible Upgrade Functionality ---
const invincibleUpgrade = document.getElementById("invincibleUpgrade");
if (invincibleUpgrade) {
    invincibleUpgrade.addEventListener("click", () => {
        const status = document.getElementById("invincibleStatus");
        if (money >= invincibleCost) {
            money -= invincibleCost;
            invincible = true;
            invincibleTimer = 0;
            playSound(truckSound);
            toggleUpgradeMenu(false);
            if (status) status.textContent = "";
        } else {
            if (status) status.textContent = "Not enough money!";
        }
    });
}

function updateScoreMoneyDisplay() {
    const scoreDisplay = document.getElementById('scoreDisplay');
    const moneyDisplay = document.getElementById('moneyDisplay');
    if (scoreDisplay) scoreDisplay.textContent = `Score: ${score}`;
    if (moneyDisplay) moneyDisplay.textContent = `$: ${money}`;
}

function gameLoop() {
    if (!isPaused) updateGameLogic();
    renderGame();
    updateScoreMoneyDisplay();
    requestAnimationFrame(gameLoop);
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        isPaused = true;
        bgMusic.pause();
    } else {
        isPaused = false;
        playSound(bgMusic);
    }
});

// --- Unified resize and center function for canvas and container ---
function resizeAndCenterCanvas() {
    const gameContainer = document.getElementById("gameContainer");
    if (!gameContainer) return;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    if (viewportWidth <= 600) {
        canvas.width = 800;
        canvas.height = viewportHeight;
        gameContainer.style.height = `${viewportHeight * 0.9}px`;
        gameContainer.style.display = "flex";
        gameContainer.style.flexDirection = "column";
        gameContainer.style.justifyContent = "center";
        gameContainer.style.alignItems = "center";
    } else {
        canvas.width = 800;
        canvas.height = 600;
        gameContainer.style.height = `600px`;
        gameContainer.style.display = "flex";
        gameContainer.style.flexDirection = "column";
        gameContainer.style.justifyContent = "center";
        gameContainer.style.alignItems = "center";
    }
    // Center joystick
    const joystickArea = document.getElementById("joystickArea");
    if (joystickArea) {
        joystickArea.style.position = "absolute";
        joystickArea.style.left = "50%";
        joystickArea.style.bottom = "20px";
        joystickArea.style.transform = "translateX(-50%)";
    }
    // Position upgrade menu if needed
    const upgradeMenu = document.getElementById("upgradeMenu");
    if (upgradeMenu) {
        upgradeMenu.style.top = "50%";
        upgradeMenu.style.left = "50%";
        upgradeMenu.style.transform = "translate(-50%, -50%)";
    }
}

window.addEventListener('resize', resizeAndCenterCanvas);
resizeAndCenterCanvas();
if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered', reg))
      .catch(err => console.error('Service Worker registration failed', err));
  });
}
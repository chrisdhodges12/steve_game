// === DOM & Canvas ===
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// === Game State ===
let isPaused = false;

// === Assets ===
const backgroundImg = loadImage("assets/background.jpg");
const playerFrames = [
    loadImage("assets/player.png"),
    loadImage("assets/bloodshot.png"),
    loadImage("assets/eyesClosed.png"),
    loadImage("assets/hurt.png")
];
const truckImg = loadImage("assets/truck.png");
const enemyImg = loadImage("assets/shannon.png");
const coinImg = loadImage("assets/coin.png");
const moneyBagImg = loadImage("assets/money.png");

// === Audio ===
const bgMusic = loadAudio("assets/bg.mp3", 0.2, true);
const coinSound = loadAudio("assets/sniff.mp3", 0.3);
const enemyHitSound1 = loadAudio("assets/yell1.mp3", 0.3);
const moneySound = loadAudio("assets/moneySound.wav", 0.4);
const womanScream = loadAudio("assets/womanScream.mp3", 0.2);
const truckSound = loadAudio("assets/truck.mp3", 0.3);
const vacuumSound = loadAudio("assets/vacuum.mp3", 0.1);

[bgMusic, coinSound, enemyHitSound1, moneySound, womanScream, truckSound, vacuumSound].forEach(audio => {
    if (audio) audio.preload = 'auto';
});

// === Player State ===
let playerX = canvas.width / 2;
let playerY = canvas.height / 2;
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
const coinRadius = 15, coinLifetime = 4 * 60;

// === Money Bag State ===
const moneyBag = { x: 0, y: 0, active: false, timer: 0 };
const moneyBagSpawnInterval = 200, moneyBagLifetime = 100;
let moneyBagSpawnTimer = 0;

// === Enemy State ===
const enemy = { x: 0, y: 0, vx: 0, vy: 0, active: false };
const enemySize = 100;
let enemyTimer = 0, nextEnemyTime = getNextEnemyTime();

// === Upgrades State ===
let vacuumActive = false, vacuumTimer = 0;
const vacuumDuration = 8 * 60, vacuumCost = 100;
let invincible = false, invincibleTimer = 0;
const invincibleDuration = 9 * 60, invincibleCost = 100;

// === Input State ===
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };

// Init
function init() {
    spawnCoin();
    gameLoop();
    playSound(bgMusic);
}

// Utility functions
function loadImage(src) {
    const img = new Image();
    img.src = src;
    return img;
}

function loadAudio(src, volume = 0.5, loop = false) {
    const audio = new Audio(src);
    audio.volume = volume;
    audio.loop = loop;
    return audio;
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
        const pull = 5;
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

    ctx.drawImage(coinImg, coinX - coinRadius, coinY - coinRadius, coinRadius*2, coinRadius*2);
    if (moneyBag.active) ctx.drawImage(moneyBagImg, moneyBag.x-20, moneyBag.y-20, 40, 40);
    // Draw player: truckImg when invincible, otherwise normal player frame
    if (invincible)
        ctx.drawImage(truckImg, playerX - playerRadius*playerScale, playerY - playerRadius*playerScale, playerRadius*2*playerScale, playerRadius*2*playerScale);
    else
        ctx.drawImage(playerFrames[currentFrame], playerX - playerRadius*playerScale, playerY - playerRadius*playerScale, playerRadius*2*playerScale, playerRadius*2*playerScale);
    if (enemy.active) ctx.drawImage(enemyImg, enemy.x-enemySize/2, enemy.y-enemySize/2, enemySize, enemySize);
}

// Helpers
function spawnCoin() {
    const p = coinRadius + 10;
    coinX = Math.random() * (canvas.width-2*p) + p;
    coinY = Math.random() * (canvas.height-2*p) + p;
    coinTimer = 0;
}

function spawnMoneyBag() {
    const p = 20;
    moneyBag.x = Math.random() * (canvas.width-2*p) + p;
    moneyBag.y = Math.random() * (canvas.height-2*p) + p;
    moneyBag.active = true; moneyBag.timer = 0;
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

// Controls
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
  setJoystickKnob(35, 35);
  velX = 0;
  velY = 0;
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

  setJoystickKnob(35 + offsetX, 35 + offsetY);

  velX = Math.cos(angle) * (dist / maxDist) * maxSpeed;
  velY = Math.sin(angle) * (dist / maxDist) * maxSpeed;
}

function setJoystickKnob(left, top) {
    if (joystickKnob) {
        joystickKnob.style.left = `${left}px`;
        joystickKnob.style.top = `${top}px`;
    }
}

// DOM helpers for UI show/hide
function showElem(id, show = true) {
    const elem = document.getElementById(id);
    if (elem) elem.style.display = show ? 'block' : 'none';
}

// Start the game
document.getElementById('startBtn').addEventListener('click', () => {
    playSound(bgMusic);
    showElem('startBtn', false);
    showElem('gameCanvas');
    showElem('upgradesBtn');
    showElem('joystickArea');
    init();
});

// Upgrade menu functionality
const upgradesBtn = document.getElementById("upgradesBtn");
const upgradeMenu = document.getElementById("upgradeMenu");
const closeUpgradesBtn = document.getElementById("closeUpgradesBtn");

if (upgradeMenu) upgradeMenu.style.display = "none";

function toggleUpgradeMenu(show) {
    isPaused = !!show;
    showElem("upgradeMenu", show);
    showElem("upgradesBtn", !show);
    if (!show) {
        const vacuumStatus = document.getElementById("vacuumStatus");
        const invincibleStatus = document.getElementById("invincibleStatus");
        if (vacuumStatus) vacuumStatus.textContent = "";
        if (invincibleStatus) invincibleStatus.textContent = "";
    }
}

if (upgradesBtn) upgradesBtn.addEventListener("click", () => toggleUpgradeMenu(true));
if (closeUpgradesBtn) closeUpgradesBtn.addEventListener("click", () => toggleUpgradeMenu(false));

// Vacuum Upgrade Functionality
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

// Invincible Upgrade Functionality
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
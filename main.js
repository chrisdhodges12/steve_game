const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

//background
const backgroundImg = new Image();
backgroundImg.src = 'assets/background.jpg';

// player
const playerImg = new Image();
playerImg.src = 'assets/player.png';
let playerX = canvas.width / 2;
let playerY = canvas.height / 2;
let playerRadius = 40;

//enemy
const enemyImg = new Image();
enemyImg.src = 'assets/shannon.png'
const enemySize = 100;

const enemy = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    active: false
};

let enemyTimer = 0;
let nextEnemyTime = getNextEnemyTime();

//money
const moneyBagImg = new Image();
moneyBagImg.src = 'assets/money.png'

const moneyBag = {
    x: 0,
    y: 0,
    active: false,
    timer: 0
};

const moneyBagSpawnInterval = 300;  // ~5s at 60fps
const moneyBagLifetime = 120;       // ~2s at 60fps

let moneyBagSpawnTimer = 0;

let money = 0;

//animates player bigger (bouncy)
let playerScale = 1.2;
let playerScaleVel = 0.0;        // default scale
const targetScale = 1.0;         // want to reach

const bounceStiffness = 0.3;
const bounceDamping = 0.1;


// Coin variables
const coinImg = new Image();
coinImg.src = 'assets/coin.png';
let coinX = 0;
let coinY = 0;
let coinRadius = 15;


//animation frames
const playerFrames = [
    { img: new Image(), src: 'assets/player.png' },
    { img: new Image(), src: 'assets/bloodshot.png' },
    { img: new Image(), src: 'assets/eyesClosed.png' },
    { img: new Image(), src: 'assets/hurt.png'}
];

playerFrames.forEach(frame => frame.img.src = frame.src);

let currentFrame = 0;           // index into playerFrames
let frameTimer = 0;             // counts frames
let frameInterval = 20;         // how many frames to wait before switching
let animationSequence = []; //
let sequenceIndex = 0;             // where we are in the sequence
let isAnimating = false;

// Previous coin position for burst effect
let prevCoinX = 0;
let prevCoinY = 0;

// Score counter
let score = 0;

// Physics variables
let velX = 0;
let velY = 0;
const acceleration = 0.5;
const maxSpeed = 10;
const friction = 0.95;

// Burst effect variables (for coin and player)
let burstParticles = [];
let burstActive = false;
let burstTimer = 0;
const maxBurstParticles = 30;

//Audio
const bgMusic = new Audio('assets/bg.mp3');
bgMusic.loop = true;        // keep playing
bgMusic.volume = 0.5;       // set to 50% volume

const coinSound = new Audio('assets/sniff.mp3');

const enemyHitSound1 = new Audio('assets/yell1.mp3');
enemyHitSound1.volume = 0.1;


// Track key states for Arrow keys and WASD
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false
};

// Pulsing effect variables
let pulseTimer = 0;
const pulseSpeed = 0.05;  // Speed of pulsing effect

// Initialize game
function init() {
    // bgMusic.play();
    spawnCoin();
    gameLoop();
}

function getNextEnemyTime() {
    return Math.random() * 30;
}

function spawnEnemy() {
    enemy.active = true;

    const side = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
    const speed = 2 + Math.random() * 2;

    let angle;

    switch (side) {
        case 0: // Top
            enemy.x = Math.random() * canvas.width;
            enemy.y = -30;
            angle = Math.random() * Math.PI / 2 + Math.PI / 4; // 45°–135°
            break;
        case 1: // Right
            enemy.x = canvas.width + 30;
            enemy.y = Math.random() * canvas.height;
            angle = Math.random() * Math.PI / 2 + Math.PI * 3/4; // 135°–225°
            break;
        case 2: // Bottom
            enemy.x = Math.random() * canvas.width;
            enemy.y = canvas.height + 30;
            angle = Math.random() * Math.PI / 2 + Math.PI * 5/4; // 225°–315°
            break;
        case 3: // Left
            enemy.x = -30;
            enemy.y = Math.random() * canvas.height;
            angle = Math.random() * Math.PI / 2 - Math.PI / 4; // -45°–45°
            break;
    }

    enemy.vx = Math.cos(angle) * speed;
    enemy.vy = Math.sin(angle) * speed;
}



// Game loop
function gameLoop() {
    // Clear the canvas and draw bg
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);

    // Apply physics and movement as usual
    if (keys.ArrowUp || keys.w) velY -= acceleration;
    if (keys.ArrowDown || keys.s) velY += acceleration;
    if (keys.ArrowLeft || keys.a) velX -= acceleration;
    if (keys.ArrowRight || keys.d) velX += acceleration;

    // Apply friction
    velX *= friction;
    velY *= friction;

    // Limit max speed
    velX = Math.max(-maxSpeed, Math.min(maxSpeed, velX));
    velY = Math.max(-maxSpeed, Math.min(maxSpeed, velY));

    // Update player position
    playerX += velX;
    playerY += velY;

    // Boundary collision with momentum
    if (playerX - playerRadius < 0) {
        playerX = playerRadius;
        velX *= -0.5;
    }
    if (playerX + playerRadius > canvas.width) {
        playerX = canvas.width - playerRadius;
        velX *= -0.5;
    }
    if (playerY - playerRadius < 0) {
        playerY = playerRadius;
        velY *= -0.5;
    }
    if (playerY + playerRadius > canvas.height) {
        playerY = canvas.height - playerRadius;
        velY *= -0.5;
    }

    // Draw the player
    drawPlayer();

    // Draw the coin
    drawCoin();

    //Draw money bag
    if (moneyBag.active) {
        ctx.drawImage(moneyBagImg, moneyBag.x - 20, moneyBag.y - 20, 40, 40);
    }

    // Draw burst effect if active
    if (burstActive) {
        drawBurst();
    }

    // Check for collision with the coin
    const distX = playerX - coinX;
    const distY = playerY - coinY;
    const distance = Math.sqrt(distX * distX + distY * distY);

    //if coin is collected do this
    if (distance < playerRadius + coinRadius) {
        prevCoinX = coinX; // Store the current coin position (before updating)
        prevCoinY = coinY;
        spawnCoin(); // Move coin to a new random position
        score += 100; // Increase score

        //play sniff sound
        coinSound.currentTime = 0;
        coinSound.play();

        //animate the player
        animationSequence = [1 ,2, 1, 0];
        sequenceIndex = 0;
        currentFrame = animationSequence[sequenceIndex];
        isAnimating = true;
        frameTimer = 0;

        //make player grow
        playerScale = 1.2;  //grow
        playerScaleVel = 1.0;  //shrink


    }

    // Draw the score on the canvas
    ctx.font = '40px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(`Score: ${score}`, 50, 50);

    //Draw money counter
    ctx.font = '40px Arial';
    ctx.fillStyle = 'Green';
    ctx.fillText(`$: ${money}`, 50, 100);

    //Animate the face by index frame
    if (isAnimating) {
        frameTimer++;
        if (frameTimer > frameInterval) {
            frameTimer = 0;
    
            sequenceIndex++;
            if (sequenceIndex >= animationSequence.length) {
                isAnimating = false;
                currentFrame = 0; // reset to normal
            } else {
                currentFrame = animationSequence[sequenceIndex];
            }
        }
    }

    //animate player growing and shrinking
    const force = (targetScale - playerScale) * bounceStiffness;
    playerScaleVel += force;
    playerScaleVel *= bounceDamping;
    playerScale += playerScaleVel



    //ENEMY
    if (!enemy.active) {
        enemyTimer++;
        if (enemyTimer > nextEnemyTime) {
            spawnEnemy();
        }
    } else {
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;

        const dx = playerX - enemy.x;
        const dy = playerY - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < playerRadius + enemySize / 2) {
            // Collision detected
            enemy.active = false;
                enemyTimer = 0;
                nextEnemyTime = getNextEnemyTime();

                enemyHitSound1.currentTime = 0;
                enemyHitSound1.play();

                //show hurt frame
                currentFrame = 3;

                score -= 200;
                if (score < 0) score = 0;
        }

        // Remove if out of screen
        if (enemy.x < -50 || enemy.x > canvas.width + 50 || enemy.y < -50 || enemy.y > canvas.height + 50) {
            enemy.active = false;
            enemyTimer = 0;
            nextEnemyTime = getNextEnemyTime();
        }
    }

    if (enemy.active) {
        ctx.drawImage(
            enemyImg,
            enemy.x - enemySize / 2,
            enemy.y - enemySize / 2,
            enemySize,
            enemySize
        );
    }

    // MONEY BAG LOGIC
if (!moneyBag.active) {
    moneyBagSpawnTimer++;
    if (moneyBagSpawnTimer > moneyBagSpawnInterval) {
        spawnMoneyBag();
    }
} else {
    moneyBag.timer++;
    if (moneyBag.timer > moneyBagLifetime) {
        moneyBag.active = false;
        moneyBagSpawnTimer = 0;
    }
}

if (moneyBag.active) {
    const dx = playerX - moneyBag.x;
    const dy = playerY - moneyBag.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < playerRadius + 20) {
        money += 100;
        moneyBag.active = false;
        moneyBagSpawnTimer = 0;
    }
}

    requestAnimationFrame(gameLoop);
}

//define spawnMoneyBag function
function spawnMoneyBag() {
    moneyBag.active = true;
    moneyBag.timer = 0;

    const padding = 20;
    moneyBag.x = Math.random() * (canvas.width - 2 * padding) + padding;
    moneyBag.y = Math.random() * (canvas.height - 2 * padding) + padding;
}

// Spawn the coin at a random position
function spawnCoin() {
    const padding = coinRadius + 10; // Avoid spawning too close to edges
    coinX = Math.random() * (canvas.width - 2 * padding) + padding;
    coinY = Math.random() * (canvas.height - 2 * padding) + padding;
}

// Draw the flashy coin
function drawCoin() {
    ctx.drawImage(
        coinImg,
        coinX - coinRadius,
        coinY - coinRadius,
        coinRadius * 2,
        coinRadius * 2
    );

}

// Draw the player
function drawPlayer() {
    const img = playerFrames[currentFrame].img;

    const size = playerRadius * 2 * playerScale;

    ctx.drawImage(
        img,
        playerX - size / 2,
        playerY - size / 2,
        size,
        size
    );
}

// Handle keydown and keyup events
window.addEventListener('keydown', (e) => {
    if (e.key in keys) keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key in keys) keys[e.key] = false;
});

// Start the game
init();
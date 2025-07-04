const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// player
const playerImg = new Image();
playerImg.src = 'assets/player.png';
let playerX = 0;
let playerY = 0;
let playerRadius = 40;

// Coin variables
const coinImg = new Image();
coinImg.src = 'assets/coin.png';
let coinX = 0;
let coinY = 0;
let coinRadius = 15;

const playerFrames = [
    { img: new Image(), src: 'assets/player.png' },
    { img: new Image(), src: 'assets/bloodshot.png' },
    { img: new Image(), src: 'assets/eyesClosed.png' },
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
    spawnCoin();
    gameLoop();
}

// Game loop
function gameLoop() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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

    // Draw the flashy player
    drawPlayer();


    // Draw the flashy coin
    drawCoin();

    // Draw burst effect if active
    if (burstActive) {
        drawBurst();
    }

    // Check for collision with the coin
    const distX = playerX - coinX;
    const distY = playerY - coinY;
    const distance = Math.sqrt(distX * distX + distY * distY);

    if (distance < playerRadius + coinRadius) {
        prevCoinX = coinX; // Store the current coin position (before updating)
        prevCoinY = coinY;
        spawnCoin(); // Move coin to a new random position
        score++; // Increase score
        animationSequence = [1 ,2, 1, 0];
        sequenceIndex = 0;
        currentFrame = animationSequence[sequenceIndex];
        isAnimating = true;
        frameTimer = 0;
    }

    // Draw the score on the canvas
    ctx.font = '20px Arial';
    ctx.fillStyle = 'black';
    ctx.fillText(`Score: ${score}`, 10, 30);

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

    requestAnimationFrame(gameLoop);

    
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

    ctx.drawImage(
        img,
        playerX - playerRadius,
        playerY - playerRadius,
        playerRadius * 2,
        playerRadius * 2
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
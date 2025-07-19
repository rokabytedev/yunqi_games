const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameState = 'playing';
let animationId;

const pig = {
    x: 100,
    y: 280,
    width: 80,
    height: 70,
    walkSpeed: 2,
    isPunching: false,
    punchTimer: 0,
    walkFrame: 0,
    walkSpeed: 0.1
};

let keyPressed = false;
let gameTime = 0;
let wallSpawnVariance = 0;
let score = 0;
let stepCounter = 0;
let finalScore = 0;

const walls = [];
const wallSpeed = 3;
const wallWidth = 20;
const wallHeight = 150;
let wallSpawnTimer = 0;
const wallSpawnDelay = 120;

function drawPig() {
    ctx.save();
    
    if (gameState === 'gameOver') {
        drawPorkChop();
        return;
    }
    
    pig.walkFrame += pig.walkSpeed;
    const bounce = Math.sin(pig.walkFrame) * 3;
    
    // Body
    ctx.fillStyle = '#FFB6C1';
    ctx.fillRect(pig.x, pig.y + bounce, pig.width, pig.height);
    
    // Head (bigger) - moved to front of pig
    ctx.fillStyle = '#FF69B4';
    ctx.fillRect(pig.x + 40, pig.y - 15 + bounce, 35, 35);
    
    // Ears
    ctx.fillStyle = '#FF1493';
    ctx.fillRect(pig.x + 43, pig.y - 12 + bounce, 8, 12);
    ctx.fillRect(pig.x + 59, pig.y - 12 + bounce, 8, 12);
    
    // Eyes (bigger and more detailed)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(pig.x + 47, pig.y - 8 + bounce, 8, 6);
    ctx.fillRect(pig.x + 57, pig.y - 8 + bounce, 8, 6);
    
    ctx.fillStyle = '#000';
    ctx.fillRect(pig.x + 49, pig.y - 6 + bounce, 4, 4);
    ctx.fillRect(pig.x + 59, pig.y - 6 + bounce, 4, 4);
    
    // Pupils
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(pig.x + 50, pig.y - 5 + bounce, 1, 1);
    ctx.fillRect(pig.x + 60, pig.y - 5 + bounce, 1, 1);
    
    // Snout (bigger)
    ctx.fillStyle = '#FFB6C1';
    ctx.fillRect(pig.x + 50, pig.y + 5 + bounce, 12, 8);
    
    // Nostrils
    ctx.fillStyle = '#000';
    ctx.fillRect(pig.x + 52, pig.y + 8 + bounce, 2, 2);
    ctx.fillRect(pig.x + 56, pig.y + 8 + bounce, 2, 2);
    
    // Mouth
    ctx.fillStyle = '#8B0000';
    ctx.fillRect(pig.x + 53, pig.y + 12 + bounce, 6, 2);
    
    // Punch animation
    if (pig.isPunching) {
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(pig.x + 85, pig.y + 25 + bounce, 25, 8);
    }
    
    // Legs with walking animation
    const legBounce = Math.sin(pig.walkFrame * 2) * 2;
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(pig.x + 10, pig.y + 70 + bounce + legBounce, 12, 20);
    ctx.fillRect(pig.x + 25, pig.y + 70 + bounce - legBounce, 12, 20);
    ctx.fillRect(pig.x + 40, pig.y + 70 + bounce + legBounce, 12, 20);
    ctx.fillRect(pig.x + 55, pig.y + 70 + bounce - legBounce, 12, 20);
    
    ctx.restore();
}

function drawPorkChop() {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(pig.x + 10, pig.y + 20, 40, 30);
    
    ctx.fillStyle = '#654321';
    ctx.fillRect(pig.x + 15, pig.y + 25, 30, 20);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(pig.x + 45, pig.y + 15, 8, 25);
    ctx.fillRect(pig.x + 47, pig.y + 40, 4, 15);
}

function drawWall(wall) {
    // Main wall
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(wall.x, wall.y, wallWidth, wall.height);
    
    // Brick pattern
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 1;
    for (let i = 0; i < wall.height; i += 15) {
        for (let j = 0; j < wallWidth; j += 10) {
            ctx.strokeRect(wall.x + j, wall.y + i, 10, 15);
        }
    }
    
    // Mortar lines
    ctx.fillStyle = '#A0522D';
    for (let i = 15; i < wall.height; i += 30) {
        ctx.fillRect(wall.x, wall.y + i - 1, wallWidth, 2);
    }
    
    // Weathering effects
    ctx.fillStyle = '#654321';
    for (let i = 5; i < wall.height; i += 25) {
        ctx.fillRect(wall.x + 2, wall.y + i, 3, 2);
        ctx.fillRect(wall.x + wallWidth - 5, wall.y + i + 10, 3, 2);
    }
}

function spawnWall() {
    const wallTypes = [
        { height: 120, y: canvas.height - 120 - 50 },
        { height: 180, y: canvas.height - 180 - 50 },
        { height: 200, y: canvas.height - 200 - 50 }
    ];
    
    const wallType = wallTypes[Math.floor(Math.random() * wallTypes.length)];
    
    walls.push({
        x: canvas.width,
        y: wallType.y,
        height: wallType.height,
        broken: false
    });
}

function updateWalls() {
    for (let i = walls.length - 1; i >= 0; i--) {
        if (!walls[i].broken) {
            walls[i].x -= wallSpeed;
        }
        
        if (walls[i].x < -wallWidth) {
            walls.splice(i, 1);
        }
    }
}

function checkCollision() {
    for (let wall of walls) {
        if (!wall.broken && 
            pig.x + pig.width > wall.x && 
            pig.x < wall.x + wallWidth &&
            pig.y + pig.height > wall.y && 
            pig.y < wall.y + wall.height) {
            
            if (pig.isPunching) {
                wall.broken = true;
            } else {
                gameState = 'gameOver';
                finalScore = score;
                document.getElementById('gameOver').style.display = 'block';
                document.getElementById('restartBtn').style.display = 'block';
                return;
            }
        }
    }
}

function gameLoop() {
    if (gameState !== 'playing') return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    gameTime++;
    stepCounter++;
    
    // Update score every 5 steps (1 meter)
    if (stepCounter >= 5) {
        score++;
        stepCounter = 0;
    }
    
    // Progressive difficulty with variable spawn timing
    const baseDelay = Math.max(60, wallSpawnDelay - Math.floor(gameTime / 300));
    wallSpawnVariance = 30 + Math.sin(gameTime * 0.01) * 20;
    const currentDelay = baseDelay + Math.random() * wallSpawnVariance;
    
    wallSpawnTimer++;
    if (wallSpawnTimer >= currentDelay) {
        spawnWall();
        wallSpawnTimer = 0;
    }
    
    updateWalls();
    
    for (let wall of walls) {
        if (!wall.broken) {
            drawWall(wall);
        }
    }
    
    if (pig.isPunching) {
        pig.punchTimer--;
        if (pig.punchTimer <= 0) {
            pig.isPunching = false;
        }
    }
    
    drawPig();
    checkCollision();
    drawScore();
    
    animationId = requestAnimationFrame(gameLoop);
}

function punch() {
    if (gameState === 'playing' && !pig.isPunching) {
        pig.isPunching = true;
        pig.punchTimer = 20;
    }
}

function drawScore() {
    // Current score display
    ctx.fillStyle = '#000';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Distance: ' + score + 'm', 20, 40);
    
    // Game over final score
    if (gameState === 'gameOver') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('FINAL SCORE', canvas.width / 2, canvas.height / 2 - 50);
        
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 72px Arial';
        ctx.fillText(finalScore + ' METERS', canvas.width / 2, canvas.height / 2 + 20);
        
        ctx.textAlign = 'left';
    }
}

function restartGame() {
    gameState = 'playing';
    walls.length = 0;
    wallSpawnTimer = 0;
    pig.isPunching = false;
    pig.punchTimer = 0;
    pig.walkFrame = 0;
    keyPressed = false;
    gameTime = 0;
    wallSpawnVariance = 0;
    score = 0;
    stepCounter = 0;
    finalScore = 0;
    
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('restartBtn').style.display = 'none';
    
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    gameLoop();
}

document.addEventListener('keydown', function(e) {
    if ((e.key === 'a' || e.key === 'A') && !keyPressed) {
        keyPressed = true;
        punch();
    }
});

document.addEventListener('keyup', function(e) {
    if (e.key === 'a' || e.key === 'A') {
        keyPressed = false;
    }
});

gameLoop();
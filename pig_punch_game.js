const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameState = 'playing';
let animationId;

const pig = {
    x: 100,
    y: 280,
    groundY: 280,
    width: 80,
    height: 70,
    walkSpeed: 2,
    isPunching: false,
    punchTimer: 0,
    walkFrame: 0,
    walkSpeed: 0.1,
    isJumping: false,
    jumpVelocity: 0,
    jumpPower: -22,
    gravity: 0.6
};

let keyPressed = false;
let spacePressed = false;
let gameTime = 0;
let wallSpawnVariance = 0;
let score = 0;
let stepCounter = 0;
let finalScore = 0;
let highScore = parseInt(localStorage.getItem('pigPunchHighScore')) || 0;
let newRecord = false;
let celebrationTimer = 0;

const walls = [];
const pits = [];
const wallSpeed = 3;
const wallWidth = 20;
const wallHeight = 150;
let wallSpawnTimer = 0;
let pitSpawnTimer = 0;
let nextWallDistance = 0;
let nextPitDistance = 0;
let difficultyLevel = 1;
const groundY = 350;

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
        { height: 120, y: groundY - 120 },
        { height: 180, y: groundY - 180 },
        { height: 200, y: groundY - 200 }
    ];
    
    const wallType = wallTypes[Math.floor(Math.random() * wallTypes.length)];
    const wallX = canvas.width;
    
    // Check if there's a pit nearby (within 100 pixels)
    let canSpawnWall = true;
    for (let pit of pits) {
        if (Math.abs(pit.x - wallX) < 100) {
            canSpawnWall = false;
            break;
        }
    }
    
    if (canSpawnWall) {
        walls.push({
            x: wallX,
            y: wallType.y,
            height: wallType.height,
            broken: false
        });
    }
    
    // Set random distance for next wall based on difficulty
    const baseDistance = Math.max(80, 150 - difficultyLevel * 10);
    nextWallDistance = baseDistance + Math.random() * 60;
}

function spawnPit() {
    const pitWidth = 40 + Math.random() * 40; // 40-80 pixels wide
    const pitX = canvas.width;
    
    // Check if there's a wall nearby (within 120 pixels)
    let canSpawnPit = true;
    for (let wall of walls) {
        if (Math.abs(wall.x - pitX) < 120) {
            canSpawnPit = false;
            break;
        }
    }
    
    if (canSpawnPit) {
        pits.push({
            x: pitX,
            y: groundY,
            width: pitWidth,
            height: 60
        });
    }
    
    // Set random distance for next pit (80-200 frames)
    nextPitDistance = 80 + Math.random() * 120;
}

function drawGround() {
    // Main ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
    
    // Grass on top
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, groundY - 10, canvas.width, 10);
    
    // Ground texture
    ctx.fillStyle = '#654321';
    for (let i = 0; i < canvas.width; i += 30) {
        ctx.fillRect(i, groundY + 10, 20, 3);
        ctx.fillRect(i + 10, groundY + 25, 15, 2);
    }
}

function drawPit(pit) {
    // Pit hole
    ctx.fillStyle = '#000000';
    ctx.fillRect(pit.x, pit.y, pit.width, pit.height);
    
    // Pit edges
    ctx.fillStyle = '#654321';
    ctx.fillRect(pit.x - 2, pit.y, 2, pit.height);
    ctx.fillRect(pit.x + pit.width, pit.y, 2, pit.height);
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

function updatePits() {
    for (let i = pits.length - 1; i >= 0; i--) {
        pits[i].x -= wallSpeed;
        
        if (pits[i].x < -pits[i].width) {
            pits.splice(i, 1);
        }
    }
}

function updatePig() {
    // Handle jumping physics
    if (pig.isJumping) {
        pig.jumpVelocity += pig.gravity;
        pig.y += pig.jumpVelocity;
        
        // Land on ground
        if (pig.y >= pig.groundY) {
            pig.y = pig.groundY;
            pig.isJumping = false;
            pig.jumpVelocity = 0;
        }
    }
}

function jump() {
    if (!pig.isJumping && gameState === 'playing') {
        pig.isJumping = true;
        pig.jumpVelocity = pig.jumpPower;
    }
}

function checkCollision() {
    // Check wall collisions
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
                
                // Update high score if needed
                if (finalScore > highScore) {
                    highScore = finalScore;
                    localStorage.setItem('pigPunchHighScore', highScore.toString());
                    newRecord = true;
                }
                
                document.getElementById('gameOver').style.display = 'block';
                document.getElementById('restartBtn').style.display = 'block';
                return;
            }
        }
    }
    
    // Check pit collisions - only check pig's feet area
    for (let pit of pits) {
        const pigFeetY = pig.y + pig.height; // Check pig's feet position
        if (pig.x + pig.width > pit.x && 
            pig.x < pit.x + pit.width &&
            pigFeetY >= pit.y) {
            
            gameState = 'gameOver';
            finalScore = score;
            
            // Update high score if needed
            if (finalScore > highScore) {
                highScore = finalScore;
                localStorage.setItem('pigPunchHighScore', highScore.toString());
                newRecord = true;
            }
            
            document.getElementById('gameOver').style.display = 'block';
            document.getElementById('restartBtn').style.display = 'block';
            return;
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
    
    // Update difficulty every 100 meters
    difficultyLevel = Math.floor(score / 100) + 1;
    
    // Spawn walls with random distances
    wallSpawnTimer++;
    if (wallSpawnTimer >= nextWallDistance) {
        spawnWall();
        wallSpawnTimer = 0;
    }
    
    // Spawn pits only after 100 meters
    if (score >= 100) {
        pitSpawnTimer++;
        if (pitSpawnTimer >= nextPitDistance) {
            spawnPit();
            pitSpawnTimer = 0;
        }
    }
    
    // Check for new high score during gameplay
    if (score > highScore && !newRecord) {
        newRecord = true;
        celebrationTimer = 120; // 2 seconds at 60fps
    }
    
    if (celebrationTimer > 0) {
        celebrationTimer--;
    }
    
    updateWalls();
    updatePits();
    updatePig();
    
    drawGround();
    
    for (let pit of pits) {
        drawPit(pit);
    }
    
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
    
    // High score display
    ctx.fillStyle = '#4169E1';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('High Score: ' + highScore + 'm', 20, 70);
    
    // Difficulty level display
    ctx.fillStyle = '#8B4513';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('Level: ' + difficultyLevel, 20, 95);
    
    // New record celebration
    if (celebrationTimer > 0) {
        const flash = Math.sin(celebrationTimer * 0.3) > 0;
        if (flash) {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🎉 NEW RECORD! 🎉', canvas.width / 2, 100);
            ctx.textAlign = 'left';
        }
    }
    
    // Game over final score
    if (gameState === 'gameOver') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('FINAL SCORE', canvas.width / 2, canvas.height / 2 - 80);
        
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 72px Arial';
        ctx.fillText(finalScore + ' METERS', canvas.width / 2, canvas.height / 2 - 20);
        
        if (newRecord) {
            ctx.fillStyle = '#00FF00';
            ctx.font = 'bold 32px Arial';
            ctx.fillText('🎉 NEW HIGH SCORE! 🎉', canvas.width / 2, canvas.height / 2 + 40);
        }
        
        ctx.fillStyle = '#4169E1';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('High Score: ' + highScore + 'm', canvas.width / 2, canvas.height / 2 + 80);
        
        ctx.textAlign = 'left';
    }
}

function restartGame() {
    gameState = 'playing';
    walls.length = 0;
    pits.length = 0;
    wallSpawnTimer = 0;
    pitSpawnTimer = 0;
    pig.isPunching = false;
    pig.punchTimer = 0;
    pig.walkFrame = 0;
    pig.y = pig.groundY;
    pig.isJumping = false;
    pig.jumpVelocity = 0;
    keyPressed = false;
    spacePressed = false;
    gameTime = 0;
    wallSpawnVariance = 0;
    score = 0;
    stepCounter = 0;
    finalScore = 0;
    nextWallDistance = 150; // Start with easier spacing
    nextPitDistance = 120;
    difficultyLevel = 1;
    newRecord = false;
    celebrationTimer = 0;
    
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
    if (e.key === ' ' && !spacePressed) {
        e.preventDefault();
        spacePressed = true;
        jump();
    }
    if (e.key === '1') {
        restartGame();
    }
});

document.addEventListener('keyup', function(e) {
    if (e.key === 'a' || e.key === 'A') {
        keyPressed = false;
    }
    if (e.key === ' ') {
        spacePressed = false;
    }
});

gameLoop();
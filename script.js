// --- App State & High Scores ---
const scores = {
    snake: 0, dino: 0, flappy: 0, coin: 0, reaction: 0,
    moto: 0, shooter: 0, color: 0, pong: 0, stack: 0 // New Games Added
};

let currentGame = null;
let animationId;
let isGameOver = false;
let currentScore = 0;

// --- DOM Elements ---
const menuEl = document.getElementById('menu');
const gameContainerEl = document.getElementById('game-container');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('current-score');
const gameOverScreen = document.getElementById('game-over');

// --- Input Tracking ---
let touchStartX = 0;
let touchStartY = 0;
let tapped = false;
let tappedSide = null; // 'left' or 'right'
let swipeDir = '';

// --- Navigation ---
function showMenu() {
    cancelAnimationFrame(animationId);
    gameContainerEl.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    menuEl.classList.remove('hidden');
    updateLeaderboard();
}

function startGame(gameId) {
    currentGame = gameId;
    isGameOver = false;
    currentScore = 0;
    scoreDisplay.innerText = `Score: 0`;
    swipeDir = 'RIGHT'; // Reset default direction
    
    menuEl.classList.add('hidden');
    gameContainerEl.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
    
    // Set canvas internal resolution to match wrapper size
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    setupInputs();
    
    // Initialize specific game
    if (gameId === 'snake') initSnake();
    if (gameId === 'dino') initDino();
    if (gameId === 'flappy') initFlappy();
    if (gameId === 'coin') initCoin();
    if (gameId === 'reaction') initReaction();
    if (gameId === 'moto') initMoto();
    if (gameId === 'shooter') initShooter();
    if (gameId === 'color') initColor();
    if (gameId === 'pong') initPong();
    if (gameId === 'stack') initStack();
}

function restartCurrentGame() {
    startGame(currentGame);
}

function endGame() {
    isGameOver = true;
    cancelAnimationFrame(animationId);
    gameOverScreen.classList.remove('hidden');
    
    // Save high score logic (lower is better for reaction time)
    if (currentGame === 'reaction') {
        if (scores.reaction === 0 || currentScore < scores.reaction) {
            scores.reaction = currentScore;
        }
    } else {
        if (currentScore > scores[currentGame]) {
            scores[currentGame] = currentScore;
        }
    }
}

function updateLeaderboard() {
    document.getElementById('score-snake').innerText = scores.snake;
    document.getElementById('score-dino').innerText = scores.dino;
    document.getElementById('score-flappy').innerText = scores.flappy;
    document.getElementById('score-coin').innerText = scores.coin;
    document.getElementById('score-reaction').innerText = scores.reaction === 0 ? "0" : scores.reaction;
    // New games below:
    document.getElementById('score-moto').innerText = scores.moto;
    document.getElementById('score-shooter').innerText = scores.shooter;
    document.getElementById('score-color').innerText = scores.color;
    document.getElementById('score-pong').innerText = scores.pong;
    document.getElementById('score-stack').innerText = scores.stack;
}

// --- Universal Input Handling (Touch + Mouse) ---
function setupInputs() {
    tapped = false;
    
    // Helper function for when input starts (Touch down / Mouse down)
    const handleInputStart = (x, y) => {
        touchStartX = x;
        touchStartY = y;
        tapped = true;
        
        // Calculate canvas bounds to know if they tapped left or right side of the game screen
        const rect = canvas.getBoundingClientRect();
        const relativeX = x - rect.left;
        tappedSide = relativeX < canvas.width / 2 ? 'left' : 'right';
    };

    // Helper function for when input ends (Touch up / Mouse up) - Used for swipes
    const handleInputEnd = (endX, endY) => {
        const dx = endX - touchStartX;
        const dy = endY - touchStartY;
        
        // Swipe logic (requires at least 30px movement)
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
            swipeDir = dx > 0 ? 'RIGHT' : 'LEFT';
        } else if (Math.abs(dy) > 30) {
            swipeDir = dy > 0 ? 'DOWN' : 'UP';
        }
        
        // We do NOT set tapped = false here anymore. 
        // We let the game loops consume the tap so fast clicks aren't missed.
    };

    // 1. Touch Events (Mobile)
    canvas.ontouchstart = (e) => {
        e.preventDefault(); // Prevents double-firing issues
        handleInputStart(e.touches[0].clientX, e.touches[0].clientY);
    };

    canvas.ontouchend = (e) => {
        e.preventDefault();
        handleInputEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    };

    // 2. Mouse Events (Desktop Testing)
    canvas.onmousedown = (e) => {
        handleInputStart(e.clientX, e.clientY);
    };

    canvas.onmouseup = (e) => {
        handleInputEnd(e.clientX, e.clientY);
    };
}

// ==========================================
// GAME 1: SNAKE (Swipe Controls)
// ==========================================
let snake, food, dx, dy;
function initSnake() {
    const gridSize = 15;
    snake = [{x: 150, y: 150}];
    dx = gridSize; dy = 0; swipeDir = 'RIGHT';
    placeFood();
    
    let lastTime = 0;
    function loop(time) {
        if (isGameOver) return;
        animationId = requestAnimationFrame(loop);
        
        if (time - lastTime < 100) return; // Speed control
        lastTime = time;

        // Process swipe direction
        if (swipeDir === 'UP' && dy === 0) { dx = 0; dy = -gridSize; }
        if (swipeDir === 'DOWN' && dy === 0) { dx = 0; dy = gridSize; }
        if (swipeDir === 'LEFT' && dx === 0) { dx = -gridSize; dy = 0; }
        if (swipeDir === 'RIGHT' && dx === 0) { dx = gridSize; dy = 0; }

        let head = {x: snake[0].x + dx, y: snake[0].y + dy};
        
        // Wall collision
        if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) return endGame();
        // Self collision
        for (let i=0; i<snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) return endGame();
        }

        snake.unshift(head);
        
        // Ate food
        if (Math.abs(head.x - food.x) < gridSize && Math.abs(head.y - food.y) < gridSize) {
            currentScore += 10;
            scoreDisplay.innerText = `Score: ${currentScore}`;
            placeFood();
        } else {
            snake.pop();
        }

        // Draw
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ff0055'; // Food color
        ctx.fillRect(food.x, food.y, gridSize-2, gridSize-2);
        
        ctx.fillStyle = '#00ffcc'; // Snake color
        snake.forEach(part => ctx.fillRect(part.x, part.y, gridSize-2, gridSize-2));
    }
    
    function placeFood() {
        food = {
            x: Math.floor(Math.random() * (canvas.width/gridSize)) * gridSize,
            y: Math.floor(Math.random() * (canvas.height/gridSize)) * gridSize
        };
    }
    animationId = requestAnimationFrame(loop);
}

// ==========================================
// GAME 2: DINO RUN (Tap to Jump)
// ==========================================
function initDino() {
    let dino = { x: 50, y: canvas.height - 50, w: 20, h: 30, dy: 0, gravity: 0.6, jump: -11, grounded: true };
    let obstacles = [];
    let frame = 0;
    
    function loop() {
        if (isGameOver) return;
        animationId = requestAnimationFrame(loop);
        frame++;

        // Jump Logic
        if (tapped && dino.grounded) {
            dino.dy = dino.jump;
            dino.grounded = false;
            tapped = false; // Consume the tap
        }

        dino.dy += dino.gravity;
        dino.y += dino.dy;

        // Ground collision
        if (dino.y >= canvas.height - 50) {
            dino.y = canvas.height - 50;
            dino.grounded = true;
        }

        // Spawn obstacles
        if (frame % 90 === 0) {
            obstacles.push({ x: canvas.width, y: canvas.height - 40, w: 15, h: 20 });
        }

        // Draw Background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#333'; // Ground line
        ctx.fillRect(0, canvas.height - 20, canvas.width, 20);

        // Draw Dino
        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(dino.x, dino.y, dino.w, dino.h);

        // Draw Obstacles & check collisions
        ctx.fillStyle = '#ff0055';
        for (let i = obstacles.length - 1; i >= 0; i--) {
            let obs = obstacles[i];
            obs.x -= 5; // speed
            ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

            // Collision logic
            if (dino.x < obs.x + obs.w && dino.x + dino.w > obs.x &&
                dino.y < obs.y + obs.h && dino.y + dino.h > obs.y) {
                endGame();
            }

            // Score logic
            if (obs.x + obs.w < 0) {
                obstacles.splice(i, 1);
                currentScore++;
                scoreDisplay.innerText = `Score: ${currentScore}`;
            }
        }
    }
    animationId = requestAnimationFrame(loop);
}

// ==========================================
// GAME 3: FLAPPY BLOCK (Tap to Flap)
// ==========================================
function initFlappy() {
    let bird = { x: 50, y: canvas.height/2, w: 20, h: 20, dy: 0, gravity: 0.4, lift: -7 };
    let pipes = [];
    let frame = 0;

    function loop() {
        if(isGameOver) return;
        animationId = requestAnimationFrame(loop);
        frame++;

        if(tapped) {
            bird.dy = bird.lift;
            tapped = false; // Consume tap
        }

        bird.dy += bird.gravity;
        bird.y += bird.dy;

        // Hit floor or ceiling
        if(bird.y + bird.h > canvas.height || bird.y < 0) endGame();

        if(frame % 100 === 0) {
            let gap = 130;
            let topHeight = Math.random() * (canvas.height - gap - 60) + 30;
            pipes.push({ x: canvas.width, y: 0, w: 30, h: topHeight }); // Top pipe
            pipes.push({ x: canvas.width, y: topHeight + gap, w: 30, h: canvas.height - topHeight - gap, passed: false }); // Bottom pipe
        }

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ff0055';
        ctx.fillRect(bird.x, bird.y, bird.w, bird.h);

        ctx.fillStyle = '#00ffcc';
        for(let i = pipes.length - 1; i >= 0; i--) {
            let p = pipes[i];
            p.x -= 3;
            ctx.fillRect(p.x, p.y, p.w, p.h);

            if(bird.x < p.x + p.w && bird.x + bird.w > p.x && bird.y < p.y + p.h && bird.y + bird.h > p.y) {
                endGame();
            }

            if(p.passed === false && p.x + p.w < bird.x) {
                p.passed = true;
                currentScore++;
                scoreDisplay.innerText = `Score: ${currentScore}`;
            }

            if(p.x + p.w < 0) pipes.splice(i, 1);
        }
    }
    animationId = requestAnimationFrame(loop);
}

// ==========================================
// GAME 4: COIN CATCHER (Tap Left/Right)
// ==========================================
function initCoin() {
    let basket = { x: canvas.width/2 - 25, y: canvas.height - 30, w: 50, h: 10, speed: 15 };
    let coins = [];
    
    function loop() {
        if(isGameOver) return;
        animationId = requestAnimationFrame(loop);

        if(tapped) {
            if(tappedSide === 'left' && basket.x > 0) basket.x -= basket.speed;
            if(tappedSide === 'right' && basket.x + basket.w < canvas.width) basket.x += basket.speed;
            tapped = false; // Consume tap
        }

        if(Math.random() < 0.04) {
            coins.push({ x: Math.random() * (canvas.width - 10), y: -10, w: 10, h: 10, speed: 2 + Math.random()*3 });
        }

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(basket.x, basket.y, basket.w, basket.h);

        ctx.fillStyle = '#ffd700'; // Gold coins
        for(let i = coins.length - 1; i >= 0; i--) {
            let c = coins[i];
            c.y += c.speed;
            ctx.beginPath();
            ctx.arc(c.x, c.y, 5, 0, Math.PI*2);
            ctx.fill();

            // Caught coin
            if(c.y + 5 > basket.y && c.x > basket.x && c.x < basket.x + basket.w) {
                currentScore++;
                scoreDisplay.innerText = `Score: ${currentScore}`;
                coins.splice(i, 1);
            } 
            // Missed coin
            else if(c.y > canvas.height) {
                endGame();
            }
        }
    }
    animationId = requestAnimationFrame(loop);
}

// ==========================================
// GAME 5: REACTION STRIKE (Tap Speed)
// ==========================================
function initReaction() {
    let state = 'waiting'; 
    let waitTime = Math.random() * 3000 + 1000;
    let startTime = Date.now();
    let showTime = 0;

    function loop() {
        if(isGameOver) return;
        animationId = requestAnimationFrame(loop);

        let now = Date.now();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if(state === 'waiting') {
            ctx.fillStyle = '#ff0055'; // Red waiting screen
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText("Wait for Green...", canvas.width/2, canvas.height/2);
            
            if(tapped) {
                currentScore = "TOO EARLY";
                scoreDisplay.innerText = "FAILED";
                tapped = false;
                endGame();
                return;
            }

            if(now - startTime > waitTime) {
                state = 'ready';
                showTime = now;
            }
        } 
        else if (state === 'ready') {
            ctx.fillStyle = '#00ffcc'; // Green GO screen
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#000';
            ctx.fillText("TAP NOW!", canvas.width/2, canvas.height/2);

            if(tapped) {
                currentScore = now - showTime; 
                scoreDisplay.innerText = `${currentScore} ms`;
                tapped = false;
                state = 'done';
                setTimeout(endGame, 1000);
            }
        }
    }
    animationId = requestAnimationFrame(loop);
}

// ==========================================
// GAME 6: MOTO DODGE (Tap L/R to change lanes)
// ==========================================
function initMoto() {
    let lane = 1; // 0=left, 1=center, 2=right
    let obstacles = [];
    let speed = 4;
    let frame = 0;

    function loop() {
        if(isGameOver) return;
        animationId = requestAnimationFrame(loop);
        frame++;

        if(tapped) {
            if(tappedSide === 'left' && lane > 0) lane--;
            if(tappedSide === 'right' && lane < 2) lane++;
            tapped = false;
        }

        if(frame % (120 - Math.min(80, currentScore*2)) === 0) {
            let obsLane = Math.floor(Math.random() * 3);
            obstacles.push({ lane: obsLane, y: -40, h: 40 });
        }

        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw lane dividers
        ctx.fillStyle = '#333';
        ctx.fillRect(canvas.width/3, 0, 2, canvas.height);
        ctx.fillRect((canvas.width/3)*2, 0, 2, canvas.height);

        let laneWidth = canvas.width / 3;
        let motoX = (lane * laneWidth) + (laneWidth/2) - 15;
        let motoY = canvas.height - 80;

        ctx.fillStyle = '#00ffcc'; // Moto
        ctx.fillRect(motoX, motoY, 30, 50);

        ctx.fillStyle = '#ff0055'; // Traffic
        for(let i = obstacles.length - 1; i >= 0; i--) {
            let obs = obstacles[i];
            obs.y += speed + (currentScore * 0.1);
            let obsX = (obs.lane * laneWidth) + (laneWidth/2) - 15;
            ctx.fillRect(obsX, obs.y, 30, obs.h);

            // Collision
            if(lane === obs.lane && motoY < obs.y + obs.h && motoY + 50 > obs.y) {
                endGame();
            }

            if(obs.y > canvas.height) {
                obstacles.splice(i, 1);
                currentScore++;
                scoreDisplay.innerText = `Score: ${currentScore}`;
            }
        }
    }
    animationId = requestAnimationFrame(loop);
}

// ==========================================
// GAME 7: SPACE SHOOTER (Tap to fire)
// ==========================================
function initShooter() {
    let ship = { x: canvas.width/2 - 15, y: canvas.height - 50, w: 30, h: 30, speed: 3, dir: 1 };
    let bullets = [];
    let enemies = [];
    let frame = 0;

    function loop() {
        if(isGameOver) return;
        animationId = requestAnimationFrame(loop);
        frame++;

        // Auto sweep ship
        ship.x += ship.speed * ship.dir;
        if(ship.x <= 0 || ship.x + ship.w >= canvas.width) ship.dir *= -1;

        // Shoot
        if(tapped) {
            bullets.push({ x: ship.x + ship.w/2 - 2, y: ship.y, w: 4, h: 10 });
            tapped = false;
        }

        // Spawn enemies
        if(frame % 60 === 0) {
            enemies.push({ x: Math.random()*(canvas.width-20), y: -20, w: 20, h: 20, speed: 2 + Math.random() });
        }

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Ship
        ctx.fillStyle = '#00ffcc';
        ctx.beginPath();
        ctx.moveTo(ship.x + ship.w/2, ship.y);
        ctx.lineTo(ship.x + ship.w, ship.y + ship.h);
        ctx.lineTo(ship.x, ship.y + ship.h);
        ctx.fill();

        // Draw Bullets
        ctx.fillStyle = '#fff';
        for(let i = bullets.length - 1; i >= 0; i--) {
            let b = bullets[i];
            b.y -= 7;
            ctx.fillRect(b.x, b.y, b.w, b.h);
            if(b.y < 0) bullets.splice(i, 1);
        }

        // Draw Enemies & Collisions
        ctx.fillStyle = '#b145e9';
        for(let i = enemies.length - 1; i >= 0; i--) {
            let e = enemies[i];
            e.y += e.speed;
            ctx.fillRect(e.x, e.y, e.w, e.h);

            // Crash into ship
            if(e.y+e.h > ship.y && e.x < ship.x+ship.w && e.x+e.w > ship.x) {
                endGame();
            }

            // Shot by bullet
            for(let j = bullets.length - 1; j >= 0; j--) {
                let b = bullets[j];
                if(b.x < e.x+e.w && b.x+b.w > e.x && b.y < e.y+e.h && b.y+b.h > e.y) {
                    enemies.splice(i, 1);
                    bullets.splice(j, 1);
                    currentScore += 5;
                    scoreDisplay.innerText = `Score: ${currentScore}`;
                    break;
                }
            }
            if(enemies[i] && enemies[i].y > canvas.height) {
                currentScore -= 2; // Penalty for missing
                if(currentScore < 0) currentScore = 0;
                scoreDisplay.innerText = `Score: ${currentScore}`;
                enemies.splice(i, 1);
            }
        }
    }
    animationId = requestAnimationFrame(loop);
}

// ==========================================
// GAME 8: COLOR MATCH (Tap to toggle color)
// ==========================================
function initColor() {
    const c1 = '#ff0055'; // Pink
    const c2 = '#004953'; // Midnight Green
    let playerColor = c1;
    let walls = [];
    let speed = 4;
    let frame = 0;

    function loop() {
        if(isGameOver) return;
        animationId = requestAnimationFrame(loop);
        frame++;

        if(tapped) {
            playerColor = (playerColor === c1) ? c2 : c1;
            tapped = false;
        }

        if(frame % 90 === 0) {
            walls.push({ y: -20, h: 20, color: Math.random() > 0.5 ? c1 : c2 });
        }

        ctx.fillStyle = '#090a0f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Player
        ctx.fillStyle = playerColor;
        ctx.beginPath();
        ctx.arc(canvas.width/2, canvas.height - 80, 15, 0, Math.PI*2);
        ctx.fill();

        // Draw Walls
        for(let i = walls.length - 1; i >= 0; i--) {
            let w = walls[i];
            w.y += speed;
            ctx.fillStyle = w.color;
            ctx.fillRect(0, w.y, canvas.width, w.h);

            // Collision line
            if(w.y + w.h > canvas.height - 95 && w.y < canvas.height - 65) {
                if(w.color !== playerColor) {
                    endGame();
                } else if (!w.passed) {
                    w.passed = true;
                    currentScore++;
                    scoreDisplay.innerText = `Score: ${currentScore}`;
                }
            }
            if(w.y > canvas.height) walls.splice(i, 1);
        }
    }
    animationId = requestAnimationFrame(loop);
}

// ==========================================
// GAME 9: PONG SOLO (Tap L/R to move)
// ==========================================
function initPong() {
    let paddle = { x: canvas.width/2 - 30, y: canvas.height - 30, w: 60, h: 10, speed: 20 };
    let ball = { x: canvas.width/2, y: canvas.height/2, r: 8, dx: 4, dy: 4 };

    function loop() {
        if(isGameOver) return;
        animationId = requestAnimationFrame(loop);

        if(tapped) {
            if(tappedSide === 'left' && paddle.x > 0) paddle.x -= paddle.speed;
            if(tappedSide === 'right' && paddle.x + paddle.w < canvas.width) paddle.x += paddle.speed;
            tapped = false;
        }

        ball.x += ball.dx;
        ball.y += ball.dy;

        // Wall bounces
        if(ball.x - ball.r <= 0 || ball.x + ball.r >= canvas.width) ball.dx *= -1;
        if(ball.y - ball.r <= 0) ball.dy *= -1; // Top ceiling

        // Paddle bounce
        if(ball.y + ball.r >= paddle.y && ball.x >= paddle.x && ball.x <= paddle.x + paddle.w) {
            ball.dy = -Math.abs(ball.dy) - 0.2; // Speed up slightly
            ball.y = paddle.y - ball.r;
            currentScore++;
            scoreDisplay.innerText = `Score: ${currentScore}`;
        }

        // Missed
        if(ball.y - ball.r > canvas.height) endGame();

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

        ctx.fillStyle = '#ff0055';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2);
        ctx.fill();
    }
    animationId = requestAnimationFrame(loop);
}

// ==========================================
// GAME 10: TOWER STACK (Tap to drop)
// ==========================================
function initStack() {
    let blocks = [{ x: canvas.width/2 - 40, y: canvas.height - 40, w: 80, h: 40 }];
    let current = { x: 0, y: canvas.height - 80, w: 80, h: 40, dx: 4 };

    function loop() {
        if(isGameOver) return;
        animationId = requestAnimationFrame(loop);

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Move current block
        current.x += current.dx;
        if(current.x <= 0 || current.x + current.w >= canvas.width) current.dx *= -1;

        if(tapped) {
            let last = blocks[blocks.length - 1];
            // Check overlap
            if(current.x + current.w < last.x || current.x > last.x + last.w) {
                endGame(); // Missed completely
            } else {
                // Cut block
                let overlapStart = Math.max(current.x, last.x);
                let overlapEnd = Math.min(current.x + current.w, last.x + last.w);
                let newW = overlapEnd - overlapStart;
                
                blocks.push({ x: overlapStart, y: current.y, w: newW, h: 40 });
                currentScore++;
                scoreDisplay.innerText = `Score: ${currentScore}`;

                // Setup next block
                let nextY = current.y - 40;
                // Scroll down if tower gets too high
                if (nextY < 100) {
                    blocks.forEach(b => b.y += 40);
                    nextY += 40;
                }
                
                current = { 
                    x: current.dx > 0 ? 0 : canvas.width - newW, 
                    y: nextY, 
                    w: newW, 
                    h: 40, 
                    dx: current.dx + (current.dx > 0 ? 0.5 : -0.5) 
                };
            }
            tapped = false;
        }

        // Draw blocks
        ctx.fillStyle = '#b145e9';
        blocks.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));
        
        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(current.x, current.y, current.w, current.h);
    }
    animationId = requestAnimationFrame(loop);
}
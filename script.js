/* ═══════════════════════════════════════════════════════════
   FUNZONE — script.js
   Parallax intro + 10 enhanced arcade games
   ═══════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────
   1. PARALLAX INTRO SCENE
────────────────────────────────────────── */
(function buildStars() {
    const layers = [
        { id: 'stars1', count: 80,  speed: 0.02, size: [1,2]   },
        { id: 'stars2', count: 50,  speed: 0.05, size: [2,3]   },
        { id: 'stars3', count: 25,  speed: 0.10, size: [2,4]   },
    ];
    layers.forEach(({ id, count, size }) => {
        const el = document.getElementById(id);
        if (!el) return;
        for (let i = 0; i < count; i++) {
            const s = document.createElement('div');
            const sz = size[0] + Math.random() * (size[1] - size[0]);
            Object.assign(s.style, {
                position: 'absolute',
                borderRadius: '50%',
                background: `rgba(255,255,255,${0.4 + Math.random() * 0.6})`,
                width: sz + 'px', height: sz + 'px',
                left: Math.random() * 100 + '%',
                top:  Math.random() * 100 + '%',
                animation: `starTwinkle ${2 + Math.random() * 3}s ease-in-out ${Math.random() * 3}s infinite`
            });
            el.appendChild(s);
        }
    });

    // Inject twinkle keyframe
    const style = document.createElement('style');
    style.textContent = `
        @keyframes starTwinkle {
            0%,100% { opacity: 0.3; transform: scale(1); }
            50%      { opacity: 1;   transform: scale(1.4); }
        }`;
    document.head.appendChild(style);
})();

// Parallax on scroll (intro scene)
window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const layers = [
        { id: 'stars1', factor: 0.15 },
        { id: 'stars2', factor: 0.30 },
        { id: 'stars3', factor: 0.50 },
        { id: 'bg-snake',  factor: 0.25 },
        { id: 'bg-dino',   factor: 0.35 },
        { id: 'bg-rocket', factor: 0.20 },
        { id: 'bg-coin',   factor: 0.40 },
        { id: 'bg-moto',   factor: 0.28 },
    ];
    layers.forEach(({ id, factor }) => {
        const el = document.getElementById(id);
        if (el) el.style.transform = `translateY(${scrollY * factor}px)`;
    });

    // Hero content fades out as you scroll down
    const hero = document.getElementById('intro-hero');
    if (hero) {
        const fadeProgress = Math.min(scrollY / (window.innerHeight * 0.5), 1);
        hero.style.opacity = 1 - fadeProgress;
        hero.style.transform = `translateY(${scrollY * 0.3}px)`;
    }
}, { passive: true });

// Reveal story cards on scroll (IntersectionObserver)
const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.2 });
document.querySelectorAll('.story-card').forEach(c => observer.observe(c));

function enterArcade() {
    document.getElementById('parallax-scene').style.display = 'none';
    document.getElementById('app').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    updateLeaderboard();
}

function showParallax() {
    document.getElementById('app').classList.add('hidden');
    document.getElementById('parallax-scene').style.display = '';
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ──────────────────────────────────────────
   2. APP STATE
────────────────────────────────────────── */
const scores = { snake:0, dino:0, flappy:0, coin:0, reaction:0, moto:0, shooter:0, color:0, pong:0, stack:0 };

const GAME_NAMES = {
    snake:'🐍 Snake', dino:'🦖 Dino Run', flappy:'🧊 Flappy Block',
    coin:'💰 Coins', reaction:'⚡ Reaction', moto:'🏍️ Moto Dodge',
    shooter:'🚀 Shooter', color:'🚥 Color Match', pong:'🏓 Pong', stack:'🏢 Tower Stack'
};

let currentGame = null;
let animationId;
let isGameOver = false;
let currentScore = 0;

const menuEl         = document.getElementById('menu');
const gameContainerEl= document.getElementById('game-container');
const canvas         = document.getElementById('gameCanvas');
const ctx            = canvas.getContext('2d');
const scoreDisplay   = document.getElementById('current-score');
const gameOverScreen = document.getElementById('game-over');
const gameOverText   = document.getElementById('gameover-score-text');
const gameTitleHUD   = document.getElementById('game-title-hud');

/* ──────────────────────────────────────────
   3. INPUT
────────────────────────────────────────── */
let touchStartX = 0, touchStartY = 0;
let tapped = false, tappedSide = null, swipeDir = 'RIGHT';

function setupInputs() {
    tapped = false;
    const onStart = (x, y) => {
        touchStartX = x; touchStartY = y; tapped = true;
        const rect = canvas.getBoundingClientRect();
        tappedSide = (x - rect.left) < canvas.width / 2 ? 'left' : 'right';
    };
    const onEnd = (x, y) => {
        const dx = x - touchStartX, dy = y - touchStartY;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) swipeDir = dx > 0 ? 'RIGHT' : 'LEFT';
        else if (Math.abs(dy) > 30) swipeDir = dy > 0 ? 'DOWN' : 'UP';
    };
    canvas.ontouchstart = e => { e.preventDefault(); onStart(e.touches[0].clientX, e.touches[0].clientY); };
    canvas.ontouchend   = e => { e.preventDefault(); onEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY); };
    canvas.onmousedown  = e => onStart(e.clientX, e.clientY);
    canvas.onmouseup    = e => onEnd(e.clientX, e.clientY);
}

/* ──────────────────────────────────────────
   4. NAVIGATION
────────────────────────────────────────── */
function showMenu() {
    cancelAnimationFrame(animationId);
    gameContainerEl.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    menuEl.classList.remove('hidden');
    updateLeaderboard();
}

function startGame(gameId) {
    currentGame = gameId;
    isGameOver = false; currentScore = 0;
    scoreDisplay.innerText = '0';
    gameTitleHUD.innerText = GAME_NAMES[gameId] || gameId;
    swipeDir = 'RIGHT';

    menuEl.classList.add('hidden');
    gameContainerEl.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');

    // Size canvas to its CSS display size
    const wrapper = canvas.parentElement;
    canvas.width  = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;

    setupInputs();

    const map = { snake:initSnake, dino:initDino, flappy:initFlappy, coin:initCoin,
                  reaction:initReaction, moto:initMoto, shooter:initShooter,
                  color:initColor, pong:initPong, stack:initStack };
    if (map[gameId]) map[gameId]();
}

function restartCurrentGame() { startGame(currentGame); }

function endGame(msg) {
    isGameOver = true;
    cancelAnimationFrame(animationId);

    if (currentGame === 'reaction') {
        if (typeof currentScore === 'number' && currentScore > 0)
            if (scores.reaction === 0 || currentScore < scores.reaction) scores.reaction = currentScore;
        gameOverText.innerText = currentScore ? `Your time: ${currentScore} ms` : 'Tapped too early!';
    } else {
        if (currentScore > scores[currentGame]) scores[currentGame] = currentScore;
        gameOverText.innerText = `Score: ${currentScore}` + (msg ? `  •  ${msg}` : '');
    }
    gameOverScreen.classList.remove('hidden');
}

function updateLeaderboard() {
    Object.keys(scores).forEach(k => {
        const el = document.getElementById('score-' + k);
        if (el) el.innerText = scores[k] || 0;
    });
}

/* ──────────────────────────────────────────
   5. SHARED DRAWING HELPERS
────────────────────────────────────────── */
function drawBg(color1 = '#000814', color2 = '#000') {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGlowRect(x, y, w, h, color, glow = 12) {
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = glow;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
}

function drawGlowCircle(x, y, r, color, glow = 15) {
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = glow;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawRoundRect(x, y, w, h, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
}

// Particle pool
class Particle {
    constructor(x, y, color, vx, vy, life = 40, size = 3) {
        Object.assign(this, { x, y, color, vx, vy, life, maxLife: life, size });
    }
    update() { this.x += this.vx; this.y += this.vy; this.vy += 0.15; this.life--; }
    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color; ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    get dead() { return this.life <= 0; }
}

function burst(particles, x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
        const spd = 1.5 + Math.random() * 3;
        particles.push(new Particle(x, y, color, Math.cos(angle) * spd, Math.sin(angle) * spd));
    }
}

function updateParticles(particles) {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        if (particles[i].dead) particles.splice(i, 1);
    }
}

/* ──────────────────────────────────────────
   GAME 1 ── SNAKE
────────────────────────────────────────── */
function initSnake() {
    const G = 16;
    let cols = Math.floor(canvas.width / G);
    let rows = Math.floor(canvas.height / G);
    let snake = [{ x: Math.floor(cols/2), y: Math.floor(rows/2) }];
    let dx = 1, dy = 0;
    let food = placeFood();
    let particles = [];
    let frame = 0, speed = 130; // ms per step

    function placeFood() {
        let pos;
        do { pos = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) }; }
        while (snake.some(s => s.x === pos.x && s.y === pos.y));
        return pos;
    }

    let lastTime = 0;
    function loop(time) {
        if (isGameOver) return;
        animationId = requestAnimationFrame(loop);

        if (swipeDir === 'UP'    && dy === 0) { dx = 0; dy = -1; }
        if (swipeDir === 'DOWN'  && dy === 0) { dx = 0; dy = 1; }
        if (swipeDir === 'LEFT'  && dx === 0) { dx = -1; dy = 0; }
        if (swipeDir === 'RIGHT' && dx === 0) { dx = 1; dy = 0; }

        // Draw always (for particle smoothness)
        drawBg('#000b14', '#000');

        // Draw grid dots
        ctx.fillStyle = 'rgba(0,255,204,0.04)';
        for (let r = 0; r < rows; r++)
            for (let c = 0; c < cols; c++) {
                ctx.fillRect(c * G + G/2 - 1, r * G + G/2 - 1, 2, 2);
            }

        updateParticles(particles);

        // Food glow pulse
        const pulse = Math.sin(frame * 0.1) * 4 + 10;
        drawGlowCircle(food.x * G + G/2, food.y * G + G/2, G/2 - 2, '#ff0055', pulse);

        // Draw snake
        snake.forEach((seg, i) => {
            const alpha = 1 - i / (snake.length * 1.2);
            const color = i === 0 ? '#00ffcc' : `rgba(0,200,150,${alpha})`;
            ctx.save();
            ctx.shadowColor = '#00ffcc'; ctx.shadowBlur = i === 0 ? 14 : 4;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(seg.x * G + 1, seg.y * G + 1, G - 2, G - 2, 4);
            ctx.fill();
            ctx.restore();
        });

        if (time - lastTime < speed) { frame++; return; }
        lastTime = time; frame++;

        const head = { x: snake[0].x + dx, y: snake[0].y + dy };

        if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) return endGame();
        if (snake.some(s => s.x === head.x && s.y === head.y)) return endGame();

        snake.unshift(head);

        if (head.x === food.x && head.y === food.y) {
            currentScore += 10;
            scoreDisplay.innerText = currentScore;
            burst(particles, food.x * G + G/2, food.y * G + G/2, '#ff0055', 12);
            food = placeFood();
            speed = Math.max(60, 130 - currentScore * 0.8); // Increase speed with score
        } else {
            snake.pop();
        }
    }
    animationId = requestAnimationFrame(loop);
}

/* ──────────────────────────────────────────
   GAME 2 ── DINO RUN
────────────────────────────────────────── */
function initDino() {
    const groundY = canvas.height - 60;
    let dino = { x: 50, y: groundY - 36, w: 28, h: 36, dy: 0, grounded: true, frame: 0 };
    let obstacles = [], clouds = [], particles = [];
    let gameFrame = 0, speed = 5;

    // Pre-populate clouds
    for (let i = 0; i < 4; i++) clouds.push({ x: Math.random() * canvas.width, y: 20 + Math.random() * 60, w: 40 + Math.random() * 60, opacity: 0.15 + Math.random() * 0.15 });

    function loop() {
        if (isGameOver) return;
        animationId = requestAnimationFrame(loop);
        gameFrame++;
        speed = 5 + currentScore * 0.08;

        // Jump
        if (tapped && dino.grounded) { dino.dy = -14; dino.grounded = false; tapped = false; }
        // Double tap mid-air for higher jump
        if (tapped && !dino.grounded && dino.dy > 0) { dino.dy = -10; tapped = false; }

        dino.dy += 0.65;
        dino.y += dino.dy;
        if (dino.y >= groundY - dino.h) { dino.y = groundY - dino.h; dino.grounded = true; dino.dy = 0; }
        dino.frame++;

        // Spawn obstacles (increasing frequency)
        const interval = Math.max(45, 100 - currentScore * 1.5);
        if (gameFrame % Math.floor(interval) === 0) {
            const h = 20 + Math.random() * 30;
            obstacles.push({ x: canvas.width, y: groundY - h, w: 18, h });
            // Sometimes spawn double obstacles
            if (currentScore > 10 && Math.random() < 0.3)
                obstacles.push({ x: canvas.width + 60, y: groundY - h, w: 18, h });
        }

        // Background
        drawBg('#0a0a14', '#000');

        // Parallax clouds
        clouds.forEach(c => {
            c.x -= speed * 0.2;
            if (c.x + c.w < 0) { c.x = canvas.width; c.y = 20 + Math.random() * 60; }
            ctx.fillStyle = `rgba(255,255,255,${c.opacity})`;
            ctx.beginPath(); ctx.ellipse(c.x + c.w/2, c.y, c.w/2, 14, 0, 0, Math.PI * 2); ctx.fill();
        });

        // Ground
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
        ctx.fillStyle = '#00ffcc22';
        ctx.fillRect(0, groundY, canvas.width, 2);

        // Dust particles when running
        if (dino.grounded && gameFrame % 6 === 0) {
            particles.push(new Particle(dino.x, groundY, 'rgba(150,150,200,0.5)', -speed * 0.5, -Math.random(), 15, 2));
        }
        updateParticles(particles);

        // Draw dino (cute pixel art with legs animation)
        const legAnim = dino.grounded ? (Math.floor(dino.frame / 6) % 2) : 0;
        ctx.save();
        ctx.shadowColor = '#00ffcc'; ctx.shadowBlur = 10;
        // Body
        ctx.fillStyle = '#00ffcc';
        ctx.beginPath(); ctx.roundRect(dino.x, dino.y, dino.w, dino.h - 10, 6); ctx.fill();
        // Eye
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(dino.x + dino.w - 7, dino.y + 8, 3, 0, Math.PI * 2); ctx.fill();
        // Legs
        ctx.fillStyle = '#00ddaa';
        if (legAnim === 0) { ctx.fillRect(dino.x + 4, dino.y + dino.h - 12, 8, 12); ctx.fillRect(dino.x + 14, dino.y + dino.h - 6, 8, 6); }
        else               { ctx.fillRect(dino.x + 4, dino.y + dino.h - 6, 8, 6); ctx.fillRect(dino.x + 14, dino.y + dino.h - 12, 8, 12); }
        ctx.restore();

        // Draw and update obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            obs.x -= speed;

            // Cactus
            ctx.save();
            ctx.shadowColor = '#ff4488'; ctx.shadowBlur = 10;
            ctx.fillStyle = '#ff0055';
            ctx.beginPath(); ctx.roundRect(obs.x + 4, obs.y, obs.w - 8, obs.h, 4); ctx.fill();
            ctx.fillRect(obs.x, obs.y + obs.h * 0.3, obs.w, obs.h * 0.15); // arms
            ctx.restore();

            // Collision (with slight forgiveness)
            const pad = 4;
            if (dino.x + pad < obs.x + obs.w && dino.x + dino.w - pad > obs.x &&
                dino.y + pad < obs.y + obs.h && dino.y + dino.h - pad > obs.y) {
                burst(particles, dino.x + dino.w/2, dino.y + dino.h/2, '#ff0055', 15);
                return endGame();
            }

            if (obs.x + obs.w < 0) { obstacles.splice(i, 1); currentScore++; scoreDisplay.innerText = currentScore; }
        }
    }
    animationId = requestAnimationFrame(loop);
}

/* ──────────────────────────────────────────
   GAME 3 ── FLAPPY BLOCK
────────────────────────────────────────── */
function initFlappy() {
    let bird = { x: 60, y: canvas.height/2, w: 24, h: 24, dy: 0 };
    const gravity = 0.45, lift = -8;
    let pipes = [], particles = [], frame = 0;

    function loop() {
        if (isGameOver) return;
        animationId = requestAnimationFrame(loop);
        frame++;

        if (tapped) { bird.dy = lift; tapped = false; burst(particles, bird.x, bird.y + bird.h/2, '#00b4ff', 5); }
        bird.dy += gravity; bird.y += bird.dy;

        if (bird.y + bird.h > canvas.height || bird.y < 0) return endGame();

        // Spawn pipes (gap shrinks with score)
        const gap = Math.max(90, 140 - currentScore * 3);
        const pipeSpeed = 3 + currentScore * 0.1;
        if (frame % Math.max(60, 90 - currentScore * 2) === 0) {
            const topH = 30 + Math.random() * (canvas.height - gap - 60);
            pipes.push({ x: canvas.width, topH, gap, passed: false });
        }

        // Draw
        drawBg('#000814', '#000a1a');

        // Starfield
        if (frame % 3 === 0) particles.push(new Particle(canvas.width, Math.random() * canvas.height, 'rgba(255,255,255,0.5)', -pipeSpeed * 0.4, 0, 60, 1));
        updateParticles(particles);

        // Bird glow
        const tilt = Math.min(Math.max(bird.dy * 4, -30), 30);
        ctx.save();
        ctx.translate(bird.x + bird.w/2, bird.y + bird.h/2);
        ctx.rotate(tilt * Math.PI / 180);
        ctx.shadowColor = '#00b4ff'; ctx.shadowBlur = 16;
        ctx.fillStyle = '#00b4ff';
        ctx.beginPath(); ctx.roundRect(-bird.w/2, -bird.h/2, bird.w, bird.h, 6); ctx.fill();
        // Wing
        ctx.fillStyle = '#0090ff';
        ctx.beginPath(); ctx.ellipse(-2, 2, 8, 5, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Pipes
        for (let i = pipes.length - 1; i >= 0; i--) {
            const p = pipes[i];
            p.x -= pipeSpeed;

            // Pipe gradient
            const pGrad = ctx.createLinearGradient(p.x, 0, p.x + 28, 0);
            pGrad.addColorStop(0, '#00ddaa'); pGrad.addColorStop(1, '#008866');

            ctx.save(); ctx.shadowColor = '#00ffcc'; ctx.shadowBlur = 12;
            ctx.fillStyle = pGrad;
            // Top pipe
            ctx.fillRect(p.x, 0, 28, p.topH);
            ctx.fillStyle = '#00ffcc44';
            ctx.fillRect(p.x - 4, p.topH - 16, 36, 16); // cap
            // Bottom pipe
            const botY = p.topH + p.gap;
            ctx.fillStyle = pGrad;
            ctx.fillRect(p.x, botY, 28, canvas.height - botY);
            ctx.fillStyle = '#00ffcc44';
            ctx.fillRect(p.x - 4, botY, 36, 16); // cap
            ctx.restore();

            // Collision
            const pad = 3;
            if (bird.x + pad < p.x + 28 && bird.x + bird.w - pad > p.x &&
               (bird.y + pad < p.topH || bird.y + bird.h - pad > p.topH + p.gap)) return endGame();

            if (!p.passed && p.x + 28 < bird.x) {
                p.passed = true; currentScore++;
                scoreDisplay.innerText = currentScore;
                burst(particles, bird.x, bird.y, '#ffd700', 8);
            }
            if (p.x + 28 < 0) pipes.splice(i, 1);
        }
    }
    animationId = requestAnimationFrame(loop);
}

/* ──────────────────────────────────────────
   GAME 4 ── COIN CATCHER
────────────────────────────────────────── */
function initCoin() {
    let basket = { x: canvas.width/2 - 30, y: canvas.height - 40, w: 60, h: 14 };
    let coins = [], bombs = [], particles = [], frame = 0;
    let lives = 3;

    function loop() {
        if (isGameOver) return;
        animationId = requestAnimationFrame(loop);
        frame++;

        if (tapped) {
            const spd = 18 + Math.min(currentScore, 20);
            if (tappedSide === 'left'  && basket.x > 0) basket.x = Math.max(0, basket.x - spd);
            if (tappedSide === 'right' && basket.x + basket.w < canvas.width) basket.x = Math.min(canvas.width - basket.w, basket.x + spd);
            tapped = false;
        }

        // Spawn coins (faster over time)
        const spawnRate = Math.max(0.02, 0.05 - currentScore * 0.001);
        if (Math.random() < spawnRate) coins.push({ x: 10 + Math.random() * (canvas.width - 20), y: -14, spd: 2.5 + Math.random() * 2 + currentScore * 0.05 });

        // Bombs after score 5
        if (currentScore > 5 && Math.random() < 0.008) bombs.push({ x: 10 + Math.random() * (canvas.width - 20), y: -14, spd: 2 + Math.random() * 2 });

        drawBg('#0a0018', '#000');

        // Moving background lines
        ctx.strokeStyle = 'rgba(100,0,200,0.05)';
        for (let x = (frame * 0.5) % 40; x < canvas.width; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }

        updateParticles(particles);

        // Lives display
        for (let i = 0; i < lives; i++) {
            ctx.font = '16px serif'; ctx.fillText('❤️', 10 + i * 22, 24);
        }

        // Draw basket (glowing rounded rect)
        const bGrad = ctx.createLinearGradient(basket.x, basket.y, basket.x + basket.w, basket.y);
        bGrad.addColorStop(0, '#00ffcc'); bGrad.addColorStop(1, '#00aaff');
        ctx.save(); ctx.shadowColor = '#00ffcc'; ctx.shadowBlur = 14;
        ctx.fillStyle = bGrad;
        ctx.beginPath(); ctx.roundRect(basket.x, basket.y, basket.w, basket.h, 8); ctx.fill();
        ctx.restore();

        // Coins
        for (let i = coins.length - 1; i >= 0; i--) {
            const c = coins[i];
            c.y += c.spd;

            // Gold coin with shine
            const coinGrad = ctx.createRadialGradient(c.x - 2, c.y - 2, 2, c.x, c.y, 9);
            coinGrad.addColorStop(0, '#ffe066'); coinGrad.addColorStop(1, '#cc8800');
            ctx.save(); ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 12;
            ctx.fillStyle = coinGrad;
            ctx.beginPath(); ctx.arc(c.x, c.y, 9, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff8'; ctx.beginPath(); ctx.arc(c.x - 3, c.y - 3, 4, 0, Math.PI * 2); ctx.fill();
            ctx.restore();

            if (c.y + 9 > basket.y && c.x > basket.x && c.x < basket.x + basket.w) {
                currentScore++; scoreDisplay.innerText = currentScore;
                burst(particles, c.x, c.y, '#ffd700', 8);
                coins.splice(i, 1);
            } else if (c.y - 9 > canvas.height) {
                lives--;
                burst(particles, c.x, canvas.height - 20, '#ff4444', 6);
                coins.splice(i, 1);
                if (lives <= 0) return endGame();
            }
        }

        // Bombs
        for (let i = bombs.length - 1; i >= 0; i--) {
            const b = bombs[i];
            b.y += b.spd;
            ctx.save(); ctx.shadowColor = '#ff0055'; ctx.shadowBlur = 12;
            ctx.fillStyle = '#ff0055';
            ctx.beginPath(); ctx.arc(b.x, b.y, 10, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = '14px serif'; ctx.textAlign = 'center';
            ctx.fillText('💣', b.x, b.y + 5);
            ctx.restore();

            if (b.y + 10 > basket.y && b.x > basket.x && b.x < basket.x + basket.w) {
                burst(particles, b.x, b.y, '#ff0055', 15);
                bombs.splice(i, 1); lives--;
                if (lives <= 0) return endGame();
            } else if (b.y - 10 > canvas.height) bombs.splice(i, 1);
        }
    }
    animationId = requestAnimationFrame(loop);
}

/* ──────────────────────────────────────────
   GAME 5 ── REACTION STRIKE
────────────────────────────────────────── */
function initReaction() {
    let state = 'waiting';
    let waitTime = 1500 + Math.random() * 3000;
    let startTime = Date.now();
    let showTime = 0, pulseFrame = 0;

    function loop() {
        if (isGameOver) return;
        animationId = requestAnimationFrame(loop);
        const now = Date.now(); pulseFrame++;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const pulse = Math.sin(pulseFrame * 0.05) * 0.1 + 0.9;

        if (state === 'waiting') {
            const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width * pulse);
            grad.addColorStop(0, '#3d0018'); grad.addColorStop(1, '#1a0009');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#ff003a'; ctx.shadowColor = '#ff003a'; ctx.shadowBlur = 40;
            ctx.font = `bold ${Math.floor(42 * pulse)}px Orbitron`; ctx.textAlign = 'center';
            ctx.fillText('⏳', canvas.width/2, canvas.height/2 - 20);
            ctx.font = '18px Space Grotesk'; ctx.shadowBlur = 0;
            ctx.fillStyle = '#ff6688';
            ctx.fillText('Wait for GREEN...', canvas.width/2, canvas.height/2 + 40);
            ctx.font = '13px Space Grotesk'; ctx.fillStyle = '#ff334466';
            ctx.fillText('Tap early = FAIL', canvas.width/2, canvas.height/2 + 70);

            if (tapped) { currentScore = 0; tapped = false; scoreDisplay.innerText = 'FAIL'; return endGame('Too early!'); }
            if (now - startTime > waitTime) { state = 'ready'; showTime = now; }
        } else if (state === 'ready') {
            const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width * pulse);
            grad.addColorStop(0, '#003d1f'); grad.addColorStop(1, '#001a0c');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#00ffcc'; ctx.shadowColor = '#00ffcc'; ctx.shadowBlur = 50;
            ctx.font = `bold ${Math.floor(52 * pulse)}px Orbitron`; ctx.textAlign = 'center';
            ctx.fillText('TAP!', canvas.width/2, canvas.height/2 + 10);
            ctx.shadowBlur = 0; ctx.font = '14px Space Grotesk'; ctx.fillStyle = '#00ffaa88';
            ctx.fillText('NOW NOW NOW', canvas.width/2, canvas.height/2 + 46);

            if (tapped) {
                currentScore = now - showTime;
                scoreDisplay.innerText = currentScore + ' ms';
                tapped = false; state = 'done';
                setTimeout(endGame, 1000);
            }
        } else if (state === 'done') {
            drawBg('#001a10', '#000');
            ctx.fillStyle = '#00ffcc'; ctx.font = 'bold 36px Orbitron'; ctx.textAlign = 'center';
            ctx.fillText(currentScore + ' ms', canvas.width/2, canvas.height/2);
            const rating = currentScore < 200 ? '🏆 Lightning!' : currentScore < 300 ? '⚡ Fast!' : currentScore < 450 ? '👍 Good' : '🐢 Slow';
            ctx.font = '20px Space Grotesk'; ctx.fillStyle = '#aaa';
            ctx.fillText(rating, canvas.width/2, canvas.height/2 + 40);
        }
    }
    animationId = requestAnimationFrame(loop);
}

/* ──────────────────────────────────────────
   GAME 6 ── MOTO DODGE
────────────────────────────────────────── */
function initMoto() {
    let lane = 1;
    let obstacles = [], particles = [], frame = 0;
    const laneW = canvas.width / 3;
    const motoY = canvas.height - 100;

    function laneX(l) { return l * laneW + laneW/2 - 16; }
    let motoTargetX = laneX(1), motoCurrentX = laneX(1);

    function loop() {
        if (isGameOver) return;
        animationId = requestAnimationFrame(loop);
        frame++;

        if (tapped) {
            if (tappedSide === 'left'  && lane > 0) lane--;
            if (tappedSide === 'right' && lane < 2) lane++;
            tapped = false;
        }
        motoTargetX = laneX(lane);
        motoCurrentX += (motoTargetX - motoCurrentX) * 0.2; // Smooth lane change

        const speed = 5 + currentScore * 0.15;
        const interval = Math.max(35, 100 - currentScore * 2);
        if (frame % Math.floor(interval) === 0) obstacles.push({ lane: Math.floor(Math.random() * 3), y: -60, h: 50, w: 32 });

        drawBg('#080818', '#000');

        // Road
        ctx.fillStyle = '#111122';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Lane lines (scrolling)
        ctx.strokeStyle = '#ffffff18';
        ctx.lineWidth = 2; ctx.setLineDash([30, 20]);
        ctx.lineDashOffset = -(frame * speed * 0.5) % 50;
        for (let l = 1; l < 3; l++) {
            ctx.beginPath(); ctx.moveTo(l * laneW, 0); ctx.lineTo(l * laneW, canvas.height); ctx.stroke();
        }
        ctx.setLineDash([]);

        // Road edges glow
        ctx.fillStyle = '#00ffcc11';
        ctx.fillRect(0, 0, 3, canvas.height);
        ctx.fillRect(canvas.width - 3, 0, 3, canvas.height);

        updateParticles(particles);

        // Moto trail
        if (frame % 3 === 0) particles.push(new Particle(motoCurrentX + 16, motoY + 48, 'rgba(0,255,204,0.4)', (Math.random()-0.5)*2, speed * 0.5, 20, 3));

        // Draw moto (pixel art style)
        const mx = motoCurrentX;
        ctx.save(); ctx.shadowColor = '#00ffcc'; ctx.shadowBlur = 16;
        ctx.fillStyle = '#00ffcc'; ctx.fillRect(mx + 8, motoY, 16, 32); // body
        ctx.fillStyle = '#009966'; ctx.fillRect(mx + 2, motoY + 18, 28, 12); // wheels base
        ctx.fillStyle = '#fff'; ctx.fillRect(mx + 4, motoY + 4, 10, 6); // windshield
        ctx.fillStyle = '#00ffcc88'; ctx.beginPath(); ctx.ellipse(mx + 8, motoY + 42, 6, 4, 0, 0, Math.PI * 2); ctx.fill(); // rear wheel
        ctx.beginPath(); ctx.ellipse(mx + 24, motoY + 42, 6, 4, 0, 0, Math.PI * 2); ctx.fill(); // front wheel
        ctx.restore();

        // Obstacles (other cars)
        const colors = ['#ff0055', '#ff6600', '#cc00ff'];
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            obs.y += speed;
            const ox = laneX(obs.lane);
            const col = colors[obs.lane];

            ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 12;
            ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(ox, obs.y, obs.w, obs.h, 6); ctx.fill();
            ctx.fillStyle = '#ffffff22'; ctx.fillRect(ox + 4, obs.y + 6, obs.w - 8, 10); // windshield
            // Taillights
            ctx.fillStyle = '#ff4444'; ctx.fillRect(ox + 2, obs.y + obs.h - 6, 8, 4);
            ctx.fillRect(ox + obs.w - 10, obs.y + obs.h - 6, 8, 4);
            ctx.restore();

            // Collision
            const pad = 5;
            if (obs.lane === lane && motoY < obs.y + obs.h && motoY + 48 > obs.y + pad) {
                burst(particles, motoCurrentX + 16, motoY + 24, '#ff0055', 20);
                return endGame();
            }

            if (obs.y > canvas.height) { obstacles.splice(i, 1); currentScore++; scoreDisplay.innerText = currentScore; }
        }
    }
    animationId = requestAnimationFrame(loop);
}

/* ──────────────────────────────────────────
   GAME 7 ── SPACE SHOOTER
────────────────────────────────────────── */
function initShooter() {
    let ship = { x: canvas.width/2 - 16, y: canvas.height - 60, w: 32, h: 32, dir: 1, speed: 2.5 };
    let bullets = [], enemies = [], stars = [], particles = [], frame = 0;
    let autoShootTimer = 0;

    // Create starfield
    for (let i = 0; i < 80; i++) stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, spd: 0.3 + Math.random() * 1.2, size: Math.random() * 2 });

    function loop() {
        if (isGameOver) return;
        animationId = requestAnimationFrame(loop);
        frame++;

        ship.x += ship.speed * ship.dir;
        if (ship.x <= 0 || ship.x + ship.w >= canvas.width) ship.dir *= -1;

        if (tapped) {
            bullets.push({ x: ship.x + ship.w/2 - 2, y: ship.y, w: 4, h: 14, spd: 10 });
            tapped = false;
        }

        // Auto-fire increases with score
        autoShootTimer++;
        const autoRate = Math.max(25, 80 - currentScore * 2);
        if (autoShootTimer >= autoRate) {
            bullets.push({ x: ship.x + ship.w/2 - 2, y: ship.y, w: 4, h: 14, spd: 10 });
            autoShootTimer = 0;
        }

        const spawnRate = Math.max(25, 70 - currentScore);
        if (frame % spawnRate === 0) {
            const types = ['normal', currentScore > 10 ? 'fast' : 'normal', currentScore > 20 ? 'zigzag' : 'normal'];
            const type = types[Math.floor(Math.random() * types.length)];
            enemies.push({ x: Math.random() * (canvas.width - 24), y: -24, w: 24, h: 24, spd: 1.5 + Math.random() * 1.5 + currentScore * 0.05, type, zigDir: 1, hp: type === 'fast' ? 1 : 2 });
        }

        drawBg('#000010', '#00000a');

        // Scrolling stars
        stars.forEach(s => {
            s.y += s.spd;
            if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; }
            ctx.fillStyle = `rgba(255,255,255,${s.spd * 0.4})`;
            ctx.fillRect(s.x, s.y, s.size, s.size);
        });

        // Nebula
        const nebula = ctx.createRadialGradient(canvas.width * 0.7, canvas.height * 0.3, 0, canvas.width * 0.7, canvas.height * 0.3, 100);
        nebula.addColorStop(0, 'rgba(100,0,200,0.06)'); nebula.addColorStop(1, 'transparent');
        ctx.fillStyle = nebula; ctx.fillRect(0, 0, canvas.width, canvas.height);

        updateParticles(particles);

        // Engine glow
        particles.push(new Particle(ship.x + ship.w/2, ship.y + ship.h, '#00aaff', (Math.random()-0.5)*2, 2+Math.random(), 20, 3));

        // Draw ship
        ctx.save(); ctx.shadowColor = '#00ffcc'; ctx.shadowBlur = 18;
        ctx.fillStyle = '#00ffcc';
        ctx.beginPath();
        ctx.moveTo(ship.x + ship.w/2, ship.y);
        ctx.lineTo(ship.x + ship.w, ship.y + ship.h);
        ctx.lineTo(ship.x + ship.w * 0.7, ship.y + ship.h * 0.7);
        ctx.lineTo(ship.x + ship.w/2, ship.y + ship.h * 0.85);
        ctx.lineTo(ship.x + ship.w * 0.3, ship.y + ship.h * 0.7);
        ctx.lineTo(ship.x, ship.y + ship.h);
        ctx.closePath(); ctx.fill();
        // Cockpit
        ctx.fillStyle = '#80ffee'; ctx.beginPath(); ctx.ellipse(ship.x + ship.w/2, ship.y + ship.h/2, 5, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i]; b.y -= b.spd;
            ctx.save(); ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 10;
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 2); ctx.fill();
            ctx.restore();
            if (b.y + b.h < 0) bullets.splice(i, 1);
        }

        // Enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            e.y += e.spd;
            if (e.type === 'zigzag') { e.x += e.zigDir * 2; if (e.x <= 0 || e.x + e.w >= canvas.width) e.zigDir *= -1; }

            const eCol = e.type === 'fast' ? '#ff6600' : '#b145e9';
            ctx.save(); ctx.shadowColor = eCol; ctx.shadowBlur = 14;
            ctx.fillStyle = eCol;
            ctx.beginPath();
            ctx.moveTo(e.x + e.w/2, e.y + e.h);
            ctx.lineTo(e.x + e.w, e.y);
            ctx.lineTo(e.x + e.w * 0.7, e.y + e.h * 0.35);
            ctx.lineTo(e.x + e.w/2, e.y + e.h * 0.15);
            ctx.lineTo(e.x + e.w * 0.3, e.y + e.h * 0.35);
            ctx.lineTo(e.x, e.y); ctx.closePath(); ctx.fill();
            ctx.restore();

            // Hit by bullet
            let killed = false;
            for (let j = bullets.length - 1; j >= 0; j--) {
                const b = bullets[j];
                if (b.x < e.x+e.w && b.x+b.w > e.x && b.y < e.y+e.h && b.y+b.h > e.y) {
                    bullets.splice(j, 1); e.hp--;
                    burst(particles, e.x + e.w/2, e.y + e.h/2, eCol, 6);
                    if (e.hp <= 0) {
                        burst(particles, e.x + e.w/2, e.y + e.h/2, eCol, 15);
                        enemies.splice(i, 1); killed = true;
                        currentScore += e.type === 'fast' ? 10 : 5;
                        scoreDisplay.innerText = currentScore; break;
                    }
                }
            }
            if (killed) continue;

            if (enemies[i] && e.y + e.h > ship.y && e.x < ship.x + ship.w && e.x + e.w > ship.x) {
                burst(particles, ship.x + ship.w/2, ship.y + ship.h/2, '#ff0055', 20);
                return endGame();
            }
            if (enemies[i] && e.y > canvas.height) { enemies.splice(i, 1); }
        }
    }
    animationId = requestAnimationFrame(loop);
}

/* ──────────────────────────────────────────
   GAME 8 ── COLOR MATCH
────────────────────────────────────────── */
function initColor() {
    const colors = ['#ff0055', '#00b4ff', '#ffd700', '#00ffcc'];
    let playerColorIdx = 0;
    let walls = [], particles = [], frame = 0;
    let speed = 3.5;

    function loop() {
        if (isGameOver) return;
        animationId = requestAnimationFrame(loop);
        frame++;
        speed = 3.5 + currentScore * 0.15;

        if (tapped) {
            playerColorIdx = (playerColorIdx + 1) % colors.length;
            tapped = false;
            burst(particles, canvas.width/2, canvas.height - 80, colors[playerColorIdx], 8);
        }

        const interval = Math.max(50, 90 - currentScore * 2);
        if (frame % Math.floor(interval) === 0) {
            walls.push({ y: -28, h: 28, color: colors[Math.floor(Math.random() * colors.length)] });
        }

        drawBg('#070714', '#000');

        // Animated bg rings
        for (let r = 0; r < 4; r++) {
            const ringR = 40 + r * 30 + (frame * 0.5) % 30;
            ctx.strokeStyle = `rgba(255,255,255,0.03)`;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(canvas.width/2, canvas.height - 80, ringR, 0, Math.PI * 2); ctx.stroke();
        }

        updateParticles(particles);

        // Player
        const pColor = colors[playerColorIdx];
        ctx.save(); ctx.shadowColor = pColor; ctx.shadowBlur = 20;
        ctx.fillStyle = pColor;
        ctx.beginPath(); ctx.arc(canvas.width/2, canvas.height - 80, 18, 0, Math.PI * 2); ctx.fill();
        // Inner circle
        ctx.shadowBlur = 0; ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(canvas.width/2, canvas.height - 80, 10, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Color indicator dots around player
        colors.forEach((c, idx) => {
            const angle = (idx / colors.length) * Math.PI * 2 - Math.PI / 2;
            const dotX = canvas.width/2 + Math.cos(angle) * 28;
            const dotY = canvas.height - 80 + Math.sin(angle) * 28;
            ctx.save(); ctx.globalAlpha = idx === playerColorIdx ? 1 : 0.3;
            ctx.shadowColor = c; ctx.shadowBlur = idx === playerColorIdx ? 12 : 0;
            ctx.fillStyle = c; ctx.beginPath(); ctx.arc(dotX, dotY, 5, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });

        // Walls
        for (let i = walls.length - 1; i >= 0; i--) {
            const w = walls[i]; w.y += speed;
            ctx.save(); ctx.shadowColor = w.color; ctx.shadowBlur = 10;
            ctx.fillStyle = w.color; ctx.fillRect(0, w.y, canvas.width, w.h);
            ctx.restore();

            const hitZone = canvas.height - 98;
            if (w.y + w.h > hitZone && w.y < hitZone + 36) {
                if (w.color !== pColor) { burst(particles, canvas.width/2, canvas.height - 80, '#ff0055', 20); return endGame(); }
                else if (!w.passed) { w.passed = true; currentScore++; scoreDisplay.innerText = currentScore; }
            }
            if (w.y > canvas.height) walls.splice(i, 1);
        }
    }
    animationId = requestAnimationFrame(loop);
}

/* ──────────────────────────────────────────
   GAME 9 ── PONG SOLO
────────────────────────────────────────── */
function initPong() {
    let paddle = { x: canvas.width/2 - 35, y: canvas.height - 28, w: 70, h: 12 };
    let ball = { x: canvas.width/2, y: canvas.height/2, r: 9, dx: 3.5, dy: 4 };
    let particles = [], frame = 0;
    let trail = [];

    function loop() {
        if (isGameOver) return;
        animationId = requestAnimationFrame(loop);
        frame++;

        if (tapped) {
            const spd = 22 + Math.min(currentScore * 0.5, 20);
            if (tappedSide === 'left')  paddle.x = Math.max(0, paddle.x - spd);
            if (tappedSide === 'right') paddle.x = Math.min(canvas.width - paddle.w, paddle.x + spd);
            tapped = false;
        }

        ball.x += ball.dx; ball.y += ball.dy;

        // Wall bounces
        if (ball.x - ball.r <= 0) { ball.x = ball.r; ball.dx = Math.abs(ball.dx); burst(particles, ball.x, ball.y, '#00b4ff', 5); }
        if (ball.x + ball.r >= canvas.width) { ball.x = canvas.width - ball.r; ball.dx = -Math.abs(ball.dx); burst(particles, ball.x, ball.y, '#00b4ff', 5); }
        if (ball.y - ball.r <= 0) { ball.y = ball.r; ball.dy = Math.abs(ball.dy); burst(particles, ball.x, ball.y, '#b145e9', 5); }

        // Paddle bounce
        if (ball.y + ball.r >= paddle.y && ball.y - ball.r < paddle.y + paddle.h &&
            ball.x >= paddle.x - 4 && ball.x <= paddle.x + paddle.w + 4) {
            const hitPos = (ball.x - paddle.x) / paddle.w; // 0-1
            ball.dx = (hitPos - 0.5) * 10; // Angle based on hit position
            ball.dy = -Math.abs(ball.dy) - 0.1;
            ball.y = paddle.y - ball.r;
            currentScore++; scoreDisplay.innerText = currentScore;
            burst(particles, ball.x, ball.y, '#00ffcc', 8);
            // Shrink paddle slightly
            if (currentScore % 5 === 0 && paddle.w > 30) paddle.w -= 3;
        }

        if (ball.y - ball.r > canvas.height) { burst(particles, ball.x, canvas.height, '#ff0055', 15); return endGame(); }

        // Ball trail
        trail.push({ x: ball.x, y: ball.y });
        if (trail.length > 12) trail.shift();

        drawBg('#000a1a', '#000');

        // Centre line
        ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 2; ctx.setLineDash([8,12]);
        ctx.beginPath(); ctx.moveTo(0, canvas.height/2); ctx.lineTo(canvas.width, canvas.height/2); ctx.stroke();
        ctx.setLineDash([]);

        updateParticles(particles);

        // Ball trail
        trail.forEach((t, idx) => {
            const alpha = idx / trail.length * 0.5;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ff0055';
            ctx.beginPath(); ctx.arc(t.x, t.y, ball.r * (idx / trail.length), 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Ball
        drawGlowCircle(ball.x, ball.y, ball.r, '#ff0055', 20);

        // Paddle glow
        const pGrad = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.w, paddle.y);
        pGrad.addColorStop(0, '#00aaff'); pGrad.addColorStop(0.5, '#00ffcc'); pGrad.addColorStop(1, '#00aaff');
        ctx.save(); ctx.shadowColor = '#00ffcc'; ctx.shadowBlur = 16;
        ctx.fillStyle = pGrad; ctx.beginPath(); ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 6); ctx.fill();
        ctx.restore();
    }
    animationId = requestAnimationFrame(loop);
}

/* ──────────────────────────────────────────
   GAME 10 ── TOWER STACK
────────────────────────────────────────── */
function initStack() {
    const blockH = 32;
    let blocks = [{ x: canvas.width/2 - 45, y: canvas.height - blockH - 10, w: 90, h: blockH }];
    let current = { x: 0, y: canvas.height - blockH * 2 - 10, w: 90, h: blockH, dx: 3 };
    let particles = [], frame = 0;

    const palette = ['#00ffcc','#00b4ff','#b145e9','#ffd700','#ff6b35','#ff0055'];

    function loop() {
        if (isGameOver) return;
        animationId = requestAnimationFrame(loop);
        frame++;

        current.x += current.dx;
        if (current.x <= 0 || current.x + current.w >= canvas.width) current.dx *= -1;

        if (tapped) {
            const last = blocks[blocks.length - 1];
            const overlapStart = Math.max(current.x, last.x);
            const overlapEnd   = Math.min(current.x + current.w, last.x + last.w);
            const newW = overlapEnd - overlapStart;

            if (newW <= 0) { burst(particles, current.x + current.w/2, current.y, '#ff0055', 20); return endGame('Missed!'); }

            burst(particles, overlapStart + newW/2, current.y + blockH/2, palette[currentScore % palette.length], 10);
            blocks.push({ x: overlapStart, y: current.y, w: newW, h: blockH, color: palette[currentScore % palette.length] });
            currentScore++; scoreDisplay.innerText = currentScore;

            // Scroll tower down
            let nextY = current.y - blockH;
            if (nextY < 120) { blocks.forEach(b => b.y += blockH); nextY += blockH; }

            const spd = 3 + currentScore * 0.4;
            current = { x: current.dx > 0 ? 0 : canvas.width - newW, y: nextY, w: newW, h: blockH, dx: current.dx > 0 ? spd : -spd };
            tapped = false;
        }

        drawBg('#0a0612', '#000');

        // Height guide lines
        for (let y = 0; y < canvas.height; y += blockH) {
            ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        updateParticles(particles);

        // Draw stacked blocks
        blocks.forEach((b, idx) => {
            const col = b.color || palette[idx % palette.length];
            ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 8;
            ctx.fillStyle = col;
            ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 4); ctx.fill();
            // Top shine
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.beginPath(); ctx.roundRect(b.x + 4, b.y + 4, b.w - 8, 6, 3); ctx.fill();
            ctx.restore();
        });

        // Moving block
        const mCol = palette[currentScore % palette.length];
        ctx.save(); ctx.shadowColor = mCol; ctx.shadowBlur = 16;
        ctx.fillStyle = mCol; ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.roundRect(current.x, current.y, current.w, current.h, 4); ctx.fill();
        ctx.restore();

        // Drop indicator line
        const last = blocks[blocks.length - 1];
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1; ctx.setLineDash([4,6]);
        ctx.beginPath(); ctx.moveTo(current.x + current.w/2, current.y + current.h); ctx.lineTo(current.x + current.w/2, last.y); ctx.stroke();
        ctx.setLineDash([]);
    }
    animationId = requestAnimationFrame(loop);
}

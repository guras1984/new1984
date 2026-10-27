const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('gameover-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const bombBtn = document.getElementById('bomb-btn');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const soundBtn = document.getElementById('sound-btn');
const pauseOverlay = document.getElementById('pause-overlay');
const bestScoreEl = document.getElementById('best-score');
const stageProgressFill = document.getElementById('stage-progress-fill');
const comboEl = document.getElementById('combo');
const finalComboEl = document.getElementById('final-combo');
const finalKillsEl = document.getElementById('final-kills');
const planeCards = document.querySelectorAll('.plane-card');
const difficultyCards = document.querySelectorAll('.difficulty-card');

const stageEl = document.getElementById('stage');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const bombsEl = document.getElementById('bombs');
const spreadEl = document.getElementById('spread');
const missilesEl = document.getElementById('missiles');
const finalScoreEl = document.getElementById('final-score');
const gameOverTitle = document.getElementById('gameover-title');
const rankNicknameEl = document.getElementById('rank-nickname');
const submitRankBtn = document.getElementById('submit-rank-btn');
const rankStatusEl = document.getElementById('rank-status');
const rankingListEl = document.getElementById('ranking-list');

// Google Apps Script 웹 앱을 배포한 뒤 이 주소를 /exec URL로 바꾸세요.
const RANKING_API_URL = 'https://script.google.com/macros/s/AKfycbwNHC8b70SXTPx9qM7xEFHgkib94re0xhVQ75QCKmQBVphYbYpNT4VaL2KUSaIB-tUpAA/exec';

const stageBanner = document.getElementById('stage-banner');
const bannerTitle = document.getElementById('banner-title');
const bannerDesc = document.getElementById('banner-desc');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let selectedPlaneType = 'standard';
let selectedDifficulty = 'normal';
const difficultySettings = {
    easy:   { spawnInterval: 1.28, enemySpeed: 0.78, enemyHp: 0.75, bossHp: 0.78, lives: 5, bulletSpeed: 0.78 },
    normal: { spawnInterval: 1.00, enemySpeed: 1.00, enemyHp: 1.00, bossHp: 1.00, lives: 3, bulletSpeed: 1.00 },
    hard:   { spawnInterval: 0.78, enemySpeed: 1.28, enemyHp: 1.35, bossHp: 1.45, lives: 2, bulletSpeed: 1.25 }
};

planeCards.forEach(card => {
    card.addEventListener('click', () => {
        planeCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedPlaneType = card.dataset.plane;
    });
});

difficultyCards.forEach(card => {
    card.addEventListener('click', () => {
        difficultyCards.forEach(c => {
            c.classList.remove('selected');
            c.setAttribute('aria-pressed', 'false');
        });
        card.classList.add('selected');
        card.setAttribute('aria-pressed', 'true');
        selectedDifficulty = card.dataset.difficulty;
    });
});

function getDifficulty() {
    return difficultySettings[selectedDifficulty] || difficultySettings.normal;
}

let audioCtx = null;
let soundMuted = false;
let isManuallyPaused = false;
let bestScore = 0;
try { bestScore = Number(localStorage.getItem('skyRaiders84Best') || 0); } catch (e) { bestScore = 0; }
if (bestScoreEl) bestScoreEl.textContent = bestScore.toLocaleString('ko-KR');
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!audioCtx || soundMuted) return;
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'shoot') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(700, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
            osc.start(); osc.stop(audioCtx.currentTime + 0.08);
        } else if (type === 'hit') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            osc.start(); osc.stop(audioCtx.currentTime + 0.15);
        } else if (type === 'item') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            osc.start(); osc.stop(audioCtx.currentTime + 0.15);
        } else if (type === 'bomb') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(100, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(15, audioCtx.currentTime + 0.7);
            gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.7);
            osc.start(); osc.stop(audioCtx.currentTime + 0.7);
        } else if (type === 'stageUp') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.4);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            osc.start(); osc.stop(audioCtx.currentTime + 0.4);
        }
    } catch(e) {}
}

let gameInterval;
let score = 0;
let lives = 3;
let bombs = 2;
let bulletCount = 1;
let power = 0;
let currentStage = 1;
let stageScore = 0;
let combo = 0, bestCombo = 0, kills = 0, comboTimer = 0, hitCooldown = 0;
let missiles = [];
let missileAmmo = 0;
let shieldHits = 0;
const SCORE_PER_STAGE = 3000;
let isPausedForBanner = false;

let player = {
    x: canvas.width / 2,
    y: canvas.height - 60,
    size: 30,
    speed: 6.5,
    icon: '✈️',
    shield: false
};

let bullets = [];
let enemyBullets = [];
let enemies = [];
let items = [];
let particles = [];
let stars = [];
let boss = null;
let bombEffectTimer = 0;

for(let i=0; i<60; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2.5 + 0.8,
        speed: Math.random() * 3 + 1,
        alpha: Math.random() * 0.7 + 0.3
    });
}

let keys = {};
let mouseX = player.x;
let mouseY = player.y;
let isMouseDown = false;

window.addEventListener('keydown', e => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    if ((e.code === 'KeyP' || e.code === 'Escape') && !gameScreen.classList.contains('hidden')) togglePause();
    if (e.code === 'KeyM') toggleSound();
    keys[e.code] = true;
}, { passive: false });
window.addEventListener('keyup', e => keys[e.code] = false);
window.addEventListener('blur', () => { keys = {}; if (!gameScreen.classList.contains('hidden')) setPaused(true); });

function setPaused(paused) {
    isManuallyPaused = paused;
    pauseOverlay.classList.toggle('hidden', !paused);
    pauseBtn.setAttribute('aria-pressed', String(paused));
    pauseBtn.innerHTML = paused ? '▶ <span>RESUME</span>' : 'Ⅱ <span>PAUSE</span>';
}
function togglePause() {
    if (isPausedForBanner || gameScreen.classList.contains('hidden')) return;
    setPaused(!isManuallyPaused);
}
function toggleSound() {
    soundMuted = !soundMuted;
    soundBtn.setAttribute('aria-pressed', String(soundMuted));
    soundBtn.innerHTML = soundMuted ? '× <span>MUTED</span>' : '♫ <span>SOUND</span>';
}

canvas.addEventListener('mousemove', e => {
    if (isPausedForBanner) return;
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
    isMouseDown = true;
});

canvas.addEventListener('touchmove', e => {
    if (isPausedForBanner) return;
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    isMouseDown = true;
    e.preventDefault();
}, { passive: false });
canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') {
        const rect = canvas.getBoundingClientRect();
        mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
        isMouseDown = true;
    }
});
canvas.addEventListener('pointermove', e => {
    if (e.pointerType !== 'touch' || isPausedForBanner) return;
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
});

function getPlaneIcon(type) {
    switch(type) {
        case 'standard': return 'F';
        case 'jet': return 'V';
        case 'propeller': return 'W';
        case 'cruiser': return 'P';
        case 'copter': return 'A';
        default: return 'F';
    }
}

function getPlaneColor(type) {
    switch(type) {
        case 'standard': return { base: '#9daeb8', high: '#f0f3e9', accent: '#d7b875' };
        case 'jet': return { base: '#b75a50', high: '#f4b4a4', accent: '#f2d7a0' };
        case 'propeller': return { base: '#3d788b', high: '#a8e4ed', accent: '#d7b875' };
        case 'cruiser': return { base: '#716e9d', high: '#d0c9f5', accent: '#8cecff' };
        case 'copter': return { base: '#4c8574', high: '#b3e0c9', accent: '#d7b875' };
        default: return { base: '#9daeb8', high: '#f0f3e9', accent: '#d7b875' };
    }
}

// 화려한 파티클 생성 함수
function createParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 4 + 2,
            color: color,
            alpha: 1,
            decay: Math.random() * 0.03 + 0.02
        });
    }
}

function startGame() {
    initAudio();
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    stageBanner.classList.add('hidden');

    score = 0;
    lives = getDifficulty().lives;
    bombs = 2;
    bulletCount = 1;
    power = 0;
    currentStage = 1;
    stageScore = 0;
    combo = 0; bestCombo = 0; kills = 0; comboTimer = 0; hitCooldown = 0;
    bullets = [];
    enemyBullets = [];
    enemies = [];
    items = [];
    particles = [];
    boss = null;
    bombEffectTimer = 0;
    isPausedForBanner = false;
    shootTimer = 0; spawnTimer = 0;
    isMouseDown = false;
    setPaused(false);

    player.icon = getPlaneIcon(selectedPlaneType);
    player.x = canvas.width / 2;
    player.y = canvas.height - 80;
    player.shield = false;
    shieldHits = 0;
    missileAmmo = 0;
    missiles = [];

    updateHUD();
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(updateGame, 1000 / 60);
}

function updateHUD() {
    stageEl.textContent = currentStage;
    scoreEl.textContent = score.toLocaleString('ko-KR');
    if (stageProgressFill) stageProgressFill.style.width = `${Math.min(100, stageScore / SCORE_PER_STAGE * 100)}%`;
    livesEl.textContent = lives;
    bombsEl.textContent = bombs;
    spreadEl.textContent = Math.min(9, bulletCount + Math.floor(power / 2));
    if (missilesEl) missilesEl.textContent = missileAmmo;
    if (comboEl) comboEl.textContent = combo.toLocaleString('ko-KR');
}

let shootTimer = 0;
function handleShooting() {
    shootTimer++;
    if (shootTimer % Math.max(4, 9 - power) === 0) {
        playSound('shoot');
        let count = Math.min(9, bulletCount + Math.floor(power / 2));
        
        bullets.push({x: player.x, y: player.y - 20, vy: -14, vx: 0, size: 6, color: '#60a5fa'});

        for (let i = 1; i <= Math.floor(count / 2); i++) {
            bullets.push({x: player.x - (i * 14), y: player.y - 10, vy: -14, vx: -i * 0.6, size: 5, color: '#3b82f6'});
            bullets.push({x: player.x + (i * 14), y: player.y - 10, vy: -14, vx: i * 0.6, size: 5, color: '#3b82f6'});
        }
        if (count % 2 === 0 && count > 0) {
            bullets.push({x: player.x - 28, y: player.y, vy: -13, vx: -1.2, size: 5, color: '#1d4ed8'});
            bullets.push({x: player.x + 28, y: player.y, vy: -13, vx: 1.2, size: 5, color: '#1d4ed8'});
        }
    }
    // 일반 탄환의 발사 속도와 별개로 유도탄은 일정 간격으로 발사됩니다.
    if (missileAmmo > 0 && shootTimer % 45 === 0) {
        missileAmmo--;
        missiles.push({ x: player.x, y: player.y - 12, vx: 0, vy: -3, speed: 5.2, damage: 8 + power * 2, trail: [] });
        playSound('item');
        updateHUD();
    }
}

// 적 생성 및 탄막 발사 패턴
let spawnTimer = 0;
function handleEnemies() {
    if (boss) {
        // 보스 탄막 공격 (시간차 발사)
        if (shootTimer % 35 === 0) {
            const aimAngle = Math.atan2(player.y - (boss.y + 20), player.x - boss.x);
            const bulletScale = getDifficulty().bulletSpeed;
            enemyBullets.push({x:boss.x, y:boss.y+20, vx:Math.cos(aimAngle)*3.2*bulletScale, vy:Math.sin(aimAngle)*3.2*bulletScale, size:6, color:'#f1dca8'});
            for (let i = -2; i <= 2; i++) {
                enemyBullets.push({
                    x: boss.x,
                    y: boss.y + 20,
                    vx: i * 1.5 * getDifficulty().bulletSpeed,
                    vy: 4.5 * getDifficulty().bulletSpeed,
                    size: 5,
                    color: '#f87171'
                });
            }
        }
        return;
    }

    if (stageScore >= SCORE_PER_STAGE) {
        spawnBoss();
        return;
    }

    spawnTimer++;
    const difficulty = getDifficulty();
    const spawnRate = Math.max(12, (35 - (currentStage * 0.3)) * difficulty.spawnInterval);
    if (spawnTimer % Math.floor(spawnRate) === 0) {
        const patterns = ['straight', 'wave', 'zigzag', 'dive'];
        const enemyTypes = [
            { type: 'interceptor', base: '#a83f3b', high: '#ffc1a8', accent: '#ffe2a8' },
            { type: 'bomber', base: '#7e4a34', high: '#f0b88a', accent: '#ffd166' },
            { type: 'drone', base: '#5e6577', high: '#c6d1df', accent: '#fca5a5' },
            { type: 'stealth', base: '#465e68', high: '#a8d0d5', accent: '#ff8c69' }
        ];
        const chosenPattern = patterns[Math.floor(Math.random() * patterns.length)];
        const chosenType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        const x = Math.random() * (canvas.width - 60) + 30;
        enemies.push({
            x, y: -35, startX: x, size: 28,
            speed: ((Math.random() * 1.8 + 1.5) + (currentStage * 0.025)) * difficulty.enemySpeed,
            hp: Math.max(1, Math.ceil((1 + Math.floor(currentStage / 18)) * difficulty.enemyHp)),
            type: chosenType.type,
            colors: { base: chosenType.base, high: chosenType.high, accent: chosenType.accent },
            pattern: chosenPattern, angle: Math.random() * Math.PI * 2
        });
    }
}

function spawnBoss() {
    enemies = [];
    const bossIcons = ['👾', '🐉', '🤖', '👽', '💀', '👑', '🛸', '🔥'];
    const bossNames = ['가고일 군주', '네더 드래곤', '메카닉 가디언', '외계인 마스터', '스컬 킹', '다크 수호자', '네뷸라 크루저', '혼돈의 파괴자'];
    
    let stageIdx = (currentStage - 1) % bossIcons.length;
    boss = {
        x: canvas.width / 2,
        y: -60,
        targetY: 100,
        size: 65,
        hp: Math.round((55 + (currentStage * 15)) * getDifficulty().bossHp),
        maxHp: Math.round((55 + (currentStage * 15)) * getDifficulty().bossHp),
        icon: bossIcons[stageIdx],
        name: bossNames[Math.floor((currentStage - 1) / bossIcons.length) % bossNames.length],
        vx: 2.2 + (currentStage * 0.02)
    };
}

function triggerBomb() {
    if (bombs > 0 && !isPausedForBanner && !isManuallyPaused && !gameScreen.classList.contains('hidden')) {
        bombs--;
        playSound('bomb');
        createParticles(canvas.width / 2, canvas.height / 2, '#3b82f6', 60);
        enemies = [];
        enemyBullets = [];
        if (boss) {
            boss.hp -= 60 + (currentStage * 3);
            if (boss.hp <= 0) {
                defeatBoss();
            }
        }
        score += 500;
        stageScore += 500;
        updateHUD();
        bombEffectTimer = 55;
    }
}
bombBtn.addEventListener('click', triggerBomb);

function defeatBoss() {
    score += 2500;
    createParticles(boss.x, boss.y, '#f59e0b', 50);
    boss = null;
    stageScore = 0;
    currentStage++;
    if (stageProgressFill) stageProgressFill.style.width = '0%';

    if (currentStage > 100) {
        gameClear();
        return;
    }

    playSound('stageUp');
    isPausedForBanner = true;
    bannerTitle.textContent = `STAGE ${currentStage - 1} CLEAR!`;
    bannerDesc.textContent = `다음 스테이지 ${currentStage} (으)로 진입합니다.`;
    stageBanner.classList.remove('hidden');

    setTimeout(() => {
        stageBanner.classList.add('hidden');
        isPausedForBanner = false;
        updateHUD();
    }, 2200);
}

// 3D 입체감 효과 렌더링 헬퍼 함수
function draw3DShape(ctx, x, y, radius, baseColor, highlightColor, icon) {
    let grad = ctx.createRadialGradient(x - radius/3, y - radius/3, radius/6, x, y, radius);
    grad.addColorStop(0, highlightColor);
    grad.addColorStop(0.7, baseColor);
    grad.addColorStop(1, '#020617');

    ctx.save();
    ctx.shadowColor = 'rgba(59, 130, 246, 0.6)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.font = `${Math.floor(radius * 1.3)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, x, y + 1);
}

// 1984-inspired vector aircraft: layered fuselage, swept wings, cockpit and engine glow.
function drawAircraft(x, y, scale, colors, enemy = false, variant = 'standard') {
    ctx.save(); ctx.translate(x, y); if (enemy) ctx.rotate(Math.PI); ctx.scale(scale, scale);
    const base = colors.base || '#9daeb8', hi = colors.high || '#f0f3e9', accent = colors.accent || '#d7b875';
    if (!enemy) {
        // Animated twin engine flames trail behind the player's aircraft.
        // The flicker is based on the current time so it animates smoothly without extra timers.
        const flicker = (Math.sin(Date.now() / 48) + 1) / 2;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const glow = ctx.createRadialGradient(0, 23, 1, 0, 23, 31);
        glow.addColorStop(0, '#ffbd55aa'); glow.addColorStop(0.45, '#ff6b35aa'); glow.addColorStop(1, '#ff3b2500');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.ellipse(0, 22, 17, 31, 0, 0, Math.PI*2); ctx.fill();
        // Two layered flame tongues behind the engine nozzles.
        for (const ex of [-7, 7]) {
            const length = 12 + flicker * 9 + (ex < 0 ? 2 : 0);
            ctx.shadowColor = '#ff7b32'; ctx.shadowBlur = 12;
            ctx.fillStyle = '#ff5a2a';
            ctx.beginPath(); ctx.moveTo(ex - 3, 14); ctx.quadraticCurveTo(ex - 4, 20 + flicker * 3, ex, 14 + length); ctx.quadraticCurveTo(ex + 4, 20 + flicker * 2, ex + 3, 14); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#ffd36a';
            ctx.beginPath(); ctx.moveTo(ex - 1.7, 14); ctx.quadraticCurveTo(ex - 2, 20, ex, 17 + length * 0.68); ctx.quadraticCurveTo(ex + 2, 20, ex + 1.7, 14); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#d9faff'; ctx.shadowColor = '#8cecff'; ctx.shadowBlur = 8;
            ctx.fillRect(ex - 1.1, 12, 2.2, 5);
        }
        ctx.restore();
    }
    ctx.shadowColor = enemy ? '#ef7160' : '#8cecff'; ctx.shadowBlur = 8;
    // swept wings
    ctx.beginPath();
    if (enemy) {
        ctx.moveTo(0,-16); ctx.lineTo(25,-4); ctx.lineTo(19,5); ctx.lineTo(8,2); ctx.lineTo(5,14); ctx.lineTo(-5,14); ctx.lineTo(-8,2); ctx.lineTo(-19,5); ctx.lineTo(-25,-4);
    } else if (variant === 'jet') {
        ctx.moveTo(0,-28); ctx.lineTo(5,-7); ctx.lineTo(17,5); ctx.lineTo(13,10); ctx.lineTo(5,6); ctx.lineTo(4,19); ctx.lineTo(8,25); ctx.lineTo(0,22); ctx.lineTo(-8,25); ctx.lineTo(-4,19); ctx.lineTo(-5,6); ctx.lineTo(-13,10); ctx.lineTo(-17,5); ctx.lineTo(-5,-7);
    } else if (variant === 'propeller') {
        ctx.moveTo(0,-22); ctx.lineTo(7,-7); ctx.lineTo(27,2); ctx.lineTo(25,12); ctx.lineTo(8,8); ctx.lineTo(6,17); ctx.lineTo(12,23); ctx.lineTo(0,20); ctx.lineTo(-12,23); ctx.lineTo(-6,17); ctx.lineTo(-8,8); ctx.lineTo(-25,12); ctx.lineTo(-27,2); ctx.lineTo(-7,-7);
    } else if (variant === 'cruiser') {
        ctx.moveTo(0,-24); ctx.lineTo(11,-7); ctx.lineTo(31,8); ctx.lineTo(28,15); ctx.lineTo(7,8); ctx.lineTo(5,18); ctx.lineTo(10,25); ctx.lineTo(0,22); ctx.lineTo(-10,25); ctx.lineTo(-5,18); ctx.lineTo(-7,8); ctx.lineTo(-28,15); ctx.lineTo(-31,8); ctx.lineTo(-11,-7);
    } else {
        ctx.moveTo(0,-25); ctx.lineTo(8,-5); ctx.lineTo(24,7); ctx.lineTo(22,12); ctx.lineTo(7,7); ctx.lineTo(5,17); ctx.lineTo(10,22); ctx.lineTo(10,25); ctx.lineTo(0,22); ctx.lineTo(-10,25); ctx.lineTo(-10,22); ctx.lineTo(-5,17); ctx.lineTo(-7,7); ctx.lineTo(-22,12); ctx.lineTo(-24,7); ctx.lineTo(-8,-5);
    }
    ctx.closePath(); ctx.fillStyle = base; ctx.fill(); ctx.lineWidth=1; ctx.strokeStyle=hi; ctx.stroke();
    // central fuselage
    ctx.beginPath(); ctx.moveTo(0,-27); ctx.lineTo(4,-13); ctx.lineTo(4,12); ctx.lineTo(0,22); ctx.lineTo(-4,12); ctx.lineTo(-4,-13); ctx.closePath();
    const metal=ctx.createLinearGradient(-5,0,5,0); metal.addColorStop(0,'#263743'); metal.addColorStop(.45,hi); metal.addColorStop(1,base);
    ctx.fillStyle=metal; ctx.fill(); ctx.strokeStyle='#edf4f2'; ctx.stroke();
    // cockpit
    ctx.beginPath(); ctx.moveTo(0,-20); ctx.lineTo(2.7,-12); ctx.lineTo(2.3,-6); ctx.lineTo(-2.3,-6); ctx.lineTo(-2.7,-12); ctx.closePath();
    ctx.fillStyle=enemy?'#ffb09b':'#8cecff'; ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=7; ctx.fill(); ctx.shadowBlur=0;
    ctx.strokeStyle=accent; ctx.lineWidth=.8; ctx.beginPath(); ctx.moveTo(-15,7);ctx.lineTo(-7,10);ctx.moveTo(15,7);ctx.lineTo(7,10);ctx.stroke();
    if (variant==='copter') { ctx.strokeStyle=hi;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-13,-20);ctx.lineTo(13,-20);ctx.moveTo(0,-20);ctx.lineTo(0,-25);ctx.stroke(); }
    ctx.restore();
}

function drawEnemyAircraft(x, y, type, colors) {
    // 적기는 아이템의 네모 상자와 헷갈리지 않도록 각진 기체 실루엣으로 표현합니다.
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI); // 적기는 화면 아래쪽을 향함
    const base = colors.base, hi = colors.high, accent = colors.accent;
    ctx.shadowColor = accent; ctx.shadowBlur = 9;
    ctx.beginPath();
    if (type === 'bomber') {
        ctx.moveTo(0,-18); ctx.lineTo(10,-8); ctx.lineTo(30,1); ctx.lineTo(28,10); ctx.lineTo(8,7); ctx.lineTo(7,15); ctx.lineTo(-7,15); ctx.lineTo(-8,7); ctx.lineTo(-28,10); ctx.lineTo(-30,1); ctx.lineTo(-10,-8);
    } else if (type === 'drone') {
        ctx.moveTo(0,-24); ctx.lineTo(18,-2); ctx.lineTo(22,12); ctx.lineTo(8,8); ctx.lineTo(0,17); ctx.lineTo(-8,8); ctx.lineTo(-22,12); ctx.lineTo(-18,-2);
    } else if (type === 'stealth') {
        ctx.moveTo(0,-27); ctx.lineTo(7,-8); ctx.lineTo(29,10); ctx.lineTo(15,8); ctx.lineTo(5,15); ctx.lineTo(0,21); ctx.lineTo(-5,15); ctx.lineTo(-15,8); ctx.lineTo(-29,10); ctx.lineTo(-7,-8);
    } else {
        ctx.moveTo(0,-25); ctx.lineTo(5,-9); ctx.lineTo(26,5); ctx.lineTo(20,11); ctx.lineTo(7,7); ctx.lineTo(5,16); ctx.lineTo(-5,16); ctx.lineTo(-7,7); ctx.lineTo(-20,11); ctx.lineTo(-26,5); ctx.lineTo(-5,-9);
    }
    ctx.closePath(); ctx.fillStyle=base; ctx.fill(); ctx.lineWidth=1.3; ctx.strokeStyle=hi; ctx.stroke();
    // cockpit, weapon pods and engine lights
    ctx.shadowBlur=4; ctx.fillStyle=accent; ctx.beginPath(); ctx.moveTo(0,-17); ctx.lineTo(4,-7); ctx.lineTo(0,-3); ctx.lineTo(-4,-7); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#ff785e';
    if (type === 'bomber') { ctx.fillRect(-19,3,5,4); ctx.fillRect(14,3,5,4); }
    else { ctx.fillRect(-8,9,3,5); ctx.fillRect(5,9,3,5); }
    ctx.restore();
}

function updateGame() {
    if (isPausedForBanner || isManuallyPaused) return;

    if (isMouseDown) {
        player.x += (mouseX - player.x) * 0.2;
        player.y += (mouseY - player.y) * 0.2;
    }
    if (keys['ArrowLeft'] || keys['KeyA']) player.x -= player.speed;
    if (keys['ArrowRight'] || keys['KeyD']) player.x += player.speed;
    if (keys['ArrowUp'] || keys['KeyW']) player.y -= player.speed;
    if (keys['ArrowDown'] || keys['KeyS']) player.y += player.speed;

    if (hitCooldown > 0) hitCooldown--;
    if (comboTimer > 0) { comboTimer--; if (comboTimer === 0) combo = 0; }
    player.x = Math.max(24, Math.min(canvas.width - 24, player.x));
    player.y = Math.max(30, Math.min(canvas.height - 30, player.y));

    handleShooting();
    handleEnemies();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Deep-night flight grid and subtle radar lanes, inspired by 1980s arcade cabinets.
    ctx.save(); ctx.strokeStyle='rgba(130,190,220,0.055)'; ctx.lineWidth=1;
    for(let gy=30; gy<canvas.height; gy+=48){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(canvas.width,gy);ctx.stroke();}
    for(let gx=24; gx<canvas.width; gx+=48){ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,canvas.height);ctx.stroke();}
    ctx.strokeStyle='rgba(215,184,117,0.16)';ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(12,canvas.height);ctx.moveTo(canvas.width-12,0);ctx.lineTo(canvas.width-12,canvas.height);ctx.stroke();ctx.restore();
    // 우주/하늘 배경 별 렌더링
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) star.y = 0;
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // 파티클 렌더링
    particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
            particles.splice(idx, 1);
            return;
        }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    // 플레이어 총알
    bullets.forEach((b, index) => {
        b.y += b.vy;
        if (b.vx) b.x += b.vx;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();

        if (b.y < 0) bullets.splice(index, 1);
    });

    // 유도탄: 가장 가까운 적/보스를 추적하고 폭발 피해를 줍니다.
    missiles.forEach((m, index) => {
        let target = boss;
        let bestDistance = boss ? Math.hypot(boss.x - m.x, boss.y - m.y) : Infinity;
        enemies.forEach(enemy => {
            const d = Math.hypot(enemy.x - m.x, enemy.y - m.y);
            if (d < bestDistance) { bestDistance = d; target = enemy; }
        });
        if (target) {
            const angle = Math.atan2(target.y - m.y, target.x - m.x);
            const desiredVx = Math.cos(angle) * m.speed;
            const desiredVy = Math.sin(angle) * m.speed;
            m.vx += (desiredVx - m.vx) * 0.09;
            m.vy += (desiredVy - m.vy) * 0.09;
        } else {
            m.vy = Math.min(m.vy - 0.08, -2.5);
        }
        m.x += m.vx; m.y += m.vy;
        m.trail.push({x:m.x, y:m.y, a:1});
        if (m.trail.length > 5) m.trail.shift();
        m.trail.forEach((t, ti) => {
            ctx.globalAlpha = (ti + 1) / m.trail.length * 0.45;
            ctx.fillStyle = '#f1dca8'; ctx.beginPath(); ctx.arc(t.x, t.y, 2 + ti * 0.4, 0, Math.PI*2); ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(Math.atan2(m.vy, m.vx) + Math.PI/2);
        ctx.shadowColor = '#ffbd68'; ctx.shadowBlur = 12; ctx.fillStyle = '#ffe0a6';
        ctx.beginPath(); ctx.moveTo(0,-9); ctx.lineTo(4,5); ctx.lineTo(0,3); ctx.lineTo(-4,5); ctx.closePath(); ctx.fill(); ctx.restore();
        let hit = false;
        if (boss && Math.hypot(m.x - boss.x, m.y - boss.y) < 48) {
            boss.hp -= m.damage; createParticles(m.x, m.y, '#ffbd68', 16); hit = true;
            if (boss.hp <= 0) defeatBoss();
        } else {
            for (let ei = enemies.length - 1; ei >= 0; ei--) {
                const enemy = enemies[ei];
                if (Math.hypot(m.x - enemy.x, m.y - enemy.y) < 27) {
                    enemy.hp -= m.damage; createParticles(m.x, m.y, '#ffbd68', 14); hit = true;
                    if (enemy.hp <= 0) {
                        createParticles(enemy.x, enemy.y, '#f59e0b', 18); enemies.splice(ei, 1);
                        kills++; combo++; comboTimer = 150; bestCombo = Math.max(bestCombo, combo);
                        score += 200 + Math.min(500, combo * 10); stageScore += 150; updateHUD();
                    }
                    break;
                }
            }
        }
        if (hit || m.y < -30 || m.x < -30 || m.x > canvas.width+30 || m.y > canvas.height+30) missiles.splice(index, 1);
    });

    // 적 탄막 총알
    enemyBullets.forEach((eb, index) => {
        eb.x += eb.vx;
        eb.y += eb.vy;
        ctx.fillStyle = eb.color;
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, eb.size, 0, Math.PI * 2);
        ctx.fill();

        // 플레이어와 적 탄막 충돌
        if (hitCooldown <= 0 && Math.hypot(player.x - eb.x, player.y - eb.y) < 20) {
            enemyBullets.splice(index, 1);
            playSound('hit');
            createParticles(player.x, player.y, '#ef4444', 10);
            hitCooldown = 70;
            if (player.shield && shieldHits > 0) {
                shieldHits--;
                player.shield = shieldHits > 0;
            } else {
                lives--;
                updateHUD();
                if (lives <= 0) gameOver();
            }
        }

        if (eb.y > canvas.height + 20 || eb.y < -20 || eb.x < -20 || eb.x > canvas.width + 20) {
            enemyBullets.splice(index, 1);
        }
    });

    // 보스
    if (boss) {
        if (boss.y < boss.targetY) boss.y += 1.5;
        boss.x += boss.vx;
        if (boss.x < 60 || boss.x > canvas.width - 60) boss.vx *= -1;

        drawAircraft(boss.x, boss.y, 1.5, {base:'#7c444b', high:'#f0b3a2', accent:'#d7b875'}, true, 'boss');

        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fillRect(canvas.width / 2 - 120, 15, 240, 14);
        ctx.strokeStyle = '#3b82f6';
        ctx.strokeRect(canvas.width / 2 - 120, 15, 240, 14);
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(canvas.width / 2 - 120, 15, Math.max(0, (boss.hp / boss.maxHp) * 240), 14);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`[STAGE ${currentStage} BOSS] ${boss.name}`, canvas.width / 2, 37);

        if (hitCooldown <= 0 && Math.hypot(player.x - boss.x, player.y - boss.y) < 50) {
            playSound('hit');
            hitCooldown = 70;
            if (player.shield && shieldHits > 0) {
                shieldHits--;
                player.shield = shieldHits > 0;
            } else {
                lives--;
                updateHUD();
                if (lives <= 0) gameOver();
            }
        }

        bullets.forEach((b, bIndex) => {
            if (boss && Math.hypot(b.x - boss.x, b.y - boss.y) < 45) {
                bullets.splice(bIndex, 1);
                boss.hp -= (1 + Math.floor(power / 2));
                createParticles(b.x, b.y, '#f43f5e', 4);
                if (boss.hp <= 0) {
                    defeatBoss();
                }
            }
        });
    }

    // 일반 적
    enemies.forEach((enemy, eIndex) => {
        enemy.y += enemy.speed;
        
        if (enemy.pattern === 'wave') {
            enemy.angle += 0.08;
            enemy.x = enemy.startX + Math.sin(enemy.angle) * 60;
        } else if (enemy.pattern === 'zigzag') {
            enemy.angle += 0.05;
            enemy.x += Math.cos(enemy.angle) * 3;
        } else if (enemy.pattern === 'dive') {
            if (enemy.y > 200 && enemy.x < player.x) enemy.x += 1.5;
            if (enemy.y > 200 && enemy.x > player.x) enemy.x -= 1.5;
        }

        drawEnemyAircraft(enemy.x, enemy.y, enemy.type || 'interceptor', enemy.colors || {base:'#a44d4a', high:'#f2b5a1', accent:'#f4cf9b'});

        if (hitCooldown <= 0 && Math.hypot(player.x - enemy.x, player.y - enemy.y) < 28) {
            playSound('hit');
            createParticles(enemy.x, enemy.y, '#ef4444', 15);
            enemies.splice(eIndex, 1);
            hitCooldown = 70;
            if (player.shield && shieldHits > 0) {
                shieldHits--;
                player.shield = shieldHits > 0;
            } else {
                lives--;
                updateHUD();
                if (lives <= 0) gameOver();
            }
        }

        bullets.forEach((b, bIndex) => {
            if (Math.hypot(b.x - enemy.x, b.y - enemy.y) < 26) {
                bullets.splice(bIndex, 1);
                enemy.hp -= (1 + Math.floor(power / 3));
                createParticles(b.x, b.y, '#60a5fa', 5);
                if (enemy.hp <= 0) {
                    createParticles(enemy.x, enemy.y, '#f59e0b', 18);
                    enemies.splice(eIndex, 1);
                    kills++; combo++; comboTimer = 150; bestCombo = Math.max(bestCombo, combo);
                    score += 150 + Math.min(500, combo * 10);
                    stageScore += 150;
                    updateHUD();

                    // 쉬움 난이도는 아이템 드롭률을 높이고, 추가 목숨이 더 자주 나오게 한다.
                    const easyMode = selectedDifficulty === 'easy';
                    const itemDropChance = easyMode ? 0.68 : 0.40;
                    if (Math.random() < itemDropChance) {
                        const lifeItem = { type: 'life', boxColor: '#c84b59', ribbonColor: '#ffe0e4', name: '추가 목숨 +1', symbol: '+' };
                        const otherItemTypes = [
                            { type: 'shield', boxColor: '#168b91', ribbonColor: '#b9fbff', name: '방어막 충전', symbol: 'S' },
                            { type: 'missile', boxColor: '#d17a32', ribbonColor: '#ffe0a6', name: '유도탄 +3', symbol: 'M' },
                            { type: 'coin', boxColor: '#b28b3c', ribbonColor: '#fff0b3', name: '무장 확장', symbol: 'W' },
                            { type: 'power', boxColor: '#bd5149', ribbonColor: '#ffd0b8', name: '파워 업', symbol: 'P' },
                            { type: 'bomb', boxColor: '#2876a0', ribbonColor: '#bae6fd', name: '폭탄 충전', symbol: 'B' },
                            { type: 'bonus', boxColor: '#a9852b', ribbonColor: '#fef08a', name: '보너스 점수', symbol: '+' }
                        ];
                        // 쉬움: 아이템이 나왔다면 35% 확률로 추가 목숨, 나머지는 다른 아이템.
                        const chosen = easyMode && Math.random() < 0.35
                            ? lifeItem
                            : otherItemTypes[Math.floor(Math.random() * otherItemTypes.length)];
                        items.push({ x: enemy.x, y: enemy.y, vy: 1.45, phase: Math.random() * Math.PI * 2, ...chosen });
                    }
                }
            }
        });

        if (enemy.y > canvas.height + 40) {
            enemies.splice(eIndex, 1);
        }
    });

    // 아이템
    items.forEach((item, iIndex) => {
        item.y += item.vy;
        item.phase = (item.phase || 0) + 0.06;
        const bobY = Math.sin(item.phase) * 2;

        ctx.save();
        ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = item.boxColor;
        ctx.beginPath(); ctx.moveTo(item.x, item.y-16+bobY); ctx.lineTo(item.x+16,item.y+bobY); ctx.lineTo(item.x,item.y+16+bobY); ctx.lineTo(item.x-16,item.y+bobY); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = item.ribbonColor; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = item.ribbonColor;
        ctx.fillRect(item.x - 3, item.y - 12+bobY, 6, 24);
        ctx.fillRect(item.x - 12, item.y - 3+bobY, 24, 6);
        ctx.fillStyle = '#07111a'; ctx.font = 'bold 10px Orbitron, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(item.symbol || ({coin:'W',power:'P',bomb:'B',shield:'S',bonus:'+'})[item.type] || '•', item.x, item.y+bobY+1);
        ctx.restore();

        if (Math.hypot(player.x - item.x, player.y - item.y) < 28) {
            playSound('item');
            createParticles(item.x, item.y, '#38bdf8', 12);
            items.splice(iIndex, 1);
            if (item.type === 'life') {
                lives = Math.min(5, lives + 1);
                score += 100;
                createParticles(player.x, player.y, '#ff7184', 18);
            } else if (item.type === 'missile') {
                missileAmmo = Math.min(12, missileAmmo + 3);
                score += 100;
            } else if (item.type === 'coin') {
                bulletCount = Math.min(9, bulletCount + 1);
            } else if (item.type === 'power') {
                power = Math.min(5, power + 1);
            } else if (item.type === 'bomb') {
                bombs = Math.min(9, bombs + 2);
            } else if (item.type === 'shield') {
                player.shield = true;
                shieldHits = Math.min(3, shieldHits + 2);
            } else if (item.type === 'bonus') {
                score += 800;
                stageScore += 800;
            }
            updateHUD();
        }

        if (item.y > canvas.height + 40) {
            items.splice(iIndex, 1);
        }
    });

    let pColor = getPlaneColor(selectedPlaneType);
    if (hitCooldown === 0 || Math.floor(hitCooldown / 5) % 2 === 0) drawAircraft(player.x, player.y, 1.0, pColor, false, selectedPlaneType);
    if (combo >= 3 && comboTimer > 0) { ctx.save(); ctx.textAlign='center'; ctx.font='bold 13px Orbitron, sans-serif'; ctx.fillStyle='#f1dca8'; ctx.shadowColor='#d7b875'; ctx.shadowBlur=10; ctx.fillText(`${combo} HIT COMBO`, player.x, player.y + 42); ctx.restore(); }

    if (player.shield) {
        ctx.strokeStyle = '#8cecff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 31 + Math.sin(Date.now()/100)*2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.save(); ctx.fillStyle = '#b9fbff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`SHIELD ${shieldHits}`, player.x, player.y + 43); ctx.restore();
    }

    if (bombEffectTimer > 0) {
        bombEffectTimer--;
        ctx.fillStyle = bombEffectTimer % 4 < 2 ? 'rgba(59, 130, 246, 0.75)' : 'rgba(255, 255, 255, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#f1dca8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(canvas.width/2, canvas.height/2, (55-bombEffectTimer)*5, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = '#f1dca8'; ctx.font = 'bold 15px Orbitron, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('TACTICAL STRIKE', canvas.width / 2, canvas.height / 2);
    }
}

function rankingApiConfigured() {
    return RANKING_API_URL.startsWith('https://script.google.com/macros/s/') && RANKING_API_URL.endsWith('/exec');
}

function requestRankingJsonp(action, params = {}, callbackName) {
    return new Promise((resolve, reject) => {
        if (!rankingApiConfigured()) {
            reject(new Error('Google Apps Script URL을 아직 설정하지 않았습니다.'));
            return;
        }
        const callbackKey = callbackName;
        const query = new URLSearchParams({ action, callback: callbackKey, ...params, _: String(Date.now()) });
        const script = document.createElement('script');
        const cleanup = () => {
            script.remove();
            clearTimeout(timeout);
            try { delete window[callbackKey]; } catch (e) { window[callbackKey] = undefined; }
        };
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('랭킹 서버 응답 시간이 초과되었습니다.'));
        }, 12000);
        window[callbackKey] = data => {
            cleanup();
            if (data && data.ok) resolve(data);
            else reject(new Error((data && data.error) || '랭킹 요청에 실패했습니다.'));
        };
        script.onerror = () => { cleanup(); reject(new Error('랭킹 서버에 연결할 수 없습니다.')); };
        script.src = `${RANKING_API_URL}?${query.toString()}`;
        document.head.appendChild(script);
    });
}

function renderRanking(rows) {
    if (!rankingListEl) return;
    rankingListEl.replaceChildren();
    if (!rows || !rows.length) {
        const li = document.createElement('li');
        li.textContent = '아직 등록된 점수가 없습니다. 첫 기록을 남겨보세요!';
        rankingListEl.appendChild(li);
        return;
    }
    rows.slice(0, 10).forEach((row, index) => {
        const li = document.createElement('li');
        const place = document.createElement('span');
        place.className = 'rank-place';
        place.textContent = `${index + 1}.`;
        const name = document.createElement('span');
        name.className = 'rank-name';
        name.textContent = String(row.nickname || '조종사').slice(0, 12);
        const meta = document.createElement('span');
        meta.className = 'rank-meta';
        const difficultyLabels = { easy: '쉬움', normal: '보통', hard: '어려움' };
        meta.textContent = `${difficultyLabels[row.difficulty] || '보통'} · ${Number(row.score || 0).toLocaleString('ko-KR')}`;
        li.append(place, name, meta);
        rankingListEl.appendChild(li);
    });
}

async function loadOnlineRanking() {
    if (!rankStatusEl) return;
    if (!rankingApiConfigured()) {
        rankStatusEl.textContent = '설정 필요: Code.gs 배포 후 script.js의 RANKING_API_URL에 웹 앱 주소를 넣으세요.';
        if (rankingListEl) rankingListEl.innerHTML = '<li>Google Sheets 연결 후 온라인 랭킹이 표시됩니다.</li>';
        return;
    }
    rankStatusEl.textContent = '온라인 랭킹을 불러오는 중...';
    try {
        const data = await requestRankingJsonp('list', {}, 'skyRaidersRankingCallback');
        renderRanking(data.rows || []);
        rankStatusEl.textContent = '온라인 랭킹 연결됨';
    } catch (error) {
        rankStatusEl.textContent = error.message;
        if (rankingListEl) rankingListEl.innerHTML = '<li>랭킹을 불러오지 못했습니다. 잠시 후 다시 시도하세요.</li>';
    }
}

async function submitOnlineScore() {
    if (!rankNicknameEl || !submitRankBtn || !rankStatusEl) return;
    const nickname = rankNicknameEl.value.trim().replace(/[<>]/g, '').slice(0, 12);
    if (!nickname) {
        rankStatusEl.textContent = '먼저 닉네임을 입력해 주세요.';
        rankNicknameEl.focus();
        return;
    }
    if (!rankingApiConfigured()) {
        rankStatusEl.textContent = '아직 연결되지 않았어요. Code.gs를 배포하고 RANKING_API_URL을 설정해 주세요.';
        return;
    }
    try { localStorage.setItem('skyRaiders84Nickname', nickname); } catch (e) {}
    submitRankBtn.disabled = true;
    rankStatusEl.textContent = '점수를 등록하는 중...';
    try {
        await requestRankingJsonp('submit', {
            nickname,
            score: String(Math.max(0, Math.floor(score))),
            difficulty: selectedDifficulty,
            plane: selectedPlaneType,
            stage: String(Math.max(1, Math.floor(currentStage || 1))),
            kills: String(Math.max(0, Math.floor(kills || 0)))
        }, 'skyRaidersSubmitCallback');
        rankStatusEl.textContent = '점수가 등록되었습니다!';
        await loadOnlineRanking();
        rankStatusEl.textContent = '점수가 등록되었습니다!';
    } catch (error) {
        rankStatusEl.textContent = error.message;
    } finally {
        submitRankBtn.disabled = false;
    }
}

if (rankNicknameEl) {
    try { rankNicknameEl.value = localStorage.getItem('skyRaiders84Nickname') || ''; } catch (e) {}
}
if (submitRankBtn) submitRankBtn.addEventListener('click', submitOnlineScore);

function gameOver() {
    if (gameScreen.classList.contains('hidden')) return;
    playSound('hit');
    clearInterval(gameInterval);
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    gameOverTitle.textContent = "GAME OVER";
    gameOverTitle.style.color = "#ef4444";
    finalScoreEl.textContent = score.toLocaleString('ko-KR');
    if (finalComboEl) finalComboEl.textContent = bestCombo;
    if (finalKillsEl) finalKillsEl.textContent = kills;
    saveBestScore();
    loadOnlineRanking();
}

function gameClear() {
    clearInterval(gameInterval);
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    gameOverTitle.textContent = "🏆 100스테이지 디럭스 클리어 성공! 🏆";
    gameOverTitle.style.color = "#10b981";
    finalScoreEl.textContent = score.toLocaleString('ko-KR');
    if (finalComboEl) finalComboEl.textContent = bestCombo;
    if (finalKillsEl) finalKillsEl.textContent = kills;
    saveBestScore();
    loadOnlineRanking();
}

function saveBestScore() {
    if (score > bestScore) {
        bestScore = score;
        try { localStorage.setItem('skyRaiders84Best', String(bestScore)); } catch (e) {}
    }
    if (bestScoreEl) bestScoreEl.textContent = bestScore.toLocaleString('ko-KR');
}

pauseBtn.addEventListener('click', togglePause);
resumeBtn.addEventListener('click', () => setPaused(false));
soundBtn.addEventListener('click', toggleSound);
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
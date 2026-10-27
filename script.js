const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('gameover-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const bombBtn = document.getElementById('bomb-btn');
const planeCards = document.querySelectorAll('.plane-card');

const stageEl = document.getElementById('stage');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const bombsEl = document.getElementById('bombs');
const spreadEl = document.getElementById('spread');
const finalScoreEl = document.getElementById('final-score');
const gameOverTitle = document.getElementById('gameover-title');

const stageBanner = document.getElementById('stage-banner');
const bannerTitle = document.getElementById('banner-title');
const bannerDesc = document.getElementById('banner-desc');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let selectedPlaneType = 'standard';

planeCards.forEach(card => {
    card.addEventListener('click', () => {
        planeCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedPlaneType = card.dataset.plane;
    });
});

let audioCtx = null;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!audioCtx) return;
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
let currentStage = 1;
let stageScore = 0;
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

window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

canvas.addEventListener('mousemove', e => {
    if (isPausedForBanner) return;
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    isMouseDown = true;
});

canvas.addEventListener('touchmove', e => {
    if (isPausedForBanner) return;
    const rect = canvas.getBoundingClientRect();
    mouseX = e.touches[0].clientX - rect.left;
    mouseY = e.touches[0].clientY - rect.top;
    isMouseDown = true;
    e.preventDefault();
}, { passive: false });

function getPlaneIcon(type) {
    switch(type) {
        case 'standard': return '✈️';
        case 'jet': return '🚀';
        case 'propeller': return '🛩️';
        case 'cruiser': return '🛸';
        case 'copter': return '🚁';
        default: return '✈️';
    }
}

function getPlaneColor(type) {
    switch(type) {
        case 'standard': return { base: '#2563eb', high: '#93c5fd' };
        case 'jet': return { base: '#dc2626', high: '#fca5a5' };
        case 'propeller': return { base: '#0284c7', high: '#7dd3fc' };
        case 'cruiser': return { base: '#7c3aed', high: '#c4b5fd' };
        case 'copter': return { base: '#059669', high: '#6ee7b7' };
        default: return { base: '#2563eb', high: '#93c5fd' };
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
    lives = 3;
    bombs = 2;
    bulletCount = 1;
    currentStage = 1;
    stageScore = 0;
    bullets = [];
    enemyBullets = [];
    enemies = [];
    items = [];
    particles = [];
    boss = null;
    bombEffectTimer = 0;
    isPausedForBanner = false;

    player.icon = getPlaneIcon(selectedPlaneType);
    player.x = canvas.width / 2;
    player.y = canvas.height - 80;
    player.shield = false;

    updateHUD();
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(updateGame, 1000 / 60);
}

function updateHUD() {
    stageEl.textContent = currentStage;
    scoreEl.textContent = score;
    livesEl.textContent = lives;
    bombsEl.textContent = bombs;
    spreadEl.textContent = bulletCount;
}

let shootTimer = 0;
function handleShooting() {
    shootTimer++;
    if (shootTimer % 9 === 0) {
        playSound('shoot');
        let count = bulletCount;
        
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
}

// 적 생성 및 탄막 발사 패턴
let spawnTimer = 0;
function handleEnemies() {
    if (boss) {
        // 보스 탄막 공격 (시간차 발사)
        if (shootTimer % 35 === 0) {
            for (let i = -2; i <= 2; i++) {
                enemyBullets.push({
                    x: boss.x,
                    y: boss.y + 20,
                    vx: i * 1.5,
                    vy: 4.5,
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
    let spawnRate = Math.max(14, 35 - (currentStage * 0.3));
    if (spawnTimer % Math.floor(spawnRate) === 0) {
        const monsters = ['👾', '🛸', '🦇', '👻', '🐉', '🤖', '👽', '☄️'];
        const patterns = ['straight', 'wave', 'zigzag', 'dive'];
        let chosenPattern = patterns[Math.floor(Math.random() * patterns.length)];

        enemies.push({
            x: Math.random() * (canvas.width - 60) + 30,
            y: -30,
            startX: Math.random() * (canvas.width - 60) + 30,
            size: 28,
            speed: (Math.random() * 1.8 + 1.5) + (currentStage * 0.025),
            hp: 1 + Math.floor(currentStage / 18),
            icon: monsters[Math.floor(Math.random() * monsters.length)],
            pattern: chosenPattern,
            angle: Math.random() * Math.PI * 2
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
        hp: 55 + (currentStage * 15),
        maxHp: 55 + (currentStage * 15),
        icon: bossIcons[stageIdx],
        name: bossNames[Math.floor((currentStage - 1) / bossIcons.length) % bossNames.length],
        vx: 2.2 + (currentStage * 0.02)
    };
}

function triggerBomb() {
    if (bombs > 0 && !isPausedForBanner) {
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

function updateGame() {
    if (isPausedForBanner) return;

    if (isMouseDown) {
        player.x += (mouseX - player.x) * 0.2;
        player.y += (mouseY - player.y) * 0.2;
    }
    if (keys['ArrowLeft'] || keys['KeyA']) player.x -= player.speed;
    if (keys['ArrowRight'] || keys['KeyD']) player.x += player.speed;
    if (keys['ArrowUp'] || keys['KeyW']) player.y -= player.speed;
    if (keys['ArrowDown'] || keys['KeyS']) player.y += player.speed;

    player.x = Math.max(20, Math.min(canvas.width - 20, player.x));
    player.y = Math.max(20, Math.min(canvas.height - 20, player.y));

    handleShooting();
    handleEnemies();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
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

    // 적 탄막 총알
    enemyBullets.forEach((eb, index) => {
        eb.x += eb.vx;
        eb.y += eb.vy;
        ctx.fillStyle = eb.color;
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, eb.size, 0, Math.PI * 2);
        ctx.fill();

        // 플레이어와 적 탄막 충돌
        if (Math.hypot(player.x - eb.x, player.y - eb.y) < 20) {
            enemyBullets.splice(index, 1);
            playSound('hit');
            createParticles(player.x, player.y, '#ef4444', 10);
            if (player.shield) {
                player.shield = false;
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

        draw3DShape(ctx, boss.x, boss.y, 35, '#7c3aed', '#c4b5fd', boss.icon);

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

        if (Math.hypot(player.x - boss.x, player.y - boss.y) < 50) {
            playSound('hit');
            if (player.shield) {
                player.shield = false;
            } else {
                lives--;
                updateHUD();
                if (lives <= 0) gameOver();
            }
        }

        bullets.forEach((b, bIndex) => {
            if (Math.hypot(b.x - boss.x, b.y - boss.y) < 45) {
                bullets.splice(bIndex, 1);
                boss.hp--;
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

        draw3DShape(ctx, enemy.x, enemy.y, 22, '#334155', '#94a3b8', enemy.icon);

        if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < 28) {
            playSound('hit');
            createParticles(enemy.x, enemy.y, '#ef4444', 15);
            enemies.splice(eIndex, 1);
            if (player.shield) {
                player.shield = false;
            } else {
                lives--;
                updateHUD();
                if (lives <= 0) gameOver();
            }
        }

        bullets.forEach((b, bIndex) => {
            if (Math.hypot(b.x - enemy.x, b.y - enemy.y) < 26) {
                bullets.splice(bIndex, 1);
                enemy.hp--;
                createParticles(b.x, b.y, '#60a5fa', 5);
                if (enemy.hp <= 0) {
                    createParticles(enemy.x, enemy.y, '#f59e0b', 18);
                    enemies.splice(eIndex, 1);
                    score += 150;
                    stageScore += 150;
                    updateHUD();

                    if (Math.random() < 0.4) {
                        const itemTypes = [
                            { type: 'coin', boxColor: '#eab308', ribbonColor: '#fef08a', name: '총알 수 증가' },
                            { type: 'power', boxColor: '#dc2626', ribbonColor: '#fca5a5', name: '파워 업' },
                            { type: 'bomb', boxColor: '#0284c7', ribbonColor: '#bae6fd', name: '폭탄 충전' },
                            { type: 'shield', boxColor: '#0d9488', ribbonColor: '#ccfbff', name: '실드' },
                            { type: 'bonus', boxColor: '#ca8a04', ribbonColor: '#fef08a', name: '보너스 점수' }
                        ];
                        const chosen = itemTypes[Math.floor(Math.random() * itemTypes.length)];
                        items.push({ x: enemy.x, y: enemy.y, vy: 1.5, ...chosen });
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

        ctx.save();
        ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = item.boxColor;
        ctx.fillRect(item.x - 14, item.y - 14, 28, 28);
        ctx.fillStyle = item.ribbonColor;
        ctx.fillRect(item.x - 4, item.y - 14, 8, 28);
        ctx.fillRect(item.x - 14, item.y - 4, 28, 8);
        ctx.restore();

        if (Math.hypot(player.x - item.x, player.y - item.y) < 28) {
            playSound('item');
            createParticles(item.x, item.y, '#38bdf8', 12);
            items.splice(iIndex, 1);
            if (item.type === 'coin') {
                bulletCount = Math.min(9, bulletCount + 1);
            } else if (item.type === 'power') {
                if (power < 5) power++;
            } else if (item.type === 'bomb') {
                bombs += 2;
            } else if (item.type === 'shield') {
                player.shield = true;
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
    draw3DShape(ctx, player.x, player.y, 24, pColor.base, pColor.high, player.icon);

    if (player.shield) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 30, 0, Math.PI * 2);
        ctx.stroke();
    }

    if (bombEffectTimer > 0) {
        bombEffectTimer--;
        ctx.fillStyle = bombEffectTimer % 4 < 2 ? 'rgba(59, 130, 246, 0.75)' : 'rgba(255, 255, 255, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#000';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("💥 DELUXE BOMB EXPLOSION 💥", canvas.width / 2, canvas.height / 2);
    }
}

function gameOver() {
    playSound('hit');
    clearInterval(gameInterval);
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    gameOverTitle.textContent = "GAME OVER";
    gameOverTitle.style.color = "#ef4444";
    finalScoreEl.textContent = score;
}

function gameClear() {
    clearInterval(gameInterval);
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    gameOverTitle.textContent = "🏆 100스테이지 디럭스 클리어 성공! 🏆";
    gameOverTitle.style.color = "#10b981";
    finalScoreEl.textContent = score;
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
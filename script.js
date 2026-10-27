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
const powerEl = document.getElementById('power');
const finalScoreEl = document.getElementById('final-score');
const gameOverTitle = document.getElementById('gameover-title');

const stageBanner = document.getElementById('stage-banner');
const bannerTitle = document.getElementById('banner-title');
const bannerDesc = document.getElementById('banner-desc');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let selectedPlaneType = 'bunny';

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
            osc.frequency.setValueAtTime(600, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
            osc.start(); osc.stop(audioCtx.currentTime + 0.08);
        } else if (type === 'hit') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(120, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
            osc.start(); osc.stop(audioCtx.currentTime + 0.12);
        } else if (type === 'item') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(500, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1100, audioCtx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            osc.start(); osc.stop(audioCtx.currentTime + 0.15);
        } else if (type === 'bomb') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(70, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.6);
            gain.gain.setValueAtTime(0.45, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
            osc.start(); osc.stop(audioCtx.currentTime + 0.6);
        } else if (type === 'stageUp') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.35);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
            osc.start(); osc.stop(audioCtx.currentTime + 0.35);
        }
    } catch(e) {}
}

let gameInterval;
let score = 0;
let lives = 3;
let bombs = 2;
let power = 1;
let currentStage = 1;
let stageScore = 0;
const SCORE_PER_STAGE = 900;
let isPausedForBanner = false;

let player = {
    x: canvas.width / 2,
    y: canvas.height - 60,
    size: 30,
    speed: 6,
    icon: '🐰',
    shield: false
};

let bullets = [];
let enemies = [];
let items = [];
let clouds = [];
let boss = null;
let bombEffectTimer = 0;

for(let i=0; i<15; i++) {
    clouds.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 40 + 20,
        speed: Math.random() * 0.8 + 0.3,
        opacity: Math.random() * 0.3 + 0.1
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
        case 'bunny': return '🐰';
        case 'duck': return '🐥';
        case 'cat': return '🐱';
        case 'bear': return '🐻';
        case 'frog': return '🐸';
        default: return '🐰';
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
    power = 1;
    currentStage = 1;
    stageScore = 0;
    bullets = [];
    enemies = [];
    items = [];
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
    powerEl.textContent = power;
}

// 미사일 발사 (최대 Lv.5)
let shootTimer = 0;
function handleShooting() {
    shootTimer++;
    if (shootTimer % 10 === 0) {
        playSound('shoot');
        let p = power;
        if (selectedPlaneType === 'bunny') {
            bullets.push({x: player.x, y: player.y - 20, vy: -12, size: 6, color: '#dc2626'});
            if (p >= 2) { bullets.push({x: player.x - 12, y: player.y - 10, vy: -12, size: 5, color: '#dc2626'}); bullets.push({x: player.x + 12, y: player.y - 10, vy: -12, size: 5, color: '#dc2626'}); }
            if (p >= 3) { bullets.push({x: player.x - 24, y: player.y, vy: -11, size: 5, color: '#b91c1c'}); bullets.push({x: player.x + 24, y: player.y, vy: -11, size: 5, color: '#b91c1c'}); }
            if (p >= 4) { bullets.push({x: player.x - 6, y: player.y - 15, vy: -13, size: 7, color: '#ef4444'}); bullets.push({x: player.x + 6, y: player.y - 15, vy: -13, size: 7, color: '#ef4444'}); }
            if (p >= 5) { bullets.push({x: player.x - 32, y: player.y + 5, vy: -10, size: 6, color: '#fff'}); bullets.push({x: player.x + 32, y: player.y + 5, vy: -10, size: 6, color: '#fff'}); }
        } else if (selectedPlaneType === 'duck') {
            bullets.push({x: player.x - 8, y: player.y - 15, vy: -11, vx: -1, size: 6, color: '#f59e0b'});
            bullets.push({x: player.x + 8, y: player.y - 15, vy: -11, vx: 1, size: 6, color: '#f59e0b'});
            if (p >= 2) { bullets.push({x: player.x - 20, y: player.y - 5, vy: -11, vx: -2, size: 5, color: '#f59e0b'}); bullets.push({x: player.x + 20, y: player.y - 5, vy: -11, vx: 2, size: 5, color: '#f59e0b'}); }
            if (p >= 3) { bullets.push({x: player.x, y: player.y - 25, vy: -12, size: 8, color: '#d97706'}); }
            if (p >= 4) { bullets.push({x: player.x - 30, y: player.y, vy: -10, vx: -3, size: 6, color: '#fef3c7'}); bullets.push({x: player.x + 30, y: player.y, vy: -10, vx: 3, size: 6, color: '#fef3c7'}); }
            if (p >= 5) { bullets.push({x: player.x - 15, y: player.y - 20, vy: -13, vx: -0.5, size: 6, color: '#fff'}); bullets.push({x: player.x + 15, y: player.y - 20, vy: -13, vx: 0.5, size: 6, color: '#fff'}); }
        } else if (selectedPlaneType === 'cat') {
            bullets.push({x: player.x, y: player.y - 20, vy: -12, vx: 0, size: 6, color: '#0284c7'});
            bullets.push({x: player.x - 15, y: player.y - 15, vy: -11, vx: -2, size: 5, color: '#0284c7'});
            bullets.push({x: player.x + 15, y: player.y - 15, vy: -11, vx: 2, size: 5, color: '#0284c7'});
            if (p >= 3) { bullets.push({x: player.x - 28, y: player.y - 10, vy: -10, vx: -4, size: 5, color: '#0369a1'}); bullets.push({x: player.x + 28, y: player.y - 10, vy: -10, vx: 4, size: 5, color: '#0369a1'}); }
            if (p >= 5) { bullets.push({x: player.x - 40, y: player.y, vy: -9, vx: -5, size: 6, color: '#fff'}); bullets.push({x: player.x + 40, y: player.y, vy: -9, vx: 5, size: 6, color: '#fff'}); }
        } else if (selectedPlaneType === 'bear') {
            bullets.push({x: player.x, y: player.y - 25, vy: -10, size: p >= 3 ? 14 : 10, color: '#9a3412'});
            if (p >= 2) { bullets.push({x: player.x - 10, y: player.y - 15, vy: -11, size: 8, color: '#7c2d12'}); bullets.push({x: player.x + 10, y: player.y - 15, vy: -11, size: 8, color: '#7c2d12'}); }
            if (p >= 4) { bullets.push({x: player.x - 20, y: player.y - 5, vy: -11, size: 9, color: '#431407'}); bullets.push({x: player.x + 20, y: player.y - 5, vy: -11, size: 9, color: '#431407'}); }
            if (p >= 5) { bullets.push({x: player.x, y: player.y - 30, vy: -14, size: 16, color: '#fff'}); }
        } else if (selectedPlaneType === 'frog') {
            bullets.push({x: player.x - 12, y: player.y - 15, vy: -12, vx: -0.5, size: 6, color: '#059669'});
            bullets.push({x: player.x + 12, y: player.y - 15, vy: -12, vx: 0.5, size: 6, color: '#059669'});
            if (p >= 2) { bullets.push({x: player.x - 25, y: player.y - 10, vy: -11, vx: -2, size: 6, color: '#047857'}); bullets.push({x: player.x + 25, y: player.y - 10, vy: -11, vx: 2, size: 6, color: '#047857'}); }
            if (p >= 4) { bullets.push({x: player.x - 38, y: player.y - 5, vy: -10, vx: -3.5, size: 6, color: '#065f46'}); bullets.push({x: player.x + 38, y: player.y - 5, vy: -10, vx: 3.5, size: 6, color: '#065f46'}); }
            if (p >= 5) { bullets.push({x: player.x, y: player.y - 25, vy: -13, size: 10, color: '#fff'}); }
        }
    }
}

// 적 생성 및 복잡한 패턴
let spawnTimer = 0;
function handleEnemies() {
    if (boss) return;

    spawnTimer++;
    let spawnRate = Math.max(12, 38 - (currentStage * 0.3));
    if (spawnTimer % spawnRate === 0) {
        // 1984 디스토피아적 무서운 적들 (사상경찰, 텔레스크린, 감시탑, 고문관 등)
        const dystopiaMonsters = ['👁️', '👮‍♂️', '📺', '🚨', '🏛️', '⚡', '⛓️', '🩸', '👁️‍🗨️', '⚠️'];
        const patterns = ['straight', 'wave', 'zigzag', 'dive'];
        let chosenPattern = patterns[Math.floor(Math.random() * patterns.length)];

        enemies.push({
            x: Math.random() * (canvas.width - 60) + 30,
            y: -30,
            startX: Math.random() * (canvas.width - 60) + 30,
            size: 28,
            speed: (Math.random() * 1.8 + 1.8) + (currentStage * 0.05),
            hp: 1 + Math.floor(currentStage / 20),
            icon: dystopiaMonsters[Math.floor(Math.random() * dystopiaMonsters.length)],
            pattern: chosenPattern,
            angle: Math.random() * Math.PI * 2
        });
    }

    if (stageScore >= SCORE_PER_STAGE) {
        spawnBoss();
    }
}

// 보스 소환 (1984 원작 기반 거대 보스들)
function spawnBoss() {
    enemies = [];
    const bossIcons = ['🟥', '👁️‍🗨️', '🏛️', '⛓️', '🚨', '👑', '☠️', '⚡'];
    const bossNames = ['사상경찰 최고사령관', '거대 텔레스크린 (빅 브라더)', '사랑부 고문실장', '진실부 장관', '사상검열관', '오브라이언의 그림자', '빅 브라더의 눈', '궁극의 영구전쟁 지배자'];
    
    let stageIdx = (currentStage - 1) % bossIcons.length;
    boss = {
        x: canvas.width / 2,
        y: -60,
        targetY: 100,
        size: 65,
        hp: 35 + (currentStage * 15),
        maxHp: 35 + (currentStage * 15),
        icon: bossIcons[stageIdx],
        name: bossNames[Math.floor((currentStage - 1) / bossIcons.length) % bossNames.length],
        vx: 2 + (currentStage * 0.05)
    };
}

// 강력한 1984 사상정화 폭탄 발사 (화면 전체 붕괴/검열 임팩트)
function triggerBomb() {
    if (bombs > 0 && !isPausedForBanner) {
        bombs--;
        playSound('bomb');
        enemies = [];
        if (boss) {
            boss.hp -= 45 + (currentStage * 2);
            if (boss.hp <= 0) {
                defeatBoss();
            }
        }
        score += 500;
        updateHUD();
        bombEffectTimer = 50; // 더 길고 강렬한 임팩트 프레임
    }
}
bombBtn.addEventListener('click', triggerBomb);

function defeatBoss() {
    score += 1500;
    boss = null;
    stageScore = 0;
    currentStage++;

    if (currentStage > 100) {
        gameClear();
        return;
    }

    playSound('stageUp');
    isPausedForBanner = true;
    bannerTitle.textContent = `STAGE ${currentStage - 1} 사상정화 완료`;
    bannerDesc.textContent = `빅 브라더의 감시를 피해 STAGE ${currentStage} (으)로 진입합니다.`;
    stageBanner.classList.remove('hidden');

    setTimeout(() => {
        stageBanner.classList.add('hidden');
        isPausedForBanner = false;
        updateHUD();
    }, 2200);
}

function updateGame() {
    if (isPausedForBanner) return;

    if (isMouseDown) {
        player.x += (mouseX - player.x) * 0.18;
        player.y += (mouseY - player.y) * 0.18;
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
    
    clouds.forEach(cloud => {
        cloud.y += cloud.speed;
        if (cloud.y > canvas.height + 50) cloud.y = -50;
        ctx.fillStyle = `rgba(255, 255, 255, ${cloud.opacity})`;
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // 총알
    bullets.forEach((b, index) => {
        b.y += b.vy;
        if (b.vx) b.x += b.vx;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();

        if (b.y < 0) bullets.splice(index, 1);
    });

    // 보스
    if (boss) {
        if (boss.y < boss.targetY) boss.y += 1.5;
        boss.x += boss.vx;
        if (boss.x < 60 || boss.x > canvas.width - 60) boss.vx *= -1;

        ctx.font = '55px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(boss.icon, boss.x, boss.y);

        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(canvas.width / 2 - 120, 15, 240, 12);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(canvas.width / 2 - 120, 15, Math.max(0, (boss.hp / boss.maxHp) * 240), 12);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`[STAGE ${currentStage} BOSS] ${boss.name}`, canvas.width / 2, 36);

        if (Math.hypot(player.x - boss.x, player.y - boss.y) < 45) {
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
            if (Math.hypot(b.x - boss.x, b.y - boss.y) < 40) {
                bullets.splice(bIndex, 1);
                boss.hp--;
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

        ctx.font = '28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(enemy.icon, enemy.x, enemy.y);

        if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < 26) {
            playSound('hit');
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
            if (Math.hypot(b.x - enemy.x, b.y - enemy.y) < 24) {
                bullets.splice(bIndex, 1);
                enemy.hp--;
                if (enemy.hp <= 0) {
                    enemies.splice(eIndex, 1);
                    score += 150;
                    stageScore += 150;
                    updateHUD();

                    // 1984 원작 기반 다양한 아이템 드랍 (선물상자 색상별)
                    if (Math.random() < 0.4) {
                        const itemTypes = [
                            { type: 'choco', boxColor: '#7c2d12', ribbonColor: '#f87171', name: '초콜릿 (파워 업)' },
                            { type: 'gin', boxColor: '#0369a1', ribbonColor: '#ffffff', name: '빅토리 진 (폭탄 충전)' },
                            { type: 'paperweight', boxColor: '#0d9488', ribbonColor: '#ccfbff', name: '유리문진 (실드)' },
                            { type: 'diary', boxColor: '#ca8a04', ribbonColor: '#b91c1c', name: '비밀 일기장 (보너스)' },
                            { type: 'cigarette', boxColor: '#334155', ribbonColor: '#f1f5f9', name: '빅토리 담배 (스피드업)' }
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

    // 아이템 (선물상자)
    items.forEach((item, iIndex) => {
        item.y += item.vy;

        ctx.fillStyle = item.boxColor;
        ctx.fillRect(item.x - 14, item.y - 14, 28, 28);
        ctx.fillStyle = item.ribbonColor;
        ctx.fillRect(item.x - 4, item.y - 14, 8, 28);
        ctx.fillRect(item.x - 14, item.y - 4, 28, 8);

        if (Math.hypot(player.x - item.x, player.y - item.y) < 28) {
            playSound('item');
            items.splice(iIndex, 1);
            if (item.type === 'choco') {
                if (power < 5) power++;
            } else if (item.type === 'gin') {
                bombs += 2;
            } else if (item.type === 'paperweight') {
                player.shield = true;
            } else if (item.type === 'diary') {
                score += 600;
                stageScore += 600;
            } else if (item.type === 'cigarette') {
                player.speed = Math.min(10, player.speed + 1);
            }
            updateHUD();
        }

        if (item.y > canvas.height + 40) {
            items.splice(iIndex, 1);
        }
    });

    // 플레이어
    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.icon, player.x, player.y);

    if (player.shield) {
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 26, 0, Math.PI * 2);
        ctx.stroke();
    }

    // 1984 원작 감성의 더욱 강력하고 압도적인 폭발/검열 임팩트 연출
    if (bombEffectTimer > 0) {
        bombEffectTimer--;
        ctx.fillStyle = bombEffectTimer % 4 < 2 ? 'rgba(185, 28, 28, 0.75)' : 'rgba(255, 255, 255, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#000';
        ctx.font = 'bold 20px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText("⚠️ BIG BROTHER IS DESTROYED ⚠️", canvas.width / 2, canvas.height / 2);
    }
}

function gameOver() {
    playSound('hit');
    clearInterval(gameInterval);
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    gameOverTitle.textContent = "GAME OVER (사상범으로 체포됨)";
    gameOverTitle.style.color = "#dc2626";
    finalScoreEl.textContent = score;
}

function gameClear() {
    clearInterval(gameInterval);
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    gameOverTitle.textContent = "🏆 100스테이지 완벽 탈출 성공! (영원한 자유) 🏆";
    gameOverTitle.style.color = "#059669";
    finalScoreEl.textContent = score;
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
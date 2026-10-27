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

// 웹 오디오 신디사이저 (효과음)
let audioCtx = null;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!audioCtx) return;
    try {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'shoot') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(500, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.08);
        } else if (type === 'hit') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'item') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
        } else if (type === 'bomb') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(100, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.4);
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.4);
        }
    } catch(e) {}
}

let gameInterval;
let score = 0;
let lives = 3;
let bombs = 1;
let power = 1;
let currentStage = 1;
let stageScore = 0;
const SCORE_PER_STAGE = 1000;

let player = {
    x: canvas.width / 2,
    y: canvas.height - 60,
    size: 30,
    speed: 5,
    icon: '🐰',
    shield: false
};

let bullets = [];
let enemies = [];
let items = [];
let stars = [];
let boss = null;
let bombEffectTimer = 0;

for(let i=0; i<40; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 2 + 0.5
    });
}

let keys = {};
let mouseX = player.x;
let mouseY = player.y;
let isMouseDown = false;

window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    isMouseDown = true;
});

canvas.addEventListener('touchmove', e => {
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

    score = 0;
    lives = 3;
    bombs = 1;
    power = 1;
    currentStage = 1;
    stageScore = 0;
    bullets = [];
    enemies = [];
    items = [];
    boss = null;
    bombEffectTimer = 0;

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

// 미사일 발사
let shootTimer = 0;
function handleShooting() {
    shootTimer++;
    if (shootTimer % 12 === 0) {
        playSound('shoot');
        if (selectedPlaneType === 'bunny') {
            bullets.push({x: player.x, y: player.y - 20, vy: -10, size: 6, color: '#ff7eb3'});
            if (power >= 2) {
                bullets.push({x: player.x - 12, y: player.y - 10, vy: -10, size: 5, color: '#ff7eb3'});
                bullets.push({x: player.x + 12, y: player.y - 10, vy: -10, size: 5, color: '#ff7eb3'});
            }
        } else if (selectedPlaneType === 'duck') {
            bullets.push({x: player.x - 8, y: player.y - 15, vy: -9, vx: -1, size: 6, color: '#ffd166'});
            bullets.push({x: player.x + 8, y: player.y - 15, vy: -9, vx: 1, size: 6, color: '#ffd166'});
            if (power >= 2) {
                bullets.push({x: player.x - 20, y: player.y - 5, vy: -9, vx: -2, size: 5, color: '#ffd166'});
                bullets.push({x: player.x + 20, y: player.y - 5, vy: -9, vx: 2, size: 5, color: '#ffd166'});
            }
        } else if (selectedPlaneType === 'cat') {
            bullets.push({x: player.x, y: player.y - 20, vy: -10, vx: 0, size: 6, color: '#a0c4ff'});
            bullets.push({x: player.x - 15, y: player.y - 15, vy: -9, vx: -2, size: 5, color: '#a0c4ff'});
            bullets.push({x: player.x + 15, y: player.y - 15, vy: -9, vx: 2, size: 5, color: '#a0c4ff'});
        } else if (selectedPlaneType === 'bear') {
            bullets.push({x: player.x, y: player.y - 25, vy: -8, size: power >= 2 ? 12 : 8, color: '#ffb703'});
        } else if (selectedPlaneType === 'frog') {
            bullets.push({x: player.x - 10, y: player.y - 15, vy: -11, size: 5, color: '#06d6a0'});
            bullets.push({x: player.x + 10, y: player.y - 15, vy: -11, size: 5, color: '#06d6a0'});
        }
    }
}

// 적 생성 (날아다니는 괴물들: 박쥐, 유령, 드래곤, 외계 괴물 등)
let spawnTimer = 0;
function handleEnemies() {
    if (boss) return;

    spawnTimer++;
    let spawnRate = Math.max(20, 45 - (currentStage * 5));
    if (spawnTimer % spawnRate === 0) {
        const flyingMonsters = ['🦇', '👻', '🐉', '👾', '🦅'];
        enemies.push({
            x: Math.random() * (canvas.width - 40) + 20,
            y: -30,
            size: 26,
            speed: (Math.random() * 1.5 + 1.5) + (currentStage * 0.3),
            hp: power >= 2 ? 2 : 1,
            icon: flyingMonsters[Math.floor(Math.random() * flyingMonsters.length)]
        });
    }

    if (stageScore >= SCORE_PER_STAGE) {
        spawnBoss();
    }
}

// 보스 소환
function spawnBoss() {
    enemies = [];
    const bossIcons = ['👿', '🐉', '💀'];
    const bossNames = ['가고일 군주', '네더 드래곤', '다크 수호자'];
    
    let stageIdx = Math.min(currentStage - 1, bossIcons.length - 1);
    boss = {
        x: canvas.width / 2,
        y: -50,
        targetY: 90,
        size: 55,
        hp: 20 + (currentStage * 10),
        maxHp: 20 + (currentStage * 10),
        icon: bossIcons[stageIdx],
        name: bossNames[stageIdx],
        vx: 1.5
    };
}

// 폭탄 발사
function triggerBomb() {
    if (bombs > 0) {
        bombs--;
        playSound('bomb');
        enemies = [];
        if (boss) {
            boss.hp -= 15;
            if (boss.hp <= 0) {
                defeatBoss();
            }
        }
        score += 300;
        updateHUD();
        bombEffectTimer = 35;
    }
}
bombBtn.addEventListener('click', triggerBomb);

function defeatBoss() {
    score += 1000;
    boss = null;
    stageScore = 0;
    currentStage++;
    if (currentStage > 3) {
        gameClear();
        return;
    }
    updateHUD();
}

function updateGame() {
    if (isMouseDown) {
        player.x += (mouseX - player.x) * 0.15;
        player.y += (mouseY - player.y) * 0.15;
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
    ctx.fillStyle = '#ffffff';
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) star.y = 0;
        ctx.fillRect(star.x, star.y, star.size, star.size);
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
        if (boss.x < 50 || boss.x > canvas.width - 50) boss.vx *= -1;

        ctx.font = '50px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(boss.icon, boss.x, boss.y);

        ctx.fillStyle = '#333';
        ctx.fillRect(canvas.width / 2 - 100, 15, 200, 10);
        ctx.fillStyle = '#cc3333';
        ctx.fillRect(canvas.width / 2 - 100, 15, (boss.hp / boss.maxHp) * 200, 10);
        ctx.fillStyle = '#fff';
        ctx.font = '11px sans-serif';
        ctx.fillText(`[BOSS] ${boss.name}`, canvas.width / 2, 35);

        if (Math.hypot(player.x - boss.x, player.y - boss.y) < 40) {
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
            if (Math.hypot(b.x - boss.x, b.y - boss.y) < 35) {
                bullets.splice(bIndex, 1);
                boss.hp--;
                if (boss.hp <= 0) {
                    defeatBoss();
                }
            }
        });
    }

    // 일반 적 (날아다니는 괴물들)
    enemies.forEach((enemy, eIndex) => {
        enemy.y += enemy.speed;
        ctx.font = '26px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(enemy.icon, enemy.x, enemy.y);

        if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < 25) {
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
            if (Math.hypot(b.x - enemy.x, b.y - enemy.y) < 22) {
                bullets.splice(bIndex, 1);
                enemy.hp--;
                if (enemy.hp <= 0) {
                    enemies.splice(eIndex, 1);
                    score += 100;
                    stageScore += 100;
                    updateHUD();

                    // 아이템 드랍: 색상으로 구분되는 선물상자
                    // 초콜릿(갈색상자), 빅토리 진(파란상자), 유리문진(청록상자), 비밀 일기장(황금상자)
                    if (Math.random() < 0.35) {
                        const itemTypes = [
                            { type: 'choco', boxColor: '#8B4513', ribbonColor: '#ff7eb3', name: '초콜릿' },
                            { type: 'gin', boxColor: '#1e90ff', ribbonColor: '#ffffff', name: '빅토리 진' },
                            { type: 'paperweight', boxColor: '#00ced1', ribbonColor: '#ffffe0', name: '유리문진' },
                            { type: 'diary', boxColor: '#ffd700', ribbonColor: '#cc3333', name: '비밀 일기장' }
                        ];
                        const chosen = itemTypes[Math.floor(Math.random() * itemTypes.length)];
                        items.push({ x: enemy.x, y: enemy.y, vy: 1.5, ...chosen });
                    }
                }
            }
        });

        if (enemy.y > canvas.height + 30) {
            enemies.splice(eIndex, 1);
        }
    });

    // 아이템 (선물상자 렌더링)
    items.forEach((item, iIndex) => {
        item.y += item.vy;

        // 캔버스로 색상별 선물상자 그리기
        ctx.fillStyle = item.boxColor;
        ctx.fillRect(item.x - 12, item.y - 12, 24, 24);
        ctx.fillStyle = item.ribbonColor;
        ctx.fillRect(item.x - 3, item.y - 12, 6, 24); // 세로 리본
        ctx.fillRect(item.x - 12, item.y - 3, 24, 6);  // 가로 리본

        if (Math.hypot(player.x - item.x, player.y - item.y) < 25) {
            playSound('item');
            items.splice(iIndex, 1);
            if (item.type === 'choco') {
                if (power < 3) power++;
            } else if (item.type === 'gin') {
                bombs++;
            } else if (item.type === 'paperweight') {
                player.shield = true;
            } else if (item.type === 'diary') {
                score += 300;
                stageScore += 300;
            }
            updateHUD();
        }

        if (item.y > canvas.height + 30) {
            items.splice(iIndex, 1);
        }
    });

    // 플레이어
    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.icon, player.x, player.y);

    if (player.shield) {
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 24, 0, Math.PI * 2);
        ctx.stroke();
    }

    // 폭탄 이펙트
    if (bombEffectTimer > 0) {
        bombEffectTimer--;
        ctx.fillStyle = bombEffectTimer % 4 < 2 ? 'rgba(255, 117, 140, 0.5)' : 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function gameOver() {
    playSound('hit');
    clearInterval(gameInterval);
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    gameOverTitle.textContent = "GAME OVER";
    gameOverTitle.style.color = "#ff5858";
    finalScoreEl.textContent = score;
}

function gameClear() {
    clearInterval(gameInterval);
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    gameOverTitle.textContent = "VICTORY! (모든 스테이지 클리어)";
    gameOverTitle.style.color = "#06d6a0";
    finalScoreEl.textContent = score;
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
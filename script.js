const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('gameover-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const bombBtn = document.getElementById('bomb-btn');
const planeCards = document.querySelectorAll('.plane-card');

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const bombsEl = document.getElementById('bombs');
const powerEl = document.getElementById('power');
const finalScoreEl = document.getElementById('final-score');

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

let gameInterval;
let score = 0;
let lives = 3;
let bombs = 1;
let power = 1;

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
let enemyBullets = [];
let stars = [];

// 배경 별 생성
for(let i=0; i<40; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 2 + 0.5
    });
}

// 조작 입력 상태
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
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    score = 0;
    lives = 3;
    bombs = 1;
    power = 1;
    bullets = [];
    enemies = [];
    items = [];
    enemyBullets = [];

    player.icon = getPlaneIcon(selectedPlaneType);
    player.x = canvas.width / 2;
    player.y = canvas.height - 80;
    player.shield = false;

    updateHUD();
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(updateGame, 1000 / 60);
}

function updateHUD() {
    scoreEl.textContent = score;
    livesEl.textContent = lives;
    bombsEl.textContent = bombs;
    powerEl.textContent = power;
}

// 자동 미사일 발사 타이머
let shootTimer = 0;
function handleShooting() {
    shootTimer++;
    if (shootTimer % 12 === 0) {
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

// 적 생성 타이머
let spawnTimer = 0;
function handleEnemies() {
    spawnTimer++;
    if (spawnTimer % 45 === 0) {
        enemies.push({
            x: Math.random() * (canvas.width - 40) + 20,
            y: -30,
            size: 26,
            speed: Math.random() * 1.5 + 1.5,
            hp: power >= 2 ? 2 : 1,
            icon: ['👁️', '🤖', '📺', '🚨'][Math.floor(Math.random() * 4)]
        });
    }
}

// 폭탄 발사 기능
function triggerBomb() {
    if (bombs > 0) {
        bombs--;
        enemies = [];
        enemyBullets = [];
        score += 500;
        updateHUD();
        // 화면 깜빡임 연출
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}
bombBtn.addEventListener('click', triggerBomb);

function updateGame() {
    // 1. 플레이어 이동 (마우스/터치 또는 키보드)
    if (isMouseDown) {
        player.x += (mouseX - player.x) * 0.15;
        player.y += (mouseY - player.y) * 0.15;
    }
    if (keys['ArrowLeft'] || keys['KeyA']) player.x -= player.speed;
    if (keys['ArrowRight'] || keys['KeyD']) player.x += player.speed;
    if (keys['ArrowUp'] || keys['KeyW']) player.y -= player.speed;
    if (keys['ArrowDown'] || keys['KeyS']) player.y += player.speed;

    // 화면 경계 제한
    player.x = Math.max(20, Math.min(canvas.width - 20, player.x));
    player.y = Math.max(20, Math.min(canvas.height - 20, player.y));

    handleShooting();
    handleEnemies();

    // 2. 배경 별 업데이트
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) star.y = 0;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    // 3. 총알 업데이트
    bullets.forEach((b, index) => {
        b.y += b.vy;
        if (b.vx) b.x += b.vx;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();

        if (b.y < 0) bullets.splice(index, 1);
    });

    // 4. 적 업데이트 및 충돌 체크
    enemies.forEach((enemy, eIndex) => {
        enemy.y += enemy.speed;
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(enemy.icon, enemy.x, enemy.y);

        // 플레이어와 적 충돌
        const distToPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (distToPlayer < 25) {
            enemies.splice(eIndex, 1);
            if (player.shield) {
                player.shield = false;
            } else {
                lives--;
                updateHUD();
                if (lives <= 0) gameOver();
            }
        }

        // 총알과 적 충돌
        bullets.forEach((b, bIndex) => {
            const dist = Math.hypot(b.x - enemy.x, b.y - enemy.y);
            if (dist < 22) {
                bullets.splice(bIndex, 1);
                enemy.hp--;
                if (enemy.hp <= 0) {
                    enemies.splice(eIndex, 1);
                    score += 100;
                    updateHUD();

                    // 1984 테마 아이템 드랍 (초콜릿, 빅토리 진, 유리문진, 비밀 일기장)
                    if (Math.random() < 0.35) {
                        const itemTypes = [
                            { type: 'choco', icon: '🍫', name: '초콜릿' },
                            { type: 'gin', icon: '🥃', name: '빅토리 진' },
                            { type: 'paperweight', icon: '💎', name: '유리문진' },
                            { type: 'diary', icon: '📖', name: '비밀 일기장' }
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

    // 5. 아이템 업데이트 및 획득 체크
    items.forEach((item, iIndex) => {
        item.y += item.vy;
        ctx.font = '20px sans-serif';
        ctx.fillText(item.icon, item.x, item.y);

        const dist = Math.hypot(player.x - item.x, player.y - item.y);
        if (dist < 25) {
            items.splice(iIndex, 1);
            if (item.type === 'choco') {
                if (power < 3) power++;
            } else if (item.type === 'gin') {
                bombs++;
            } else if (item.type === 'paperweight') {
                player.shield = true;
            } else if (item.type === 'diary') {
                score += 300;
            }
            updateHUD();
        }

        if (item.y > canvas.height + 30) {
            items.splice(iIndex, 1);
        }
    });

    // 6. 플레이어 그리기
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
}

function gameOver() {
    clearInterval(gameInterval);
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    finalScoreEl.textContent = score;
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
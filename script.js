const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('gameover-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const bombBtn = document.getElementById('bomb-btn');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const soundBtn = document.getElementById('sound-btn');
const quitBtn = document.getElementById('quit-btn');
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
const startRankingBtn = document.getElementById('start-ranking-btn');
const rankingBackBtn = document.getElementById('ranking-back-btn');
const rankStatusEl = document.getElementById('rank-status');
const rankingListEl = document.getElementById('ranking-list');

// Public browser key; database access is restricted to the ranking functions.
const RANKING_URL = 'https://lubrwnbluclmpoxnkzul.supabase.co/rest/v1/rpc/';
const RANKING_KEY = 'sb_publishable_iFW2FjdPFeMHgvi5-RfB2A_qHdQgX8g';
let rankingResult = null;
let rankingSubmitted = false;
let rankingSubmitting = false;
let rankingLoadVersion = 0;

const stageBanner = document.getElementById('stage-banner');
const bannerTitle = document.getElementById('banner-title');
const bannerDesc = document.getElementById('banner-desc');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let selectedPlaneType = 'standard';
let selectedDifficulty = 'normal';
const difficultySettings = {
    easy:   { spawnInterval: 1.28, enemySpeed: 0.78, enemyHp: 0.75, bossHp: 0.78, lives: 5, scoreMultiplier: 0.8, bulletSpeed: 0.78 },
    normal: { spawnInterval: 1.00, enemySpeed: 1.00, enemyHp: 1.00, bossHp: 1.00, lives: 3, scoreMultiplier: 1, bulletSpeed: 1.00 },
    hard:   { spawnInterval: 0.78, enemySpeed: 1.28, enemyHp: 1.35, bossHp: 1.45, lives: 2, scoreMultiplier: 1.3, bulletSpeed: 1.25 }
};
const planeSpecs = {
    standard:  { speed: 6.5, fireDelay: 9, initialSpread: 1, shield: 0, name: '요격기' },
    jet:       { speed: 8.2, fireDelay: 7, initialSpread: 1, shield: 0, name: '고속기' },
    propeller: { speed: 6.1, fireDelay: 6, initialSpread: 1, shield: 0, name: '건십' },
    cruiser:   { speed: 5.8, fireDelay: 10, initialSpread: 3, shield: 0, name: '스텔스' },
    copter:    { speed: 5.6, fireDelay: 10, initialSpread: 1, shield: 2, name: '방어기' }
};
const planeStatusEl = document.getElementById('active-plane');

planeCards.forEach(card => {
    const selectPlane = () => {
        if (missionActive) return;
        planeCards.forEach(c => {c.classList.remove('selected'); c.setAttribute('aria-pressed', 'false');});
        card.classList.add('selected');
        card.setAttribute('aria-pressed', 'true');
        selectedPlaneType = card.dataset.plane;
        renderPlanePreviews();
    };
    card.addEventListener('click', selectPlane);
    card.addEventListener('keydown', e => {
        if (e.code === 'Enter' || e.code === 'Space') {e.preventDefault(); selectPlane();}
    });
});

difficultyCards.forEach(card => {
    card.addEventListener('click', () => {
        if (missionActive) return;
        difficultyCards.forEach(c => {
            c.classList.remove('selected');
            c.setAttribute('aria-pressed', 'false');
        });
        card.classList.add('selected');
        card.setAttribute('aria-pressed', 'true');
        selectedDifficulty = card.dataset.difficulty;
        document.getElementById('difficulty-score-note').textContent = `획득 점수 ${getDifficulty().scoreMultiplier}배 · 통합 랭킹`;
    });
});

function getDifficulty() {
    return difficultySettings[selectedDifficulty] || difficultySettings.normal;
}

function addScore(basePoints) {
    const points = Math.round(basePoints * getDifficulty().scoreMultiplier);
    score += points;
    return points;
}

let audioCtx = null;
let soundMuted = false;
let isManuallyPaused = false;
let bestScore = 0;
try { bestScore = Number(localStorage.getItem('skyRaiders84Best') || 0); } catch (e) { bestScore = 0; }
if (bestScoreEl) bestScoreEl.textContent = bestScore.toLocaleString('ko-KR');
function initAudio() {
    if (!audioCtx) {
        const AudioEngine = window.AudioContext || window.webkitAudioContext;
        if (!AudioEngine) return;
        try { audioCtx = new AudioEngine(); } catch (error) { console.warn('Audio unavailable', error); }
    }
    if (audioCtx?.state === 'suspended') audioCtx.resume().catch(() => {});
}

// Soft original arcade arpeggio, generated locally (no external audio file).
function playMusicBeat() {
    if (!audioCtx || soundMuted || frameCount % 23 !== 0) return;
    const sequence = [261.63,392,523.25,659.25,523.25,392,293.66,440,587.33,698.46,587.33,440,329.63,493.88,659.25,783.99];
    const note = sequence[Math.floor(frameCount / 23) % sequence.length];
    try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note, now);
        gain.gain.setValueAtTime(.0001, now);
        gain.gain.linearRampToValueAtTime(.018, now + .015);
        gain.gain.exponentialRampToValueAtTime(.0001, now + .23);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + .24);
    } catch (error) {}
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
let stageBannerTimeout = null;
let frameCount = 0;
let pickupNoticeTimeout = null;
const pickupNotice = document.getElementById('pickup-notice');
let score = 0;
let lives = 3;
let bombs = 2;
const MAX_SHOTS = 5, MAX_POWER = 2;
let supportCount = 0;
let bulletCount = 1;
let power = 0;
let currentStage = 1;
let stageScore = 0;
let combo = 0, bestCombo = 0, kills = 0, comboTimer = 0, hitCooldown = 0;
let killsWithoutItem = 0;
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
let screenShake = 0;
let combatTexts = [];
let pickupCount = 0;

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
    if (!document.getElementById('tutorial-overlay').classList.contains('hidden')) return;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code) && !gameScreen.classList.contains('hidden')) e.preventDefault();
    if (e.repeat || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if ((e.code === 'KeyP' || e.code === 'Escape') && !gameScreen.classList.contains('hidden')) togglePause();
    if (e.code === 'KeyM' && !gameScreen.classList.contains('hidden')) toggleSound();
    if (e.code === 'Space' || e.code === 'KeyB') triggerBomb();
    keys[e.code] = true;
}, { passive: false });
window.addEventListener('keyup', e => keys[e.code] = false);
window.addEventListener('blur', () => { keys = {}; if (!gameScreen.classList.contains('hidden') && !isPausedForBanner) setPaused(true); });
document.addEventListener('visibilitychange', () => {
    if (document.hidden && !gameScreen.classList.contains('hidden') && !isPausedForBanner) setPaused(true);
});

function setPaused(paused) {
    if (paused && missionActive) saveMission();
    isManuallyPaused = paused;
    pauseOverlay.classList.toggle('hidden', !paused);
    pauseBtn.setAttribute('aria-pressed', String(paused));
    pauseBtn.innerHTML = paused ? '▶ <span>계속</span>' : 'Ⅱ <span>일시정지</span>';
}
function togglePause() {
    if (isPausedForBanner || gameScreen.classList.contains('hidden')) return;
    setPaused(!isManuallyPaused);
}
function toggleSound() {
    soundMuted = !soundMuted;
    soundBtn.setAttribute('aria-pressed', String(soundMuted));
    soundBtn.innerHTML = soundMuted ? '× <span>음소거</span>' : '♫ <span>소리</span>';
}

// Pointer Events avoid synthetic mouse events replacing the touch offset.
let activePointer = null;
function aimAtPointer(e) {
    const rect = canvas.getBoundingClientRect();
    const offset = e.pointerType === 'mouse' ? 0 : 76;
    mouseX = (e.clientX - rect.left) * canvas.width / rect.width;
    mouseY = (e.clientY - rect.top - offset) * canvas.height / rect.height;
    isMouseDown = true;
}
canvas.addEventListener('pointerdown', e => {
    if (isManuallyPaused || isPausedForBanner || activePointer !== null) return;
    activePointer = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    aimAtPointer(e);
    if (e.pointerType !== 'mouse') { player.x = Math.max(24, Math.min(canvas.width-24, mouseX)); player.y = Math.max(30, Math.min(canvas.height-30, mouseY)); }
});
canvas.addEventListener('pointermove', e => {
    if (isPausedForBanner || isManuallyPaused) return;
    if (e.pointerType === 'mouse' && activePointer === null || e.pointerId === activePointer) aimAtPointer(e);
});
function releasePointer(e) { if(e.pointerId === activePointer) { activePointer = null; isMouseDown = false; } }
canvas.addEventListener('pointerup', releasePointer);
canvas.addEventListener('pointercancel', releasePointer);
canvas.addEventListener('lostpointercapture', releasePointer);

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
    if (!resumingMission && readSave() && !confirm('새로 출격하면 저장된 작전이 바뀝니다. 새로 시작할까요?')) return;
    missionActive = true;
    setSelectionLock(true);
    activePointer = null;
    gameOverScreen.classList.remove('ranking-only');
    rankingResult = null;
    rankingSubmitted = false;
    if (submitRankBtn) submitRankBtn.disabled = false;
    rankingLoadVersion++;

    initAudio();
    clearTimeout(stageBannerTimeout);
    clearTimeout(pickupNoticeTimeout);
    if (pickupNotice) pickupNotice.classList.add('hidden');
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    stageBanner.classList.add('hidden');

    score = 0;
    lives = getDifficulty().lives;
    bombs = 2;
    const spec = planeSpecs[selectedPlaneType] || planeSpecs.standard;
    bulletCount = spec.initialSpread;
    power = 0; supportCount = 0;
    currentStage = 1;
    stageScore = 0;
    combo = 0; bestCombo = 0; kills = 0; comboTimer = 0; hitCooldown = 0;
    killsWithoutItem = 0;
    bullets = [];
    enemyBullets = [];
    enemies = [];
    items = [];
    particles = [];
    boss = null;
    bombEffectTimer = 0;
    screenShake = 0;
    combatTexts = [];
    pickupCount = 0;
    isPausedForBanner = false;
    shootTimer = 0; spawnTimer = 0;
    isMouseDown = false;
    frameCount = 0;
    setPaused(false);

    player.icon = getPlaneIcon(selectedPlaneType);
    player.speed = spec.speed;
    player.x = canvas.width / 2;
    player.y = canvas.height - 80;
    player.shield = spec.shield > 0;
    shieldHits = spec.shield;
    if (planeStatusEl) planeStatusEl.textContent = spec.name;
    missileAmmo = 0;
    missiles = [];

    updateHUD();
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(updateGame, 1000 / 60);
    if (!resumingMission) { saveMission(); showFirstFlightGuide(); }
}

function updateHUD() {
    stageEl.textContent = currentStage;
    scoreEl.textContent = score.toLocaleString('ko-KR');
    if (stageProgressFill) stageProgressFill.style.width = `${Math.min(100, stageScore / SCORE_PER_STAGE * 100)}%`;
    livesEl.textContent = lives;
    bombsEl.textContent = bombs;
    spreadEl.textContent = Math.min(MAX_SHOTS, bulletCount);
    if (missilesEl) missilesEl.textContent = missileAmmo;
    if (comboEl) comboEl.textContent = combo.toLocaleString('ko-KR');
}

let shootTimer = 0;
function handleShooting() {
    shootTimer++;
    const spec = planeSpecs[selectedPlaneType] || planeSpecs.standard;
    if (shootTimer % Math.max(7, spec.fireDelay - power) === 0) {
        playSound('shoot');
        let count = Math.min(MAX_SHOTS, bulletCount);
        
        for(let i=0;i<count;i++) {
            const offset=i-(count-1)/2;
            bullets.push({x:player.x+offset*12,y:player.y-20,vy:-14,vx:offset*.5,size:5,color:'#60a5fa'});
        }
    }
    if (supportCount > 0 && shootTimer % 50 === 0) {
        for(let i=0;i<supportCount;i++) {
            const x=Math.max(12,Math.min(canvas.width-12,player.x+(i===0?-42:42)));
            bullets.push({x,y:player.y+2,vy:-9,vx:0,size:4,color:'#7de9da',damage:1});
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

// Every aircraft and every weapon uses the same reward rule.
function maybeDropItem(enemy) {
    const easy = selectedDifficulty === 'easy';
    const chance = easy ? 0.66 : selectedDifficulty === 'hard' ? 0.34 : 0.46;
    const guaranteeAfter = easy ? 2 : 4;
    if (Math.random() >= chance && killsWithoutItem < guaranteeAfter - 1) {
        killsWithoutItem++;
        return;
    }
    killsWithoutItem = 0;
    const drops = [
        { type: 'life', boxColor: '#d83f65', ribbonColor: '#fff2f5', name: '추가 목숨 +1', symbol: '♥' },
        { type: 'shield', boxColor: '#168b91', ribbonColor: '#b9fbff', name: '방어막 충전', symbol: 'S' },
        { type: 'missile', boxColor: '#d17a32', ribbonColor: '#ffe0a6', name: '유도탄 +3', symbol: 'M' },
        { type: 'coin', boxColor: '#b28b3c', ribbonColor: '#fff0b3', name: '무장 확장', symbol: 'W' },
        { type: 'power', boxColor: '#bd5149', ribbonColor: '#ffd0b8', name: '파워 업', symbol: 'P' },
        { type: 'bomb', boxColor: '#2876a0', ribbonColor: '#bae6fd', name: '폭탄 충전', symbol: 'B' },
        { type: 'support', boxColor:'#358b80', ribbonColor:'#c7fff0', name:'보조 비행기', symbol:'F' },
        { type: 'bonus', boxColor: '#a9852b', ribbonColor: '#fef08a', name: '보너스 점수', symbol: '+' }
    ];
    const lifeChance = easy ? 0.34 : selectedDifficulty === 'hard' ? 0.07 : 0.13;
    const picked = Math.random() < lifeChance ? drops[0] : drops[1 + Math.floor(Math.random() * (drops.length - 1))];
    items.push({ x: Math.max(20, Math.min(canvas.width - 20, enemy.x)), y: enemy.y, vy: 1.35, phase: Math.random() * Math.PI * 2, ...picked });
}

function awardEnemyKill(enemy) {
    createParticles(enemy.x, enemy.y, '#f59e0b', 18);
    kills++; combo++; comboTimer = 150;
    bestCombo = Math.max(bestCombo, combo);
    const earned = addScore(150 + Math.min(500, combo * 10));
    stageScore += 150;
    addCombatText(enemy.x, enemy.y, `+${earned}`, '#ffdd69');
    maybeDropItem(enemy);
    if (Math.random() < .24) items.push({x:enemy.x,y:enemy.y,vy:1.5,phase:0,type:'gem',name:'보석 +1',boxColor:'#9b60ff',ribbonColor:'#e5ceff'});
    updateHUD();
}

function addCombatText(x, y, label, color = '#fff') {
    if (combatTexts.length > 24) combatTexts.shift();
    combatTexts.push({x, y, label, color, opacity:1, vy:-1.1});
}

// 적 생성 및 탄막 발사 패턴
let spawnTimer = 0;
function handleEnemies() {
    if (boss) {
        // Bosses rotate between aimed volleys, expanding fans and sweeping curtains.
        const interval = selectedDifficulty === 'easy' ? 52 : selectedDifficulty === 'hard' ? 34 : 43;
        if (boss.y > 40 && shootTimer % interval === 0 && enemyBullets.length < 65) {
            const aimAngle = Math.atan2(player.y - (boss.y + 20), player.x - boss.x);
            const bulletScale = getDifficulty().bulletSpeed;
            const phase = (currentStage - 1) % 3;
            const count = phase === 0 ? 3 : phase === 1 ? 5 : 6;
            for (let i = 0; i < count; i++) {
                const angle = phase === 0 ? aimAngle + (i - 1) * .2
                    : phase === 1 ? Math.PI / 2 + (i - 2) * .24
                    : Math.PI / 2 + Math.sin(shootTimer * .045) * .5 + (i - 2.5) * .16;
                const speed = (phase === 0 ? 3.0 : 3.25) * bulletScale;
                enemyBullets.push({
                    x: boss.x,
                    y: boss.y + 20,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 5.5,
                    color: phase === 1 ? '#ef476f' : '#b45360'
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
        const patterns = currentStage < 3 ? ['straight', 'wave', 'dive'] :
            currentStage < 8 ? ['straight','wave','zigzag','dive','swoop'] :
            ['straight','wave','zigzag','dive','swoop','orbit'];
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
            pattern: chosenPattern, angle: Math.random() * Math.PI * 2,
            phaseSpeed: 0.05 + Math.min(.05, currentStage * .0008)
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
        screenShake = 17;
        playSound('bomb');
        createParticles(canvas.width / 2, canvas.height / 2, '#3b82f6', 60);
        enemies = [];
        enemyBullets = [];
        if (boss) {
            boss.hp = Math.max(1, boss.hp - Math.max(1, Math.floor(boss.maxHp * .18)));
            if (boss.hp <= 0) {
                defeatBoss();
            }
        }
        addScore(500);
        // Bombs clear danger without advancing boss progress.
        updateHUD();
        bombEffectTimer = 55;
    }
}
bombBtn.addEventListener('click', triggerBomb);

function defeatBoss() {
    screenShake = 20;
    addScore(2500);
    createParticles(boss.x, boss.y, '#f59e0b', 50);
    boss = null;
    wardrobe.gems += 5; saveWardrobe();
    stageScore = 0;
    currentStage++;
    saveMission();
    if (stageProgressFill) stageProgressFill.style.width = '0%';

    if (currentStage > 100) {
        gameClear();
        return;
    }

    playSound('stageUp');
    addCombatText(canvas.width/2, 165, 'BOSS DEFEATED! +2500', '#ffcc55');
    isPausedForBanner = true;
    bannerTitle.textContent = `STAGE ${currentStage - 1} CLEAR!`;
    bannerDesc.textContent = `다음 스테이지 ${currentStage} (으)로 진입합니다.`;
    stageBanner.classList.remove('hidden');

    clearTimeout(stageBannerTimeout);
    stageBannerTimeout = setTimeout(() => {
        if (gameScreen.classList.contains('hidden')) return;
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
function paintAircraft(c,x,y,scale,colors,variant,flame=true) {
 c.save(); c.translate(x,y); c.scale(scale,scale);
 const palette={standard:'#253e57',jet:'#446c85',propeller:'#526d65',cruiser:'#4f506d',copter:'#80704c'};
 const base=palette[variant]||palette.standard;
 const wing=variant==='jet'?19:variant==='propeller'?31:variant==='cruiser'?29:variant==='copter'?26:25;
 function shape(points,fill,stroke='#b2c4cf') { c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=fill;c.fill();c.strokeStyle=stroke;c.lineWidth=.8;c.stroke(); }
 c.shadowColor='#0c223e66';c.shadowBlur=3;c.shadowOffsetY=2;
 if(flame){for(const x of [-6,6]){shape([[x-2,20],[x,32+Math.sin(Date.now()/45)*3],[x+2,20]],'#ffba59','#ffe7ab');}}
 const top=variant==='cruiser'?-14:-8;
 shape([[0,-31],[7,top],[wing,13],[wing-3,18],[8,10],[6,20],[13,28],[3,25],[0,29],[-3,25],[-13,28],[-6,20],[-8,10],[-wing+3,18],[-wing,13],[-7,top]],base);
 c.shadowBlur=0;c.shadowOffsetY=0;
 for(const sign of [-1,1]){
 shape([[sign*5,-3],[sign*(wing-3),13],[sign*9,8]],'#9badb7','#dfe8ed');
 shape([[sign*4,12],[sign*11,26],[sign*3,22]],base,'#cfb781');
 c.fillStyle='#1b2e3c';c.fillRect(sign*6-2,13,4,10);
 }
 const metal=c.createLinearGradient(-5,0,5,0);metal.addColorStop(0,'#536c7c');metal.addColorStop(.5,'#edf0e9');metal.addColorStop(1,'#6d8796');
 shape([[0,-33],[4,-16],[4,17],[0,26],[-4,17],[-4,-16]],metal);
 shape([[0,-21],[2.5,-13],[2,-5],[-2,-5],[-2.5,-13]],'#223c54','#9dc7df');
 c.strokeStyle='#cfb781';c.lineWidth=1;c.beginPath();c.moveTo(0,-28);c.lineTo(0,-23);c.moveTo(0,1);c.lineTo(0,19);c.stroke();
 if(variant==='copter'){c.strokeStyle='#e7e2ca';c.lineWidth=2;c.beginPath();c.moveTo(-22,4);c.lineTo(-22,12);c.moveTo(22,4);c.lineTo(22,12);c.stroke();}
 c.restore();
}
function drawAircraft(x,y,scale,colors,enemy=false,variant='standard') {
 paintAircraft(ctx,x,y,scale,colors,variant);
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

// Layered, scrolling airspace: changing daylight and distant islands every 10 stages.
function drawBackdrop() {
    const phase = Math.floor((currentStage - 1) / 10) % 3;
    const palettes = [
        ['#43b7fa', '#b9edff', '#e8faff', '#5bbce1'],
        ['#64b9fa', '#f8dcbb', '#fff6d6', '#73bdd3'],
        ['#62c4c8', '#bcebdc', '#f1fcdf', '#6bb9ba']
    ];
    const palette = palettes[phase];
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, palette[0]);
    sky.addColorStop(0.57, palette[1]);
    sky.addColorStop(1, palette[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const sunX = canvas.width * 0.78;
    const sunY = canvas.height * 0.14;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 3, sunX, sunY, 180);
    sunGlow.addColorStop(0, 'rgba(255,255,214,.72)');
    sunGlow.addColorStop(1, 'rgba(255,255,214,0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff9d5';
    ctx.beginPath(); ctx.arc(sunX, sunY, 26, 0, Math.PI*2); ctx.fill();

    // Distant sea with slow light ripples to create a sense of forward flight.
    const waterY = canvas.height * 0.59;
    ctx.fillStyle = palette[3] + '37';
    ctx.fillRect(0, waterY, canvas.width, canvas.height - waterY);
    ctx.strokeStyle = 'rgba(255,255,255,.26)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 11; i++) {
        const y = waterY + ((i * 53 + frameCount * 1.1) % (canvas.height - waterY));
        const x = ((i * 113 + Math.sin(i * 3.1) * 70) % canvas.width + canvas.width) % canvas.width;
        ctx.beginPath(); ctx.moveTo(x - 28, y); ctx.lineTo(x + 36, y); ctx.stroke();
    }

    // Parallax islands: soft-edged shapes deliberately stay behind combat entities.
    for (let i = 0; i < 5; i++) {
        const x = 55 + (i * 127) % 430;
        const y = waterY + ((i * 178 + frameCount * (0.42 + i * .09)) % (canvas.height - waterY + 180)) - 70;
        const scale = .65 + i * .13;
        ctx.save(); ctx.translate(x,y); ctx.rotate(Math.sin(i * 2) * .3); ctx.scale(scale, scale);
        ctx.fillStyle = 'rgba(16, 113, 116, .11)';
        ctx.beginPath(); ctx.ellipse(5, 9, 46, 22, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = i % 2 ? '#79c7a6a0' : '#6ec8a8a0';
        ctx.beginPath(); ctx.ellipse(0, 0, 39, 16, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff0bd96';
        ctx.beginPath(); ctx.ellipse(-10, -2, 18, 6, 0, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }

    function cloud(cx, cy, scale, alpha) {
        ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 31 * scale, 13 * scale, 0, 0, Math.PI * 2);
        ctx.ellipse(cx - 19 * scale, cy + 2 * scale, 17 * scale, 10 * scale, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 2 * scale, cy - 8 * scale, 19 * scale, 16 * scale, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 22 * scale, cy + 1 * scale, 18 * scale, 11 * scale, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.restore();
    }
    const cloudY = (offset, speed) => (offset + frameCount * speed) % (canvas.height + 180) - 90;
    cloud(canvas.width * .16, cloudY(100,.45), .9,.48);
    cloud(canvas.width * .82, cloudY(240,.65), 1.12,.43);
    cloud(canvas.width * .25, cloudY(410,.3),.72,.28);
    cloud(canvas.width * .92, cloudY(540,.52),.9,.3);
}

function updateGame() {
    if (isPausedForBanner || isManuallyPaused) return;
    frameCount++;
    if (frameCount % 120 === 0) saveMission();

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
    playMusicBeat();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackdrop();
    if (screenShake > 0) {
        const strength = Math.min(8, screenShake / 2);
        canvas.style.transform = `translate(${(Math.random()-.5)*strength}px, ${(Math.random()-.5)*strength}px)`;
        screenShake--;
    } else if (canvas.style.transform) {
        canvas.style.transform = '';
    }

    // 파티클 렌더링
    for (let idx = particles.length - 1; idx >= 0; idx--) {
        const p = particles[idx];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
            particles.splice(idx, 1);
            continue;
        }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // 플레이어 총알
    for (let index = bullets.length - 1; index >= 0; index--) {
        const b = bullets[index];
        b.y += b.vy;
        if (b.vx) b.x += b.vx;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();

        if (b.y < 0) bullets.splice(index, 1);
    }

    // 유도탄: 가장 가까운 적/보스를 추적하고 폭발 피해를 줍니다.
    for (let index = missiles.length - 1; index >= 0; index--) {
        const m = missiles[index];
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
                        enemies.splice(ei, 1);
                        awardEnemyKill(enemy);
                    }
                    break;
                }
            }
        }
        if (hit || m.y < -30 || m.x < -30 || m.x > canvas.width+30 || m.y > canvas.height+30) missiles.splice(index, 1);
    }

    // 적 탄막 총알
    for (let index = enemyBullets.length - 1; index >= 0; index--) {
        const eb = enemyBullets[index];
        eb.x += eb.vx;
        eb.y += eb.vy;
        ctx.fillStyle = '#df294d';
        ctx.strokeStyle = '#fff5ec'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, eb.size, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // 플레이어와 적 탄막 충돌
        if (hitCooldown <= 0 && Math.hypot(player.x - eb.x, player.y - eb.y) < 20) {
            enemyBullets.splice(index, 1);
            playSound('hit');
            screenShake = 9;
            createParticles(player.x, player.y, '#ef4444', 10);
            hitCooldown = 70;
            if (player.shield && shieldHits > 0) {
                shieldHits--;
                player.shield = shieldHits > 0;
            } else {
                lives--;
                updateHUD();
                if (lives <= 0) { gameOver(); return; }
            }
        }

        if (eb.y > canvas.height + 20 || eb.y < -20 || eb.x < -20 || eb.x > canvas.width + 20) {
            if (enemyBullets[index] === eb) enemyBullets.splice(index, 1);
        }
    }

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
            screenShake = 9;
            hitCooldown = 70;
            if (player.shield && shieldHits > 0) {
                shieldHits--;
                player.shield = shieldHits > 0;
            } else {
                lives--;
                updateHUD();
                if (lives <= 0) { gameOver(); return; }
            }
        }

        for (let bIndex = bullets.length - 1; bIndex >= 0 && boss; bIndex--) {
            const b = bullets[bIndex];
            if (boss && Math.hypot(b.x - boss.x, b.y - boss.y) < 45) {
                bullets.splice(bIndex, 1);
                boss.hp -= b.damage || (1 + Math.floor(power / 2));
                createParticles(b.x, b.y, '#f43f5e', 4);
                if (boss.hp <= 0) {
                    defeatBoss();
                }
            }
        }
    }

    // 일반 적
    for (let eIndex = enemies.length - 1; eIndex >= 0; eIndex--) {
        const enemy = enemies[eIndex];
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
        } else if (enemy.pattern === 'swoop') {
            enemy.angle += enemy.phaseSpeed;
            enemy.x = enemy.startX + Math.sin(enemy.angle) * (45 + Math.min(45, currentStage));
        } else if (enemy.pattern === 'orbit') {
            enemy.angle += enemy.phaseSpeed;
            enemy.x = enemy.startX + Math.sin(enemy.angle * 1.3) * 90;
            enemy.y += Math.cos(enemy.angle) * .8;
        }
        enemy.x = Math.max(25, Math.min(canvas.width-25, enemy.x));

        // From stage 3 onward, small aircraft occasionally fire aimed shots.
        if (currentStage >= 3 && enemy.y > 35 && enemy.y < player.y - 90 && enemyBullets.length < 48) {
            const fireChance = (selectedDifficulty === 'easy' ? .0018 : selectedDifficulty === 'hard' ? .006 : .0033)
                * Math.min(1.7, 1 + currentStage / 65);
            if (Math.random() < fireChance) {
                const angle = Math.atan2(player.y-enemy.y, player.x-enemy.x);
                const speed = 2.5 * getDifficulty().bulletSpeed;
                enemyBullets.push({x:enemy.x,y:enemy.y+9,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,size:4.5,color:'#d3465b'});
            }
        }

        drawEnemyAircraft(enemy.x, enemy.y, enemy.type || 'interceptor', enemy.colors || {base:'#a44d4a', high:'#f2b5a1', accent:'#f4cf9b'});

        if (hitCooldown <= 0 && Math.hypot(player.x - enemy.x, player.y - enemy.y) < 28) {
            playSound('hit');
            screenShake = 9;
            createParticles(enemy.x, enemy.y, '#ef4444', 15);
            enemies.splice(eIndex, 1);
            hitCooldown = 70;
            if (player.shield && shieldHits > 0) {
                shieldHits--;
                player.shield = shieldHits > 0;
            } else {
                lives--;
                updateHUD();
                if (lives <= 0) { gameOver(); return; }
            }
            continue;
        }

        for (let bIndex = bullets.length - 1; bIndex >= 0; bIndex--) {
            const b = bullets[bIndex];
            if (Math.hypot(b.x - enemy.x, b.y - enemy.y) < 26) {
                bullets.splice(bIndex, 1);
                enemy.hp -= b.damage || (1 + Math.floor(power / 3));
                createParticles(b.x, b.y, '#60a5fa', 5);
                if (enemy.hp <= 0) {
                    enemies.splice(eIndex, 1);
                    awardEnemyKill(enemy);
                    break;
                }
            }
        }

        if (enemies[eIndex] === enemy && enemy.y > canvas.height + 40) {
            enemies.splice(eIndex, 1);
        }
    }

    // 아이템
    for (let iIndex = items.length - 1; iIndex >= 0; iIndex--) {
        const item = items[iIndex];
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
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#102b40'; ctx.lineWidth = 3; ctx.font = 'bold 12px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; const symbol = ({support:'F',gem:'◆',life:'♥',shield:'S',missile:'↑',coin:'W',power:'P',bomb:'B',bonus:'+'})[item.type] || '+'; ctx.strokeText(symbol,item.x,item.y+bobY+1); ctx.fillText(symbol,item.x,item.y+bobY+1);
        ctx.restore();

        if (Math.hypot(player.x - item.x, player.y - item.y) < 28) {
            playSound('item');
            pickupCount++;
            addCombatText(item.x, item.y - 16, item.name, '#fff9d5');
            if (pickupNotice) {
                pickupNotice.textContent = item.name;
                pickupNotice.classList.remove('hidden');
                clearTimeout(pickupNoticeTimeout);
                pickupNoticeTimeout = setTimeout(() => pickupNotice.classList.add('hidden'), 1100);
            }
            createParticles(item.x, item.y, '#38bdf8', 12);
            items.splice(iIndex, 1);
            if (item.type === 'gem') {
                wardrobe.gems++; saveWardrobe(); saveMission();
            } else if (item.type === 'life') {
                lives = Math.min(5, lives + 1);
                addScore(100);
                createParticles(player.x, player.y, '#ff7184', 18);
            } else if (item.type === 'missile') {
                missileAmmo = Math.min(12, missileAmmo + 3);
                addScore(100);
            } else if (item.type === 'support') {
                supportCount = Math.min(2, supportCount + 1);
            } else if (item.type === 'coin') {
                bulletCount = Math.min(MAX_SHOTS, bulletCount + 1);
            } else if (item.type === 'power') {
                power = Math.min(MAX_POWER, power + 1);
            } else if (item.type === 'bomb') {
                bombs = Math.min(9, bombs + 2);
            } else if (item.type === 'shield') {
                player.shield = true;
                shieldHits = Math.min(3, shieldHits + 2);
            } else if (item.type === 'bonus') {
                addScore(800);
                stageScore += 800;
            }
            updateHUD();
        }

        if (items[iIndex] === item && item.y > canvas.height + 40) {
            items.splice(iIndex, 1);
        }
    }

    for(let i=0;i<supportCount;i++) {
        const x=Math.max(12,Math.min(canvas.width-12,player.x+(i===0?-42:42)));
        drawAircraft(x,player.y+18,.45,{base:'#26796f',high:'#a9fff0',accent:'#e8ffb1'},false,'standard');
    }
    drawCosmetics(ctx, player.x, player.y, 1, frameCount);
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
        ctx.fillStyle = '#f1dca8'; ctx.font = 'bold 15px Orbitron, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('폭탄 투하', canvas.width / 2, canvas.height / 2);
    }

    for (let i = combatTexts.length - 1; i >= 0; i--) {
        const t = combatTexts[i];
        t.y += t.vy; t.opacity -= .018;
        if (t.opacity <= 0) { combatTexts.splice(i,1); continue; }
        ctx.save(); ctx.globalAlpha = t.opacity; ctx.font = '800 14px Noto Sans KR, sans-serif';
        ctx.textAlign = 'center'; ctx.lineWidth = 3.5; ctx.strokeStyle = '#194c69';
        ctx.strokeText(t.label, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(t.label, t.x, t.y);
        ctx.restore();
    }
}

async function rankingRpc(name, payload = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
        const response = await fetch(RANKING_URL + name, {
            method: 'POST',
            headers: { apikey: RANKING_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload), signal: controller.signal
        });
        if (!response.ok) throw new Error('랭킹 서버 요청에 실패했습니다. 잠시 후 다시 시도하세요.');
        return await response.json();
    } catch (error) {
        if (error.name === 'AbortError') throw new Error('랭킹 서버 응답 시간이 초과되었습니다. 다시 시도하세요.');
        if (error instanceof TypeError) throw new Error('랭킹 서버에 연결하지 못했습니다. 인터넷 연결을 확인하세요.');
        throw error;
    } finally { clearTimeout(timer); }
}

function captureRankingResult() {
    if (rankingResult) return;
    if (cloudCredentials && rankNicknameEl) rankNicknameEl.value = cloudCredentials.player_id.slice(0, rankNicknameEl.maxLength);
    rankingResult = {
        p_id: crypto.randomUUID(),
        p_score: Math.max(0, Math.floor(score)),
        p_difficulty: selectedDifficulty, p_plane: selectedPlaneType,
        p_stage: Math.min(100, Math.max(1, Math.floor(currentStage))),
        p_kills: Math.max(0, Math.floor(kills))
    };
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
        li.className = 'ranking-row';
        const place = document.createElement('span');
        place.className = 'rank-place';
        place.textContent = `${index + 1}.`;
        const details = document.createElement('div');
        details.className = 'rank-details';
        const name = document.createElement('span');
        name.className = 'rank-name';
        name.textContent = String(row.nickname || '조종사').slice(0, 12);
        const sub = document.createElement('span');
        sub.className = 'rank-sub';
        const difficultyLabels = { easy: '쉬움', normal: '보통', hard: '어려움' };
        const planeLabels = { standard: '요격기', jet: '고속기', propeller: '건십', cruiser: '스텔스', copter: '방어기' };
        const stageValue = Math.max(1, Number(row.stage || 1));
        const killsValue = Math.max(0, Number(row.kills || 0));
        sub.textContent = `${difficultyLabels[row.difficulty] || '보통'} · ${planeLabels[row.plane] || String(row.plane || 'FALCON')} · ${stageValue}단계 · 격추 ${killsValue}`;
        details.append(name, sub);
        const meta = document.createElement('span');
        meta.className = 'rank-meta';
        meta.textContent = `${Number(row.score || 0).toLocaleString('ko-KR')}점`;
        li.append(place, details, meta);
        rankingListEl.appendChild(li);
    });
}

async function loadOnlineRanking() {
    if (!rankStatusEl) return;
    const version = ++rankingLoadVersion;
    rankStatusEl.textContent = '온라인 랭킹을 불러오는 중...';
    try {
        const rows = await rankingRpc('new1984_leaderboard');
        if (version !== rankingLoadVersion) return;
        renderRanking(rows);
        rankStatusEl.textContent = rankingSubmitted ? '점수가 등록되었습니다!' : '온라인 랭킹 연결됨';
    } catch (error) {
        if (version !== rankingLoadVersion) return;
        rankStatusEl.textContent = rankingSubmitted ? '점수는 등록되었습니다. 랭킹 목록을 불러오지 못했습니다.' : error.message;
        if (rankingListEl) rankingListEl.innerHTML = '<li>랭킹을 불러오지 못했습니다. 잠시 후 다시 시도하세요.</li>';
    }
}

async function submitOnlineScore() {
    if (!rankNicknameEl || !submitRankBtn || !rankStatusEl || !rankingResult || rankingSubmitted || rankingSubmitting) return;
    const nickname = rankNicknameEl.value.trim().replace(/[<>\x00-\x1f\x7f]/g, '').slice(0, 12);
    if (!nickname) {
        rankStatusEl.textContent = '먼저 닉네임을 입력해 주세요.';
        rankNicknameEl.focus();
        return;
    }
    try { localStorage.setItem('skyRaiders84Nickname', nickname); } catch (e) {}
    const result = rankingResult;
    rankingSubmitting = true;
    submitRankBtn.disabled = true;
    rankStatusEl.textContent = '점수를 등록하는 중...';
    try {
        await rankingRpc('new1984_submit_score', { ...result, p_nickname: nickname });
        if (rankingResult !== result) return;
        rankingSubmitted = true;
        await loadOnlineRanking();
    } catch (error) {
        if (rankingResult === result) rankStatusEl.textContent = error.message;
    } finally {
        rankingSubmitting = false;
        submitRankBtn.disabled = rankingSubmitted;
    }
}

if (rankNicknameEl) {
    try { rankNicknameEl.value = localStorage.getItem('skyRaiders84Nickname') || ''; } catch (e) {}
}
if (submitRankBtn) submitRankBtn.addEventListener('click', submitOnlineScore);

async function endMissionEarly() {
    if (gameScreen.classList.contains('hidden')) return;
    const choice = await askMissionMenu();
    if(choice==='save'){saveMission();returnToStart();return;}
    if(choice!=='accept')return;
    finishMission();
    clearTimeout(stageBannerTimeout);
    clearTimeout(pickupNoticeTimeout);
    clearInterval(gameInterval);
    isManuallyPaused = false;
    isPausedForBanner = false;
    pauseOverlay.classList.add('hidden');
    stageBanner.classList.add('hidden');
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    gameOverTitle.textContent = '작전 종료';
    gameOverTitle.style.color = '#d7b875';
    finalScoreEl.textContent = score.toLocaleString('ko-KR');
    if (finalComboEl) finalComboEl.textContent = bestCombo;
    if (finalKillsEl) finalKillsEl.textContent = kills;
    captureRankingResult();
    saveBestScore();
    if (rankStatusEl) rankStatusEl.textContent = '작전이 종료되었습니다. 닉네임을 입력해 현재 점수를 등록할 수 있어요.';
    loadOnlineRanking();
}

function gameOver() {
    finishMission();
    if (gameScreen.classList.contains('hidden')) return;
    playSound('hit');
    clearTimeout(stageBannerTimeout);
    clearTimeout(pickupNoticeTimeout);
    clearInterval(gameInterval);
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    gameOverTitle.textContent = "작전 종료";
    gameOverTitle.style.color = "#ef4444";
    finalScoreEl.textContent = score.toLocaleString('ko-KR');
    if (finalComboEl) finalComboEl.textContent = bestCombo;
    if (finalKillsEl) finalKillsEl.textContent = kills;
    captureRankingResult();
    saveBestScore();
    loadOnlineRanking();
}

function gameClear() {
    finishMission();
    clearTimeout(stageBannerTimeout);
    clearTimeout(pickupNoticeTimeout);
    clearInterval(gameInterval);
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    gameOverTitle.textContent = "🏆 100스테이지 디럭스 클리어 성공! 🏆";
    gameOverTitle.style.color = "#10b981";
    finalScoreEl.textContent = score.toLocaleString('ko-KR');
    if (finalComboEl) finalComboEl.textContent = bestCombo;
    if (finalKillsEl) finalKillsEl.textContent = kills;
    captureRankingResult();
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
if (quitBtn) quitBtn.addEventListener('click', endMissionEarly);
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
if (startRankingBtn) startRankingBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    gameOverScreen.classList.add('ranking-only');
    gameOverTitle.textContent = '온라인 랭킹';
    finalScoreEl.closest('p').classList.add('hidden');
    document.querySelector('.result-stats').classList.add('hidden');
    document.querySelector('.record-line').classList.add('hidden');
    rankNicknameEl.closest('.rank-submit').classList.add('hidden');
    document.querySelector('#gameover-screen > .portal-home-link').classList.add('hidden');
    restartBtn.classList.add('hidden');
    loadOnlineRanking();
});
if (rankingBackBtn) rankingBackBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    gameOverScreen.classList.remove('ranking-only');
    finalScoreEl.closest('p').classList.remove('hidden');
    document.querySelector('.result-stats').classList.remove('hidden');
    document.querySelector('.record-line').classList.remove('hidden');
    rankNicknameEl.closest('.rank-submit').classList.remove('hidden');
    document.querySelector('#gameover-screen > .portal-home-link').classList.remove('hidden');
    restartBtn.classList.remove('hidden');
    startScreen.classList.remove('hidden');
});

function returnToStart() {
    saveMission();
    missionActive = false; setSelectionLock(false); refreshContinue();
    planeCards.forEach(c=>{c.classList.toggle('selected',c.dataset.plane===selectedPlaneType);c.setAttribute('aria-pressed',String(c.dataset.plane===selectedPlaneType));});
    difficultyCards.forEach(c=>{c.classList.toggle('selected',c.dataset.difficulty===selectedDifficulty);c.setAttribute('aria-pressed',String(c.dataset.difficulty===selectedDifficulty));});
    document.getElementById('difficulty-score-note').textContent=`획득 점수 ${getDifficulty().scoreMultiplier}배 · 통합 랭킹`;renderPlanePreviews();
    clearInterval(gameInterval); clearTimeout(stageBannerTimeout); clearTimeout(pickupNoticeTimeout);
    gameScreen.classList.add('hidden'); gameOverScreen.classList.add('hidden');
    gameOverScreen.classList.remove('ranking-only'); startScreen.classList.remove('hidden');
    rankingLoadVersion++; startRankingBtn.focus();
}
document.getElementById('result-home-btn').addEventListener('click', returnToStart);
const guide = document.getElementById('tutorial-overlay');
function showFirstFlightGuide() {
    let seen = false; try { seen = localStorage.getItem('skyRaiders84Guide') === '1'; } catch(e) {}
    if (seen) return;
    isManuallyPaused = true; guide.classList.remove('hidden');
    document.getElementById('tutorial-start-btn').focus();
}
function closeFirstFlightGuide() {
    try { localStorage.setItem('skyRaiders84Guide','1'); } catch(e) {}
    guide.classList.add('hidden'); setPaused(false); canvas.focus();
}
document.getElementById('tutorial-start-btn').addEventListener('click',closeFirstFlightGuide);
document.getElementById('tutorial-skip-btn').addEventListener('click',closeFirstFlightGuide);
guide.addEventListener('keydown',e=>{
    if(e.key==='Escape') { e.stopPropagation(); closeFirstFlightGuide(); }
    if(e.key==='Tab') { e.preventDefault(); const a=document.getElementById('tutorial-start-btn'),b=document.getElementById('tutorial-skip-btn'); (document.activeElement===a?b:a).focus(); }
});
function renderPlanePreviews() {
    const descriptions = {standard:'요격기 · 속도와 화력의 균형',jet:'고속기 · 빠른 이동과 집중 사격',propeller:'건십 · 안정적인 연속 사격',cruiser:'스텔스 · 넓게 퍼지는 확산 공격',copter:'방어기 · 방어막 2회로 생존 강화'};
    document.getElementById('plane-description').textContent = descriptions[selectedPlaneType];
    document.querySelectorAll('.plane-card').forEach(card=>{
        const preview=card.querySelector('canvas'), pctx=preview.getContext('2d');
        pctx.clearRect(0,0,72,72); paintAircraft(pctx,36,35,.88,getPlaneColor(card.dataset.plane),card.dataset.plane,false);
    });
    const preview=document.getElementById('preview-plane'),pctx=preview.getContext('2d');
    pctx.clearRect(0,0,320,180); paintAircraft(pctx,160,83,2.45,getPlaneColor(selectedPlaneType),selectedPlaneType,false);
}
renderPlanePreviews();

// Keep the current mission when the player cancels leaving it.
document.getElementById('game-home-btn').addEventListener('click', async () => {
    if (gameScreen.classList.contains('hidden')) return;
    if (!await askGameConfirmation('처음으로 돌아갈까요?', '진행 상황을 저장해 두고 다음에 이어할 수 있어요.', '저장하고 돌아가기')) return;
    returnToStart();
});


// Local profile and mission snapshots are versioned independently.
const PROFILE_KEY = 'skyRaiders84WardrobeV1', MISSION_KEY = 'skyRaiders84MissionV1';
let missionActive = false, resumingMission = false;
function readLocal(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
const storedWardrobe = readLocal(PROFILE_KEY);
const wardrobe = {gems: Math.max(0, Number(storedWardrobe?.gems) || 0), owned: Array.isArray(storedWardrobe?.owned) ? storedWardrobe.owned : [], equipped: storedWardrobe?.equipped || {}};
const cosmetics = [
 {id:'aqua',slot:'trail',name:'오로라 궤적',price:15,color:'#53fff0',desc:'청록빛 리본과 반짝이는 입자'},
 {id:'flame',slot:'trail',name:'태양 불꽃',price:30,color:'#ff9644',desc:'길게 타오르는 황금빛 불꽃'},
 {id:'galaxy',slot:'trail',name:'은하수',price:50,color:'#c78aff',desc:'보랏빛과 분홍빛 별가루'},
 {id:'halo',slot:'aura',name:'네온 후광',price:25,color:'#65dcff',desc:'기체를 감싸는 푸른 광륜'},
 {id:'crown',slot:'wings',name:'황금 날개',price:40,color:'#ffdc79',desc:'양옆으로 펼쳐지는 빛의 날개'},
 {id:'feather',slot:'wings',name:'빛깃 날개',price:55,color:'#a8edff',desc:'푸른 깃털이 겹쳐지는 날개'},
 {id:'sidefins',slot:'wings',name:'날개 장식',price:28,color:'#ff8cc6',desc:'날개 끝의 분홍빛 보조 날개'},
 {id:'engines',slot:'wings',name:'쌍발 장식',price:35,color:'#7cf4b0',desc:'양쪽 엔진과 빛나는 배기구'},
 {id:'stars',slot:'aura',name:'별의 수호자',price:60,color:'#ffc7fa',desc:'비행기 주위를 도는 빛나는 별'}
];
function storageWrite(key,value) { try {localStorage.setItem(key,JSON.stringify(value)); return true;} catch {document.getElementById('save-status').textContent='저장 공간을 사용할 수 없습니다. 브라우저 설정을 확인해 주세요.'; return false;} }
function saveWardrobe() {storageWrite(PROFILE_KEY,wardrobe); refreshVaultStatus(); document.getElementById('gem-count').textContent=wardrobe.gems; document.getElementById('hud-gems').textContent=wardrobe.gems;}
function setSelectionLock(locked) { [...planeCards,...difficultyCards].forEach(c=>c.disabled=locked); }
function readSave() {const s=readLocal(MISSION_KEY); return s?.version===1 && difficultySettings[s.difficulty] && planeSpecs[s.plane] && s.currentStage>=1 && s.currentStage<=100 && s.lives>0 ? s : null;}
function saveMission() {
 if(!missionActive || lives<=0 || currentStage>100) return;
 const data={version:1,plane:selectedPlaneType,difficulty:selectedDifficulty,score,lives,bombs,bulletCount,power,currentStage,stageScore,combo,bestCombo,kills,comboTimer,hitCooldown,killsWithoutItem,missileAmmo,shieldHits,player,bullets,enemyBullets,enemies,items,missiles,boss,frameCount,shootTimer,spawnTimer,pickupCount,supportCount};
 if(storageWrite(MISSION_KEY,data)) document.getElementById('save-status').textContent='장비와 현재 단계 저장됨 · 이어하면 단계 처음부터 시작';
}
function finishMission() {missionActive=false; setSelectionLock(false); try {localStorage.removeItem(MISSION_KEY);} catch {} refreshContinue();}
function refreshContinue() {const s=readSave(),b=document.getElementById('continue-btn'); b.classList.toggle('hidden',!s); if(s)b.textContent=`${s.currentStage}단계 이어하기 · ${Number(s.score).toLocaleString('ko-KR')}점`;}
document.getElementById('continue-btn').onclick=()=>{
 const s=readSave(); if(!s)return;
 selectedPlaneType=s.plane;selectedDifficulty=s.difficulty;resumingMission=true;startGame();resumingMission=false;
 ({score,lives,bombs,bulletCount,power,currentStage,stageScore,combo,bestCombo,kills,comboTimer,hitCooldown,killsWithoutItem,missileAmmo,shieldHits,player,bullets,enemyBullets,enemies,items,missiles,boss,frameCount,shootTimer,spawnTimer,pickupCount}=s);
 supportCount=Math.min(2,Math.max(0,Number(s.supportCount)||0));bulletCount=Math.min(MAX_SHOTS,bulletCount);power=Math.min(MAX_POWER,power);
 stageScore=0;combo=0;comboTimer=0;bullets=[];enemyBullets=[];enemies=[];items=[];missiles=[];boss=null;shootTimer=0;spawnTimer=0;frameCount=0;
 player.x=canvas.width/2;player.y=canvas.height-90;
 keys={};activePointer=null;isMouseDown=false;mouseX=player.x;mouseY=player.y;hitCooldown=Math.max(120,hitCooldown);updateHUD();setPaused(true);saveMission();
};
window.addEventListener('pagehide',saveMission);
document.addEventListener('visibilitychange',()=>{if(document.hidden && missionActive){saveMission();setPaused(true);}});
function drawCosmetics(c,x,y,scale,t) {
 c.save();c.translate(x,y);c.scale(scale,scale);
 for(const part of cosmetics.filter(p=>wardrobe.owned.includes(p.id)&&wardrobe.equipped[p.slot]===p.id)){
 c.strokeStyle=part.color;c.fillStyle=part.color;c.shadowColor=part.color;c.shadowBlur=14;c.lineWidth=2;
 if(part.slot==='trail'){
  for(let i=0;i<3;i++){c.beginPath();c.moveTo((i-1)*7,18);for(let j=0;j<12;j++)c.lineTo((i-1)*7+Math.sin(t*.08+j*.55+i)*j*.9,18+j*6);c.globalAlpha=.7-i*.12;c.stroke();}
  for(let i=0;i<12;i++){const v=(t*1.7+i*9)%100;c.globalAlpha=1-v/100;c.beginPath();c.arc(Math.sin(i*4+t*.025)*v*.24,22+v,1.5+(i%2),0,Math.PI*2);c.fill();}
 } else if(part.slot==='wings') {c.globalAlpha=.8;for(const side of [-1,1]){for(let i=0;i<4;i++){c.beginPath();c.moveTo(side*15,i*4);c.lineTo(side*(48-i*6),-14+i*7);c.lineTo(side*24,20);c.stroke();}if(part.id==='feather')for(let i=0;i<5;i++){c.beginPath();c.moveTo(side*18,2+i*3);c.quadraticCurveTo(side*(32+i*2),-19+i*5,side*(43-i*3),-13+i*6);c.stroke();}if(part.id==='sidefins'){c.beginPath();c.moveTo(side*22,9);c.lineTo(side*42,7);c.lineTo(side*29,22);c.closePath();c.fill();}if(part.id==='engines'){c.beginPath();c.ellipse(side*19,22,4,8,0,0,Math.PI*2);c.fill();}}}
 else {c.globalAlpha=.75; c.beginPath();c.ellipse(0,4,39,30,Math.sin(t*.02)*.3,0,Math.PI*2);c.stroke();for(let i=0;i<5;i++){const a=t*.025+i*Math.PI*2/5;c.font='15px sans-serif';c.fillText('✦',Math.cos(a)*39-6,Math.sin(a)*30+8);}}
 c.globalAlpha=1;
 }c.restore();
}
const shop=document.getElementById('shop-overlay');
function renderShop(){saveWardrobe();const list=document.getElementById('shop-items');list.replaceChildren();for(const p of cosmetics){const owned=wardrobe.owned.includes(p.id),equipped=wardrobe.equipped[p.slot]===p.id;const card=document.createElement('article');card.className='shop-item';const title=document.createElement('h3');title.textContent=p.name;title.style.color=p.color;const desc=document.createElement('p');desc.textContent=p.desc;const b=document.createElement('button');b.className='utility-btn';b.textContent=equipped?'장착 해제':owned?'장착하기':`◆ ${p.price} 구매`;b.disabled=!owned&&wardrobe.gems<p.price;b.onclick=()=>{if(!owned){if(wardrobe.gems<p.price)return;wardrobe.gems-=p.price;wardrobe.owned.push(p.id);}wardrobe.equipped[p.slot]=equipped?null:p.id;saveWardrobe();renderShop();};card.append(title,desc,b);list.append(card);}}
document.getElementById('shop-btn').onclick=()=>{renderShop();shop.classList.remove('hidden');document.getElementById('shop-close').focus();};
document.getElementById('shop-close').onclick=()=>{shop.classList.add('hidden');document.getElementById('shop-btn').focus();};
shop.addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('shop-close').click();if(e.key==='Tab'){const buttons=[...shop.querySelectorAll('button:not(:disabled)')];if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0].focus();}}});
function animateShopPreview(){const c=document.getElementById('shop-preview').getContext('2d');if(!shop.classList.contains('hidden')){c.clearRect(0,0,320,190);drawCosmetics(c,160,65,1.5,performance.now()/17);paintAircraft(c,160,65,1.5,getPlaneColor(selectedPlaneType),selectedPlaneType,false);}requestAnimationFrame(animateShopPreview);}
saveWardrobe();refreshContinue();animateShopPreview();


const VAULT_FUNCTION='https://lubrwnbluclmpoxnkzul.supabase.co/functions/v1/super-responder';
let cloudCredentials=null;
function cloudMessage(message,error=false){const e=document.getElementById('cloud-status');e.textContent=message;e.dataset.state=error?'error':'info';e.setAttribute('aria-live','assertive');}
function cloudId(){const id=document.getElementById('cloud-id').value.trim().toLowerCase();return /^[a-z0-9_-]{3,16}$/.test(id)?id:null;}
async function vaultRequest(payload){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);let response;try{response=await fetch(VAULT_FUNCTION,{method:'POST',signal:controller.signal,headers:{apikey:RANKING_KEY,'Content-Type':'application/json'},body:JSON.stringify(payload)});}catch(e){if(e.name==='AbortError')throw Error('응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.');throw Error('서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.');}finally{clearTimeout(timer);}let data={};try{data=await response.json()}catch{}if(!response.ok){if(data.error==='USERNAME_TAKEN')throw Error('이미 사용 중인 아이디예요. 다른 아이디를 선택해 주세요.');if(data.error==='INVALID_CREDENTIALS')throw Error('아이디 또는 비밀번호를 확인해 주세요.');if(data.error==='TOO_MANY_ATTEMPTS')throw Error('로그인 시도가 많아 잠시 잠겼어요. 15분 후 다시 시도해 주세요.');if(data.error==='VAULT_UNAVAILABLE')throw Error('보관함 기능을 아직 연결하지 못했어요. Supabase 설정을 확인해 주세요.');throw Error('요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.');}return data;}
function setCloudCredentials(credentials){cloudCredentials=credentials;document.getElementById('cloud-auth-form').classList.toggle('hidden',!!credentials);document.getElementById('cloud-account-session').classList.toggle('hidden',!credentials);if(credentials)document.getElementById('cloud-account-label').textContent=`${credentials.player_id} 보관함에 연결되어 있어요.`;}
function refreshVaultStatus(){const e=document.getElementById('cloud-saved-state');if(!e)return;const saved=readLocal('skyRaiders84VaultReceiptV1');if(!saved){e.textContent='아직 보관함에 저장하지 않았어요.';return;}const same=saved.snapshot===JSON.stringify(currentWardrobe());e.textContent=`${saved.player_id} · ${same?'보관함에 저장됨':'저장하지 않은 변경 사항 있음'} · 저장 상태 확인 ${new Date(saved.savedAt).toLocaleString('ko-KR')}`;e.dataset.state=same?'saved':'changed';}
function recordVaultSave(player_id,profile){storageWrite('skyRaiders84VaultReceiptV1',{player_id,snapshot:JSON.stringify(profile),savedAt:Date.now()});refreshVaultStatus();}
function currentWardrobe(){return {gems:wardrobe.gems,owned:wardrobe.owned,equipped:wardrobe.equipped};}
function applyCloudWardrobe(profile){wardrobe.gems=Math.max(0,Number(profile.gems)||0);wardrobe.owned=Array.isArray(profile.owned)?profile.owned.filter(id=>cosmetics.some(c=>c.id===id)):[];wardrobe.equipped=profile.equipped&&typeof profile.equipped==='object'?profile.equipped:{};for(const slot of Object.keys(wardrobe.equipped)){if(!cosmetics.some(c=>c.id===wardrobe.equipped[slot]&&c.slot===slot&&wardrobe.owned.includes(c.id)))delete wardrobe.equipped[slot];}saveWardrobe();renderShop();}
function readVaultCredentials(){const player_id=cloudId(),password=document.getElementById('cloud-password').value;if(!player_id)return {error:'아이디는 영문 소문자, 숫자, _ 또는 -로 3~16자 입력해 주세요.'};if(password.length<8||password.length>72)return {error:'비밀번호는 8~72자로 입력해 주세요.'};return {player_id,password};}
async function cloudSignup(){const credentials=readVaultCredentials();if(credentials.error)return cloudMessage(credentials.error,true);try{const profile=JSON.parse(JSON.stringify(currentWardrobe()));await vaultRequest({action:'create',...credentials,profile});recordVaultSave(credentials.player_id,profile);setCloudCredentials(credentials);document.getElementById('cloud-password').value='';cloudMessage('보관함을 만들고 현재 기기의 꾸미기 상태를 저장했어요.');}catch(e){cloudMessage(e.message,true);}}
async function cloudLogin(){const credentials=readVaultCredentials();if(credentials.error)return cloudMessage(credentials.error,true);try{await vaultRequest({action:'login',...credentials});setCloudCredentials(credentials);document.getElementById('cloud-password').value='';cloudMessage(`${credentials.player_id} 보관함을 불러왔어요. 저장 데이터를 적용하려면 아래 버튼을 눌러 주세요.`);}catch(e){cloudMessage(e.message,true);}}
async function cloudSave(){if(!cloudCredentials)return cloudMessage('먼저 보관함을 불러와 주세요.',true);try{const profile=JSON.parse(JSON.stringify(currentWardrobe()));const id=cloudCredentials.player_id;await vaultRequest({action:'save',...cloudCredentials,profile});recordVaultSave(id,profile);cloudMessage('현재 기기의 보석과 꾸미기 상태를 보관함에 저장했어요.');}catch(e){cloudMessage(e.message,true);}}
async function cloudLoad(){if(!cloudCredentials)return cloudMessage('먼저 보관함을 불러와 주세요.',true);try{const result=await vaultRequest({action:'load',...cloudCredentials});applyCloudWardrobe(result.profile);recordVaultSave(cloudCredentials.player_id,currentWardrobe());cloudMessage('보관함의 보석과 꾸미기 상태를 불러왔어요.');}catch(e){cloudMessage(e.message,true);}}
function setCloudAuthMode(mode){const signup=mode==='signup';document.getElementById('cloud-auth-title').textContent=signup?'새 보관함 만들기':'보관함 불러오기';document.getElementById('cloud-auth-description').textContent=signup?'아이디와 비밀번호를 새로 만들고, 현재 기기의 꾸미기 상태를 보관합니다.': '다른 기기에서 저장한 보석과 꾸미기 상태를 불러옵니다.';document.getElementById('cloud-login').classList.toggle('hidden',signup);document.getElementById('cloud-signup').classList.toggle('hidden',!signup);document.getElementById('show-signup').classList.toggle('hidden',signup);document.getElementById('back-to-login').classList.toggle('hidden',!signup);}
const cloudActions={'show-signup':()=>setCloudAuthMode('signup'),'back-to-login':()=>setCloudAuthMode('login'),'cloud-save':cloudSave,'cloud-load':cloudLoad,'cloud-logout':()=>{setCloudCredentials(null);document.getElementById('cloud-password').value='';cloudMessage('보관함 연결을 해제했어요.');},'cloud-login':cloudLogin,'cloud-signup':cloudSignup};
document.querySelector('.cloud-account').addEventListener('click',event=>{const button=event.target.closest('button');if(!button||!cloudActions[button.id])return;event.preventDefault();const pending={'cloud-login':'보관함을 확인하고 있어요.','cloud-signup':'보관함을 만들고 있어요.','cloud-save':'저장하고 있어요.','cloud-load':'불러오고 있어요.'}[button.id];if(pending)cloudMessage(pending);button.disabled=true;Promise.resolve().then(()=>cloudActions[button.id]()).catch(error=>cloudMessage(error.message||'요청을 처리하지 못했습니다.',true)).finally(()=>{button.disabled=false;});});
setCloudAuthMode('login');

function askGameConfirmation(title, description, actionLabel, returnChoice=false) {
 const dialog=document.getElementById('mission-confirm');
 if(dialog.open)return Promise.resolve(false);
 const wasPaused=isManuallyPaused;
 setPaused(true);
 document.getElementById('mission-confirm-title').textContent=title;
 document.getElementById('mission-confirm-description').textContent=description;
 document.getElementById('mission-confirm-accept').textContent=actionLabel;
 dialog.returnValue='cancel';
 return new Promise(resolve=>{
  dialog.addEventListener('close',()=>{setPaused(wasPaused);resolve(returnChoice?dialog.returnValue:dialog.returnValue==='accept');},{once:true});
  dialog.showModal();
 });
}
document.getElementById('mission-confirm').addEventListener('keydown',event=>event.stopPropagation());

async function askMissionMenu(){
 const save=document.getElementById('mission-confirm-save');save.classList.remove('hidden');
 try{return await askGameConfirmation('작전을 어떻게 할까요?', '저장하면 현재 장비를 유지하고, 다음에 같은 스테이지를 처음부터 이어합니다. 종료하면 현재 점수를 랭킹에 등록할 수 있어요.', '종료하기', true);}
 finally{save.classList.add('hidden');}
}

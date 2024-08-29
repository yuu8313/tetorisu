// game.js
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const scale = 20; // Smaller size for tetromino blocks
context.scale(scale, scale);

const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');
nextContext.scale(scale, scale);

const bgm = document.getElementById('bgm');
const gameoverSound = document.getElementById('gameoverSound');
const lineClearSound = document.getElementById('lineClearSound');
const moveSound = document.getElementById('moveSound');
const warningSound = document.getElementById('warningSound');
const placeSound = document.getElementById('placeSound');

let dropCounter = 0;
let dropInterval = 500;
let fastDropInterval = 50;
let lastTime = 0;
let isPaused = false;
let isGameOver = false;
let score = 0;
let isFastDropping = false;
let gameStarted = false;

const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
};

const colors = [
    null,
    '#FF0D72', // T
    '#0DC2FF', // J
    '#0DFF72', // Z
    '#F538FF', // O
    '#FF8E0D', // S
    '#FFE138', // I
    '#3877FF'  // L
];

// アリーナのサイズを10列×20行に変更
const arena = createMatrix(10, 20); // Standard Tetris size
let nextPiece = createPiece('T');

// 操作2のみを残す
document.addEventListener('keydown', handleMode2Keydown);



document.addEventListener('keyup', event => {
    if (event.keyCode === 40) {
        isFastDropping = false;
    }
});

// 操作2のキーイベント処理
function handleMode2Keydown(event) {
    if (isGameOver || isPaused) return;
    if (!gameStarted) {
        if (event.keyCode === 32) { // スペースキーでスタート
            startGame();
        }
        return;
    }
    if (event.keyCode === 37) { // 左矢印キーで移動
        playerMove(-1);
    } else if (event.keyCode === 39) { // 右矢印キーで移動
        playerMove(1);
    } else if (event.keyCode === 40) { // 下矢印キーで高速落下
        isFastDropping = true;
    } else if (event.keyCode === 32) { // スペースキーで回転
        playerRotate(1);
    } else if (event.keyCode === 13) { // エンターキーでハードドロップ
        playerHardDrop();
    }
}

function togglePause() {
    isPaused = !isPaused;
    if (!isPaused && !isGameOver) {
        lastTime = performance.now();
        update();
    }
    if (isPaused) {
        bgm.pause();
    } else {
        bgm.play();
    }
}

document.getElementById('resetButton').addEventListener('click', () => {
    resetGame();
});

document.getElementById('pauseButton').addEventListener('click', () => {
    togglePause();
});

function startGame() {
    document.getElementById('startScreen').style.display = 'none';
    gameStarted = true;
    playBGM();
    playerReset();
    drawNextPiece();
    updateScore();
    lastTime = performance.now();
    update();
}

function playBGM() {
    bgm.play().catch(error => {
        console.log('BGM autoplay was prevented:', error);
    });
}

function stopBGM() {
    bgm.pause();
}

function resetGame() {
    arena.forEach(row => row.fill(0));
    score = 0;
    updateScore();
    playerReset();
    isGameOver = false;
    bgm.currentTime = 0;
    if (gameStarted) {
        playBGM();
        lastTime = performance.now();
        update();
    }
}

function gameOver() {
    for (let x = 0; x < arena[0].length; x++) {
        if (arena[0][x] !== 0) {
            return true;
        }
    }
    return false;
}

function handleGameOver() {
    gameoverSound.currentTime = 0;
    gameoverSound.play();
    stopBGM();
    isGameOver = true;
    context.fillStyle = 'rgba(0, 0, 0, 0.75)';
    context.fillRect(0, 0, canvas.width / scale, canvas.height / scale);
    context.fillStyle = '#00FF00';
    context.font = '1px Arial';
    context.fillText('GAME OVER', 3, 10);
    context.fillText('Press Reset to Restart', 1, 12);
}

function drawMatrix(matrix, offset, alpha = 1, ctx = context) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.globalAlpha = alpha;
                ctx.fillStyle = colors[value];
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 0.05;
                ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function drawShadow(player) {
    const shadowPos = { ...player.pos };
    while (!collide(arena, { matrix: player.matrix, pos: shadowPos })) {
        shadowPos.y++;
    }
    shadowPos.y--;
    drawMatrix(player.matrix, shadowPos, 0.5);
}

function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width / scale, canvas.height / scale);
    drawMatrix(arena, { x: 0, y: 0 });
    drawShadow(player);
    drawMatrix(player.matrix, player.pos);
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    } else {
        moveSound.currentTime = 0;
        moveSound.play();
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        placeSound.currentTime = 0;
        placeSound.play();
        arenaSweep();
        playerReset();
        if (gameOver()) {
            handleGameOver();
            return;
        }
    }
    dropCounter = 0;
}

function playerHardDrop() {
    while (!collide(arena, player)) {
        player.pos.y++;
    }
    player.pos.y--;
    merge(arena, player);
    placeSound.currentTime = 0;
    placeSound.play();
    arenaSweep();
    playerReset();
    if (gameOver()) {
        handleGameOver();
    }
}

function playerReset() {
    const pieces = 'TJZOSIL';
    player.matrix = createPiece(pieces[pieces.length * Math.random() | 0]);
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    if (collide(arena, player)) {
        arena.forEach(row => row.fill(0));
        isGameOver = true;
        handleGameOver();
        stopBGM();
    }
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
    moveSound.currentTime = 0;
    moveSound.play();
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function createPiece(type) {
    if (type === 'T') {
        return [
            [0, 0, 0],
            [1, 1, 1],
            [0, 1, 0],
        ];
    } else if (type === 'O') {
        return [
            [2, 2],
            [2, 2],
        ];
    } else if (type === 'L') {
        return [
            [0, 3, 0],
            [0, 3, 0],
            [0, 3, 3],
        ];
    } else if (type === 'J') {
        return [
            [0, 4, 0],
            [0, 4, 0],
            [4, 4, 0],
        ];
    } else if (type === 'I') {
        return [
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
        ];
    } else if (type === 'S') {
        return [
            [0, 6, 6],
            [6, 6, 0],
            [0, 0, 0],
        ];
    } else if (type === 'Z') {
        return [
            [7, 7, 0],
            [0, 7, 7],
            [0, 0, 0],
        ];
    }
}

function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function arenaSweep() {
    let rowCount = 1;
    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;
        score += rowCount * 10;
        rowCount *= 2;
        updateScore();
        lineClearSound.currentTime = 0;
        lineClearSound.play();
    }
}

function updateScore() {
    document.getElementById('score').innerText = score;
}

function drawNextPiece() {
    nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    drawMatrix(nextPiece, { x: 1, y: 1 }, 1, nextContext);
}

function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    if (isFastDropping && dropCounter > fastDropInterval) {
        playerDrop();
        dropCounter = 0;
    } else if (dropCounter > dropInterval) {
        playerDrop();
        dropCounter = 0;
    }
    draw();
    if (!isGameOver && !isPaused) {
        requestAnimationFrame(update);
    }
}

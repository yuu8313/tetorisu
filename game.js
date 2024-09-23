// game.js - テトリスのゲームロジックを制御するスクリプト

// キャンバス要素とそのコンテキストを取得
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');

// テトリスブロックのスケール設定（サイズ調整）
const scale = 20; // 1ブロックを20ピクセルに設定
context.scale(scale, scale); // キャンバスの描画スケールを設定

// 次のピースを表示するキャンバスとそのコンテキストを取得
const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');
nextContext.scale(scale, scale); // 次のピースキャンバスのスケール設定

// 音声要素を取得
const bgm = document.getElementById('bgm'); // バックグラウンドミュージック
const gameoverSound = document.getElementById('gameoverSound'); // ゲームオーバー時の音
const lineClearSound = document.getElementById('lineClearSound'); // ラインクリア時の音
const moveSound = document.getElementById('moveSound'); // ピース移動時の音
const warningSound = document.getElementById('warningSound'); // 警告音
const placeSound = document.getElementById('placeSound'); // ピース固定時の音

// ゲームの状態管理変数
let dropCounter = 0; // ピースが落下するカウンター
let dropInterval = 500; // 通常の落下間隔（ミリ秒）
let fastDropInterval = 50; // 高速落下時の間隔（ミリ秒）
let lastTime = 0; // 最後の更新時間
let isPaused = false; // ゲームが一時停止中かどうか
let isGameOver = false; // ゲームオーバー状態かどうか
let score = 0; // プレイヤーのスコア
let isFastDropping = false; // 高速落下中かどうか
let gameStarted = false; // ゲームが開始されたかどうか

// プレイヤー（現在操作中のピース）の状態
const player = {
    pos: { x: 0, y: 0 }, // ピースの現在位置
    matrix: null, // ピースの形状を表す行列
};

// 各ピースの色を定義（インデックスがピースの種類に対応）
const colors = [
    null,
    '#C651FF', // Tピース
    '#FFF200', // Oピース
    '#EE8F00', // Lピース
    '#5173FF', // Jピース
    '#51EFFF', // Iピース
    '#479E46', // Sピース
    '#F73939'  // Zピース
];

// ゲームフィールド（アリーナ）の作成
const arena = createMatrix(10, 20); // 幅10ブロック、高さ20ブロックのフィールド
let nextPiece = createPiece('T'); // 次に出現するピースを初期化

// キーボード操作のイベントリスナーを設定
document.addEventListener('keydown', handleMode2Keydown); // キーダウン時の処理
document.addEventListener('keyup', event => {
    if (event.keyCode === 40) { // 下矢印キーが離されたとき
        isFastDropping = false; // 高速落下を停止
    }
});

// 操作2のキーイベント処理関数
function handleMode2Keydown(event) {
    if (isGameOver || isPaused) return; // ゲームオーバーまたは一時停止中は操作を無効化
    if (!gameStarted) { // ゲームが開始されていない場合
        if (event.keyCode === 32) { // スペースキーが押されたらゲーム開始
            startGame();
        }
        return;
    }
    // ゲーム開始後のキー操作
    if (event.keyCode === 37) { // 左矢印キーで左に移動
        playerMove(-1);
    } else if (event.keyCode === 39) { // 右矢印キーで右に移動
        playerMove(1);
    } else if (event.keyCode === 40) { // 下矢印キーで高速落下
        isFastDropping = true;
    } else if (event.keyCode === 32) { // スペースキーでピースを回転
        playerRotate(1);
    } else if (event.keyCode === 13) { // エンターキーでハードドロップ
        playerHardDrop();
    }
}

// 一時停止と再開を切り替える関数
function togglePause() {
    isPaused = !isPaused; // 一時停止状態を反転
    if (!isPaused && !isGameOver) { // 再開時
        lastTime = performance.now(); // 現在の時間を記録
        update(); // ゲームループを再開
    }
    if (isPaused) { // 一時停止中
        bgm.pause(); // BGMを一時停止
    } else { // 再開時
        bgm.play(); // BGMを再生
    }
}

// リセットボタンのクリックイベントリスナー
document.getElementById('resetButton').addEventListener('click', () => {
    resetGame(); // ゲームをリセット
});

// ポーズボタンのクリックイベントリスナー
document.getElementById('pauseButton').addEventListener('click', () => {
    togglePause(); // 一時停止と再開を切り替え
});

// ゲームを開始する関数
function startGame() {
    document.getElementById('startScreen').style.display = 'none'; // スタート画面を非表示
    gameStarted = true; // ゲーム開始フラグを設定
    playBGM(); // BGMを再生
    playerReset(); // プレイヤーのピースをリセット
    drawNextPiece(); // 次のピースを描画
    updateScore(); // スコアを表示
    lastTime = performance.now(); // 現在の時間を記録
    update(); // ゲームループを開始
}

// BGMを再生する関数
function playBGM() {
    bgm.play().catch(error => {
        console.log('BGMの自動再生がブロックされました:', error);
    });
}

// BGMを停止する関数
function stopBGM() {
    bgm.pause(); // BGMを一時停止
}

// ゲームをリセットする関数
function resetGame() {
    arena.forEach(row => row.fill(0)); // フィールドをクリア
    score = 0; // スコアをリセット
    updateScore(); // スコアを更新表示
    playerReset(); // プレイヤーのピースをリセット
    isGameOver = false; // ゲームオーバー状態を解除
    bgm.currentTime = 0; // BGMの再生位置をリセット
    if (gameStarted) { // ゲームが開始されている場合
        playBGM(); // BGMを再生
        lastTime = performance.now(); // 現在の時間を記録
        update(); // ゲームループを再開
    }
}

// ゲームオーバーかどうかを判定する関数
function gameOver() {
    for (let x = 0; x < arena[0].length; x++) { // フィールドの最上段をチェック
        if (arena[0][x] !== 0) { // 何かブロックがある場合
            return true; // ゲームオーバー
        }
    }
    return false; // ゲームオーバーではない
}

// ゲームオーバー時の処理を行う関数
function handleGameOver() {
    gameoverSound.currentTime = 0; // ゲームオーバー音の再生位置をリセット
    gameoverSound.play(); // ゲームオーバー音を再生
    stopBGM(); // BGMを停止
    isGameOver = true; // ゲームオーバーフラグを設定
    // ゲームオーバーのメッセージを表示
    context.fillStyle = 'rgba(0, 0, 0, 0.75)'; // 半透明の黒でフィールドを覆う
    context.fillRect(0, 0, canvas.width / scale, canvas.height / scale); // フィールド全体を塗りつぶす
    context.fillStyle = '#00FF00'; // テキストカラーを緑に設定
    context.font = '1px Arial'; // フォントサイズと種類を設定
    context.fillText('GAME OVER', 3, 10); // "GAME OVER" テキストを描画
    context.fillText('Press Reset to Restart', 1, 12); // リセットメッセージを描画
}

// マトリックス（行列）を描画する関数
// matrix: 描画するピースの形状
// offset: 描画する位置
// alpha: 不透明度
// ctx: 描画先のコンテキスト（デフォルトはメインキャンバス）
function drawMatrix(matrix, offset, alpha = 1, ctx = context) {
    matrix.forEach((row, y) => { // 各行をループ
        row.forEach((value, x) => { // 各セルをループ
            if (value !== 0) { // セルが空でない場合
                ctx.globalAlpha = alpha; // 不透明度を設定
                ctx.fillStyle = colors[value]; // セルの色を設定
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1); // ブロックを描画
                ctx.strokeStyle = '#000000'; // ブロックの枠線を黒に設定
                ctx.lineWidth = 0.05; // 枠線の幅を設定
                ctx.strokeRect(x + offset.x, y + offset.y, 1, 1); // 枠線を描画
            }
        });
    });
}

// プレイヤーのピースの影（シャドウ）を描画する関数
function drawShadow(player) {
    const shadowPos = { ...player.pos }; // 現在の位置をコピー
    // 影の位置を下に移動させて衝突しない最下点を見つける
    while (!collide(arena, { matrix: player.matrix, pos: shadowPos })) {
        shadowPos.y++;
    }
    shadowPos.y--; // 最後の衝突する位置の一つ上に設定
    drawMatrix(player.matrix, shadowPos, 0.5); // シャドウを半透明で描画
}

// フィールドとピースを描画する関数
function draw() {
    context.fillStyle = '#000'; // 背景色を黒に設定
    context.fillRect(0, 0, canvas.width / scale, canvas.height / scale); // フィールド全体を塗りつぶす
    drawMatrix(arena, { x: 0, y: 0 }); // フィールドのブロックを描画
    drawShadow(player); // シャドウを描画
    drawMatrix(player.matrix, player.pos); // 現在のピースを描画
}

// フィールドとピースをマージ（固定）する関数
function merge(arena, player) {
    player.matrix.forEach((row, y) => { // ピースの各行をループ
        row.forEach((value, x) => { // ピースの各セルをループ
            if (value !== 0) { // セルが空でない場合
                arena[y + player.pos.y][x + player.pos.x] = value; // フィールドにブロックを固定
            }
        });
    });
}

// プレイヤーのピースを左右に移動する関数
// dir: 移動方向（-1: 左, 1: 右）
function playerMove(dir) {
    player.pos.x += dir; // ピースのx位置を移動
    if (collide(arena, player)) { // 移動後に衝突が発生した場合
        player.pos.x -= dir; // 元に戻す
    } else { // 衝突しなかった場合
        moveSound.currentTime = 0; // 移動音の再生位置をリセット
        moveSound.play(); // 移動音を再生
    }
}

// ピースを1ブロック下に落下させる関数
function playerDrop() {
    player.pos.y++; // ピースのy位置を1下げる
    if (collide(arena, player)) { // 落下後に衝突が発生した場合
        player.pos.y--; // 元に戻す
        merge(arena, player); // ピースをフィールドに固定
        placeSound.currentTime = 0; // ピース固定音の再生位置をリセット
        placeSound.play(); // ピース固定音を再生
        arenaSweep(); // ラインを消去
        playerReset(); // 新しいピースを生成
        if (gameOver()) { // ゲームオーバーかどうかをチェック
            handleGameOver(); // ゲームオーバー処理を実行
            return;
        }
    }
    dropCounter = 0; // 落下カウンターをリセット
}

// ピースをハードドロップ（最下部まで一気に落下）する関数
function playerHardDrop() {
    while (!collide(arena, player)) { // 衝突しない限り下に移動
        player.pos.y++;
    }
    player.pos.y--; // 最後の衝突位置の一つ上に設定
    merge(arena, player); // ピースをフィールドに固定
    placeSound.currentTime = 0; // ピース固定音の再生位置をリセット
    placeSound.play(); // ピース固定音を再生
    arenaSweep(); // ラインを消去
    playerReset(); // 新しいピースを生成
    if (gameOver()) { // ゲームオーバーかどうかをチェック
        handleGameOver(); // ゲームオーバー処理を実行
    }
}

// プレイヤーのピースをリセット（新しいピースを生成）する関数
function playerReset() {
    player.matrix = nextPiece; // 次のピースを現在のピースに設定
    player.pos.y = 0; // ピースの初期y位置を設定
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0); // ピースをフィールド中央に配置

    // ピースがフィールドと衝突している場合（ゲームオーバー）
    if (collide(arena, player)) {
        arena.forEach(row => row.fill(0)); // フィールドをクリア
        isGameOver = true; // ゲームオーバーフラグを設定
        handleGameOver(); // ゲームオーバー処理を実行
        stopBGM(); // BGMを停止
    }
    
    const pieces = 'TJZOSIL'; // 使用可能なピースの種類
    nextPiece = createPiece(pieces[pieces.length * Math.random() | 0]); // ランダムに次のピースを生成
    drawNextPiece(); // 次のピースを描画
}

// プレイヤーのピースを回転させる関数
// dir: 回転方向（1: 時計回り, -1: 反時計回り）
function playerRotate(dir) {
    const pos = player.pos.x; // 現在のx位置を記憶
    let offset = 1; // ピースをフィールド内に収めるためのオフセット
    rotate(player.matrix, dir); // ピースを回転
    // 回転後に衝突が発生する場合、ピースを左右にシフトして衝突を回避
    while (collide(arena, player)) {
        player.pos.x += offset; // ピースをシフト
        offset = -(offset + (offset > 0 ? 1 : -1)); // シフト方向を反転し、オフセットを増加
        if (offset > player.matrix[0].length) { // オフセットがピース幅を超えた場合
            rotate(player.matrix, -dir); // ピースを元に戻す
            player.pos.x = pos; // ピースのx位置を元に戻す
            return; // 回転を中止
        }
    }
    moveSound.currentTime = 0; // 回転音の再生位置をリセット
    moveSound.play(); // 回転音を再生
}

// ピースを回転させる関数
// matrix: 回転させるピースの行列
// dir: 回転方向（1: 時計回り, -1: 反時計回り）
function rotate(matrix, dir) {
    // 行列を転置
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    // 時計回りまたは反時計回りに回転
    if (dir > 0) {
        matrix.forEach(row => row.reverse()); // 各行を反転（時計回り）
    } else {
        matrix.reverse(); // 行全体を反転（反時計回り）
    }
}

// 指定されたタイプのピースを作成する関数
// type: ピースの種類（'T', 'O', 'L', 'J', 'I', 'S', 'Z'）
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

// 指定された幅と高さでマトリックス（行列）を作成する関数
// w: 幅
// h: 高さ
function createMatrix(w, h) {
    const matrix = [];
    while (h--) { // 高さ分ループ
        matrix.push(new Array(w).fill(0)); // 各行を0で埋める
    }
    return matrix;
}

// フィールドとプレイヤーのピースが衝突しているかを判定する関数
// arena: フィールドのマトリックス
// player: プレイヤーのピースの状態
function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos]; // ピースの形状と位置を取得
    for (let y = 0; y < m.length; ++y) { // ピースの各行をループ
        for (let x = 0; x < m[y].length; ++x) { // ピースの各セルをループ
            if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true; // 衝突が発生
            }
        }
    }
    return false; // 衝突なし
}

// フィールドのラインをチェックして、満たされたラインを消去する関数
function arenaSweep() {
    let rowCount = 1; // 消去するラインの数
    outer: for (let y = arena.length - 1; y > 0; --y) { // 下から上に向かってフィールドをチェック
        for (let x = 0; x < arena[y].length; ++x) { // 各セルをチェック
            if (arena[y][x] === 0) { // 空セルがある場合
                continue outer; // このラインは満たされていないので次のラインへ
            }
        }
        const row = arena.splice(y, 1)[0].fill(0); // ラインを削除して新しい空行を追加
        arena.unshift(row); // 上部に空行を追加
        ++y; // 次のラインを再チェック
        score += rowCount * 10; // スコアを加算
        rowCount *= 2; // 連続消去でスコア倍率を増加
        updateScore(); // スコアを更新表示
        lineClearSound.currentTime = 0; // ラインクリア音の再生位置をリセット
        lineClearSound.play(); // ラインクリア音を再生
    }
}

// スコアを更新する関数
function updateScore() {
    document.getElementById('score').innerText = score; // スコア表示を更新
}

// 次に出現するピースを描画する関数
function drawNextPiece() {
    nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height); // キャンバスをクリア
    // 次のピースを中央に配置するためのオフセットを計算
    const offsetX = Math.floor((nextCanvas.width / scale - nextPiece[0].length) / 2);
    const offsetY = Math.floor((nextCanvas.height / scale - nextPiece.length) / 2);
    // 次のピースを描画
    drawMatrix(nextPiece, { x: offsetX, y: offsetY }, 1, nextContext);
}

// ゲームのメイン更新ループを実行する関数
// time: requestAnimationFrameから渡される現在の時間
function update(time = 0) {
    const deltaTime = time - lastTime; // 前回のフレームからの経過時間を計算
    lastTime = time; // 最後の更新時間を更新
    dropCounter += deltaTime; // 落下カウンターを加算
    if (isFastDropping && dropCounter > fastDropInterval) { // 高速落下中で落下カウンターが閾値を超えた場合
        playerDrop(); // ピースを落下
        dropCounter = 0; // 落下カウンターをリセット
    } else if (dropCounter > dropInterval) { // 通常の落下カウンターが閾値を超えた場合
        playerDrop(); // ピースを落下
        dropCounter = 0; // 落下カウンターをリセット
    }
    draw(); // フィールドとピースを描画
    if (!isGameOver && !isPaused) { // ゲームオーバーでも一時停止でもない場合
        requestAnimationFrame(update); // 次のフレームをリクエスト
    }
}

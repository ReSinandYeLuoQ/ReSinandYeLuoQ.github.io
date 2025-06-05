/* ****************************************************************************
 * main.js —— 互动漫画与小游戏核心逻辑
 * 1. 漫画页依次显示各切片（播片）并切换页面
 * 2. 页面切换（点击箭头、或自动播放完毕后）
 * 3. 第三页点击箭头后进入小游戏，隐藏漫画页面
 * 4. 在 canvas 上实现小游戏：可拖拽的 3 个“我方物体”、随机分布的 3×3 = 9 个“敌方物体”
 *    - player1 碰到 enemy1 播放 1s 帧动画，期间 player1 不可移动，动画结束后消除该 enemy1
 *    - player2 碰到 enemy2，直接快速消失该 enemy2
 *    - player3 碰到 enemy3，直接快速消失该 enemy3
 *    - 当所有 9 个敌方消失后，背景渐变到 `bg-final.png`，并在随机位置出现 3 个“特殊动画”帧序列，
 *      放映 1s 后自动切换到最后一页漫画（page4）
 * ****************************************************************************/

/* ---------------------------- 全局常量与变量 ---------------------------- */
// 用于存储当前所在页面索引：1 表示 page1，2 表示 page2，3 表示 page3，4 表示 game-page 之后的 page4。
let currentPage = 1;

// 漫画页各自总切片数
const PART_COUNTS = {
  1: 5,  // page1 有 5 张
  2: 5,  // page2 有 5 张
  3: 1,  // page3 有 1 张
  4: 5   // page4 （结束漫画）有 5 张
};

// 存放每页已经展示到第几张切片
let shownParts = {
  1: 0,
  2: 0,
  3: 0,
  4: PART_COUNTS[4] // 结束页不自动播，直接全部显示
};

// 定时器引用（用于自动播放漫画）
let playTimers = {
  1: null,
  2: null
};

// 小游戏相关变量
let canvas, ctx;         // canvas 及其 2D 上下文
const GAME_WIDTH = 640;
const GAME_HEIGHT = 1008;

// 存储“我方物体”与“敌方物体”的数组
let players = [];    // 每个元素是 { id: 1/2/3, x, y, width, height, dragging, img （静态或帧序列） }
let enemies = [];    // 每个元素是 { id: 1/2/3, x, y, width, height, alive, img, disappearAnim? }

// 存储“特殊动画”部分
let specials = [];   // 每个元素是 { x, y, frameIndex, totalFrames, frameImages, done }

// 预加载图片，避免后面绘制时闪烁
const imageCache = {};

/* =========================== 工具函数 =========================== */
/**
 * loadImage(src) -> Promise<Image>
 * 用于动态加载图片并缓存，避免重复加载。
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (imageCache[src]) {
      resolve(imageCache[src]);
      return;
    }
    const img = new Image();
    img.src = src;
    img.onload = () => {
      imageCache[src] = img;
      resolve(img);
    };
    img.onerror = () => reject(new Error("无法加载图片：" + src));
  });
}

/**
 * sleep(ms) -> Promise<void>
 * 简易延时函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* =========================== 漫画播放逻辑 =========================== */
/**
 * showNextPart(pageNum)
 * 将第 pageNum 页的下一个 .comic-part 显示出来，若已经到最后一个，则停止自动播放。
 */
async function showNextPart(pageNum) {
  const total = PART_COUNTS[pageNum];
  let current = shownParts[pageNum];
  if (current >= total) {
    // 已经播放完毕
    return;
  }
  // 下一个要展示的序号
  const nextIndex = current + 1;
  const selector = `#page${pageNum} .comic-part[data-part="${nextIndex}"]`;
  const partDiv = document.querySelector(selector);
  if (!partDiv) return;
  // 显示该切片
  partDiv.style.display = "block";
  // （可选）淡入效果：从 0 到 1 的过渡
  partDiv.style.opacity = 0;
  partDiv.style.transition = "opacity 0.5s ease";
  // 强制浏览器应用初始样式，再切换到 1
  requestAnimationFrame(() => {
    partDiv.style.opacity = 1;
  });

  shownParts[pageNum] = nextIndex;

  // 如果尚未到最后一个，继续 1s 后自动播放
  if (nextIndex < total) {
    playTimers[pageNum] = setTimeout(() => {
      showNextPart(pageNum);
    }, 1000);
  }
}

/**
 * playPage(pageNum)
 * 自动播放 pageNum 页的所有切片（如果原来有定时器要清除则先清除），
 * 也可点击时触发此函数。
 */
function playPage(pageNum) {
  // 清除该页已有 timer
  if (playTimers[pageNum]) {
    clearTimeout(playTimers[pageNum]);
  }
  // 如果还没显示任何切片，就开始播放
  if (shownParts[pageNum] === 0) {
    showNextPart(pageNum);
  }
}

/**
 * switchToPage(nextPage)
 * 切换显示到第 nextPage 页，其它页全部隐藏。
 */
function switchToPage(nextPage) {
  // 隐藏当前页
  const currentSection = document.querySelector(`#page${currentPage}`);
  if (currentSection) currentSection.style.display = "none";
  // 如果 currentPage 是 3，且即将进入游戏页，则隐藏 #page3 并显示 #game-page
  if (currentPage === 3 && nextPage === 4) {
    document.querySelector(`#page3`).style.display = "none";
    document.querySelector(`#game-page`).style.display = "block";
    initGame(); // 进入第4页（小游戏）时初始化游戏
    currentPage = 4;
    return;
  }
  // 如果 currentPage 是 4（小游戏）且要切到第5页（page4），则隐藏游戏容器
  if (currentPage === 4 && nextPage === 5) {
    document.querySelector(`#game-page`).style.display = "none";
  }
  // 页面 ID 的映射：1-> page1，2-> page2，3-> page3，5-> page4
  if (nextPage >= 1 && nextPage <= 3) {
    const nextSection = document.querySelector(`#page${nextPage}`);
    if (nextSection) nextSection.style.display = "block";
  }
  if (nextPage === 5) {
    const endSection = document.querySelector(`#page4`);
    if (endSection) endSection.style.display = "block";
  }
  currentPage = nextPage;
}

/* ==================== 页面加载完成后绑定事件 ==================== */
window.addEventListener("DOMContentLoaded", () => {
  // 1. 直接调用 playPage(1) 播放第一页的漫画
  playPage(1);

  // 2. 点击第一页底部箭头，即可跳到第二页
  const arrow1 = document.getElementById("arrow1");
  arrow1.addEventListener("click", () => {
    // 如果第一页尚未播放完，也可以直接跳过
    clearTimeout(playTimers[1]);
    switchToPage(2);
    // 切换到第2页后，自动播放第2页
    playPage(2);
  });

  // 3. 点击第二页底部箭头，跳到第三页
  const arrow2 = document.getElementById("arrow2");
  arrow2.addEventListener("click", () => {
    clearTimeout(playTimers[2]);
    switchToPage(3);
    // 第3页只有 1 张，直接显示
    const onlyPart = document.querySelector(`#page3 .comic-part[data-part="1"]`);
    if (onlyPart) {
      onlyPart.style.display = "block";
      onlyPart.style.opacity = 0;
      onlyPart.style.transition = "opacity 0.5s ease";
      requestAnimationFrame(() => {
        onlyPart.style.opacity = 1;
      });
      shownParts[3] = 1;
    }
  });

  // 4. 点击第三页底部箭头，进入小游戏页面
  const arrow3 = document.getElementById("arrow3");
  arrow3.addEventListener("click", () => {
    switchToPage(4);
  });

  // 5. 第五页（page4）无箭头，无需绑定事件，漫画都是一次性显示
});

/* =========================== 小游戏逻辑部分 =========================== */
/**
 * initGame()
 * 初始化 canvas，加载游戏素材，创建我方/敌方对象，绑定拖拽/动画循环等。
 */
async function initGame() {
  // 1. 获取 canvas & ctx
  canvas = document.getElementById("game-canvas");
  ctx = canvas.getContext("2d");

  // 2. 预加载所有游戏素材（背景 / 玩家帧 / 静态玩家 / 敌人 / 特殊动画帧）
  await preloadGameAssets();

  // 3. 初始化游戏实体：3 个玩家，9 个敌人（3 类 × 3 个）
  initGameEntities();

  // 4. 绑定鼠标 & 触摸 事件，实现拖拽功能
  bindDragEvents();

  // 5. 启动游戏主循环
  requestAnimationFrame(gameLoop);
}

/**
 * preloadGameAssets()
 *   - 加载背景图片
 *   - 加载 player1 的帧动画序列
 *   - 加载 player2、player3 静态图
 *   - 加载 enemy1, enemy2, enemy3 图
 *   - 加载特殊动画的一组帧
 */
async function preloadGameAssets() {
  // 背景图：初始 & 最终
  await loadImage("images/game/bg-initial.png");
  await loadImage("images/game/bg-final.png");

  // player1 所有帧
  const player1FrameCount = 9; // 假设有 9 帧，实际根据你的资源自行修改
  for (let i = 1; i <= player1FrameCount; i++) {
    await loadImage(`images/game/player1-frame${i}.png`);
  }

  // player2 & player3 静态
  await loadImage("images/game/player2.png");
  await loadImage("images/game/player3.png");

  // enemy1 / enemy2 / enemy3
  await loadImage("images/game/enemy1.png");
  await loadImage("images/game/enemy2.png");
  await loadImage("images/game/enemy3.png");

  // 特殊动画帧（假设 M = 1 帧），实际根据你素材命名来改
  const specialFrameCount = 1;
  for (let i = 1; i <= specialFrameCount; i++) {
    await loadImage(`images/game/special-frame${i}.png`);
  }
}

/**
 * initGameEntities()
 * 在画布上创建 3 个玩家和 9 个敌人，初始位置如下：
 *   - 三个玩家沿底部水平排列
 *   - 三类敌人各 3 个，以随机位置放置，确保不重叠玩家初始范围
 */
function initGameEntities() {
  players = [];
  enemies = [];
  specials = [];

  // —— 1. 创建“我方”3个物体 ——
  const playerWidth = 80,
        playerHeight = 80; // 假设玩家贴图都是 80×80

  // y 坐标固定在底部离画布底部 20px
  const baseY = GAME_HEIGHT - playerHeight - 20;
  // x 坐标在 3 等分的 1/4、2/4、3/4 处
  const xs = [
    GAME_WIDTH * (1 / 4) - playerWidth / 2,
    GAME_WIDTH * (2 / 4) - playerWidth / 2,
    GAME_WIDTH * (3 / 4) - playerWidth / 2,
  ];

  // player1：带帧动画
  players.push({
    id: 1,
    x: xs[0],
    y: baseY,
    width: playerWidth,
    height: playerHeight,
    dragging: false,
    // 准备 player1 的帧序列
    frameImages: [],      // 存放 Image 对象
    totalFrames: 10,      // 假设 10 帧
    currentFrame: 0,      // 当前播放到哪一帧
    isPlayingAnimation: false // 播放动画期间玩家不可移动
  });
  // player2：静态图
  players.push({
    id: 2,
    x: xs[1],
    y: baseY,
    width: playerWidth,
    height: playerHeight,
    dragging: false,
    img: imageCache["images/game/player2.png"]
  });
  // player3：静态图
  players.push({
    id: 3,
    x: xs[2],
    y: baseY,
    width: playerWidth,
    height: playerHeight,
    dragging: false,
    img: imageCache["images/game/player3.png"]
  });

  // 把 player1 的帧图对象推入 frameImages 数组
  for (let i = 1; i <= 10; i++) {
    players[0].frameImages.push(
      imageCache[`images/game/player1-frame${i}.png`]
    );
  }

  // —— 2. 创建“敌方”3类×3个，共 9 个 —— 
  const enemyWidth = 60,
        enemyHeight = 60; // 假设敌人贴图都是 60×60

  // 辅助函数：生成一个随机不重叠（与玩家区域）的坐标
  function getRandomEnemyPos() {
    // 限制：x ∈ [0, GAME_WIDTH - enemyWidth], y ∈ [0, GAME_HEIGHT - 200]
    // 让敌人不要出现在离底部玩家太近的地方
    const x = Math.random() * (GAME_WIDTH - enemyWidth);
    const y = Math.random() * (GAME_HEIGHT - enemyHeight - 200);
    return { x, y };
  }

  // 每种敌人放 3 个
  for (let eId = 1; eId <= 3; eId++) {
    for (let k = 0; k < 3; k++) {
      const pos = getRandomEnemyPos();
      enemies.push({
        id: eId,
        x: pos.x,
        y: pos.y,
        width: enemyWidth,
        height: enemyHeight,
        alive: true,
        img: imageCache[`images/game/enemy${eId}.png`]
      });
    }
  }
}

/**
 * bindDragEvents()
 * 给 canvas 绑定鼠标 / 触摸 事件，实现“拖拽玩家”的功能。
 * 当玩家按下鼠标或触摸时，检测是否在某个玩家的范围内，如果是且该玩家当前不在动画播放中，则标记 dragging = true；
 * 当鼠标或手指移动时，如果 dragging = true，则更新该玩家的 x, y（保持物体中心在手指/鼠标位置），
 * 并确保不超出画布边界；
 * 松开时 dragging = false。
 */
function bindDragEvents() {
  let activePlayer = null; // 当前正在拖拽的 player 对象
  let offsetX = 0, offsetY = 0; // 点击点相对于 player 左上角的偏移

  // 获取鼠标或触摸坐标相对于 canvas 左上角的 x,y
  function getPointerPos(evt) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (evt.touches) {
      clientX = evt.touches[0].clientX;
      clientY = evt.touches[0].clientY;
    } else {
      clientX = evt.clientX;
      clientY = evt.clientY;
    }
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
  }

  // 按下（mousedown / touchstart）
  function handleDown(evt) {
    evt.preventDefault();
    const { x, y } = getPointerPos(evt);
    // 倒序遍历 players（确保鼠标点到重叠时，优先顶层玩家 —— 这里没有层叠，但习惯如此）
    for (let i = players.length - 1; i >= 0; i--) {
      const p = players[i];
      if (
        !p.isPlayingAnimation && // 如果正在动画播放，则不可拖
        x >= p.x && x <= p.x + p.width &&
        y >= p.y && y <= p.y + p.height
      ) {
        activePlayer = p;
        p.dragging = true;
        // 记录点击点相对于玩家左上角的偏移，拖拽时保持相对位置
        offsetX = x - p.x;
        offsetY = y - p.y;
        break;
      }
    }
  }

  // 移动（mousemove / touchmove）
  function handleMove(evt) {
    if (!activePlayer) return;
    evt.preventDefault();
    const { x, y } = getPointerPos(evt);
    // 计算新的左上角坐标
    let newX = x - offsetX;
    let newY = y - offsetY;
    // 边界检测：不能出画布
    newX = Math.max(0, Math.min(newX, GAME_WIDTH - activePlayer.width));
    newY = Math.max(0, Math.min(newY, GAME_HEIGHT - activePlayer.height));
    activePlayer.x = newX;
    activePlayer.y = newY;
  }

  // 松开（mouseup / touchend / touchcancel）
  function handleUp(evt) {
    if (activePlayer) {
      activePlayer.dragging = false;
      activePlayer = null;
    }
  }

  // 绑定事件（支持鼠标和触摸）
  canvas.addEventListener("mousedown", handleDown);
  canvas.addEventListener("mousemove", handleMove);
  canvas.addEventListener("mouseup", handleUp);
  canvas.addEventListener("mouseleave", handleUp);

  canvas.addEventListener("touchstart", handleDown);
  canvas.addEventListener("touchmove", handleMove);
  canvas.addEventListener("touchend", handleUp);
  canvas.addEventListener("touchcancel", handleUp);
}

/**
 * gameLoop()
 * 游戏主循环，负责每帧清屏、绘制背景、绘制敌人、绘制玩家、检测碰撞、更新动画。
 * 当所有敌人都消失后，触发特殊背景渐变与特殊动画，之后切到下一页漫画。
 */
let backgroundAlpha = 1.0;     // 用于背景渐变：1 表示初始背景完全不透明，0 表示渐变结束
let specialPhase = false;      // 标记是否进入“特殊动画阶段”
let specialStartTime = null;   // 记录特殊动画开始时间

async function gameLoop(timestamp) {
  // 1. 清空画布
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // 2. 绘制背景：如果 specialPhase 为 false，绘制初始背景；否则混合渐变到最终背景
  if (!specialPhase) {
    const bg = imageCache["images/game/bg-initial.png"];
    ctx.drawImage(bg, 0, 0, GAME_WIDTH, GAME_HEIGHT);
  } else {
    // 混合初始背景与最终背景，alpha 由 backgroundAlpha 决定
    const bg1 = imageCache["images/game/bg-initial.png"];
    const bg2 = imageCache["images/game/bg-final.png"];
    // 绘制 bg1
    ctx.globalAlpha = backgroundAlpha;
    ctx.drawImage(bg1, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    // 绘制 bg2，alpha = (1 - backgroundAlpha)
    ctx.globalAlpha = 1 - backgroundAlpha;
    ctx.drawImage(bg2, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.globalAlpha = 1.0; // 恢复不透明
  }

  // 3. 如果还没进入 specialPhase，就先绘制所有“活着”的敌人，否则跳过
  if (!specialPhase) {
    enemies.forEach(enemy => {
      if (enemy.alive) {
        ctx.drawImage(enemy.img, enemy.x, enemy.y, enemy.width, enemy.height);
      }
    });
  }

  // 4. 绘制并更新玩家状态（包括动画帧）
  players.forEach(player => {
    if (player.id === 1 && player.isPlayingAnimation) {
      // 正在播放 player1 的帧动画
      const frameImg = player.frameImages[player.currentFrame];
      ctx.drawImage(frameImg, player.x, player.y, player.width, player.height);
      // 每帧播放间隔约 100ms，总共 10 帧 -> 1s 结束
      if (!player._lastFrameTime) {
        player._lastFrameTime = timestamp;
      }
      const elapsed = timestamp - player._lastFrameTime;
      if (elapsed >= 100) {
        player.currentFrame++;
        player._lastFrameTime = timestamp;
      }
      if (player.currentFrame >= player.totalFrames) {
        // 动画播放完毕，重置
        player.isPlayingAnimation = false;
        player.currentFrame = 0;
        player._lastFrameTime = null;
      }
    } else if (player.id === 1) {
      // 如果 player1 没在动画，就绘制静态第 1 帧
      ctx.drawImage(player.frameImages[0], player.x, player.y, player.width, player.height);
    } else {
      // player2 或 player3 直接绘制静态 img
      ctx.drawImage(player.img, player.x, player.y, player.width, player.height);
    }
  });

  // 5. 如果未进入 specialPhase，需要检测碰撞：遍历每个玩家／敌人组合
  if (!specialPhase) {
    players.forEach(player => {
      if (player.id === 1 && player.isPlayingAnimation) {
        // 播放动画期间不检测碰撞
        return;
      }
      enemies.forEach(enemy => {
        if (!enemy.alive) return;
        // 只有当两者边界框相交时才判定碰撞
        if (rectsOverlap(player, enemy)) {
          // 根据 id 做不同处理
          if (player.id === 1 && enemy.id === 1) {
            // 播放 1s 帧动画，期间 player1 不可移动
            player.isPlayingAnimation = true;
            player.currentFrame = 0;
            player._lastFrameTime = null;
            // 在动画结束时将该敌人消失
            setTimeout(() => {
              enemy.alive = false;
              checkAllEnemiesCleared();
            }, player.totalFrames * 100 + 50); // 10帧×100ms + 50ms 缓冲
          }
          if (player.id === 2 && enemy.id === 2) {
            // 直接快速消失
            enemy.alive = false;
            checkAllEnemiesCleared();
          }
          if (player.id === 3 && enemy.id === 3) {
            // 直接快速消失
            enemy.alive = false;
            checkAllEnemiesCleared();
          }
        }
      });
    });
  }

  // 6. 如果进入 specialPhase，就绘制特殊动画帧
  if (specialPhase) {
    // 6.1 第一次进入 specialPhase 时，记录开始时间并初始化 3 个 specials 对象
    if (!specialStartTime) {
      specialStartTime = timestamp;
      generateSpecials();
    }
    // 6.2 随机在画布上绘制 3 个 special 帧动画
    const now = timestamp;
    const elapsedSinceSpecial = now - specialStartTime; // 单位 ms
    // 背景渐变：持续 500ms，从 backgroundAlpha=1 到 backgroundAlpha=0
    if (elapsedSinceSpecial <= 500) {
      backgroundAlpha = 1 - elapsedSinceSpecial / 500;
    } else {
      backgroundAlpha = 0;
    }
    // 遍历每个 special，播放其帧动画
    specials.forEach(sp => {
      const frameDuration = 100; // 每帧 100ms
      const frameIndex = Math.floor(elapsedSinceSpecial / frameDuration);
      if (frameIndex < sp.totalFrames) {
        const frameImg = imageCache[`images/game/special-frame${frameIndex + 1}.png`];
        ctx.drawImage(frameImg, sp.x, sp.y, sp.width, sp.height);
      }
    });
    // 6.3 如果已经超过 1000ms（1s），直接跳转到最后一页漫画（page4）
    if (elapsedSinceSpecial >= 1000) {
      switchToPage(5);
      return; // 停止后续帧循环
    }
  }

  // 7. 继续下一帧
  requestAnimationFrame(gameLoop);
}

/**
 * rectsOverlap(a, b) -> boolean
 * 简易矩形碰撞检测：判断 a 与 b 是否边界框相交。
 */
function rectsOverlap(a, b) {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

/**
 * checkAllEnemiesCleared()
 * 检测 enemies 数组里是否所有项都已 alive = false。如果是，则进入特殊阶段。
 */
function checkAllEnemiesCleared() {
  const anyAlive = enemies.some(e => e.alive);
  if (!anyAlive && !specialPhase) {
    // 触发 specialPhase
    specialPhase = true;
  }
}

/**
 * generateSpecials()
 * 在特殊阶段一开始，生成 3 个 special 对象，每个在随机位置，大小与 player1 相似（80×80）。
 */
function generateSpecials() {
  specials = [];
  for (let i = 0; i < 3; i++) {
    // 随机位置
    const x = Math.random() * (GAME_WIDTH - 80);
    const y = Math.random() * (GAME_HEIGHT - 80);
    specials.push({
      x: x,
      y: y,
      width: 80,
      height: 80,
      totalFrames: 8, // 假设 M = 8
    });
  }
}

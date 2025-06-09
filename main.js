window.addEventListener('DOMContentLoaded', () => {

  console.log("✅ main.js 已加载");

  const pages = ["page1", "page2", "page3", "page4", "page5", "page6"];

  function showPage(index) {
    console.log(`[showPage] 切换到页面 ${index + 1}`);
    pages.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove("active");
    });
    const target = document.getElementById(pages[index]);
    if (target) target.classList.add("active");
  }

  function startComicSequence(baseId, count, onDone) {
  let i = 1;
  function showNext() {
    const el = document.getElementById(`${baseId}-${i}`);
    if (el) {
el.classList.add("show");      
      el.style.display = "block";           // 👈 显示元素
             // 👈 启动渐显动画
      console.log(`[漫画] 显示图像 ${baseId}-${i}`);
    
    }
    if (i < count) {
      i++;
      setTimeout(showNext, 1000);
    } else if (onDone) {
      console.log(`[漫画] ${baseId} 播放完成`);
      onDone();
    }
  }
  showNext();
}


  // 页面1自动播放到页面2
  setTimeout(() => document.getElementById("line1").style.opacity = 1, 1000);
  setTimeout(() => document.getElementById("line2").style.opacity = 1, 2000);
  setTimeout(() => {
    showPage(1);
    startComicSequence("comic2", 5, () => {
      document.getElementById("arrow2").style.display = "block";
    });
  }, 5000);

  document.getElementById("arrow2").onclick = () => {
    showPage(2);
    startComicSequence("comic3", 5, () => {
      document.getElementById("arrow3").style.display = "block";
    });
  };

  document.getElementById("arrow3").onclick = () => {
    showPage(3);
    initGame();
  };

  document.getElementById("arrow5").onclick = () => {
  showPage(5);
  setTimeout(() => {
    document.getElementById("final-image").style.display = "block";

    // ✅ 这里开始控制按钮的动画
    setTimeout(() => {
      const btn = document.getElementById("final-button");
      if (btn) {
        btn.classList.add("show");
      }
    }, 5000);  // 等待5秒后触发动画

  }, 3000);  // 图片延迟3秒显示
};

function initGame() {
  console.log("[小游戏] 初始化开始");

  document.body.style.backgroundColor = "white";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  let hero = {
    x: 300,
    y: 900,
    r: 70, // ⬆️ 放大 100%
    dragging: false,
    locked: false,
    visible: true
  };

  let enemies = [];
  const numEnemies = Math.floor(Math.random() * 3) + 3;
  for (let i = 0; i < numEnemies; i++) {
    enemies.push({
      x: Math.random() * 540 + 50,
      y: Math.random() * 500 + 50,
      r: 100, // ⬆️ 放大 800%
      alive: true
    });
  }

  let currentBackground = 1;
  let frame = 0;
  let animPlaying = false;
  let animEnemyIndex = null;
  let lastAnimTime = 0;
  const animInterval = 100;
  let gameEnded = false;

  const heroImg = new Image();
  heroImg.src = "assets/images/hero.png";
  const enemyImg = new Image();
  enemyImg.src = "assets/images/enemy.png";

  const sprite1 = new Image();
  sprite1.src = "assets/images/sprite1.png";
  const sprite2 = new Image();
  sprite2.src = "assets/images/sprite2.png";

  const animFrames = [];
  for (let i = 1; i <= 9; i++) {
    const img = new Image();
    img.src = `assets/images/anim-${i}.png`;
    animFrames.push(img);
  }

  canvas.addEventListener("mousedown", e => {
    if (hero.locked || !hero.visible) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (Math.hypot(mx - hero.x, my - hero.y) < hero.r) {
      hero.dragging = true;
    }
  });

  canvas.addEventListener("mousemove", e => {
    if (!hero.dragging || hero.locked || !hero.visible) return;
    const rect = canvas.getBoundingClientRect();
    hero.x = Math.max(hero.r, Math.min(640 - hero.r, e.clientX - rect.left));
    hero.y = Math.max(hero.r, Math.min(1008 - hero.r, e.clientY - rect.top));
  });

  canvas.addEventListener("mouseup", () => {
    hero.dragging = false;
  });

  const bgImage = new Image();
  bgImage.src = `assets/images/game-bg${currentBackground}.jpg`;
  bgImage.onload = () => requestAnimationFrame(draw);

  function draw(timestamp) {
    ctx.clearRect(0, 0, 640, 1008);
    ctx.drawImage(bgImage, 0, 0, 640, 1008);

    enemies.forEach((e, index) => {
      if (!e.alive) return;
      ctx.drawImage(enemyImg, e.x - e.r, e.y - e.r, e.r * 2, e.r * 2);
    });

    if (animPlaying) {
      if (!lastAnimTime) lastAnimTime = timestamp;
      if (timestamp - lastAnimTime >= animInterval) {
        if (frame < animFrames.length) {
          const anim = animFrames[frame];
          const scale = 0.2;
          const w = anim.width * scale;
          const h = anim.height * scale;
          ctx.drawImage(anim, hero.x - w / 2, hero.y - h / 2, w, h);
          console.log(`[动画] 播放第 ${frame + 1} 帧`);
          frame++;
          lastAnimTime = timestamp;
        } else {
          console.log(`[动画] 播放结束，对敌人${animEnemyIndex} 执行消除`);
          frame = 0;
          animPlaying = false;
          hero.locked = false;
          if (animEnemyIndex !== null && enemies[animEnemyIndex]) {
            enemies[animEnemyIndex].alive = false;
          } else {
            console.warn("⚠️ animEnemyIndex 无效或敌人不存在");
          }
          animEnemyIndex = null;
          lastAnimTime = 0;
        }
      } else {
        if (frame < animFrames.length) {
          const anim = animFrames[frame];
          const scale = 0.2;
          const w = anim.width * scale;
          const h = anim.height * scale;
          ctx.drawImage(anim, hero.x - w / 2, hero.y - h / 2, w, h);
        }
      }
    } else if (hero.visible) {
      ctx.drawImage(heroImg, hero.x - hero.r, hero.y - hero.r, hero.r * 2, hero.r * 2);
    }

    if (!animPlaying && hero.visible) {
      enemies.forEach((e, index) => {
        if (!e.alive) return;
        if (Math.hypot(hero.x - e.x, hero.y - e.y) < hero.r + e.r) {
          console.log(`[碰撞检测] 击中敌人 ${index}`);
          animPlaying = true;
          hero.locked = true;
          animEnemyIndex = index;
          frame = 0;
          lastAnimTime = 0;
        }
      });
    }

    if (!animPlaying && enemies.every(e => !e.alive) && !gameEnded) {
      console.log("[小游戏] 所有敌人清除，开始后续流程");
      gameEnded = true;
      setTimeout(() => afterEnemyCleared(ctx), 500);
      return;
    }

    requestAnimationFrame(draw);
  }

  function afterEnemyCleared(ctx) {
    hero.visible = false;
    fadeToNextBackground(() => {
      playSprite1(() => {
        fadeToNextBackground(() => {
          playSprite2(() => {
            fadeToNextBackground(() => {
              setTimeout(() => {
                showPage(4);
                startComicSequence("comic5", 4, () => {
                  document.getElementById("arrow5").style.display = "block";
                });
              }, 1500);
            });
          });
        });
      });
    });
  }

  function fadeToNextBackground(callback) {
    console.log(`[背景切换] 当前是 ${currentBackground} → ${currentBackground + 1}`);
    let alpha = 0;
    const nextBackgroundIndex = currentBackground + 1;
    const tempBg = new Image();
    const toBg = `assets/images/game-bg${nextBackgroundIndex}.jpg`;
    tempBg.src = toBg;
    tempBg.onload = () => {
      const fade = () => {
        ctx.drawImage(tempBg, 0, 0, 640, 1008);
        ctx.fillStyle = `rgba(255,255,255,${1 - alpha})`;
        ctx.fillRect(0, 0, 640, 1008);
        alpha += 0.05;
        if (alpha < 1) {
          requestAnimationFrame(fade);
        } else {
          currentBackground = nextBackgroundIndex;
          bgImage.src = toBg;
          if (callback) setTimeout(callback, 500);
        }
      };
      fade();
    };
  }

  function playSprite1(callback) {
    let x = -300, y = 500;
    const loop = () => {
      ctx.clearRect(0, 0, 640, 1008);
      ctx.drawImage(bgImage, 0, 0, 640, 1008);
      ctx.drawImage(sprite1, x, y, 200, 200);
      x += 2; // ⬆️ 加速一倍
      y = 500 - Math.sin(x / 80) * 100;
      if (x < 700) {
        requestAnimationFrame(loop);
      } else {
        if (callback) setTimeout(callback, 300);
      }
    };
    loop();
  }

  function playSprite2(callback) {
    let angle = 0;
    let x = -300;
    const loop = () => {
      ctx.clearRect(0, 0, 640, 1008);
      ctx.drawImage(bgImage, 0, 0, 640, 1008);
      x += 2; // ⬆️ 加速一倍
      const r = 280;
      const centerX = 320;
      const centerY = 504;
      let y = centerY + Math.sin(angle) * r;
      if (x > 0 && x < 640) {
        angle += 0.2;
      }
      ctx.drawImage(sprite2, x, y, 200, 200);
      if (x < 700) {
        requestAnimationFrame(loop);
      } else {
        if (callback) setTimeout(callback, 300);
      }
    };
    loop();
  }
}

});

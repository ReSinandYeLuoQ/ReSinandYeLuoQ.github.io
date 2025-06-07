window.addEventListener('DOMContentLoaded', () => {
  const pages = ["page1", "page2", "page3", "page4", "page5", "page6"];

  function showPage(index) {
    console.log(`[showPage] 切换到页面 ${index + 1}`);
    pages.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove("active");
    });
    const target = document.getElementById(pages[index]);
    if (target) target.classList.add("active");
    else console.warn(`[showPage] 没有找到页面 ${pages[index]}`);
  }

  function startComicSequence(baseId, count, onDone) {
    let i = 1;
    function showNext() {
      const el = document.getElementById(`${baseId}-${i}`);
      if (el) {
        el.style.display = "block";
        console.log(`[漫画] 显示图像 ${baseId}-${i}`);
      } else {
        console.warn(`[漫画] 未找到图像 ${baseId}-${i}`);
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

  // 页面3到页面4小游戏启动逻辑
  const arrow3 = document.getElementById("arrow3");
  if (arrow3) {
    arrow3.addEventListener("click", () => {
      console.log("[箭头3] 被点击，进入小游戏页面");
      showPage(3); // page4
      initGame();
    });
  }

  // 页面5跳转到页面6
  const arrow5 = document.getElementById("arrow5");
  if (arrow5) {
    arrow5.addEventListener("click", () => {
      console.log("[箭头5] 被点击，进入第六页");
      showPage(5); // page6
      setTimeout(() => {
        const finalImage = document.getElementById("final-image");
        const linkBtn = document.querySelector(".link-button");
        if (finalImage) {
          finalImage.style.display = "block";
          console.log("[页面6] 显示结尾图像");
        }
        if (linkBtn) {
          linkBtn.style.display = "block";
          console.log("[页面6] 显示链接按钮");
        }
      }, 3000);
    });
  }

  // 小游戏逻辑
  function initGame() {
    console.log("[小游戏] initGame 开始");
    const canvas = document.getElementById("gameCanvas");
    if (!canvas) {
      console.error("[小游戏] 没找到 canvas 元素！");
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("[小游戏] 无法获取 canvas 上下文！");
      return;
    }

    console.log("[小游戏] 获取 canvas 成功");

    let player = {
      x: 300,
      y: 900,
      r: 30,
      dragging: false
    };

    let enemies = [];
    for (let i = 0; i < 3; i++) {
      enemies.push({
        x: 100 + i * 150,
        y: 300,
        r: 20,
        alive: true
      });
    }

    console.log("[小游戏] 敌人生成完成：", enemies);

    canvas.addEventListener("mousedown", e => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      if (Math.hypot(mx - player.x, my - player.y) < player.r) {
        player.dragging = true;
        console.log("[小游戏] 开始拖拽玩家");
      }
    });

    canvas.addEventListener("mousemove", e => {
      if (!player.dragging) return;
      const rect = canvas.getBoundingClientRect();
      player.x = e.clientX - rect.left;
      player.y = e.clientY - rect.top;
    });

    canvas.addEventListener("mouseup", () => {
      if (player.dragging) {
        console.log("[小游戏] 停止拖拽玩家");
        player.dragging = false;
      }
    });

    function draw() {
      ctx.clearRect(0, 0, 640, 1008);
      ctx.fillStyle = "#eee";
      ctx.fillRect(0, 0, 640, 1008);

      // 玩家
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
      ctx.fillStyle = "red";
      ctx.fill();

      // 敌人
      enemies.forEach((e, index) => {
        if (!e.alive) return;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fillStyle = "blue";
        ctx.fill();

        if (Math.hypot(player.x - e.x, player.y - e.y) < player.r + e.r) {
          console.log(`[小游戏] 撞到了敌人 ${index}`);
          e.alive = false;
        }
      });

      if (enemies.every(e => !e.alive)) {
        console.log("[小游戏] 所有敌人已消灭，即将切换到第五页");
        setTimeout(() => {
          showPage(4); // 第五页
          startComicSequence("comic5", 4, () => {
            const arrow5 = document.getElementById("arrow5");
            if (arrow5) {
              arrow5.style.display = "block";
              console.log("[页面5] 显示箭头");
            }
          });
        }, 1000);
        return;
      }

      requestAnimationFrame(draw);
    }

    draw();
  }
});

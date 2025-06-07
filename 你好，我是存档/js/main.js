window.addEventListener('DOMContentLoaded', () => {
  const text1 = document.getElementById("text1");
  const text2 = document.getElementById("text2");
  const page1 = document.getElementById("page1");
  const page2 = document.getElementById("page2");
  const nextBtn = document.getElementById("next-button");

  // 安全检查元素是否存在
  if (!text1 || !text2 || !page1 || !page2 || !nextBtn) {
    console.error("某些HTML元素未找到，请检查HTML结构是否一致。");
    return;
  }

  // 页面加载后淡入文本
  setTimeout(() => {
    text1.style.opacity = 1;
    setTimeout(() => {
      text2.style.opacity = 1;

      // 等待三秒后切换页面
      setTimeout(() => {
        page1.style.display = "none";
        page2.style.display = "block";
      }, 3000);

    }, 1500);
  }, 500);

  // 下一页按钮点击事件（暂时仅打印）
  nextBtn.addEventListener("click", () => {
    alert("你点击了下一页！这里可以切换到第三页");
    // TODO: 切换 page3
  });
});

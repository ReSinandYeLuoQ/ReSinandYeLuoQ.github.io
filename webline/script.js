// 当前显示的页面索引
let currentPage = 0;
const pages = document.querySelectorAll('.page');
const gamePage = document.querySelector('.game-page');
const nextButton = document.getElementById('nextButton');

// 显示第一页
showPage(0);

// 翻页按钮点击事件
function nextPage() {
    if (currentPage < 4) {
        // 显示下一页空白页面
        currentPage++;
        showPage(currentPage);
    } else {
        // 显示游戏页面
        showGamePage();
    }
}

// 显示指定的空白页面
function showPage(pageIndex) {
    pages.forEach((page, index) => {
        if (index === pageIndex) {
            page.style.display = 'block';
        } else {
            page.style.display = 'none';
        }
    });
    nextButton.style.display = 'block';
}

// 显示游戏页面
function showGamePage() {
    pages.forEach(page => {
        page.style.display = 'none';
    });
    gamePage.style.display = 'block';
    nextButton.style.display = 'none';
    initGame();
}

// 游戏初始化
function initGame() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 640;
    canvas.height = 1008;

    // 定义图形类
    class Shape {
        constructor(x, y, type, color, size) {
            this.x = x;
            this.y = y;
            this.type = type;
            this.color = color;
            this.size = size;
            this.isDragging = false;
        }

        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            if (this.type === 'circle') {
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            } else if (this.type === 'square') {
                ctx.rect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
            } else if (this.type === 'triangle') {
                ctx.moveTo(this.x, this.y - this.size);
                ctx.lineTo(this.x - this.size, this.y + this.size);
                ctx.lineTo(this.x + this.size, this.y + this.size);
                ctx.closePath();
            } else if (this.type === 'diamond') {
                ctx.moveTo(this.x, this.y - this.size);
                ctx.lineTo(this.x + this.size, this.y);
                ctx.lineTo(this.x, this.y + this.size);
                ctx.lineTo(this.x - this.size, this.y);
                ctx.closePath();
            }
            ctx.fill();
        }
    }

    // 创建图形
    const shapes = [];
    const colors = ['#ff000080', '#0000ff80', '#00ff0080'];
    const types = ['triangle', 'square', 'diamond'];
    const smallShapesCount = Math.floor(Math.random() * 3) + 3; // 3-5个小型图形
    const largeShapesCount = 3; // 3个大型圆形

    for (let i = 0; i < smallShapesCount; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = 30; // 小型图形大小
        shapes.push(new Shape(x, y, type, '#000', size));
    }

    for (let i = 0; i < largeShapesCount; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = 50; // 大型图形大小
        shapes.push(new Shape(x, y, 'circle', colors[i], size));
    }

    // 渲染函数
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        shapes.forEach(shape => {
            shape.draw();
        });
    }

    // 鼠标事件处理
    let selectedShape = null;

    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        shapes.forEach(shape => {
            if (shape.type === 'circle') {
                const distance = Math.sqrt((shape.x - x) ** 2 + (shape.y - y) ** 2);
                if (distance < shape.size) {
                    selectedShape = shape;
                    shape.isDragging = true;
                }
            }
        });
    });

    canvas.addEventListener('mousemove', (e) => {
        if (selectedShape) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            selectedShape.x = x;
            selectedShape.y = y;
        }
    });

    canvas.addEventListener('mouseup', () => {
        if (selectedShape) {
            selectedShape.isDragging = false;
            selectedShape = null;
        }
    });

    // 游戏逻辑
    function gameLoop() {
        render();
        requestAnimationFrame(gameLoop);
    }

    gameLoop();
}
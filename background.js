const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let gameImages = [];

// Configuration
const ICON_SIZE = 60; // Size of the floating icons
const PARTICLE_COUNT = 30; // How many icons on screen
const SPEED_FACTOR = 1.0; // Speed multiplier

// Resize Canvas
function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}

window.addEventListener('resize', resize);
resize();

// Fetch Data & Start
fetch('data.json')
    .then(res => res.json())
    .then(data => {
        // Extract Unique Images
        const uniqueUrls = [...new Set(data.games.map(g => g.image))];
        loadImages(uniqueUrls);
    })
    .catch(err => console.error("BG: Failed to load data", err));

function loadImages(urls) {
    let loadedCount = 0;
    urls.forEach(url => {
        const img = new Image();
        img.src = url;
        img.onload = () => {
            gameImages.push(img);
            loadedCount++;
            if (loadedCount === urls.length) {
                initParticles();
                animate();
            }
        };
    });
}

class Particle {
    constructor() {
        this.reset(true);
    }

    reset(initial = false) {
        this.img = gameImages[Math.floor(Math.random() * gameImages.length)];
        this.x = Math.random() * width;
        // If initial, scatter vertically. If reset, start at bottom.
        this.y = initial ? Math.random() * height : height + ICON_SIZE;
        this.speed = (Math.random() * 0.5 + 0.2) * SPEED_FACTOR;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
        this.size = (Math.random() * 0.5 + 0.5) * ICON_SIZE; // Random scale 0.5x to 1x
        this.opacity = Math.random() * 0.2 + 0.05; // Low opacity (0.05 to 0.25)
    }

    update() {
        this.y -= this.speed;
        this.rotation += this.rotationSpeed;

        // Reset if off top screen
        if (this.y < -this.size) {
            this.reset();
        }
    }

    draw() {
        if (!this.img) return;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.drawImage(this.img, -this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();
    }
}

function initParticles() {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle());
    }
}

function animate() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
        p.update();
        p.draw();
    });

    requestAnimationFrame(animate);
}

// Interactive Mouse "Push" (Optional - simpler for now just to have them float)
canvas.addEventListener('mousemove', (e) => {
    // We could add repulsion here if requested later
});

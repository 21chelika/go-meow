const { Engine, Render, World, Bodies, Events, Body } = Matter;

// =================== CANVAS ===================
const canvas = document.getElementById("game");
canvas.width = 340;
canvas.height = 520;
const SPRITE_BASE = 256;
const MAX_RADIUS = 65;
const BOX_PADDING = 20;
const BOX_LEFT = BOX_PADDING;
const BOX_RIGHT = canvas.width - BOX_PADDING;
const SIZE_SCALE = 0.55;
const DROP_GAP = 8;
const GRID_COL = MAX_RADIUS * 2.2; // 🔑 jarak antar item (ANTI NUMPUK)
const merging = new Set();
const FLOOR_HEIGHT = 12;
const FLOOR_OFFSET = MAX_RADIUS * SIZE_SCALE; // ⬅️ INI KUNCI

const floor = Bodies.rectangle(
  canvas.width / 2,
  canvas.height - FLOOR_HEIGHT / 2 - FLOOR_OFFSET,
  canvas.width,
  FLOOR_HEIGHT,
  {
    isStatic: true,
    render: { visible: false }
  }
);



// =================== SCORE ===================
let score = 0;
const scoreBox = document.getElementById("score");

// =================== ENGINE ===================
const engine = Engine.create();
engine.world.gravity.y = 0.6;
const world = engine.world;

const render = Render.create({
  canvas,
  engine,
  options: {
  width: 340,
  height: 520,
    wireframes: false,
    background: "transparent"
  }
});

// =================== LEVEL DATA (JW 1–12) ===================
const levels = [
  { img: "assets/jw1.png",  radius: 18, score: 2 },
  { img: "assets/jw2.png",  radius: 24, score: 4 },
  { img: "assets/jw3.png",  radius: 30, score: 8 },
  { img: "assets/jw4.png",  radius: 38, score: 16 },
  { img: "assets/jw5.png",  radius: 48, score: 32 },
  { img: "assets/jw6.png",  radius: 60, score: 64 },
  { img: "assets/jw7.png",  radius: 74, score: 128 },
  { img: "assets/jw8.png",  radius: 90, score: 256 },
  { img: "assets/jw9.png",  radius: 108, score: 512 },
  { img: "assets/jw10.png", radius: 128, score: 1024 },
  { img: "assets/jw11.png", radius: 150, score: 2048 },
  { img: "assets/jw12.png", radius: 174, score: 4096 }
];

// =================== BOX (WADAH) ===================
const dropLineY = 90;
const boxTopY = 200;
const boxBottomY = 360;

World.add(world, [
  floor,

  Bodies.rectangle(-10, canvas.height / 2, 40, canvas.height, {
    isStatic: true,
    render: { visible: false }
  }),

  Bodies.rectangle(canvas.width + 10, canvas.height / 2, 40, canvas.height, {
    isStatic: true,
    render: { visible: false }
  })
]);




// =================== RANDOM LEVEL ===================
const MAX_RANDOM_LEVEL = 2; // jw1 – jw3

function randomLevel() {
  return Math.floor(Math.random() * (MAX_RANDOM_LEVEL + 1));
}


// =================== NEXT SYSTEM (BARU) ===================
let nextLevel = randomLevel();

function updateNext() {
  const nextImg = document.querySelector(".next-img");
  nextImg.classList.remove("bump");

  nextImg.style.backgroundImage = `url(${levels[nextLevel].img})`;

  requestAnimationFrame(() => {
    nextImg.classList.add("bump");
  });
}


// =================== SPAWN ===================
let currentBody = null;

function spawn() {
  const level = nextLevel;

  let newNext;
  do {
    newNext = randomLevel();
  } while (newNext === level);

  nextLevel = newNext;
  updateNext();

  const data = levels[level];
  const radius = Math.min(data.radius * SIZE_SCALE, MAX_RADIUS);


currentBody = Bodies.circle(
  130,
  dropLineY - radius - DROP_GAP,
  radius,
  {
    isStatic: true,
restitution: 0,
friction: 0.8,
frictionAir: 0.02,

    render: {
      sprite: {
        texture: data.img,
        xScale: (radius * 2) / SPRITE_BASE,
        yScale: (radius * 2) / SPRITE_BASE
      }
    }
  });

  currentBody.level = level;
  World.add(world, currentBody);
}




// PANGGIL AWAL
setTimeout(() => {
  updateNext();
  spawn();
  console.log("NEXT FIX:", levels[nextLevel].img);
}, 0);


// =================== DROP LINE ===================
const dropLine = document.querySelector(".drop-line");
const DROP_LINE_Y = 60;

function updateDropLine() {
  dropLine.style.top = `${DROP_LINE_Y}px`;
}

let mouseX = 130;
// =================== CONTROL ===================

let canDrop = true;
document.addEventListener("mousemove", e => {
  if (!currentBody || !currentBody.isStatic) return;

  const rect = canvas.getBoundingClientRect();
  let x = e.clientX - rect.left;

  const r = currentBody.circleRadius;
  x = Math.max(BOX_LEFT + r, Math.min(BOX_RIGHT - r, x));

  mouseX = x;

  Body.setPosition(currentBody, {
    x: mouseX,
    y: dropLineY- currentBody.circleRadius - DROP_GAP
  });
});

document.addEventListener("click", () => {
  if (!currentBody || isGameOver || !canDrop) return;

  canDrop = false;

  // jatuhkan bola
  Body.setStatic(currentBody, false);
  currentBody = null;

  // spawn bola berikutnya
  setTimeout(() => {
    spawn();
    canDrop = true;
  }, 300);
});


// =================== RUN ===================
Engine.run(engine);
Render.run(render);

const gameOverY = dropLineY - 100;
let isGameOver = false;


Events.on(engine, "collisionStart", event => {
  event.pairs.forEach(pair => {
    const a = pair.bodyA;
    const b = pair.bodyB;

    if (!a.circleRadius || !b.circleRadius) return;
    if (a.level === undefined || b.level === undefined) return;
    if (a.level !== b.level) return;
    if (a.level >= levels.length - 1) return;

    const key = `${a.id}-${b.id}`;
    if (merging.has(key)) return;

    merging.add(key);

    setTimeout(() => {
      mergeNow(a, b);
      merging.delete(key);
    }, 40); // ✨ delay kecil biar natural
  });
});



function mergeNow(a, b) {
  if (!world.bodies.includes(a) || !world.bodies.includes(b)) return;
  const nextIdx = a.level + 1;
  const next = levels[nextIdx];
  const radius = Math.min(next.radius * SIZE_SCALE, MAX_RADIUS);

  const x = (a.position.x + b.position.x) / 2;
const y = (a.position.y + b.position.y) / 2;

  World.remove(world, [a, b]);

  const merged = Bodies.circle(x, y, radius, {
  restitution: 0.1,
  friction: 0.8,
  frictionAir: 0.02,
    render: {
      sprite: {
        texture: next.img,
        xScale: (radius * 2) / SPRITE_BASE,
        yScale: (radius * 2) / SPRITE_BASE
      }
    }
  });

  Body.setInertia(merged, Infinity);
  merged.level = nextIdx;
  World.add(world, merged);

  score += levels[a.level].score;
  scoreBox.innerText = score;
}


function checkMerge(items) {
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];

      if (a.level !== b.level) continue;
      if (a.level >= levels.length - 1) continue;

      const dx = a.position.x - b.position.x;
      const dy = a.position.y - b.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const MERGE_DIST = a.circleRadius + b.circleRadius;

      if (dist < MERGE_DIST * 0.9) {
        mergeNow(a, b);
        return;
      }
    }
  }
}




function endGame() {
  isGameOver = true;
  Engine.clear(engine);

  // tampilkan skor akhir
  document.getElementById("finalScore").innerText = score;

  // munculin overlay
  document.getElementById("resultOverlay").style.display = "flex";

  // tombol retry
  document.getElementById("retryBtn2").onclick = () => {
    location.reload();
  };
}



document.addEventListener("mousemove", () => {
  console.log("MOUSE GERAK");
});
document.addEventListener("wheel", e => {
  e.preventDefault();
}, { passive: false });

function goForm() {
  window.open(
    "https://docs.google.com/forms/d/e/1FAIpQLSegX5muPqxA9BqdGTJhqPqMk8SauMZ1q6re7AAC1Xynd_Hsag/viewform?usp=dialog",
    "_blank"
  );
}

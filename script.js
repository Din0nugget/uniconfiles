const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// =================================================
// ✅ Contents
// =================================================
// const contentArray = [
//   "Blink",
//   "Your",
//   "Eyes"
// ];
const fallbackWords = ["Blink", "Focus", "Look", "Again"];
let wordIndex = 0;

let lastWordTime = 0;
const WORD_DELAY = 600;

let currentIndex = 0;

// =================================================
// ✔️ Smmothing State
// =================================================
let smoothX = 0;
let smoothY = 0;


// =================================================
// ✅ Blink State
// =================================================
let blinkStart = null;
const BLINK_DURATION = 450;


// =================================================
// ✔️ Face Mesh Landmarks 
// =================================================
const RIGHT_EYE = [33, 133, 160, 159, 158, 157, 173];


// =================================================
// ✔️ Blink Detection
// =================================================
function getEyeCenter(landmarks, indices) {
  let x = 0;
  let y = 0;

  for (let i = 0; i < indices.length; i++) {
    const p = landmarks[indices[i]];
    if (!p) continue;
    x += p.x;
    y += p.y;
  }

  return {
    x: x / indices.length,
    y: y / indices.length
  };
}

function isBlink(landmarks) {
  // upper eyelid vs lower eyelid
  const top = landmarks[159];
  const bottom = landmarks[145];

  if (!top || !bottom) return false;

  const dist = Math.abs(top.y - bottom.y);
  return dist < 0.008;
}

function addItem(x, y) {
  const div = document.createElement("div");
  div.className = "item";

  div.style.left = x + "px";
  div.style.top = y + "px";

  div.innerText = contentArray[currentIndex % contentArray.length];

  document.body.appendChild(div);
  currentIndex++;
}
function showWord(x, y) {
  const div = document.createElement("div");
  div.className = "word";

  div.style.left = x + "px";
  div.style.top = y + "px";

  div.innerText = fallbackWords[wordIndex];

  document.body.appendChild(div);

  wordIndex = (wordIndex + 1) % fallbackWords.length;

  setTimeout(() => div.remove(), 1200);
}


// =================================================
// ✔️ Mediapipe Setup
// =================================================
const faceMesh = new FaceMesh({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

faceMesh.onResults((results) => {
  smoothX += (targetX - smoothX) * 0.25;
  smoothY += (targetY - smoothY) * 0.25;
  const lookedAtId = getLookedAtElement(smoothX, smoothY);

  console.log("GAZE:", smoothX, smoothY);
console.log("LOOKED AT:", getLookedAtElement(smoothX, smoothY));
// // CASE 1: looking at file → do nothing here (file logic already handles it)
// if (lookedAtId) {
//   return;
// }

// // CASE 2: not looking at file → show words
// if (Date.now() - lastWordTime > WORD_DELAY) {
//   showWord(smoothX, smoothY);
//   lastWordTime = Date.now();
// }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!results.multiFaceLandmarks || !results.multiFaceLandmarks[0]) return;

  const landmarks = results.multiFaceLandmarks[0];


  // =================================================
  // 👀 Eye Position
  // =================================================
  const eye = getEyeCenter(landmarks, RIGHT_EYE);
  const targetX = eye.x * canvas.width;
  const targetY = eye.y * canvas.height;

  // =================================================
  // ✔️ Smoothing
  // =================================================
  smoothX += (targetX - smoothX) * 0.25;
  smoothY += (targetY - smoothY) * 0.25;


  // =================================================
  // 🔴 Draw Red Dot
  // =================================================
  ctx.beginPath();
  ctx.arc(smoothX, smoothY, 8, 0, Math.PI * 2);
  ctx.fillStyle = "red";
  ctx.fill();

  // =================================================
  // ✔️ Blink Logic
  // =================================================
  if (isBlink(landmarks)) {
    if (!blinkStart) blinkStart = Date.now();

    if (Date.now() - blinkStart > BLINK_DURATION) {
      addItem(smoothX, smoothY);
      blinkStart = null;
    }
  } else {
    blinkStart = null;
  }
});

// =================================================
// 📸 Webcam
// =================================================
const camera = new Camera(video, {
  onFrame: async () => {
    await faceMesh.send({ image: video });
  },
  width: 640,
  height: 480
});

camera.start();


// const files = [
//   document.getElementById("file1"),
//   document.getElementById("file2"),
//   document.getElementById("file3"),
//   document.getElementById("file4"),
//   document.getElementById("file5")
// ];

const fileConfigs = {
  file1: {
    emojis: ["📁","✨","💙"],
    sound: "audio/zzm.mp3"
  },
  file2: {
    emojis: ["🔥","💥","⚡"],
    sound: "audio/520.mp3"
  },
  file3: {
    emojis: ["😂","😎","🎉"],
    sound: "audio/eva.mp3"
  },
  file4: {
    emojis: ["🌿","🍄","🦋"],
    sound: "audio/wsid.mp3"
  },
  file5: {
    emojis: ["🚀","🌌","🪐"],
    sound: "audio/aud1.mp3"
  }
};
function getLookedAtElement(x, y) {
  for (let id in fileConfigs) {
    const el = document.getElementById(id);
    const rect = el.getBoundingClientRect();

    if (
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    ) {
      return id;
    }
  }
  return null;
}

const sounds = {};

for (let id in fileConfigs) {
  const audio = new Audio(fileConfigs[id].sound);
  audio.volume = 0.6;
  sounds[id] = audio;
}

Object.keys(fileConfigs).forEach(id => {
  const el = document.getElementById(id);

  if (!el) return;

  el.addEventListener("click", () => {
    playSound(id);
  });
});

function playSound(id) {
  const sound = sounds[id];
  if (!sound) return;

  // If currently playing → pause
  if (!sound.paused) {
    sound.pause();
    return;
  }

  // If paused → play
  sound.play().catch(err => {
    console.log("Audio blocked:", err);
  });
}
// function getLookedAtElement(x, y) {
//   for (let el of files) {
//     const rect = el.getBoundingClientRect();

//     if (
//       x >= rect.left &&
//       x <= rect.right &&
//       y >= rect.top &&
//       y <= rect.bottom
//     ) {
//       return el;
//     }
//   }
//   return null;
// }

let lastTriggerTime = 0;
const GAZE_DELAY = 500;

faceMesh.onResults((results) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!results.multiFaceLandmarks || !results.multiFaceLandmarks[0]) return;

  const landmarks = results.multiFaceLandmarks[0];

  const eye = getEyeCenter(landmarks, RIGHT_EYE);
  const targetX = eye.x * canvas.width;
  const targetY = eye.y * canvas.height;

  smoothX += (targetX - smoothX) * 0.25;
  smoothY += (targetY - smoothY) * 0.25;

  // 🔴 debug dot
  ctx.beginPath();
  ctx.arc(smoothX, smoothY, 8, 0, Math.PI * 2);
  ctx.fillStyle = "red";
  ctx.fill();

  // 👀 NEW: detect looked-at file
  const lookedAt = getLookedAtElement(smoothX, smoothY);

  if (lookedAt && Date.now() - lastTriggerTime > GAZE_DELAY) {
    spawnFromElement(lookedAt);
    lastTriggerTime = Date.now();
  }
});

function spawnFromElement(id) {
  const el = document.getElementById(id);
  const rect = el.getBoundingClientRect();
  const config = fileConfigs[id];

  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  // // 🔊 play sound
  // const sound = sounds[id];
  // if (sound) {
  //   sound.currentTime = 0;
  //   sound.play();
  // }

  // ✨ spawn emojis
  for (let i = 0; i < 6; i++) {
    const div = document.createElement("div");
    div.className = "item";

    div.style.left = x + (Math.random()*60 - 30) + "px";
    div.style.top = y + (Math.random()*60 - 30) + "px";

    const emoji = config.emojis[
      Math.floor(Math.random() * config.emojis.length)
    ];

    div.innerText = emoji;

    document.body.appendChild(div);
    setTimeout(() => div.remove(), 1000);
  }
}

// function spawnFromElement(el) {
//   const rect = el.getBoundingClientRect();

//   const x = rect.left + rect.width / 2;
//   const y = rect.top + rect.height / 2;

//   for (let i = 0; i < 5; i++) {
//     const div = document.createElement("div");
//     div.className = "item";
//     div.style.left = x + (Math.random() * 40 - 20) + "px";
//     div.style.top = y + (Math.random() * 40 - 20) + "px";

//     div.innerText = ["✨","🔥","😍","🎉"][Math.floor(Math.random()*4)];

//     document.body.appendChild(div);

//     setTimeout(() => div.remove(), 1000);
//   }
// }
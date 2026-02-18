const bpmSlider = document.getElementById("bpm");
const bpmDisplay = document.getElementById("bpmDisplay");
const playBtn = document.getElementById("play");
const stopBtn = document.getElementById("stop");
const tapBtn = document.getElementById("tap");
const ledsContainer = document.getElementById("leds");
const accentSelect = document.getElementById("accent");
const figureButtons = document.querySelectorAll(".figures button");

let bpm = 120;
let beatsPerBar = 4;
let noteMultiplier = 1;

let metronomoInicializado = false;
let metronomoInterval = null;

function initMetronomo(){
  if(metronomoInicializado) return;
  metronomoInicializado = true;

  createLeds();
  setTimeSignature("4/4");
}

const soundSelect = document.getElementById("soundType");
let soundType = "digital";

soundSelect.onchange = () => {
  soundType = soundSelect.value;
};

const volumeSlider = document.getElementById("volume");
let masterVolume = 0.7;

volumeSlider.oninput = () => {
  masterVolume = volumeSlider.value / 100;
};

const timeSelect = document.getElementById("timeSignature");

let accentPattern = [0]; // dónde cae el acento


function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

// Crear LEDs
function createLeds() {
  ledsContainer.innerHTML = "";
  for (let i = 0; i < beatsPerBar; i++) {
    const led = document.createElement("div");
    led.classList.add("led");
    ledsContainer.appendChild(led);
  }
}
createLeds();

// BPM
bpmSlider.oninput = () => {
  bpm = bpmSlider.value;
  bpmDisplay.textContent = bpm + " BPM";
  restart();
};

// Acento
accentSelect.onchange = () => {
  beatsPerBar = parseInt(accentSelect.value);
  beat = 0;
  createLeds();
};

// Figuras
figureButtons.forEach(btn => {
  btn.onclick = () => {
    figureButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    noteMultiplier = parseFloat(btn.dataset.mult);
    restart();
  };
});

// Play
playBtn.onclick = () => {
  if (interval) return;
  const time = (60000 / bpm) * noteMultiplier;
  interval = setInterval(tick, time);
};

// Stop
stopBtn.onclick = () => {
  clearInterval(interval);
  interval = null;
  beat = 0;
  document.querySelectorAll(".led").forEach(l => l.classList.remove("active"));
};

// Tick
function tick() {
  const leds = document.querySelectorAll(".led");
  leds.forEach(l => l.classList.remove("active"));

  leds[beat].classList.add("active");

  const isAccent = accentPattern.includes(beat);
  playClick(isAccent);

  beat = (beat + 1) % beatsPerBar;
}

// TAP tempo
let taps = [];
tapBtn.onclick = () => {
  const now = Date.now();
  taps.push(now);
  if (taps.length > 4) taps.shift();
  if (taps.length >= 2) {
    const diffs = [];
    for (let i = 1; i < taps.length; i++) {
      diffs.push(taps[i] - taps[i - 1]);
    }
    const avg = diffs.reduce((a,b)=>a+b)/diffs.length;
    bpm = Math.round(60000 / avg);
    bpmSlider.value = bpm;
    bpmDisplay.textContent = bpm + " BPM";
    restart();
  }
};

function restart() {
  if (interval) {
    clearInterval(interval);
    interval = null;
    playBtn.click();
  }
}

// Clic
function playClick(isAccent) {
  initAudio();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  let freq = isAccent ? 800 : 1200;
  let type = "square";

  if (soundType === "wood") {
    freq = isAccent ? 500 : 900;
    type = "triangle";
  }

  if (soundType === "clap") {
    playClap(isAccent);
    return;
  }

  osc.type = type;
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(masterVolume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    audioCtx.currentTime + 0.06
  );

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.06);
}

function playClap(isAccent) {
  const bufferSize = audioCtx.sampleRate * 0.05;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (isAccent ? 1 : 0.6);
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(masterVolume, audioCtx.currentTime);

  gain.gain.exponentialRampToValueAtTime(
    0.01,
    audioCtx.currentTime + 0.05
  );

  noise.connect(gain);
  gain.connect(audioCtx.destination);

  noise.start();
}

function setTimeSignature(signature) {
  switch (signature) {
    case "3/4":
      beatsPerBar = 3;
      accentPattern = [0];
      break;

    case "4/4":
      beatsPerBar = 4;
      accentPattern = [0];
      break;

    case "6/8":
      beatsPerBar = 6;
      accentPattern = [0, 3]; // fuerte-débil
      break;

    case "12/8":
      beatsPerBar = 12;
      accentPattern = [0, 3, 6, 9];
      break;
  }

  beat = 0;
  createLeds();
}

timeSelect.onchange = () => {
  setTimeSignature(timeSelect.value);
  restart();
};

setTimeSignature("4/4");


document.body.addEventListener("click", initAudio, { once: true });
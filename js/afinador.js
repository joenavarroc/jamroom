console.log("JS OK");
let blinkPhase = 0;


const canvas = document.getElementById("dial");
const ctx = canvas.getContext("2d");
const noteEl = document.getElementById("note");
const freqEl = document.getElementById("freq");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("start");
const guitarBtn = document.getElementById("guitarBtn");
const bassBtn = document.getElementById("bassBtn");

let mode = "guitar";

guitarBtn.onclick = ()=>{
  mode = "guitar";
  guitarBtn.classList.add("active");
  bassBtn.classList.remove("active");
  drawDial(0); // 👈 REDIBUJA
};

bassBtn.onclick = ()=>{
  mode = "bass";
  bassBtn.classList.add("active");
  guitarBtn.classList.remove("active");
  drawDial(0); // 👈 REDIBUJA
};

const guitarNotes = [
  {note:"E",freq:82.41},
  {note:"A",freq:110},
  {note:"D",freq:146.83},
  {note:"G",freq:196},
  {note:"B",freq:246.94},
  {note:"E",freq:329.63}
];

const bassNotes = [
  {note:"E",freq:41.20},
  {note:"A",freq:55},
  {note:"D",freq:73.42},
  {note:"G",freq:98}
];

let analyser, buffer;

function initAfinador(){
  if(afinadorInicializado) return;
  afinadorInicializado = true;

  drawDial(0);
}

startBtn.onclick = async () => {
  audioCtx = new AudioContext();
  await audioCtx.resume();
  const stream = await navigator.mediaDevices.getUserMedia({ 
    audio: {
      echoCancellation: false,
      noiseSuppression: false, // Importante para no filtrar las notas bajas
      autoGainControl: false
    } 
  });

  micStream = stream;
  analyser = audioCtx.createAnalyser();
  // Aumentamos a 8192 para captar ondas largas de bajo
  analyser.fftSize = 8192; 
  
  buffer = new Float32Array(analyser.fftSize);
  const source = audioCtx.createMediaStreamSource(stream);
  
  // Opcional: Crear un filtro para el modo bajo
  const filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 400; // Corta lo que no sea bajo
  
  if(mode === "bass") {
    source.connect(filter);
    filter.connect(analyser);
  } else {
    source.connect(analyser);
  }
  
  statusEl.textContent = "Escuchando...";
  update();
};

function drawDial(diff){
  ctx.clearRect(0,0,320,180);

  const cx = 160;
  const cy = 140;
  const radius = 90;

  let level = Math.round(diff / 2);
  level = Math.max(-7, Math.min(7, level));

  blinkPhase += 0.1;
  let blink = (Math.sin(blinkPhase) + 1) / 2;

  for(let i = -7; i <= 7; i++){
    let angle = Math.PI + (i + 7) * (Math.PI / 14);

    let x = cx + Math.cos(angle) * radius;
    let y = cy + Math.sin(angle) * radius;

    let color = "#222";

    if(i < 0) color = "red";
    if(i > 0) color = "red";
    if(i === 0) color = "lime";

    if(
      (level < 0 && i >= level && i < 0) ||
      (level > 0 && i <= level && i > 0) ||
      (level === 0 && i === 0)
    ){
      ctx.fillStyle = color;
    } else {
      ctx.fillStyle = "#222";
    }

    // ⭐ parpadeo en afinado
    if(i === 0 && Math.abs(diff) < 2){
      ctx.fillStyle = `rgba(0,255,120,${0.2 + blink*0.8})`;
    }

    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI*2);
    ctx.fill();
  }

    // 🎵 letras de las cuerdas arriba del arco
    const notes = mode === "bass"
      ? ["E1", "A1", "D2", "G2"]
      : ["E2", "A2", "D3", "G3", "B3", "E4"];

    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#aaa";

    let count = notes.length;
    for(let i = 0; i < count; i++){
      let angle = Math.PI + (i * (Math.PI / (count - 1)));
      let x = cx + Math.cos(angle) * (radius + 20);
      let y = cy + Math.sin(angle) * (radius + 20);

      ctx.fillText(notes[i], x, y);
    }
}

function autoCorrelate(buf,sr){
  let SIZE=buf.length;
  let rms=0;
  for(let i=0;i<SIZE;i++) rms+=buf[i]*buf[i];
  rms=Math.sqrt(rms/SIZE);
  if(rms<0.01) return -1;

  let c=new Array(SIZE).fill(0);
  for(let i=0;i<SIZE;i++)
    for(let j=0;j<SIZE-i;j++)
      c[i]+=buf[j]*buf[j+i];

  let d=0;
  while(c[d]>c[d+1]) d++;

  let max=-1,pos=-1;
  for(let i=d;i<SIZE;i++){
    if(c[i]>max){max=c[i];pos=i;}
  }
  return sr/pos;
}

function closest(freq){
  const list = mode === "bass" ? bassNotes : guitarNotes;
  return list.reduce((a,b)=>
    Math.abs(freq-a.freq)<Math.abs(freq-b.freq)?a:b
  );
}

function update(){
  analyser.getFloatTimeDomainData(buffer);
  let freq = autoCorrelate(buffer,audioCtx.sampleRate);
  rafId = requestAnimationFrame(update);
  
  if(freq !== -1){
    let n = closest(freq);
    let diff = freq - n.freq;

    noteEl.textContent = n.note;
    freqEl.textContent = freq.toFixed(1) + " Hz";

    if(diff > 1){
      statusEl.textContent = "Muy alto (aflojá)";
      wasInTune = false; // 👈 importante
    }
    else if(diff < -1){
      statusEl.textContent = "Muy bajo (apretá)";
      wasInTune = false; // 👈 importante
    }
    else{
      statusEl.textContent = "Afinado ✔";

      if(!wasInTune && navigator.vibrate){
        navigator.vibrate(100); // 📳 vibra al entrar en afinado
      }
      wasInTune = true;
    }

    drawDial(diff);
  } 
  else {
    noteEl.textContent="--";
    freqEl.textContent="-- Hz";
    statusEl.textContent="Esperando sonido...";
    wasInTune = false; // 👈 también reset acá
    drawDial(0);
  }

  requestAnimationFrame(update);
}
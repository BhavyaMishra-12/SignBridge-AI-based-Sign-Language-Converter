const camera = document.querySelector("#camera");
const canvas = document.querySelector("#capture");
const context = canvas.getContext("2d");
const startButton = document.querySelector("#start-camera");
const stopButton = document.querySelector("#stop-camera");
const cameraWindow = document.querySelector(".camera-window");
const cameraEmpty = document.querySelector("#camera-empty");
const prediction = document.querySelector("#prediction");
const confidence = document.querySelector("#confidence");
const confidenceBar = document.querySelector("#confidence-bar");
const handCount = document.querySelector("#hand-count");
const modelLabel = document.querySelector("#model-label");
const pipelineLabel = document.querySelector("#pipeline-label");
const systemStatus = document.querySelector("#system-status");
const systemPill = document.querySelector(".system-pill");
const signalLed = document.querySelector("#signal-led");
const signalNote = document.querySelector("#signal-note");
const fpsLabel = document.querySelector("#fps-label");
const themeToggle = document.querySelector("#theme-toggle");

function applyTheme(theme) {
  const light = theme !== "dark";
  document.documentElement.classList.toggle("dark", !light);
  if (!themeToggle) return;
  themeToggle.querySelector("span").textContent = light ? "☾" : "☀";
  themeToggle.querySelector(".theme-toggle-label").textContent = light ? "Deep navy" : "Light theme";
  themeToggle.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
}

applyTheme(localStorage.getItem("signbridge-theme") || "light");
themeToggle?.addEventListener("click", () => {
  const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
  localStorage.setItem("signbridge-theme", next);
  applyTheme(next);
});
let stream = null;
let predictionTimer = null;
let requestInFlight = false;

function setSystem(text, ready = false) {
  systemStatus.textContent = text;
  systemPill.classList.toggle("ready", ready);
}

async function checkHealth() {
  try {
    const response = await fetch("/api/health");
    const health = await response.json();
    if (!response.ok) throw new Error("Backend unavailable");
    modelLabel.textContent = health.model
      .replace(".keras", "")
      .replaceAll("_", " ");
    setSystem("Model ready", true);
    signalNote.textContent = `Ready for ${health.labels.join(", ")}.`;
  } catch (_) {
    setSystem("Backend offline");
    signalNote.textContent = "Start web_server.py, then refresh this page.";
  }
}

function resetResult(note = "Camera paused. Start it when you are ready.") {
  prediction.textContent = "—";
  confidence.textContent = "0%";
  confidenceBar.style.width = "0%";
  handCount.textContent = "0";
  pipelineLabel.textContent = "Standby";
  signalLed.style.background = "#c5ad13";
  signalNote.textContent = note;
}

function renderResult(result) {
  handCount.textContent = result.hands.length;
  if (!result.detected) {
    prediction.textContent = "LOOK HERE";
    confidence.textContent = "0%";
    confidenceBar.style.width = "0%";
    pipelineLabel.textContent = "Searching";
    signalLed.style.background = "#d0c7ad";
    signalNote.textContent = "Show one or both hands inside the camera frame.";
    return;
  }
  const percent = Math.round(result.confidence * 100);
  prediction.textContent = result.label;
  confidence.textContent = `${percent}%`;
  confidenceBar.style.width = `${percent}%`;
  pipelineLabel.textContent = "Classifying";
  signalLed.style.background = percent >= 75 ? "#80ad22" : "#d4ae45";
  signalNote.textContent = `${result.hands.map((hand) => hand.handedness).join(" + ")} hand detected · local model response`;
}

async function sendFrame() {
  if (!stream || requestInFlight || camera.readyState < 2) return;
  requestInFlight = true;
  canvas.width = 640;
  canvas.height = 360;
  context.save();
  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(camera, 0, 0, canvas.width, canvas.height);
  context.restore();
  try {
    const response = await fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: canvas.toDataURL("image/jpeg", 0.78) }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Prediction failed");
    renderResult(result);
    fpsLabel.textContent = "LIVE";
  } catch (error) {
    pipelineLabel.textContent = "Error";
    signalNote.textContent = error.message;
    signalLed.style.background = "#e36f5f";
  } finally {
    requestInFlight = false;
  }
}

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
    camera.srcObject = stream;
    await camera.play();
    cameraWindow.classList.add("active");
    cameraEmpty.hidden = true;
    startButton.disabled = true;
    stopButton.disabled = false;
    pipelineLabel.textContent = "Listening";
    signalNote.textContent = "Camera connected. Looking for a hand…";
    predictionTimer = window.setInterval(sendFrame, 420);
    sendFrame();
  } catch (error) {
    signalNote.textContent =
      "Camera permission was not granted. Allow access and try again.";
  }
}

function stopCamera() {
  window.clearInterval(predictionTimer);
  predictionTimer = null;
  if (stream) stream.getTracks().forEach((track) => track.stop());
  stream = null;
  camera.srcObject = null;
  cameraWindow.classList.remove("active");
  cameraEmpty.hidden = false;
  startButton.disabled = false;
  stopButton.disabled = true;
  fpsLabel.textContent = "IDLE";
  resetResult();
}

startButton.addEventListener("click", startCamera);
stopButton.addEventListener("click", stopCamera);
window.addEventListener("beforeunload", stopCamera);
document.querySelectorAll(".reveal").forEach((element) =>
  new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
      }),
    { threshold: 0.12 },
  ).observe(element),
);
document.addEventListener("pointermove", (event) => {
  const x = (event.clientX / window.innerWidth - 0.5) * 12;
  const y = (event.clientY / window.innerHeight - 0.5) * 12;
  document.querySelector("#hero-object").style.setProperty("--mx", `${x}px`);
  document.querySelector("#hero-object").style.setProperty("--my", `${y}px`);
});
checkHealth();

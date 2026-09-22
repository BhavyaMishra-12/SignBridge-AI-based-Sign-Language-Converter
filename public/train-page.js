const video = document.querySelector("#trainer-camera"),
  canvas = document.querySelector("#trainer-capture"),
  ctx = canvas.getContext("2d");
const start = document.querySelector("#trainer-start"),
  stop = document.querySelector("#trainer-stop"),
  save = document.querySelector("#save-sample");
const nameInput = document.querySelector("#symbol-name"),
  mode = document.querySelector("#hand-mode"),
  count = document.querySelector("#sample-count"),
  message = document.querySelector("#capture-message");
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
let stream,
  previewTimer,
  currentHands = 0;
function capture() {
  canvas.width = 640;
  canvas.height = 360;
  ctx.save();
  ctx.translate(640, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, 640, 360);
  ctx.restore();
  return canvas.toDataURL("image/jpeg", 0.8);
}
async function api(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}
async function preview() {
  if (!stream || video.readyState < 2) return;
  try {
    const r = await api("/api/predict", { image: capture() });
    currentHands = r.hands.length;
    document.querySelector("#landmark-overlay").textContent = r.detected
      ? `${currentHands} HAND${currentHands === 1 ? "" : "S"} DETECTED`
      : "LOOKING FOR HANDS";
    document.querySelector("#trainer-live").textContent = "LIVE";
  } catch (_) {}
}
async function refreshClasses() {
  const r = await fetch("/api/classes");
  const data = await r.json();
  const entries = Object.entries(data.classes);
  document.querySelector("#total-samples").textContent =
    `${data.total} samples`;
  document.querySelector("#class-list").innerHTML = entries.length
    ? entries
        .map(
          ([label, n]) =>
            `<div class="class-row flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5"><span>${label.replaceAll("_", " ")}</span><b class="text-teal-600">${n}</b></div>`,
        )
        .join("")
    : '<span class="list-empty">No two-hand data yet.</span>';
  const clean = nameInput.value.trim().toUpperCase().replaceAll(" ", "_");
  if (clean && data.classes[clean]) {
    count.textContent = data.classes[clean];
    document.querySelector("#sample-label").textContent =
      `Saved examples for ${clean}.`;
  }
}
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    document.querySelector(".trainer-window").classList.add("active");
    start.disabled = true;
    stop.disabled = false;
    save.disabled = false;
    message.textContent = "Camera connected. Capture a clear hand pose.";
    previewTimer = setInterval(preview, 700);
    preview();
  } catch (_) {
    message.textContent = "Camera permission is needed to capture samples.";
  }
}
function stopCamera() {
  clearInterval(previewTimer);
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
  video.srcObject = null;
  document.querySelector(".trainer-window").classList.remove("active");
  start.disabled = false;
  stop.disabled = true;
  save.disabled = true;
  document.querySelector("#trainer-live").textContent = "IDLE";
}
async function savePoint() {
  const label = nameInput.value.trim();
  if (!label) {
    message.textContent = "Name the symbol before saving.";
    nameInput.focus();
    return;
  }
  if (!stream) {
    message.textContent = "Connect the camera first.";
    return;
  }
  save.disabled = true;
  try {
    const r = await api("/api/collect", {
      label,
      image: capture(),
      min_hands: Number(mode.value),
    });
    if (!r.saved) {
      message.textContent = r.reason;
      return;
    }
    count.textContent = r.samples;
    message.textContent = `Saved ${r.label} sample ${r.samples} with ${r.hands} hand(s).`;
    await refreshClasses();
  } catch (error) {
    message.textContent = error.message;
  } finally {
    save.disabled = false;
  }
}
async function trainModel() {
  const button = document.querySelector("#train-model"),
    state = document.querySelector("#training-state");
  button.disabled = true;
  try {
    const r = await api("/api/train", {});
    state.innerHTML =
      '<i class="spinning"></i><span>Training has started. This can take a moment…</span>';
    const poll = setInterval(async () => {
      const h = await (await fetch("/api/health")).json();
      if (!h.training.running) {
        clearInterval(poll);
        button.disabled = false;
        state.innerHTML = `<i class="done"></i><span>${h.training.message}${h.training.last_accuracy !== null ? ` · test accuracy ${Math.round(h.training.last_accuracy * 100)}%` : ""}</span>`;
      }
    }, 1500);
  } catch (e) {
    button.disabled = false;
    state.textContent = e.message;
  }
}
start.onclick = startCamera;
stop.onclick = stopCamera;
save.onclick = savePoint;
nameInput.addEventListener("input", refreshClasses);
window.addEventListener("beforeunload", stopCamera);
new IntersectionObserver(
  (es) =>
    es.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
  { threshold: 0.1 },
).observe(document.querySelector("main"));
refreshClasses();

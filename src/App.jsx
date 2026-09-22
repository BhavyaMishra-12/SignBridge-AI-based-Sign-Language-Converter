import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useSpring } from "framer-motion";
import AbstractBackground from "./AbstractBackground";
import PillNav from "./PillNav";

const Moon = () => <span>☾</span>;
const Sun = () => <span>☀</span>;
const ArrowDown = () => <span>↓</span>;
const Camera = () => <span>⌁</span>;
const X = () => <span>×</span>;

const steps = [
  [
    "01",
    "Browser camera",
    "Your live video stays in your local prototype.",
    "◉",
  ],
  [
    "02",
    "MediaPipe landmarks",
    "Both hands are mapped into 21 spatial points.",
    "⌁",
  ],
  [
    "03",
    "Neural classifier",
    "Normalized landmarks become a recognised sign.",
    "⌘",
  ],
  [
    "04",
    "Live response",
    "Confidence and hand state return to the interface.",
    "✦",
  ],
];

const rise = { hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0 } };

function App() {
  const [dark, setDark] = useState(false);
  const [status, setStatus] = useState("Checking system");
  const [labels, setLabels] = useState([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [result, setResult] = useState({
    label: "—",
    confidence: 0,
    hands: 0,
    pipeline: "Standby",
  });
  const videoRef = useRef(null),
    canvasRef = useRef(null),
    streamRef = useRef(null),
    timerRef = useRef(null);
  const cursorX = useSpring(0, { stiffness: 80, damping: 18 });
  const cursorY = useSpring(0, { stiffness: 80, damping: 18 });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        setStatus("Model ready");
        setLabels(data.labels || []);
      })
      .catch(() => setStatus("Backend offline"));
    const move = (event) => {
      cursorX.set((event.clientX / innerWidth - 0.5) * 20);
      cursorY.set((event.clientY / innerHeight - 0.5) * 20);
    };
    window.addEventListener("pointermove", move);
    return () => {
      window.removeEventListener("pointermove", move);
      stopCamera();
    };
  }, []);

  async function predict() {
    const video = videoRef.current,
      canvas = canvasRef.current;
    if (!video || video.readyState < 2) return;
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.translate(640, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, 640, 360);
    ctx.restore();
    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: canvas.toDataURL("image/jpeg", 0.78) }),
      });
      const data = await response.json();
      setResult({
        label: data.detected ? data.label.replaceAll("_", " ") : "—",
        confidence: Math.round((data.confidence || 0) * 100),
        hands: data.hands?.length || 0,
        pipeline: data.detected ? "Classifying" : "Looking for hands",
      });
    } catch {
      setResult((old) => ({ ...old, pipeline: "Connection issue" }));
    }
  }
  async function startCamera() {
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      videoRef.current.srcObject = streamRef.current;
      await videoRef.current.play();
      setCameraOn(true);
      setResult((old) => ({ ...old, pipeline: "Camera connected" }));
      timerRef.current = window.setInterval(predict, 650);
      predict();
    } catch {
      setResult((old) => ({ ...old, pipeline: "Camera permission needed" }));
    }
  }
  function stopCamera() {
    window.clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setResult({ label: "—", confidence: 0, hands: 0, pipeline: "Standby" });
  }

  return (
    <div className="min-h-screen overflow-x-hidden text-slate-800 transition-colors duration-500 dark:text-slate-200">
      <AbstractBackground cursorX={cursorX} cursorY={cursorY} />
      
      <nav className="mx-auto flex h-24 w-[min(1440px,calc(100%-2rem))] items-center justify-between gap-4">
        <a
          className="flex items-center gap-3 text-lg font-extrabold tracking-tight"
          href="#top"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f5f3ec] shadow-skeuo font-serif text-xl text-teal-600 dark:bg-[#111111] dark:shadow-skeuo-dark dark:text-teal-400">
            S
          </span>
          SignBridge
        </a>
        <div className="hidden md:block">
          <PillNav 
            items={[
              { label: 'Live demo', href: '#live' },
              { label: 'How it works', href: '#pipeline' },
              { label: 'Training studio', href: '/train.html' }
            ]}
          />
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setDark(!dark)}
            className="inline-flex h-10 px-4 items-center gap-2 rounded-full bg-[#f5f3ec] shadow-skeuo-btn active:shadow-skeuo-btn-pressed text-xs font-bold text-slate-600 transition-all dark:bg-[#111111] dark:shadow-skeuo-btn-dark dark:active:shadow-skeuo-btn-pressed-dark dark:text-slate-300"
          >
            {dark ? <Sun /> : <Moon />}
            <span className="hidden sm:inline">
              {dark ? "Light theme" : "Deep navy"}
            </span>
          </button>
          <span className="hidden items-center gap-2 rounded-full h-10 px-4 bg-[#f5f3ec] shadow-skeuo-inner text-xs font-bold text-slate-600 sm:flex dark:bg-[#111111] dark:shadow-skeuo-inner-dark dark:text-slate-300">
            <i
              className={`h-3 w-3 rounded-full ${status === "Model ready" ? "bg-teal-400 shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.3),_0_0_10px_#2dd4bf]" : "bg-slate-300 shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.3)]"}`}
            />
            {status}
          </span>
        </div>
      </nav>
      <main id="top">
        <section className="mx-auto grid min-h-[42rem] w-[min(1440px,calc(100%-2rem))] items-center gap-10 py-12 lg:grid-cols-[1.05fr_.95fr]">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="max-w-2xl"
          >
            <motion.p
              variants={rise}
              className="mb-4 text-xs font-black uppercase tracking-[.22em] text-teal-600"
            >
              Gesture intelligence · real time
            </motion.p>
            <motion.h1
              variants={rise}
              className="text-5xl font-black leading-[.92] tracking-[-.07em] sm:text-7xl"
            >
              Every hand
              <br />
              <em className="font-serif font-normal text-teal-600">
                has a voice.
              </em>
            </motion.h1>
            <motion.p
              variants={rise}
              className="mt-8 max-w-lg leading-relaxed text-slate-600 dark:text-slate-400"
            >
              SignBridge is a tactile, local prototype that translates recognised hand signs into clear digital signals—directly from your camera.
              <br /><br />
              By mapping 21 spatial landmarks on each hand in real-time, the neural classifier bridges the gap between physical gestures and digital communication, ensuring that every movement is instantly understood without relying on external cloud processing.
            </motion.p>
            <motion.div variants={rise} className="mt-10 flex flex-wrap gap-4">
              <a
                href="#live"
                className="inline-flex h-14 items-center justify-center rounded-2xl bg-[#f5f3ec] shadow-skeuo-btn active:shadow-skeuo-btn-pressed px-8 text-sm font-extrabold text-teal-600 transition-all dark:bg-[#111111] dark:shadow-skeuo-btn-dark dark:active:shadow-skeuo-btn-pressed-dark dark:text-teal-400"
              >
                <span className="mr-2">Try the live model</span>
                <ArrowDown />
              </a>
              <a
                href="/train.html"
                className="inline-flex h-14 items-center justify-center rounded-2xl bg-[#f5f3ec] shadow-skeuo-btn active:shadow-skeuo-btn-pressed px-8 text-sm font-extrabold text-slate-600 transition-all dark:bg-[#111111] dark:shadow-skeuo-btn-dark dark:active:shadow-skeuo-btn-pressed-dark dark:text-slate-300"
              >
                Train new signs ↗
              </a>
            </motion.div>
            <motion.div
              variants={rise}
              className="mt-14 flex gap-12 text-xs font-bold text-slate-500 dark:text-slate-400 border-t border-slate-300/50 dark:border-slate-800 pt-8"
            >
              <span className="flex flex-col gap-2">
                <b className="text-2xl text-slate-800 dark:text-slate-200">
                  100%
                </b>
                local processing
              </span>
              <span className="flex flex-col gap-2">
                <b className="text-2xl text-slate-800 dark:text-slate-200">
                  21 × 2
                </b>
                hand landmarks
              </span>
              <span className="flex flex-col gap-2">
                <b className="text-2xl text-slate-800 dark:text-slate-200">
                  Zero
                </b>
                cloud dependency
              </span>
            </motion.div>
          </motion.div>
          <motion.div
            style={{ x: cursorX, y: cursorY }}
            className="relative grid min-h-[27rem] place-items-center"
          >
            <motion.div
              whileHover={{ y: -10, rotate: -1 }}
              transition={{ type: "spring", stiffness: 180 }}
              className="relative z-10 w-[22rem] rounded-[3rem] bg-[#f5f3ec] shadow-skeuo p-8 text-center dark:bg-[#111111] dark:shadow-skeuo-dark"
            >
              <div className="flex gap-2 justify-center">
                <i className="h-3 w-3 rounded-full bg-slate-300 shadow-skeuo-inner dark:bg-slate-700 dark:shadow-skeuo-inner-dark" />
                <i className="h-3 w-3 rounded-full bg-slate-300 shadow-skeuo-inner dark:bg-slate-700 dark:shadow-skeuo-inner-dark" />
                <i className="h-3 w-3 rounded-full bg-slate-300 shadow-skeuo-inner dark:bg-slate-700 dark:shadow-skeuo-inner-dark" />
              </div>
              <div className="mt-8 rounded-3xl bg-slate-900 shadow-skeuo-inner dark:shadow-skeuo-inner-dark p-8 border-4 border-[#f5f3ec] dark:border-[#111111] text-emerald-100">
                <motion.div
                  animate={{ scale: [1, 1.12, 1], rotate: [0, 8, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="text-8xl text-teal-400"
                >
                  ✦
                </motion.div>
                <div className="mt-8 flex h-10 items-center justify-center gap-2">
                  {[4, 7, 5, 8, 4].map((height, i) => (
                    <motion.i
                      key={i}
                      animate={{
                        height: [
                          `${height * 4}px`,
                          `${height * 5}px`,
                          `${height * 4}px`,
                        ],
                      }}
                      transition={{
                        duration: 0.7 + i * 0.1,
                        repeat: Infinity,
                        repeatType: "mirror",
                      }}
                      className="w-2 rounded-full bg-teal-400 shadow-[0_0_8px_#2dd4bf]"
                    />
                  ))}
                </div>
                <small className="mt-6 block text-[.7rem] font-bold tracking-[.2em] text-teal-300">
                  LIVE SIGNAL
                </small>
              </div>
              <div className="mx-auto mt-8 h-10 w-10 rounded-full bg-[#f5f3ec] shadow-skeuo-btn dark:bg-[#111111] dark:shadow-skeuo-btn-dark" />
              <div className="mt-4 text-[.6rem] font-black tracking-[.25em] text-slate-500">
                SIGNBRIDGE AI
              </div>
            </motion.div>
          </motion.div>
        </section>
        
        <section
          id="live"
          className="mx-auto w-[min(1440px,calc(100%-2rem))] py-28"
        >
          <div className="mb-14 flex flex-col justify-between gap-7 md:flex-row md:items-end">
            <div>
              <p className="mb-4 text-xs font-black uppercase tracking-[.22em] text-teal-600">
                Live prototype
              </p>
              <h2 className="text-4xl font-black leading-none tracking-[-.06em] sm:text-6xl">
                Make a sign.
                <br />
                See it respond.
              </h2>
            </div>
            <p className="max-w-sm leading-7 text-slate-500 dark:text-slate-400">
              Start your camera, then hold one of the signs included in your
              trained model. The browser feeds frames to your local SignBridge
              backend.
            </p>
          </div>
          <div className="grid gap-8 lg:grid-cols-[1.4fr_.6fr]">
            <motion.div
              whileHover={{ y: -5 }}
              className="rounded-[3rem] bg-[#f5f3ec] shadow-skeuo p-8 dark:bg-[#111111] dark:shadow-skeuo-dark"
            >
              <div className="mb-6 flex justify-between text-xs font-bold tracking-wider text-slate-500">
                <span>● CAMERA INPUT</span>
                <span>{cameraOn ? "LIVE" : "IDLE"}</span>
              </div>
              <div className="relative aspect-video overflow-hidden rounded-[2rem] bg-slate-900 shadow-skeuo-inner dark:shadow-skeuo-inner-dark border-4 border-[#f5f3ec] dark:border-[#111111]">
                <video
                  ref={videoRef}
                  className={`h-full w-full object-cover opacity-80 ${cameraOn ? "block" : "hidden"}`}
                  autoPlay
                  muted
                  playsInline
                />
                <canvas ref={canvasRef} hidden />
                {!cameraOn && (
                  <div className="absolute inset-0 grid place-items-center text-center text-slate-300">
                    <div>
                      <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-slate-800 shadow-skeuo-inner-dark text-teal-400">
                        <Camera size={32} />
                      </div>
                      <strong className="block text-lg">Camera is waiting</strong>
                      <span className="mt-2 block text-sm text-slate-400">
                        Click start to connect your device.
                      </span>
                    </div>
                  </div>
                )}
                <AnimatePresence>
                  {cameraOn && (
                    <motion.div
                      initial={{ y: -100 }}
                      animate={{ y: 300 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        repeatType: "mirror",
                        ease: "linear",
                      }}
                      className="absolute inset-x-0 h-1 bg-teal-400/80 shadow-[0_0_20px_#99f6e4]"
                    />
                  )}
                </AnimatePresence>
              </div>
              <div className="mt-8 flex gap-4">
                {!cameraOn ? (
                  <button
                    onClick={startCamera}
                    className="h-14 rounded-2xl bg-[#f5f3ec] shadow-skeuo-btn active:shadow-skeuo-btn-pressed px-8 text-sm font-extrabold text-teal-600 transition-all dark:bg-[#111111] dark:shadow-skeuo-btn-dark dark:active:shadow-skeuo-btn-pressed-dark dark:text-teal-400"
                  >
                    Start camera ↗
                  </button>
                ) : (
                  <button
                    onClick={stopCamera}
                    className="inline-flex h-14 items-center justify-center rounded-2xl bg-[#f5f3ec] shadow-skeuo-inner px-8 text-sm font-extrabold text-slate-500 transition-all dark:bg-[#111111] dark:shadow-skeuo-inner-dark dark:text-slate-400"
                  >
                    <X />
                    <span className="ml-2">Stop camera</span>
                  </button>
                )}
              </div>
            </motion.div>
            <motion.aside
              whileHover={{ y: -5 }}
              className="rounded-[3rem] bg-[#f5f3ec] shadow-skeuo p-8 dark:bg-[#111111] dark:shadow-skeuo-dark"
            >
              <div className="mb-8 flex justify-between text-xs font-bold tracking-wider text-slate-500">
                <span>RECOGNISED SIGNAL</span>
                <motion.span
                  animate={{ scale: cameraOn ? [1, 1.35, 1] : 1 }}
                  transition={{ repeat: Infinity, duration: 1.4 }}
                  className={`h-4 w-4 rounded-full ${cameraOn ? "bg-teal-400 shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.3),_0_0_14px_#2dd4bf]" : "bg-slate-300 shadow-skeuo-inner dark:bg-slate-700 dark:shadow-skeuo-inner-dark"}`}
                />
              </div>
              <div className="rounded-[2rem] bg-[#f5f3ec] shadow-skeuo-inner p-8 dark:bg-[#111111] dark:shadow-skeuo-inner-dark">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Current result
                </span>
                <strong className="mt-4 block text-5xl font-black text-teal-600">
                  {result.label}
                </strong>
                <div className="mt-10 flex justify-between text-sm font-bold text-slate-600 dark:text-slate-300">
                  <span>Confidence</span>
                  <b>{result.confidence}%</b>
                </div>
                <div className="mt-3 h-4 overflow-hidden rounded-full bg-[#f5f3ec] shadow-skeuo-inner dark:bg-[#111111] dark:shadow-skeuo-inner-dark p-1">
                  <motion.i
                    animate={{ width: `${result.confidence}%` }}
                    className="block h-full rounded-full bg-teal-400 shadow-[inset_0_2px_4px_rgba(255,255,255,0.5)]"
                  />
                </div>
              </div>
              <div className="mt-8 space-y-4 text-sm font-bold text-slate-600 dark:text-slate-300">
                <div className="flex justify-between pb-4">
                  <span>Hands detected</span>
                  <b className="text-teal-600 dark:text-teal-400">{result.hands}</b>
                </div>
                <div className="flex justify-between pb-4">
                  <span>Model</span>
                  <b className="text-teal-600 dark:text-teal-400">two hand classifier</b>
                </div>
                <div className="flex justify-between">
                  <span>Pipeline</span>
                  <b className="text-teal-600 dark:text-teal-400">{result.pipeline}</b>
                </div>
              </div>
              <p className="mt-8 text-sm leading-6 font-bold text-slate-500 dark:text-slate-400 text-center">
                {labels.length
                  ? `Ready for ${labels.join(", ")}.`
                  : "Model labels will appear here."}
              </p>
            </motion.aside>
          </div>
        </section>
        <section
          id="pipeline"
          className="mx-auto w-[min(1440px,calc(100%-2rem))] py-28"
        >
          <p className="mb-4 text-xs font-black uppercase tracking-[.22em] text-teal-600">
            Built to explain itself
          </p>
          <h2 className="mb-14 text-4xl font-black tracking-[-.06em] sm:text-6xl">
            From motion to meaning.
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(([number, title, copy, icon], index) => (
              <motion.article
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                whileHover={{ y: -8, rotate: index % 2 ? 1 : -1 }}
                className="rounded-[2rem] bg-[#f5f3ec] shadow-skeuo p-8 dark:bg-[#111111] dark:shadow-skeuo-dark"
              >
                <div className="flex justify-between items-start">
                  <span className="font-black text-2xl text-slate-400 dark:text-slate-600">{number}</span>
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f5f3ec] shadow-skeuo-inner text-2xl text-teal-600 dark:bg-[#111111] dark:shadow-skeuo-inner-dark dark:text-teal-400">
                    {icon}
                  </div>
                </div>
                <h3 className="mt-10 text-xl font-black">{title}</h3>
                <p className="mt-4 text-sm leading-6 font-bold text-slate-500 dark:text-slate-400">
                  {copy}
                </p>
              </motion.article>
            ))}
          </div>
        </section>
        <section className="mx-auto mb-28 grid w-[min(1440px,calc(100%-2rem))] gap-10 rounded-[3rem] bg-[#f5f3ec] shadow-skeuo p-12 md:grid-cols-[1fr_auto] dark:bg-[#111111] dark:shadow-skeuo-dark">
          <div>
            <p className="mb-4 text-xs font-black uppercase tracking-[.22em] text-teal-600">
              Grow the vocabulary
            </p>
            <h2 className="text-4xl font-black leading-none tracking-[-.06em] sm:text-5xl">
              Teach SignBridge
              <br />
              <em className="font-serif font-normal text-teal-600">
                something new.
              </em>
            </h2>
            <p className="mt-8 max-w-xl leading-7 text-slate-500 dark:text-slate-400 font-bold">
              Use the integrated training studio to capture your own labelled
              gestures, inspect the data points, and retrain the local model.
            </p>
            <a
              className="mt-10 inline-flex h-14 items-center justify-center rounded-2xl bg-[#f5f3ec] shadow-skeuo-btn active:shadow-skeuo-btn-pressed px-8 text-sm font-extrabold text-teal-600 transition-all dark:bg-[#111111] dark:shadow-skeuo-btn-dark dark:active:shadow-skeuo-btn-pressed-dark dark:text-teal-400"
              href="/train.html"
            >
              Open training studio ↗
            </a>
          </div>
          <motion.div
            whileHover={{ rotate: 2, scale: 1.02 }}
            className="self-center rounded-[2rem] bg-[#f5f3ec] shadow-skeuo-inner p-10 text-center dark:bg-[#111111] dark:shadow-skeuo-inner-dark"
          >
            <b className="block text-7xl font-black text-teal-600">128</b>
            <span className="mt-4 block text-sm font-bold text-slate-600 dark:text-slate-300">
              features per
              <br />
              two-hand sign
            </span>
            <small className="mt-6 block text-xs font-bold text-slate-400 dark:text-slate-500">
              left hand · right hand · presence flags
            </small>
          </motion.div>
        </section>
      </main>
      <footer className="mx-auto flex w-[min(1440px,calc(100%-2rem))] flex-col gap-2 py-12 text-xs font-bold text-slate-400 sm:flex-row sm:justify-between dark:text-slate-500">
        <span>© SignBridge AI prototype</span>
        <span>Designed for accessible conversation</span>
      </footer>
    </div>
  );
}
export default App;

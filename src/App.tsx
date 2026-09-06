import { useEffect, useState } from "react";
import Today from "./screens/Today";
import { useStore, useTimer } from "./lib/useStore";
import { todayISO } from "./lib/storage";
import "./styles.css";

export default function App() {
  const store = useStore();
  const [date, setDate] = useState(todayISO());
  const [toast, setToast] = useState<string | null>(null);
  const [light, setLight] = useState(
    () => localStorage.getItem("tdp-theme") === "light"
  );

  useEffect(() => {
    document.documentElement.classList.toggle("light", light);
    localStorage.setItem("tdp-theme", light ? "light" : "dark");
  }, [light]);

  const timer = useTimer((taskId, elapsedSec, completed) => {
    const minutes = Math.max(1, Math.round(elapsedSec / 60));
    store.addSession({
      taskId,
      startedAt: Date.now() - elapsedSec * 1000,
      endedAt: Date.now(),
      durationMinutes: minutes,
      type: "focus",
      completed,
    });
    setToast(
      completed
        ? `Засчитано ${minutes} мин`
        : `Прервано, ${minutes} мин записано`
    );
  });

  // Тост сам исчезает — подтверждение действия без модалок.
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  // Пробел — пауза/продолжение, когда таймер запущен.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return;
      if (e.code === "Space" && timer.taskId) {
        e.preventDefault();
        timer.setRunning(!timer.running);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [timer]);

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          Tracker DayPlan <small>прототип</small>
        </div>
        <button
          className="btn-icon"
          onClick={() => setLight((v) => !v)}
          title={light ? "Тёмная тема" : "Светлая тема"}
        >
          {light ? "🌙" : "☀"}
        </button>
      </div>

      <Today store={store} timer={timer} date={date} setDate={setDate} />

      {toast && (
        <div className="toast" role="status">
          <span>✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}

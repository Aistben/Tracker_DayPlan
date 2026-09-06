import { useEffect, useRef, useState } from "react";
import Today from "./screens/Today";
import { useStore, useTimer } from "./lib/useStore";
import { todayISO } from "./lib/storage";
import { IconSun, IconMoon, IconCheck, IconTomato } from "./lib/icons";
import "./styles.css";

type Done = { title: string; minutes: number };

export default function App() {
  const store = useStore();
  const [date, setDate] = useState(todayISO());
  const [toast, setToast] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null); // модалка конца помидорки
  const [light, setLight] = useState(
    () => localStorage.getItem("tdp-theme") === "light"
  );
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("light", light);
    localStorage.setItem("tdp-theme", light ? "light" : "dark");
  }, [light]);

  // Короткий сигнал через WebAudio — без внешних файлов.
  const chime = () => {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = audioRef.current ?? new Ctx();
      audioRef.current = ctx;
      if (ctx.state === "suspended") ctx.resume();
      // три ноты по возрастанию
      [0, 0.16, 0.32].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = [660, 880, 1180][i];
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + delay + 0.34
        );
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.36);
      });
    } catch {
      /* звук не критичен */
    }
  };

  const timer = useTimer((taskId, elapsedSec, completed, auto) => {
    const minutes = Math.max(1, Math.round(elapsedSec / 60));
    store.addSession({
      taskId,
      startedAt: Date.now() - elapsedSec * 1000,
      endedAt: Date.now(),
      durationMinutes: minutes,
      type: "focus",
      completed,
    });

    if (auto) {
      // Таймер дошёл до конца сам — показываем стойкое уведомление.
      const title =
        store.data.tasks.find((t) => t.id === taskId)?.title ?? "Задача";
      store.setStatus(taskId, "done");
      setDone({ title, minutes });
      chime();
      try {
        if ("Notification" in window && Notification.permission === "granted") {
          // requireInteraction — тост Windows висит, пока не закроют
          new Notification("Помидор завершён", {
            body: `${title} · ${minutes} мин`,
            requireInteraction: true,
            tag: "pomodoro-done",
          });
        }
      } catch {
        /* уведомления могут быть недоступны */
      }
    } else {
      setToast(
        completed
          ? `Засчитано ${minutes} мин`
          : `Прервано, ${minutes} мин записано`
      );
    }
  });

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  // Пробел — пауза/продолжение; Escape закрывает уведомление о конце.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return;
      if (done && (e.key === "Escape" || e.key === "Enter")) {
        e.preventDefault();
        setDone(null);
        return;
      }
      if (e.code === "Space" && timer.taskId) {
        e.preventDefault();
        timer.setRunning(!timer.running);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [timer, done]);

  // Пока висит уведомление — мигаем заголовком вкладки.
  useEffect(() => {
    if (!done) {
      document.title = "Tracker DayPlan";
      return;
    }
    let on = false;
    const id = setInterval(() => {
      on = !on;
      document.title = on ? "⏰ Помидор завершён!" : "Tracker DayPlan";
    }, 900);
    return () => {
      clearInterval(id);
      document.title = "Tracker DayPlan";
    };
  }, [done]);

  const breakMin = store.data.settings.shortBreakMinutes;

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <i className="brand-dot" />
          Tracker DayPlan <small>прототип</small>
        </div>
        <button
          className="btn-icon"
          onClick={() => setLight((v) => !v)}
          title={light ? "Тёмная тема" : "Светлая тема"}
        >
          {light ? <IconMoon size={16} /> : <IconSun size={16} />}
        </button>
      </div>

      <Today store={store} timer={timer} date={date} setDate={setDate} />

      {toast && (
        <div className="toast" role="status">
          <span className="tick">
            <IconCheck size={12} />
          </span>
          {toast}
        </div>
      )}

      {/* Стойкое уведомление: висит, пока не закроют */}
      {done && (
        <div className="modal-backdrop" onClick={() => setDone(null)}>
          <div
            className="modal"
            role="alertdialog"
            aria-live="assertive"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-ico">
              <IconTomato size={26} />
            </div>
            <h3 className="modal-title">Помидор завершён</h3>
            <p className="modal-text">
              <b>{done.title}</b>
              <br />
              Засчитано {done.minutes} мин. Пора отдохнуть {breakMin} мин.
            </p>
            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setDone(null)}>
                <IconCheck size={14} /> Понятно
              </button>
            </div>
            <div className="modal-hint">Enter или Esc — закрыть</div>
          </div>
        </div>
      )}
    </div>
  );
}

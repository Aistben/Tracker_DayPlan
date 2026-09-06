import { useState } from "react";
import Today from "./screens/Today";
import Timer from "./screens/Timer";
import Stats from "./screens/Stats";
import { useStore, useTimer } from "./lib/useStore";
import { todayISO } from "./lib/storage";

type Tab = "today" | "timer" | "stats";

export default function App() {
  const store = useStore();
  const [tab, setTab] = useState<Tab>("today");
  const [date, setDate] = useState(todayISO());

  const timer = useTimer((taskId, elapsedSec, completed) => {
    store.addSession({
      taskId,
      startedAt: Date.now() - elapsedSec * 1000,
      endedAt: Date.now(),
      durationMinutes: Math.max(1, Math.round(elapsedSec / 60)),
      type: "focus",
      completed,
    });
  });

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16, maxWidth: 900 }}>
      <h1 style={{ fontSize: 20 }}>Tracker DayPlan — прототип</h1>

      <nav style={{ margin: "12px 0", display: "flex", gap: 8 }}>
        <button onClick={() => setTab("today")} disabled={tab === "today"}>
          Сегодня
        </button>
        <button onClick={() => setTab("timer")} disabled={tab === "timer"}>
          Таймер {timer.running ? "●" : ""}
        </button>
        <button onClick={() => setTab("stats")} disabled={tab === "stats"}>
          Статистика
        </button>
      </nav>
      <hr />

      {tab === "today" && (
        <Today store={store} timer={timer} date={date} setDate={setDate} />
      )}
      {tab === "timer" && <Timer store={store} timer={timer} />}
      {tab === "stats" && <Stats store={store} />}
    </div>
  );
}

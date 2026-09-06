import { useState } from "react";
import Today from "./screens/Today";
import { useStore, useTimer } from "./lib/useStore";
import { todayISO } from "./lib/storage";

export default function App() {
  const store = useStore();
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
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>
        Tracker DayPlan — прототип
      </h1>

      <Today store={store} timer={timer} date={date} setDate={setDate} />
    </div>
  );
}

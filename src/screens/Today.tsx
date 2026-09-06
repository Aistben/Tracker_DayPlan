import { useMemo, useState } from "react";
import { STATUS_LABEL, STATUS_MARKER, Status } from "../lib/types";
import { spentMinutes, tasksForDate, shiftISO } from "../lib/storage";
import type { useStore, useTimer } from "../lib/useStore";

type Props = {
  store: ReturnType<typeof useStore>;
  timer: ReturnType<typeof useTimer>;
  date: string;
  setDate: (d: string) => void;
};

// Категория скрыта в UI прототипа, но остаётся в модели ради статистики.
const DEFAULT_CATEGORY_ID = "work";

function fmt(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h}ч ${m}м` : `${m}м`;
}

export default function Today({ store, timer, date, setDate }: Props) {
  const { data } = store;
  const [title, setTitle] = useState("");
  const [planned, setPlanned] = useState(30);

  const tasks = useMemo(
    () => tasksForDate(data.tasks, date).filter((t) => t.status !== "moved"),
    [data.tasks, date]
  );

  const totals = useMemo(() => {
    const plan = tasks.reduce((s, t) => s + t.plannedMinutes, 0);
    const spent = tasks.reduce((s, t) => s + spentMinutes(data.sessions, t.id), 0);
    const counts: Partial<Record<Status, number>> = {};
    tasks.forEach((t) => (counts[t.status] = (counts[t.status] ?? 0) + 1));
    return { plan, spent, counts };
  }, [tasks, data.sessions]);

  const pct = totals.plan ? Math.round((totals.spent / totals.plan) * 100) : 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    store.addTask(title.trim(), DEFAULT_CATEGORY_ID, planned, date);
    setTitle("");
  };

  return (
    <div>
      <h2>
        <button onClick={() => setDate(shiftISO(date, -1))}>←</button> {date}{" "}
        <button onClick={() => setDate(shiftISO(date, 1))}>→</button>
      </h2>

      <p>
        План {fmt(totals.plan)} · Факт {fmt(totals.spent)} · {pct}%
      </p>
      <progress value={totals.spent} max={totals.plan || 1} style={{ width: "100%" }} />

      <p>
        {(Object.keys(STATUS_MARKER) as Status[])
          .filter((s) => totals.counts[s])
          .map((s) => `${STATUS_MARKER[s]} ${totals.counts[s]}`)
          .join("   ")}
      </p>

      <table border={1} cellPadding={6} style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>—</th><th>Задача</th>
            <th>Факт / План</th><th>Таймер</th><th></th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => {
            const spent = spentMinutes(data.sessions, t.id);
            const isActive = timer.taskId === t.id;
            return (
              <tr key={t.id}>
                <td>
                  <button
                    onClick={() => store.cycleStatus(t.id)}
                    title={STATUS_LABEL[t.status]}
                    style={{ fontSize: 18, width: 34 }}
                  >
                    {STATUS_MARKER[isActive ? "active" : t.status]}
                  </button>
                </td>
                <td
                  style={{
                    textDecoration:
                      t.status === "done" || t.status === "cancelled"
                        ? "line-through"
                        : "none",
                  }}
                >
                  {t.title}
                </td>
                <td>
                  {fmt(spent)} / {fmt(t.plannedMinutes)}
                </td>
                <td>
                  {isActive ? (
                    <em>идёт…</em>
                  ) : (
                    <button onClick={() => timer.start(t.id, data.settings.focusMinutes)}>
                      ▶ старт
                    </button>
                  )}
                </td>
                <td>
                  <button onClick={() => store.removeTask(t.id)}>✕</button>
                </td>
              </tr>
            );
          })}
          {!tasks.length && (
            <tr>
              <td colSpan={5}>
                <em>Пусто. Добавь задачу ниже.</em>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <form onSubmit={submit} style={{ marginTop: 12 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Новая задача"
          style={{ width: 260 }}
        />{" "}
        <input
          type="number"
          min={5}
          step={5}
          value={planned}
          onChange={(e) => setPlanned(+e.target.value)}
          style={{ width: 70 }}
        />{" "}
        мин <button type="submit">Добавить</button>
      </form>

      <p style={{ marginTop: 16 }}>
        <button onClick={() => store.carryOver(date, shiftISO(date, 1))}>
          Закрыть день → перенести незакрытое на завтра
        </button>
      </p>
    </div>
  );
}

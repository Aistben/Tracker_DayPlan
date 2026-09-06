import { useMemo, useState } from "react";
import { STATUS_EMOJI, STATUS_LABEL, Status, taskColor } from "../lib/types";
import { spentMinutes, tasksForDate, shiftISO } from "../lib/storage";
import Stats from "./Stats";
import type { useStore, useTimer } from "../lib/useStore";

type Props = {
  store: ReturnType<typeof useStore>;
  timer: ReturnType<typeof useTimer>;
  date: string;
  setDate: (d: string) => void;
};

// Категория скрыта в UI прототипа, но остаётся в модели ради статистики.
const DEFAULT_CATEGORY_ID = "work";

function mmss(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

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
  const activeTask = data.tasks.find((t) => t.id === timer.taskId) ?? null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    store.addTask(title.trim(), DEFAULT_CATEGORY_ID, planned, date);
    setTitle("");
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ margin: 0 }}>
          <button onClick={() => setDate(shiftISO(date, -1))} title="Предыдущий день">
            ⬅️
          </button>{" "}
          {date}{" "}
          <button onClick={() => setDate(shiftISO(date, 1))} title="Следующий день">
            ➡️
          </button>
        </h2>

        {/* Таймер активной задачи — всегда на виду */}
        <div
          style={{
            border: "1px solid #ccc",
            borderRadius: 6,
            padding: "6px 12px",
            minWidth: 300,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {activeTask ? (
            <>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 26,
                  width: 78,
                  opacity: timer.running ? 1 : 0.45,
                }}
              >
                {mmss(
                  timer.mode === "pomodoro"
                    ? Math.max(0, timer.targetSec - timer.elapsed)
                    : timer.elapsed
                )}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <small
                  style={{
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={activeTask.title}
                >
                  {activeTask.title}
                </small>
                <small style={{ opacity: 0.6 }}>
                  {timer.running ? "идёт" : "на паузе"}
                </small>
              </span>
              <button
                onClick={() => timer.setRunning(!timer.running)}
                title={timer.running ? "Пауза" : "Возобновить"}
              >
                {timer.running ? "⏸️" : "▶️"}
              </button>
              <button onClick={timer.stop} title="Стоп — записать как прерванную">
                ⏹️
              </button>
              <button
                onClick={() => {
                  timer.complete();
                  store.setStatus(activeTask.id, "done");
                }}
                title="Готово — засчитать время и закрыть задачу"
              >
                ✔️
              </button>
            </>
          ) : (
            <small style={{ opacity: 0.6, flex: 1 }}>
              ⏱️ Таймер не запущен — нажми ▶️ у задачи
            </small>
          )}
        </div>
      </div>

      <p style={{ margin: "6px 0 12px", fontSize: 13, opacity: 0.85 }}>
        <label>
          <input
            type="radio"
            checked={timer.mode === "pomodoro"}
            onChange={() => timer.setMode("pomodoro")}
          />{" "}
          🍅 Помидоро
        </label>{" "}
        <input
          type="number"
          min={1}
          value={data.settings.focusMinutes}
          onChange={(e) => store.updateSettings({ focusMinutes: +e.target.value })}
          style={{ width: 52 }}
          disabled={timer.mode !== "pomodoro"}
        />{" "}
        мин {" · "}
        <label>
          <input
            type="radio"
            checked={timer.mode === "stopwatch"}
            onChange={() => timer.setMode("stopwatch")}
          />{" "}
          ⏱️ Секундомер
        </label>{" "}
        <button
          onClick={() => "Notification" in window && Notification.requestPermission()}
          title="Уведомление в конце помидорки"
        >
          🔔
        </button>
      </p>

      <p>
        План {fmt(totals.plan)} · Факт {fmt(totals.spent)} · {pct}%
      </p>
      <progress value={totals.spent} max={totals.plan || 1} style={{ width: "100%" }} />

      <p>
        {(Object.keys(STATUS_EMOJI) as Status[])
          .filter((s) => totals.counts[s])
          .map((s) => `${STATUS_EMOJI[s]} ${STATUS_LABEL[s]}: ${totals.counts[s]}`)
          .join("   ·   ")}
      </p>

      <table
        border={1}
        cellPadding={6}
        style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}
      >
        <colgroup>
          <col style={{ width: 46 }} />
          <col />
          <col style={{ width: 130 }} />
          <col style={{ width: 210 }} />
          <col style={{ width: 46 }} />
        </colgroup>
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
                    title={`${STATUS_LABEL[t.status]} — клик меняет статус`}
                    style={{ fontSize: 18, width: 34 }}
                  >
                    {STATUS_EMOJI[isActive ? "active" : t.status]}
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
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: taskColor(t.id),
                      marginRight: 8,
                    }}
                  />
                  {t.title}
                </td>
                <td>
                  {fmt(spent)} / {fmt(t.plannedMinutes)}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {isActive ? (
                    <em style={{ opacity: 0.7 }}>▶️ идёт — управление вверху</em>
                  ) : (
                    <button
                      onClick={() => timer.start(t.id, data.settings.focusMinutes)}
                      title="Запустить таймер"
                      disabled={timer.taskId !== null}
                      style={{ width: "100%" }}
                    >
                      ▶️ старт
                    </button>
                  )}
                </td>
                <td>
                  <button onClick={() => store.removeTask(t.id)} title="Удалить">🗑️</button>
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
        мин <button type="submit">➕ Добавить</button>
      </form>

      <p style={{ marginTop: 16 }}>
        <button onClick={() => store.carryOver(date, shiftISO(date, 1))}>
          🌙 Закрыть день — перенести незакрытое на завтра
        </button>
      </p>

      <hr style={{ margin: "24px 0" }} />
      <h3 style={{ marginTop: 0 }}>📊 Часы по дням</h3>
      <Stats store={store} compact />


    </div>
  );
}

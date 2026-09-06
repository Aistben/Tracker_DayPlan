import { useMemo, useState } from "react";
import { STATUS_EMOJI, STATUS_LABEL, Status, colorByIndex } from "../lib/types";
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
  const { data, colorIndex } = store;
  const [title, setTitle] = useState("");
  const [planned, setPlanned] = useState(30);
  const [showCfg, setShowCfg] = useState(false);

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
  const dialColor = activeTask
    ? colorByIndex(colorIndex.get(activeTask.id) ?? 0)
    : "#c9c9c9";
  // Помидоро — заполняется до конца отрезка, секундомер — по кругу за час.
  const dialFrac =
    timer.mode === "pomodoro"
      ? timer.targetSec
        ? Math.min(1, timer.elapsed / timer.targetSec)
        : 0
      : (timer.elapsed % 3600) / 3600;

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
          gap: 20,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        {/* дата */}
        <div>
          <h2 style={{ margin: 0 }}>
            <button onClick={() => setDate(shiftISO(date, -1))} title="Предыдущий день">
              ⬅️
            </button>{" "}
            {date}{" "}
            <button onClick={() => setDate(shiftISO(date, 1))} title="Следующий день">
              ➡️
            </button>
          </h2>
        </div>

        {/* циферблат — прижат к правому краю, параллельно дате */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginLeft: "auto",
          }}
        >
          <svg width={104} height={104} viewBox="0 0 104 104">
            <circle cx="52" cy="52" r="46" fill="none" stroke="#e3e3e3" strokeWidth="9" />
            <circle
              cx="52"
              cy="52"
              r="46"
              fill="none"
              stroke={activeTask ? dialColor : "#c9c9c9"}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 46}
              strokeDashoffset={2 * Math.PI * 46 * (1 - dialFrac)}
              transform="rotate(-90 52 52)"
              style={{ transition: "stroke-dashoffset .3s linear" }}
            />
            <text
              x="52"
              y="52"
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="monospace"
              fontSize="21"
              opacity={activeTask && !timer.running ? 0.45 : 1}
            >
              {mmss(
                timer.mode === "pomodoro"
                  ? Math.max(0, timer.targetSec - timer.elapsed)
                  : timer.elapsed
              )}
            </text>
          </svg>

          <div>
            {activeTask ? (
              <>
                <div
                  style={{
                    maxWidth: 210,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontWeight: 600,
                  }}
                  title={activeTask.title}
                >
                  {activeTask.title}
                </div>
                <small style={{ opacity: 0.6 }}>
                  {timer.running ? "идёт" : "на паузе"}
                </small>
                <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
                  <button
                    onClick={() => timer.setRunning(!timer.running)}
                    title={timer.running ? "Пауза" : "Возобновить"}
                  >
                    {timer.running ? "⏸️" : "▶️"}
                  </button>
                  <button
                    onClick={() => {
                      timer.stop();
                      store.setStatus(activeTask.id, "partial");
                    }}
                    title="Стоп — время засчитать, задача не доделана"
                  >
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
                  <button onClick={() => setShowCfg((v) => !v)} title="Настройки помодоро">
                    ⚙️
                  </button>
                </div>
              </>
            ) : (
              <>
                <small style={{ opacity: 0.6 }}>Таймер не запущен</small>
                <div style={{ marginTop: 6 }}>
                  <button onClick={() => setShowCfg((v) => !v)} title="Настройки помодоро">
                    ⚙️ Настройки
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showCfg && (
        <p
          style={{
            border: "1px solid #ddd",
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: 13,
          }}
        >
          Режим:{" "}
          <label>
            <input
              type="radio"
              checked={timer.mode === "pomodoro"}
              onChange={() => timer.setMode("pomodoro")}
            />{" "}
            🍅 Помидоро
          </label>{" "}
          <label>
            <input
              type="radio"
              checked={timer.mode === "stopwatch"}
              onChange={() => timer.setMode("stopwatch")}
            />{" "}
            ⏱️ Секундомер
          </label>
          <br />
          🍅 Фокус{" "}
          <input
            type="number"
            min={1}
            value={data.settings.focusMinutes}
            onChange={(e) => store.updateSettings({ focusMinutes: +e.target.value })}
            style={{ width: 56 }}
          />{" "}
          мин · Перерыв{" "}
          <input
            type="number"
            min={1}
            value={data.settings.shortBreakMinutes}
            onChange={(e) =>
              store.updateSettings({ shortBreakMinutes: +e.target.value })
            }
            style={{ width: 56 }}
          />{" "}
          мин{" "}
          <button
            onClick={() => "Notification" in window && Notification.requestPermission()}
          >
            🔔 Уведомления
          </button>
        </p>
      )}

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
          <col style={{ width: 96 }} />
          <col style={{ width: 46 }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ width: 46 }}></th>
            <th style={{ textAlign: "left" }}>Задача</th>
            <th colSpan={2}></th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => {
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
                      background: colorByIndex(colorIndex.get(t.id) ?? 0),
                      marginRight: 8,
                    }}
                  />
                  {t.title}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {isActive ? (
                    <em style={{ opacity: 0.6, fontSize: 12 }}>идёт ⏳</em>
                  ) : (
                    <button
                      onClick={() => timer.start(t.id, data.settings.focusMinutes)}
                      title="Запустить таймер"
                      disabled={timer.taskId !== null}
                      style={{ width: "100%" }}
                    >
                      ▶️
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
              <td colSpan={4}>
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

import { useMemo, useState } from "react";
import { STATUS_EMOJI, STATUS_LABEL, Status, colorByIndex } from "../lib/types";
import { spentMinutes, tasksForDate, shiftISO } from "../lib/storage";
import Stats from "./Stats";
import Calendar from "./Calendar";
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
  const [showCal, setShowCal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPlan, setEditPlan] = useState(30);

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
  const startEdit = (t: { id: string; title: string; plannedMinutes: number }) => {
    setEditId(t.id);
    setEditTitle(t.title);
    setEditPlan(t.plannedMinutes);
  };
  const saveEdit = (id: string) => {
    if (editTitle.trim()) {
      store.updateTask(id, {
        title: editTitle.trim(),
        plannedMinutes: Math.max(5, editPlan),
      });
    }
    setEditId(null);
  };

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
            <button
              onClick={() => setShowCal((v) => !v)}
              title="Выбрать дату"
              style={{ font: "inherit", cursor: "pointer", padding: "2px 8px" }}
            >
              📅 {date} {showCal ? "▴" : "▾"}
            </button>
          </h2>

          {/* выпадает так же плавно, как настройки таймера */}
          <div
            style={{
              overflow: "hidden",
              maxHeight: showCal ? 340 : 0,
              opacity: showCal ? 1 : 0,
              transition:
                "max-height .25s ease, opacity .2s ease, margin-top .25s ease",
              marginTop: showCal ? 8 : 0,
              visibility: showCal ? "visible" : "hidden",
            }}
            aria-hidden={!showCal}
          >
            <Calendar
              data={data}
              value={date}
              onPick={(d) => {
                setDate(d);
                setShowCal(false);
              }}
            />
          </div>
        </div>

        {/* циферблат — прижат к правому краю, параллельно дате */}
        <div style={{ marginLeft: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
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

          {/* выезжает из блока таймера, шириной ровно по нему */}
          <div
            style={{
              overflow: "hidden",
              maxHeight: showCfg ? 200 : 0,
              opacity: showCfg ? 1 : 0,
              transition: "max-height .25s ease, opacity .2s ease, margin-top .25s ease",
              marginTop: showCfg ? 8 : 0,
              visibility: showCfg ? "visible" : "hidden",
            }}
            aria-hidden={!showCfg}
          >
            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 13,
                lineHeight: 1.9,
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
              Фокус{" "}
              <input
                type="number"
                min={1}
                value={data.settings.focusMinutes}
                onChange={(e) =>
                  store.updateSettings({ focusMinutes: +e.target.value })
                }
                style={{ width: 52 }}
              />{" "}
              мин · Перерыв{" "}
              <input
                type="number"
                min={1}
                value={data.settings.shortBreakMinutes}
                onChange={(e) =>
                  store.updateSettings({ shortBreakMinutes: +e.target.value })
                }
                style={{ width: 52 }}
              />{" "}
              мин{" "}
              <button
                onClick={() =>
                  "Notification" in window && Notification.requestPermission()
                }
              >
                🔔
              </button>
            </div>
          </div>
        </div>
      </div>


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

      <div style={{ overflowX: "auto" }}>
      <table
        border={1}
        cellPadding={6}
        style={{
          width: "100%",
          minWidth: 620,
          borderCollapse: "collapse",
          tableLayout: "fixed",
        }}
      >
        <colgroup>
          <col style={{ width: 44 }} />
          <col />
          <col style={{ width: 92 }} />
          <col style={{ width: 116 }} />
          <col style={{ width: 44 }} />
          <col style={{ width: 44 }} />
        </colgroup>
        <thead>
          <tr>
            {/* один заголовок на всю ширину таблицы */}
            <th colSpan={6} style={{ textAlign: "center" }}>
              Задача
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => {
            const isActive = timer.taskId === t.id;
            return (
              <tr key={t.id}>
                <td style={{ textAlign: "center" }}>
                  <button
                    onClick={() => store.cycleStatus(t.id)}
                    title={`${STATUS_LABEL[t.status]} — клик меняет статус`}
                    style={{ fontSize: 16 }}
                  >
                    {STATUS_EMOJI[isActive ? "active" : t.status]}
                  </button>
                </td>
                <td style={{ overflow: "hidden" }}>
                  {editId === t.id ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(t.id);
                          if (e.key === "Escape") setEditId(null);
                        }}
                        autoFocus
                        style={{ flex: 1, minWidth: 0 }}
                      />
                      <input
                        type="number"
                        min={5}
                        step={5}
                        value={editPlan}
                        onChange={(e) => setEditPlan(+e.target.value)}
                        title="Плановое время, мин"
                        style={{ width: 58, flexShrink: 0 }}
                      />
                      <button onClick={() => saveEdit(t.id)} title="Сохранить" style={{ flexShrink: 0 }}>
                        💾
                      </button>
                      <button onClick={() => setEditId(null)} title="Отмена" style={{ flexShrink: 0 }}>
                        ↩️
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          flexShrink: 0,
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          background: colorByIndex(colorIndex.get(t.id) ?? 0),
                        }}
                      />
                      <span
                        onDoubleClick={() => startEdit(t)}
                        title={`${t.title} — двойной клик, чтобы переименовать`}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          cursor: "text",
                          textDecoration:
                            t.status === "done" || t.status === "cancelled"
                              ? "line-through"
                              : "none",
                        }}
                      >
                        {t.title}
                      </span>
                    </div>
                  )}
                </td>

                <td
                  style={{
                    whiteSpace: "nowrap",
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                    fontSize: 13,
                  }}
                >
                  {fmt(spentMinutes(data.sessions, t.id))}
                  <span style={{ opacity: 0.45 }}> / {fmt(t.plannedMinutes)}</span>
                </td>

                <td style={{ whiteSpace: "nowrap", fontSize: 12, textAlign: "center" }}>
                  <button
                    onClick={() => store.addManualTime(t.id, -15)}
                    title="Списать 15 минут"
                    style={{ width: 34 }}
                  >
                    −15
                  </button>{" "}
                  <button
                    onClick={() => store.addManualTime(t.id, 15)}
                    title="Добавить 15 минут"
                    style={{ width: 34 }}
                  >
                    +15
                  </button>{" "}
                  <button onClick={() => startEdit(t)} title="Редактировать" style={{ width: 30 }}>
                    ✏️
                  </button>
                </td>
                <td style={{ textAlign: "center" }}>
                  {isActive ? (
                    <span title="Таймер идёт">⏳</span>
                  ) : (
                    <button
                      onClick={() => timer.start(t.id, data.settings.focusMinutes)}
                      title="Запустить таймер"
                      disabled={timer.taskId !== null}
                    >
                      ▶️
                    </button>
                  )}
                </td>
                <td style={{ textAlign: "center" }}>
                  <button onClick={() => store.removeTask(t.id)} title="Удалить">
                    🗑️
                  </button>
                </td>
              </tr>
            );
          })}
          {!tasks.length && (
            <tr>
              <td colSpan={6}>
                <em>Пусто. Добавь задачу ниже.</em>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

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

import { useMemo, useState } from "react";
import { STATUS_EMOJI, STATUS_LABEL, Status, colorByIndex } from "../lib/types";
import { spentMinutes, tasksForDate, shiftISO, todayISO } from "../lib/storage";
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

// «пятница, 5 сентября» — читается лучше, чем 2026-09-05
function humanDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const s = d.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function relativeDay(iso: string) {
  const t = todayISO();
  if (iso === t) return "сегодня";
  if (iso === shiftISO(t, -1)) return "вчера";
  if (iso === shiftISO(t, 1)) return "завтра";
  return null;
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

  const pct = totals.plan
    ? Math.min(100, Math.round((totals.spent / totals.plan) * 100))
    : 0;

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
    : "var(--text-faint)";
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

  const R = 44;
  const C = 2 * Math.PI * R;
  const rel = relativeDay(date);
  const openCount = tasks.filter(
    (t) => t.status === "planned" || t.status === "partial"
  ).length;

  return (
    <>
      {/* ---------- Шапка: дата + таймер ---------- */}
      <div className="card">
        <div className="day-head">
          <div>
            <button
              className="date-btn"
              onClick={() => setShowCal((v) => !v)}
              title="Выбрать дату"
              aria-expanded={showCal}
            >
              {humanDate(date)}
              <span className="chev">{showCal ? "▲" : "▼"}</span>
            </button>
            <div className="date-sub">
              {rel ? `${rel} · ` : ""}
              {tasks.length
                ? `${tasks.length} задач · ${openCount} открыто`
                : "задач нет"}
            </div>

            <div className={`collapse${showCal ? " open" : ""}`} aria-hidden={!showCal}>
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

          {/* ---------- Таймер ---------- */}
          <div>
            <div className="timer-box">
              <div className="dial-wrap">
                <svg width={102} height={102} viewBox="0 0 102 102">
                  <circle
                    className="dial-track"
                    cx="51" cy="51" r={R}
                    fill="none" strokeWidth="7"
                  />
                  <circle
                    cx="51" cy="51" r={R}
                    fill="none"
                    stroke={dialColor}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    strokeDashoffset={C * (1 - dialFrac)}
                    transform="rotate(-90 51 51)"
                    style={{ transition: "stroke-dashoffset .35s linear" }}
                  />
                  <text
                    className={`dial-time${
                      activeTask && !timer.running ? " paused" : ""
                    }`}
                    x="51" y="47"
                    textAnchor="middle" dominantBaseline="central"
                  >
                    {mmss(
                      timer.mode === "pomodoro"
                        ? Math.max(0, timer.targetSec - timer.elapsed)
                        : timer.elapsed
                    )}
                  </text>
                  <text
                    className="dial-label"
                    x="51" y="64"
                    textAnchor="middle" dominantBaseline="central"
                  >
                    {timer.mode === "pomodoro" ? "фокус" : "отсчёт"}
                  </text>
                </svg>
              </div>

              <div className="timer-info">
                {activeTask ? (
                  <>
                    <div className="timer-task" title={activeTask.title}>
                      {activeTask.title}
                    </div>
                    <span className="timer-state">
                      {timer.running && <i className="pulse" />}
                      {timer.running ? "идёт" : "на паузе"}
                    </span>
                    <div className="timer-actions">
                      <button
                        className="btn-icon"
                        onClick={() => timer.setRunning(!timer.running)}
                        title={timer.running ? "Пауза" : "Продолжить"}
                      >
                        {timer.running ? "⏸" : "▶"}
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => {
                          timer.stop();
                          store.setStatus(activeTask.id, "partial");
                        }}
                        title="Стоп — время засчитать, задача не доделана"
                      >
                        ⏹
                      </button>
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => {
                          timer.complete();
                          store.setStatus(activeTask.id, "done");
                        }}
                        title="Готово — засчитать время и закрыть задачу"
                      >
                        ✓ Готово
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => setShowCfg((v) => !v)}
                        title="Настройки таймера"
                      >
                        ⚙
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="muted" style={{ marginBottom: 8 }}>
                      Таймер не запущен
                    </div>
                    <button
                      className="btn-sm"
                      onClick={() => setShowCfg((v) => !v)}
                      title="Настройки таймера"
                    >
                      ⚙ Настройки
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className={`collapse${showCfg ? " open" : ""}`} aria-hidden={!showCfg}>
              <div className="settings-panel">
                <div className="settings-row">
                  <label>
                    <input
                      type="radio"
                      checked={timer.mode === "pomodoro"}
                      onChange={() => timer.setMode("pomodoro")}
                    />
                    🍅 Помидоро
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={timer.mode === "stopwatch"}
                      onChange={() => timer.setMode("stopwatch")}
                    />
                    ⏱ Секундомер
                  </label>
                </div>
                <div className="settings-row">
                  <span className="muted">Фокус</span>
                  <input
                    type="number" min={1}
                    value={data.settings.focusMinutes}
                    onChange={(e) =>
                      store.updateSettings({ focusMinutes: +e.target.value })
                    }
                    style={{ width: 62 }}
                  />
                  <span className="muted">Перерыв</span>
                  <input
                    type="number" min={1}
                    value={data.settings.shortBreakMinutes}
                    onChange={(e) =>
                      store.updateSettings({ shortBreakMinutes: +e.target.value })
                    }
                    style={{ width: 62 }}
                  />
                  <span className="spacer" />
                  <button
                    className="btn-sm"
                    onClick={() =>
                      "Notification" in window && Notification.requestPermission()
                    }
                  >
                    🔔 Уведомления
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Прогресс дня ---------- */}
      <div className="card">
        <div className="progress-row">
          <span className="progress-nums">
            <b>{fmt(totals.spent)}</b> из {fmt(totals.plan)}
          </span>
          <span className="progress-nums">
            <b>{pct}%</b>
          </span>
        </div>
        <div className="bar">
          <i style={{ width: `${pct}%` }} />
        </div>
        {!!tasks.length && (
          <div className="chips">
            {(Object.keys(STATUS_EMOJI) as Status[])
              .filter((s) => totals.counts[s])
              .map((s) => (
                <span key={s} className="chip">
                  {STATUS_EMOJI[s]} {STATUS_LABEL[s]}
                  <b style={{ color: "var(--text)" }}>{totals.counts[s]}</b>
                </span>
              ))}
          </div>
        )}
      </div>

      {/* ---------- Задачи ---------- */}
      <div className="card">
        <h3 className="section-title">Задачи</h3>

        {tasks.length ? (
          <div className="tasks">
            {tasks.map((t) => {
              const isActive = timer.taskId === t.id;
              const spent = spentMinutes(data.sessions, t.id);
              const color = colorByIndex(colorIndex.get(t.id) ?? 0);
              const cls = [
                "task",
                isActive ? "is-active" : "",
                t.status === "done" ? "is-done" : "",
                t.status === "cancelled" ? "is-cancelled" : "",
              ].filter(Boolean).join(" ");

              return (
                <div
                  key={t.id}
                  className={cls}
                  style={{ ["--task-color" as string]: color }}
                >
                  <button
                    className="status-btn"
                    onClick={() => store.cycleStatus(t.id)}
                    title={`${STATUS_LABEL[t.status]} — клик меняет статус`}
                  >
                    {STATUS_EMOJI[isActive ? "active" : t.status]}
                  </button>

                  <div className="task-main">
                    {editId === t.id ? (
                      <div className="task-edit">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(t.id);
                            if (e.key === "Escape") setEditId(null);
                          }}
                          autoFocus
                        />
                        <input
                          type="number" min={5} step={5}
                          value={editPlan}
                          onChange={(e) => setEditPlan(+e.target.value)}
                          title="Плановое время, мин"
                          style={{ width: 62 }}
                        />
                        <button className="btn-primary btn-sm" onClick={() => saveEdit(t.id)}>
                          Сохранить
                        </button>
                        <button className="btn-sm" onClick={() => setEditId(null)}>
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <>
                        <div
                          className="task-title"
                          onDoubleClick={() => startEdit(t)}
                          title={`${t.title} — двойной клик, чтобы изменить`}
                        >
                          {t.title}
                        </div>
                        {isActive && (
                          <div className="task-meta">выполняется сейчас</div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="task-time">
                    <b>{fmt(spent)}</b> / {fmt(t.plannedMinutes)}
                  </div>

                  <div className="task-tail">
                    {/* свёрнуто: кнопка запуска; на hover — полный набор */}
                    {!isActive && (
                      <button
                        className="btn-icon task-run"
                        onClick={() => timer.start(t.id, data.settings.focusMinutes)}
                        title={
                          timer.taskId
                            ? "Сначала останови текущий таймер"
                            : "Запустить таймер"
                        }
                        disabled={timer.taskId !== null}
                        style={{ fontSize: 15, position: "absolute", right: 0 }}
                      >
                        ▶
                      </button>
                    )}

                    <div className="task-actions">
                      {!isActive && (
                        <button
                          className="btn-icon"
                          onClick={() => timer.start(t.id, data.settings.focusMinutes)}
                          title={
                            timer.taskId
                              ? "Сначала останови текущий таймер"
                              : "Запустить таймер"
                          }
                          disabled={timer.taskId !== null}
                        >
                          ▶
                        </button>
                      )}
                      <button
                        className="btn-icon"
                        onClick={() => store.addManualTime(t.id, -15)}
                        title="Списать 15 минут"
                      >
                        −15
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => store.addManualTime(t.id, 15)}
                        title="Добавить 15 минут"
                      >
                        +15
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => startEdit(t)}
                        title="Изменить"
                      >
                        ✎
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => store.removeTask(t.id)}
                        title="Удалить"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty">
            На этот день задач нет.
            <br />
            Добавь первую в поле ниже.
          </div>
        )}

        <form className="add-form" onSubmit={submit}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Что нужно сделать?"
          />
          <span className="suffix">
            <input
              type="number" min={5} step={5}
              value={planned}
              onChange={(e) => setPlanned(+e.target.value)}
              style={{ width: 68 }}
            />
            мин
          </span>
          <button className="btn-primary" type="submit">
            Добавить
          </button>
        </form>

        {openCount > 0 && (
          <div style={{ marginTop: 14 }}>
            <button
              className="btn-sm"
              onClick={() => store.carryOver(date, shiftISO(date, 1))}
              title="Незакрытые задачи переедут на следующий день"
            >
              🌙 Закрыть день — перенести {openCount} на завтра
            </button>
          </div>
        )}
      </div>

      {/* ---------- Статистика ---------- */}
      <div className="card">
        <Stats store={store} compact />
      </div>
    </>
  );
}

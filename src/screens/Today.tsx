import { useEffect, useMemo, useState } from "react";
import { STATUS_EMOJI, STATUS_LABEL, Status, colorByIndex } from "../lib/types";
import {
  IconPlay, IconPause, IconStop, IconCheck, IconSettings, IconEdit,
  IconTrash, IconPlus, IconMinus, IconChevronDown, IconCalendar,
  IconBell, IconTimer, IconTomato, IconMoon, StatusIcon,
} from "../lib/icons";
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

  // Escape закрывает всплывающие панели.
  useEffect(() => {
    if (!showCal && !showCfg) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowCal(false);
        setShowCfg(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showCal, showCfg]);

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
      {(showCal || showCfg) && (
        <div
          className="pop-backdrop"
          onClick={() => {
            setShowCal(false);
            setShowCfg(false);
          }}
        />
      )}

      {/* ---------- Шапка: дата + таймер + прогресс ---------- */}
      <div className="card">
        <div className="day-head">
          <div className="pop-anchor">
            <button
              className="date-btn"
              onClick={() => { setShowCfg(false); setShowCal((v) => !v); }}
              title="Выбрать дату"
              aria-expanded={showCal}
            >
              <IconCalendar size={16} className="cal-ico" />
              {humanDate(date)}
              <IconChevronDown size={14} className="chev" />
            </button>
            <div className="date-sub">
              {rel && (
                <>
                  <span>{rel}</span>
                  <i className="dot-sep" />
                </>
              )}
              {tasks.length ? (
                <>
                  <span>{tasks.length} задач</span>
                  <i className="dot-sep" />
                  <span>{openCount} открыто</span>
                </>
              ) : (
                <span>задач нет</span>
              )}
            </div>

            <div
              className={`popover left${showCal ? " open" : ""}`}
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

          {/* ---------- Таймер ---------- */}
          <div className="pop-anchor">
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
                        {timer.running ? <IconPause size={15} /> : <IconPlay size={15} />}
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => {
                          timer.stop();
                          store.setStatus(activeTask.id, "partial");
                        }}
                        title="Стоп — время засчитать, задача не доделана"
                      >
                        <IconStop size={14} />
                      </button>
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => {
                          timer.complete();
                          store.setStatus(activeTask.id, "done");
                        }}
                        title="Готово — засчитать время и закрыть задачу"
                      >
                        <IconCheck size={14} /> Готово
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => { setShowCal(false); setShowCfg((v) => !v); }}
                        title="Настройки таймера"
                      >
                        <IconSettings size={15} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="muted" style={{ marginBottom: 8 }}>
                      Таймер не запущен
                    </div>
                    <button
                      className="btn-outline btn-sm"
                      onClick={() => { setShowCal(false); setShowCfg((v) => !v); }}
                      title="Настройки таймера"
                    >
                      <IconSettings size={14} /> Настройки
                    </button>
                  </>
                )}
              </div>
            </div>

            <div
              className={`popover right${showCfg ? " open" : ""}`}
              aria-hidden={!showCfg}
            >
              <div className="settings-panel">
                <div className="settings-row">
                  <div className="mode-switch">
                    <button
                      className={timer.mode === "pomodoro" ? "on" : ""}
                      onClick={() => timer.setMode("pomodoro")}
                    >
                      <IconTomato size={15} /> Помидоро
                    </button>
                    <button
                      className={timer.mode === "stopwatch" ? "on" : ""}
                      onClick={() => timer.setMode("stopwatch")}
                    >
                      <IconTimer size={15} /> Секундомер
                    </button>
                  </div>
                </div>
                <div className="settings-row">
                  <span className="settings-lab">Фокус</span>
                  <input
                    type="number" min={1}
                    value={data.settings.focusMinutes}
                    onChange={(e) =>
                      store.updateSettings({ focusMinutes: +e.target.value })
                    }
                    style={{ width: 58 }}
                  />
                  <span className="settings-lab">Перерыв</span>
                  <input
                    type="number" min={1}
                    value={data.settings.shortBreakMinutes}
                    onChange={(e) =>
                      store.updateSettings({ shortBreakMinutes: +e.target.value })
                    }
                    style={{ width: 58 }}
                  />
                </div>
                <div className="settings-row">
                  <button
                    className="btn-outline btn-sm"
                    style={{ width: "100%" }}
                    onClick={() =>
                      "Notification" in window && Notification.requestPermission()
                    }
                  >
                    <IconBell size={14} /> Включить уведомления
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="day-progress">
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
                <span key={s} className={`chip st-${s}`}>
                  <span className={`st status-btn s-${s}`} style={{ width: 14, height: 14 }}>
                    <StatusIcon status={s} size={14} />
                  </span>
                  {STATUS_LABEL[s]}
                  <b>{totals.counts[s]}</b>
                </span>
              ))}
          </div>
        )}
        </div>
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
              const over = spent > t.plannedMinutes;
              const cls = [
                "task",
                over ? "is-over" : "",
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
                    className={`status-btn s-${isActive ? "active" : t.status}`}
                    onClick={() => store.cycleStatus(t.id)}
                    title={`${STATUS_LABEL[t.status]} — клик меняет статус`}
                  >
                    <StatusIcon status={isActive ? "active" : t.status} size={18} />
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
                          <IconCheck size={13} />
                        </button>
                        <button className="btn-outline btn-sm" onClick={() => setEditId(null)}>
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
                        {isActive && <div className="task-note">выполняется</div>}
                      </>
                    )}
                  </div>

                  <div className="task-time">
                    <div>
                      <b>{spent ? fmt(spent) : "0м"}</b>
                      <span className="sep">/</span>
                      {fmt(t.plannedMinutes)}
                    </div>
                    <div className="task-bar">
                      <i
                        style={{
                          width: `${Math.min(
                            100,
                            t.plannedMinutes
                              ? (spent / t.plannedMinutes) * 100
                              : 0
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="task-tail">
                    {!isActive && !timer.taskId && (
                      <>
                        <button
                          className="btn-icon btn-run"
                          onClick={() => timer.start(t.id, data.settings.focusMinutes)}
                          title="Запустить таймер"
                        >
                          <IconPlay size={14} />
                        </button>
                        <i className="divider" />
                      </>
                    )}
                    <button
                      className="btn-icon sm"
                      onClick={() => store.addManualTime(t.id, -15)}
                      title="Списать 15 минут"
                    >
                      <IconMinus size={13} />
                    </button>
                    <button
                      className="btn-icon sm"
                      onClick={() => store.addManualTime(t.id, 15)}
                      title="Добавить 15 минут"
                    >
                      <IconPlus size={13} />
                    </button>
                    <button
                      className="btn-icon sm"
                      onClick={() => startEdit(t)}
                      title="Изменить"
                    >
                      <IconEdit size={13} />
                    </button>
                    <button
                      className="btn-icon sm danger"
                      onClick={() => store.removeTask(t.id)}
                      title="Удалить"
                    >
                      <IconTrash size={13} />
                    </button>
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
            <IconPlus size={15} /> Добавить
          </button>
        </form>

        {openCount > 0 && (
          <div style={{ marginTop: 14 }}>
            <button
              className="btn-outline btn-sm"
              onClick={() => store.carryOver(date, shiftISO(date, 1))}
              title="Незакрытые задачи переедут на следующий день"
            >
              <IconMoon size={14} /> Закрыть день — перенести {openCount} на завтра
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

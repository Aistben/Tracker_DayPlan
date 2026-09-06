import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppData,
  Session,
  Status,
  STATUS_CYCLE,
  Task,
} from "./types";
import { load, save, todayISO, uid } from "./storage";

export function useStore() {
  const [data, setData] = useState<AppData>(() => load());

  useEffect(() => {
    save(data);
  }, [data]);

  const addTask = useCallback(
    (title: string, categoryId: string, plannedMinutes: number, date: string) => {
      setData((d) => ({
        ...d,
        tasks: [
          ...d.tasks,
          {
            id: uid(),
            title,
            status: "planned" as Status,
            categoryId,
            plannedMinutes,
            date,
            order: d.tasks.filter((t) => t.date === date).length,
            createdAt: Date.now(),
            doneAt: null,
          },
        ],
      }));
    },
    []
  );

  const setStatus = useCallback((id: string, status: Status) => {
    setData((d) => ({
      ...d,
      tasks: d.tasks.map((t) =>
        t.id === id
          ? { ...t, status, doneAt: status === "done" ? Date.now() : t.doneAt }
          : t
      ),
    }));
  }, []);

  const cycleStatus = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      tasks: d.tasks.map((t) => {
        if (t.id !== id) return t;
        const i = STATUS_CYCLE.indexOf(t.status);
        const next = STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length];
        return {
          ...t,
          status: next,
          doneAt: next === "done" ? Date.now() : null,
        };
      }),
    }));
  }, []);

  const removeTask = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      tasks: d.tasks.filter((t) => t.id !== id),
      sessions: d.sessions.filter((s) => s.taskId !== id),
    }));
  }, []);

  const addSession = useCallback((s: Omit<Session, "id">) => {
    setData((d) => ({ ...d, sessions: [...d.sessions, { ...s, id: uid() }] }));
  }, []);

  // Перенос незакрытых задач на следующий день (CONCEPT §7, этап 5).
  const carryOver = useCallback((from: string, to: string) => {
    setData((d) => {
      const stuck = d.tasks.filter(
        (t) => t.date === from && (t.status === "planned" || t.status === "partial")
      );
      if (!stuck.length) return d;
      const base = d.tasks.filter((t) => t.date === to).length;
      const clones: Task[] = stuck.map((t, i) => ({
        ...t,
        id: uid(),
        date: to,
        status: "planned",
        order: base + i,
        doneAt: null,
      }));
      return {
        ...d,
        tasks: [
          ...d.tasks.map((t) =>
            stuck.some((s) => s.id === t.id) ? { ...t, status: "moved" as Status } : t
          ),
          ...clones,
        ],
      };
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<AppData["settings"]>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem("tracker-dayplan-v1");
    location.reload();
  }, []);

  return {
    data,
    addTask,
    setStatus,
    cycleStatus,
    removeTask,
    addSession,
    carryOver,
    updateSettings,
    reset,
  };
}

// Таймер: помидоро или свободный секундомер (CONCEPT §5.2).
export type TimerMode = "pomodoro" | "stopwatch";

export function useTimer(
  onFinish: (taskId: string, elapsedSec: number, completed: boolean) => void
) {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [mode, setMode] = useState<TimerMode>("pomodoro");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [targetSec, setTargetSec] = useState(25 * 60);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Автозавершение помидорки.
  useEffect(() => {
    if (mode === "pomodoro" && running && elapsed >= targetSec) {
      setRunning(false);
      if (taskId) finishRef.current(taskId, elapsed, true);
      setElapsed(0);
      setTaskId(null);
      try {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Помидор завершён", { body: "Пора сделать перерыв" });
        }
      } catch {}
    }
  }, [elapsed, running, targetSec, mode, taskId]);

  const start = (id: string, focusMinutes: number) => {
    setTaskId(id);
    setTargetSec(focusMinutes * 60);
    setElapsed(0);
    setRunning(true);
  };

  // Прерванная сессия всё равно пишется: время потрачено (CONCEPT §5.2).
  const stop = () => {
    if (elapsed > 0 && taskId) finishRef.current(taskId, elapsed, false);
    setRunning(false);
    setElapsed(0);
    setTaskId(null);
  };

  const complete = () => {
    if (elapsed > 0 && taskId) finishRef.current(taskId, elapsed, true);
    setRunning(false);
    setElapsed(0);
    setTaskId(null);
  };

  return {
    taskId, mode, setMode, running, setRunning,
    elapsed, targetSec, start, stop, complete,
  };
}

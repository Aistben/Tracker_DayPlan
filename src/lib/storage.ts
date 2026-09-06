// Слой хранения. Сейчас localStorage.
// В Tauri-сборке заменяется на SQLite — остальной код не меняется.

import {
  AppData,
  DEFAULT_CATEGORIES,
  DEFAULT_SETTINGS,
  Task,
  Session,
} from "./types";

const KEY = "tracker-dayplan-v1";

export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function shiftISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function empty(): AppData {
  return {
    tasks: [],
    sessions: [],
    categories: DEFAULT_CATEGORIES,
    settings: DEFAULT_SETTINGS,
  };
}

export function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as AppData;
    return {
      ...empty(),
      ...parsed,
      categories: parsed.categories?.length
        ? parsed.categories
        : DEFAULT_CATEGORIES,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
  } catch {
    return empty();
  }
}

export function save(data: AppData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* превышена квота — молча игнорируем в прототипе */
  }
}

// Демо-данные, чтобы графики не были пустыми при первом запуске.
function seed(): AppData {
  const data = empty();
  const today = todayISO();

  const plan: Array<[string, string, number]> = [
    ["Свёрстать экран статистики", "work", 90],
    ["Разобрать почту", "work", 20],
    ["Тренировка", "sport", 45],
    ["Дочитать главу", "study", 60],
    ["Позвонить родителям", "personal", 20],
  ];

  plan.forEach(([title, categoryId, plannedMinutes], i) => {
    data.tasks.push({
      id: uid(),
      title,
      status: "planned",
      categoryId,
      plannedMinutes,
      date: today,
      order: i,
      createdAt: Date.now(),
      doneAt: null,
    });
  });

  // История за прошлые 6 дней — только сессии, для недельного графика.
  const cats = ["work", "work", "study", "sport", "home"];
  for (let d = 1; d <= 6; d++) {
    const date = shiftISO(today, -d);
    const count = 4 + Math.floor(Math.random() * 6);
    for (let s = 0; s < count; s++) {
      const hour = 9 + Math.floor(Math.random() * 11);
      const start = new Date(date + "T00:00:00").getTime() + hour * 3600_000;
      const taskId = uid();
      data.tasks.push({
        id: taskId,
        title: "Задача " + (s + 1),
        status: Math.random() > 0.25 ? "done" : "partial",
        categoryId: cats[s % cats.length],
        plannedMinutes: 30,
        date,
        order: s,
        createdAt: start,
        doneAt: start,
      });
      data.sessions.push({
        id: uid(),
        taskId,
        startedAt: start,
        endedAt: start + 25 * 60000,
        durationMinutes: 25,
        type: "focus",
        completed: Math.random() > 0.2,
      });
    }
  }

  save(data);
  return data;
}

// spent считается из сессий — источник правды один (CONCEPT §4).
export function spentMinutes(sessions: Session[], taskId: string): number {
  return sessions
    .filter((s) => s.taskId === taskId && s.type === "focus")
    .reduce((sum, s) => sum + s.durationMinutes, 0);
}

export function tasksForDate(tasks: Task[], date: string): Task[] {
  return tasks.filter((t) => t.date === date).sort((a, b) => a.order - b.order);
}

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

// Стартовый набор задач. Сессий нет — статистика заполняется
// только реальной работой по таймеру.
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

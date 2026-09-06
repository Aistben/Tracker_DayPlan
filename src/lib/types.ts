// Доменная модель. Соответствует docs/CONCEPT.md §4.

export type Status =
  | "planned"
  | "active"
  | "done"
  | "partial"
  | "cancelled"
  | "moved";

export const STATUS_MARKER: Record<Status, string> = {
  planned: "○",
  active: "◐",
  done: "●",
  partial: "◒",
  cancelled: "✕",
  moved: "→",
};

export const STATUS_EMOJI: Record<Status, string> = {
  planned: "⬜",
  active: "⏳",
  done: "✅",
  partial: "🟨",
  cancelled: "❌",
  moved: "➡️",
};

export const STATUS_LABEL: Record<Status, string> = {
  planned: "Запланировано",
  active: "В работе",
  done: "Выполнено",
  partial: "Частично",
  cancelled: "Отменено",
  moved: "Перенесено",
};

// Порядок перебора по клику на маркер.
export const STATUS_CYCLE: Status[] = [
  "planned",
  "done",
  "partial",
  "cancelled",
];

export type Category = {
  id: string;
  name: string;
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "work", name: "Работа" },
  { id: "study", name: "Учёба" },
  { id: "sport", name: "Спорт" },
  { id: "home", name: "Быт" },
  { id: "personal", name: "Личное" },
];

export type Task = {
  id: string;
  title: string;
  status: Status;
  categoryId: string;
  plannedMinutes: number;
  date: string; // YYYY-MM-DD
  order: number;
  createdAt: number;
  doneAt: number | null;
};

export type SessionType = "focus" | "short_break" | "long_break";

export type Session = {
  id: string;
  taskId: string | null;
  startedAt: number;
  endedAt: number;
  durationMinutes: number;
  type: SessionType;
  completed: boolean; // досидел или прервал
};

export type Settings = {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
};

export const DEFAULT_SETTINGS: Settings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
};

export type AppData = {
  tasks: Task[];
  sessions: Session[];
  categories: Category[];
  settings: Settings;
};

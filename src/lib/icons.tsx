// Единый набор иконок: тонкие штриховые SVG в стиле Lucide.
// Наследуют currentColor и размер, поэтому подчиняются теме.

type P = { size?: number; className?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const IconPlay = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6.5 4.8v14.4l11.2-7.2z" fill="currentColor" stroke="none" />
  </svg>
);

export const IconPause = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="7" y="5" width="3.4" height="14" rx="1.1" fill="currentColor" stroke="none" />
    <rect x="13.6" y="5" width="3.4" height="14" rx="1.1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconStop = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="6.2" y="6.2" width="11.6" height="11.6" rx="2.2" fill="currentColor" stroke="none" />
  </svg>
);

export const IconCheck = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);

export const IconSettings = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9.1 19.4a1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9.1a1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 .97-1.47V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47.97H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.47.97z" />
  </svg>
);

export const IconEdit = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);

export const IconTrash = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export const IconPlus = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconMinus = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M5 12h14" />
  </svg>
);

export const IconChevronLeft = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export const IconChevronRight = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export const IconChevronDown = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const IconCalendar = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

export const IconBell = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M18 8a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 14 18 8" />
    <path d="M13.7 20a2 2 0 0 1-3.4 0" />
  </svg>
);

export const IconMoon = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M20.5 14.3A8.5 8.5 0 1 1 9.7 3.5a6.8 6.8 0 0 0 10.8 10.8" />
  </svg>
);

export const IconSun = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8" />
  </svg>
);

export const IconTimer = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="13.5" r="8" />
    <path d="M12 9.5v4l2.5 2M9 2h6" />
  </svg>
);

export const IconTomato = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 6.5c4.4 0 7.5 3 7.5 7s-3.1 7-7.5 7-7.5-3-7.5-7 3.1-7 7.5-7z" />
    <path d="M9 5c1 1 2 1.5 3 1.5S14 6 15 5M12 4v2.5" />
  </svg>
);

export const IconMoonSleep = ({ size = 16, className }: P) => IconMoon({ size, className });

// --- Маркеры статусов: геометрические фигуры вместо эмодзи ---
export const StatusIcon = ({
  status,
  size = 17,
}: {
  status: string;
  size?: number;
}) => {
  const s = { width: size, height: size, viewBox: "0 0 24 24" };
  switch (status) {
    case "done":
      return (
        <svg {...s} fill="none">
          <circle cx="12" cy="12" r="9.2" fill="currentColor" />
          <path
            d="m7.8 12.2 2.9 2.9 5.5-6"
            stroke="var(--surface-2)"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      );
    case "active":
      // кольцо с треугольником: половинная заливка читалась как «чёрный бок»
      return (
        <svg {...s} fill="none">
          <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.9" />
          <path d="M10.2 8.6v6.8l5.4-3.4z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "partial":
      return (
        <svg {...s} fill="none">
          <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.9" />
          <circle cx="12" cy="12" r="4.4" fill="currentColor" />
        </svg>
      );
    case "cancelled":
      return (
        <svg {...s} fill="none">
          <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.9" />
          <path
            d="m9 9 6 6M15 9l-6 6"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      );
    case "moved":
      return (
        <svg {...s} fill="none">
          <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.9" />
          <path
            d="M8.5 12h7m-3-3 3 3-3 3"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    default: // planned
      return (
        <svg {...s} fill="none">
          <circle
            cx="12" cy="12" r="9.2"
            stroke="currentColor" strokeWidth="1.9"
            strokeDasharray="3 3.2"
          />
        </svg>
      );
  }
};

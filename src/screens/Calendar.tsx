import { useMemo, useState } from "react";
import { todayISO } from "../lib/storage";
import type { AppData } from "../lib/types";
import { IconChevronLeft, IconChevronRight } from "../lib/icons";

const DOW = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function Calendar({
  data,
  value,
  onPick,
}: {
  data: AppData;
  value: string;
  onPick: (date: string) => void;
}) {
  const [ym, setYm] = useState(() => {
    const d = new Date(value + "T00:00:00");
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  // Минуты по датам — чтобы подсветить дни с работой.
  const minutesByDate = useMemo(() => {
    const map = new Map<string, number>();
    data.sessions
      .filter((s) => s.type === "focus")
      .forEach((s) => {
        const d = new Date(s.startedAt);
        const off = d.getTimezoneOffset();
        const key = new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
        map.set(key, (map.get(key) ?? 0) + s.durationMinutes);
      });
    return map;
  }, [data.sessions]);

  const taskDates = useMemo(
    () => new Set(data.tasks.map((t) => t.date)),
    [data.tasks]
  );

  const cells = useMemo(() => {
    const first = new Date(ym.y, ym.m, 1);
    const shift = (first.getDay() + 6) % 7; // неделя с понедельника
    const total = new Date(ym.y, ym.m + 1, 0).getDate();
    const out: Array<number | null> = Array(shift).fill(null);
    for (let d = 1; d <= total; d++) out.push(d);
    return out;
  }, [ym]);

  const today = todayISO();
  const move = (delta: number) => {
    const d = new Date(ym.y, ym.m + delta, 1);
    setYm({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <div className="cal">
      <div className="cal-head">
        <button className="btn-icon sm" onClick={() => move(-1)} title="Предыдущий месяц">
          <IconChevronLeft size={15} />
        </button>
        <span className="cal-title">
          {MONTHS[ym.m]} {ym.y}
        </span>
        <button className="btn-icon sm" onClick={() => move(1)} title="Следующий месяц">
          <IconChevronRight size={15} />
        </button>
      </div>

      <div className="cal-grid">
        {DOW.map((d) => (
          <div key={d} className="cal-dow">
            {d}
          </div>
        ))}

        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const key = iso(ym.y, ym.m, d);
          const min = minutesByDate.get(key) ?? 0;
          const selected = key === value;
          const isToday = key === today;
          const cls = [
            "cal-day",
            selected ? "sel" : "",
            isToday ? "today" : "",
            min > 0 ? "has-work" : "",
            taskDates.has(key) ? "has-tasks" : "",
          ].filter(Boolean).join(" ");
          return (
            <button
              key={key}
              className={cls}
              onClick={() => onPick(key)}
              title={min ? `${Math.round(min)} мин работы` : undefined}
            >
              {d}
              {min > 0 && <span className="cal-dot" />}
            </button>
          );
        })}
      </div>

      <div className="cal-foot">
        <button className="btn-sm" onClick={() => onPick(today)}>
          Сегодня
        </button>
      </div>
    </div>
  );
}

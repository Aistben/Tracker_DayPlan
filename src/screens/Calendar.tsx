import { useMemo, useState } from "react";
import { todayISO } from "../lib/storage";
import type { AppData } from "../lib/types";

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
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 6,
        padding: 10,
        width: 268,
        background: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <button onClick={() => move(-1)} title="Предыдущий месяц">‹</button>
        <strong style={{ fontSize: 13 }}>
          {MONTHS[ym.m]} {ym.y}
        </strong>
        <button onClick={() => move(1)} title="Следующий месяц">›</button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
          fontSize: 12,
        }}
      >
        {DOW.map((d) => (
          <div key={d} style={{ textAlign: "center", opacity: 0.5, padding: 2 }}>
            {d}
          </div>
        ))}

        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const key = iso(ym.y, ym.m, d);
          const min = minutesByDate.get(key) ?? 0;
          const selected = key === value;
          const isToday = key === today;
          return (
            <button
              key={key}
              onClick={() => onPick(key)}
              title={min ? `${Math.round(min)} мин работы` : undefined}
              style={{
                padding: "4px 0",
                cursor: "pointer",
                border: isToday ? "1px solid #4a90d9" : "1px solid transparent",
                borderRadius: 4,
                background: selected ? "#4a90d9" : min ? "#e8f3e8" : "transparent",
                color: selected ? "#fff" : "inherit",
                fontWeight: taskDates.has(key) ? 700 : 400,
                position: "relative",
              }}
            >
              {d}
              {min > 0 && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 2,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: selected ? "#fff" : "#4aa777",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 8, textAlign: "center" }}>
        <button onClick={() => onPick(today)} style={{ fontSize: 12 }}>
          Сегодня
        </button>
      </div>
    </div>
  );
}

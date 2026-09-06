import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { shiftISO, todayISO } from "../lib/storage";
import { colorByIndex } from "../lib/types";
import type { useStore } from "../lib/useStore";

type Period = 7 | 30;

function fmtH(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h}ч ${m}м` : `${m}м`;
}

export default function Stats({
  store,
  compact = false,
}: {
  store: ReturnType<typeof useStore>;
  compact?: boolean;
}) {
  const { data, colorIndex } = store;
  const [days, setDays] = useState<Period>(7);

  // Столбик на день, внутри — сегмент на каждую задачу.
  const { chart, taskKeys, totalMin, activeDays } = useMemo(() => {
    const today = todayISO();
    const dates = Array.from({ length: days }, (_, i) =>
      shiftISO(today, i - (days - 1))
    );

    // date -> taskId -> минуты
    const grid = new Map<string, Map<string, number>>();
    dates.forEach((d) => grid.set(d, new Map()));

    data.sessions
      .filter((s) => s.type === "focus" && s.taskId)
      .forEach((s) => {
        const d = new Date(s.startedAt);
        const off = d.getTimezoneOffset();
        const iso = new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
        const day = grid.get(iso);
        if (!day) return;
        day.set(s.taskId!, (day.get(s.taskId!) ?? 0) + s.durationMinutes);
      });

    // Уникальные задачи периода, по убыванию суммарного времени.
    const totals = new Map<string, number>();
    grid.forEach((day) =>
      day.forEach((min, id) => totals.set(id, (totals.get(id) ?? 0) + min))
    );
    const keys = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);

    const rows = dates.map((date) => {
      const day = grid.get(date)!;
      const row: Record<string, string | number> = {
        label:
          days === 7
            ? ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][
                (new Date(date + "T00:00:00").getDay() + 6) % 7
              ]
            : date.slice(8),
        date,
      };
      keys.forEach((id) => {
        row[id] = day.get(id) ?? 0; // минуты
      });
      return row;
    });

    const total = [...totals.values()].reduce((a, b) => a + b, 0);
    const active = dates.filter((d) => (grid.get(d)?.size ?? 0) > 0).length;
    return { chart: rows, taskKeys: keys, totalMin: total, activeDays: active };
  }, [data.sessions, days]);

  const titleOf = (id: string) =>
    data.tasks.find((t) => t.id === id)?.title ?? "Удалённая задача";

  const avg = activeDays ? totalMin / activeDays : 0;

  // Пока времени мало, часы дают полоску в пиксель — показываем минуты.
  const maxMin = Math.max(
    0,
    ...chart.map((r) =>
      taskKeys.reduce((sum, k) => sum + (Number(r[k]) || 0), 0)
    )
  );
  const inHours = maxMin >= 120;
  const toUnit = (min: number) => (inHours ? +(min / 60).toFixed(2) : min);

  return (
    <div>
      {!compact && <h2>📊 Статистика</h2>}

      <p>
        <button onClick={() => setDays(7)} disabled={days === 7}>
          Неделя
        </button>{" "}
        <button onClick={() => setDays(30)} disabled={days === 30}>
          Месяц
        </button>
      </p>

      <p>
        Всего <strong>{fmtH(totalMin)}</strong> · В среднем{" "}
        <strong>{fmtH(avg)}</strong> в активный день · Активных дней{" "}
        <strong>{activeDays}</strong> из {days}
      </p>

      <div style={{ width: "100%", height: compact ? 240 : 300 }}>
        <ResponsiveContainer>
          <BarChart
            data={chart.map((r) => {
              const row: Record<string, string | number> = {
                label: r.label,
                date: r.date,
              };
              taskKeys.forEach((k) => (row[k] = toUnit(Number(r[k]) || 0)));
              return row;
            })}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" interval={days === 7 ? 0 : 2} />
            <YAxis unit={inHours ? "ч" : "м"} allowDecimals={inHours} />
            {/* shared=false — тултип показывает только тот сегмент, на котором курсор */}
            <Tooltip
              shared={false}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              formatter={(v: number, name: string) => [
                inHours ? `${v} ч` : `${v} мин`,
                titleOf(name),
              ]}
              labelFormatter={(_, p) => p?.[0]?.payload?.date ?? ""}
            />
            {taskKeys.map((id) => (
              <Bar key={id} dataKey={id} stackId="day" fill={colorByIndex(colorIndex.get(id) ?? 0)} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Легенда: своя, чтобы показывать названия задач, а не id. */}
      {taskKeys.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
          {taskKeys.map((id) => (
            <span key={id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  background: colorByIndex(colorIndex.get(id) ?? 0),
                  display: "inline-block",
                  borderRadius: 2,
                }}
              />
              <small>{titleOf(id)}</small>
            </span>
          ))}
        </div>
      )}

      {!totalMin && (
        <p>
          <em>
            Пока пусто. Запусти таймер на задаче — часы появятся здесь, каждая
            задача своим цветом.
          </em>
        </p>
      )}

      <p style={{ marginTop: 20 }}>
        <button
          onClick={() =>
            confirm("Удалить все задачи и сессии? Действие необратимо.") &&
            store.reset()
          }
        >
          🗑️ Сбросить все данные
        </button>
      </p>
    </div>
  );
}

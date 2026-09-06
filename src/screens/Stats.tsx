import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { shiftISO, todayISO } from "../lib/storage";
import { colorByIndex } from "../lib/types";
import type { useStore } from "../lib/useStore";

type Period = 7 | 30 | 365;

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

    // Год: 365 столбиков нечитаемы — группируем по месяцам.
    const finalRows =
      days === 365
        ? (() => {
            const MON = ["янв","фев","мар","апр","май","июн",
                         "июл","авг","сен","окт","ноя","дек"];
            const acc = new Map<string, Record<string, string | number>>();
            rows.forEach((r) => {
              const d = String(r.date);
              const key = d.slice(0, 7);
              if (!acc.has(key)) {
                acc.set(key, {
                  label: MON[+d.slice(5, 7) - 1],
                  date: key,
                });
              }
              const cur = acc.get(key)!;
              keys.forEach((id) => {
                cur[id] = (Number(cur[id]) || 0) + (Number(r[id]) || 0);
              });
            });
            return [...acc.values()];
          })()
        : rows;

    const total = [...totals.values()].reduce((a, b) => a + b, 0);
    const active = dates.filter((d) => (grid.get(d)?.size ?? 0) > 0).length;
    return { chart: finalRows, taskKeys: keys, totalMin: total, activeDays: active };
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
      <div className="stats-head">
        <h3 className="section-title" style={{ margin: 0 }}>
          Часы по дням
        </h3>
        <div className="segmented">
          <button onClick={() => setDays(7)} disabled={days === 7}>
            Неделя
          </button>
          <button onClick={() => setDays(30)} disabled={days === 30}>
            Месяц
          </button>
          <button onClick={() => setDays(365)} disabled={days === 365}>
            Год
          </button>
        </div>
      </div>

      <div className="kpis">
        <div>
          <div className="kpi-val">{fmtH(totalMin)}</div>
          <div className="kpi-lab">всего</div>
        </div>
        <div>
          <div className="kpi-val">{fmtH(avg)}</div>
          <div className="kpi-lab">в активный день</div>
        </div>
        <div>
          <div className="kpi-val">
            {activeDays}
            {days !== 365 && (
              <span style={{ color: "var(--text-faint)", fontSize: 14 }}>
                {" "}/ {days}
              </span>
            )}
          </div>
          <div className="kpi-lab">активных дней</div>
        </div>
      </div>

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
            <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              interval={days === 7 ? 0 : days === 30 ? 2 : 0}
              tick={{ fill: "var(--text-faint)", fontSize: 11 }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
            />
            <YAxis
              unit={inHours ? "ч" : "м"}
              allowDecimals={inHours}
              tick={{ fill: "var(--text-faint)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={38}
            />
            {/* shared=false — тултип показывает только тот сегмент, на котором курсор */}
            <Tooltip
              shared={false}
              cursor={{ fill: "rgba(125,140,170,0.09)" }}
              wrapperClassName="tooltip"
              formatter={(v: number, name: string) => [
                inHours ? `${v} ч` : `${v} мин`,
                titleOf(name),
              ]}
              labelFormatter={(_, p) => p?.[0]?.payload?.date ?? ""}
            />
            {taskKeys.map((id, i) => (
              <Bar
                key={id}
                dataKey={id}
                stackId="day"
                fill={colorByIndex(colorIndex.get(id) ?? 0)}
                radius={i === taskKeys.length - 1 ? [3, 3, 0, 0] : undefined}
                animationDuration={420}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Легенда: своя, чтобы показывать названия задач, а не id. */}
      {taskKeys.length > 0 && (
        <div className="legend">
          {taskKeys.map((id) => (
            <span key={id} className="legend-item">
              <i
                className="legend-swatch"
                style={{ background: colorByIndex(colorIndex.get(id) ?? 0) }}
              />
              {titleOf(id)}
            </span>
          ))}
        </div>
      )}

      {!totalMin && (
        <div className="empty" style={{ marginTop: 12 }}>
          Пока пусто. Запусти таймер на задаче — часы появятся здесь,
          <br />
          каждая задача своим цветом.
        </div>
      )}

      <div style={{ marginTop: 18, textAlign: "right" }}>
        <button
          className="btn-ghost btn-sm muted"
          onClick={() =>
            confirm("Удалить все задачи и сессии? Действие необратимо.") &&
            store.reset()
          }
        >
          Сбросить все данные
        </button>
      </div>
    </div>
  );
}

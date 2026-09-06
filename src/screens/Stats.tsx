import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { shiftISO, todayISO } from "../lib/storage";
import type { useStore } from "../lib/useStore";

type Period = 7 | 30;

export default function Stats({ store }: { store: ReturnType<typeof useStore> }) {
  const { data } = store;
  const [days, setDays] = useState<Period>(7);

  // Единственный график: сколько часов ушло по дням.
  const chart = useMemo(() => {
    const today = todayISO();
    // Минуты фокус-сессий, разложенные по датам.
    const byDate = new Map<string, number>();
    data.sessions
      .filter((s) => s.type === "focus")
      .forEach((s) => {
        const d = new Date(s.startedAt);
        const off = d.getTimezoneOffset();
        const iso = new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
        byDate.set(iso, (byDate.get(iso) ?? 0) + s.durationMinutes);
      });

    return Array.from({ length: days }, (_, i) => {
      const date = shiftISO(today, i - (days - 1));
      const min = byDate.get(date) ?? 0;
      const dow = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][
        (new Date(date + "T00:00:00").getDay() + 6) % 7
      ];
      return {
        // за неделю — дни недели, за месяц — числа
        label: days === 7 ? dow : date.slice(8),
        часы: +(min / 60).toFixed(1),
        date,
      };
    });
  }, [data.sessions, days]);

  const totalMin = chart.reduce((s, d) => s + d.часы * 60, 0);
  const activeDays = chart.filter((d) => d.часы > 0).length;
  const avg = activeDays ? totalMin / activeDays : 0;

  const fmtH = (min: number) => {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return h ? `${h}ч ${m}м` : `${m}м`;
  };

  return (
    <div>
      <h2>Статистика</h2>

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

      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" interval={days === 7 ? 0 : 2} />
            <YAxis unit="ч" />
            <Tooltip
              formatter={(v: number) => [`${v} ч`, "Потрачено"]}
              labelFormatter={(_, p) => p?.[0]?.payload?.date ?? ""}
            />
            <Bar dataKey="часы" fill="#4a7" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {!totalMin && (
        <p>
          <em>
            Пока пусто. Запусти таймер на задаче во вкладке «Сегодня» — часы
            появятся здесь.
          </em>
        </p>
      )}

      <p style={{ marginTop: 24 }}>
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

import { useMemo } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { shiftISO, todayISO } from "../lib/storage";
import type { useStore } from "../lib/useStore";

export default function Stats({ store }: { store: ReturnType<typeof useStore> }) {
  const { data } = store;

  // План/факт по дням за неделю.
  const week = useMemo(() => {
    const today = todayISO();
    return Array.from({ length: 7 }, (_, i) => {
      const date = shiftISO(today, i - 6);
      const dayTasks = data.tasks.filter((t) => t.date === date);
      const ids = new Set(dayTasks.map((t) => t.id));
      const spent = data.sessions
        .filter((s) => s.taskId && ids.has(s.taskId) && s.type === "focus")
        .reduce((sum, s) => sum + s.durationMinutes, 0);
      const plan = dayTasks.reduce((sum, t) => sum + t.plannedMinutes, 0);
      return {
        day: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][
          (new Date(date + "T00:00:00").getDay() + 6) % 7
        ],
        План: +(plan / 60).toFixed(1),
        Факт: +(spent / 60).toFixed(1),
      };
    });
  }, [data]);

  // Разбивка по категориям.
  const byCat = useMemo(() => {
    const map = new Map<string, number>();
    data.sessions
      .filter((s) => s.type === "focus")
      .forEach((s) => {
        const t = data.tasks.find((x) => x.id === s.taskId);
        if (!t) return;
        map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + s.durationMinutes);
      });
    return [...map.entries()].map(([id, min]) => ({
      name: data.categories.find((c) => c.id === id)?.name ?? id,
      value: +(min / 60).toFixed(1),
    }));
  }, [data]);

  // Активность по часам суток.
  const byHour = useMemo(() => {
    const arr = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}`, мин: 0 }));
    data.sessions
      .filter((s) => s.type === "focus")
      .forEach((s) => {
        arr[new Date(s.startedAt).getHours()].мин += s.durationMinutes;
      });
    return arr.filter((x) => +x.hour >= 6);
  }, [data]);

  const focus = data.sessions.filter((s) => s.type === "focus");
  const doneCount = data.tasks.filter((t) => t.status === "done").length;
  const closed = data.tasks.filter((t) => t.status !== "planned" && t.status !== "moved").length;
  const rate = closed ? Math.round((doneCount / closed) * 100) : 0;
  const colors = ["#4a7", "#47a", "#a47", "#aa4", "#7a4", "#a74"];

  return (
    <div>
      <h2>Статистика</h2>
      <p>
        Выполнено {rate}% · Сессий {focus.length} · Прервано{" "}
        {focus.filter((s) => !s.completed).length}
      </p>

      <h3>План / факт по дням, ч</h3>
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <BarChart data={week}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="План" fill="#bbb" />
            <Bar dataKey="Факт" fill="#4a7" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h3>По категориям, ч</h3>
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={byCat} dataKey="value" nameKey="name" outerRadius={80} label>
              {byCat.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <h3>Активность по часам, мин</h3>
      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer>
          <BarChart data={byHour}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="мин" fill="#47a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p style={{ marginTop: 20 }}>
        <button onClick={store.reset}>Сбросить все данные</button>
      </p>
    </div>
  );
}

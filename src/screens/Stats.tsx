import { useMemo } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { STATUS_EMOJI } from "../lib/types";
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

  // Что реально сделано: задачи с потраченным временем.
  const byTask = useMemo(() => {
    const spent = new Map<string, number>();
    data.sessions
      .filter((x) => x.type === "focus" && x.taskId)
      .forEach((x) => {
        spent.set(x.taskId!, (spent.get(x.taskId!) ?? 0) + x.durationMinutes);
      });
    return [...spent.entries()]
      .map(([id, min]) => {
        const t = data.tasks.find((x) => x.id === id);
        return {
          id,
          name: t?.title ?? "Удалённая задача",
          status: t?.status,
          date: t?.date ?? "",
          мин: min,
          plan: t?.plannedMinutes ?? 0,
        };
      })
      .sort((a, b) => b.мин - a.мин);
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

      <h3>Сделано по задачам, мин</h3>
      {!byTask.length ? (
        <p>
          <em>
            Пока пусто. Запусти таймер на задаче во вкладке «Сегодня» — она
            появится здесь.
          </em>
        </p>
      ) : (
        <>
          <div style={{ width: "100%", height: Math.max(160, byTask.length * 34) }}>
            <ResponsiveContainer>
              <BarChart data={byTask} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={180} />
                <Tooltip />
                <Bar dataKey="мин" fill="#4a7" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <table border={1} cellPadding={6} style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Задача</th><th>Статус</th><th>Дата</th><th>Факт / План</th>
              </tr>
            </thead>
            <tbody>
              {byTask.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.status ? STATUS_EMOJI[t.status] : "—"}</td>
                  <td>{t.date}</td>
                  <td>
                    {t.мин}м / {t.plan}м
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

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
        <button
          onClick={() =>
            confirm("Удалить все задачи и сессии? Действие необратимо.") &&
            store.reset()
          }
        >
          🗑️ Сбросить все данные
        </button>{" "}
        <small>
          старые демо-данные могли остаться в браузере — сброс их уберёт
        </small>
      </p>
    </div>
  );
}

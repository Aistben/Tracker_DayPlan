import type { useStore, useTimer } from "../lib/useStore";

type Props = {
  store: ReturnType<typeof useStore>;
  timer: ReturnType<typeof useTimer>;
};

function mmss(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Timer({ store, timer }: Props) {
  const { data } = store;
  const task = data.tasks.find((t) => t.id === timer.taskId);
  const remain =
    timer.mode === "pomodoro"
      ? Math.max(0, timer.targetSec - timer.elapsed)
      : timer.elapsed;

  return (
    <div>
      <h2>Таймер</h2>

      <p>
        Режим:{" "}
        <label>
          <input
            type="radio"
            checked={timer.mode === "pomodoro"}
            onChange={() => timer.setMode("pomodoro")}
          />{" "}
          Помидоро
        </label>{" "}
        <label>
          <input
            type="radio"
            checked={timer.mode === "stopwatch"}
            onChange={() => timer.setMode("stopwatch")}
          />{" "}
          Секундомер
        </label>
      </p>

      {!task ? (
        <p>
          <em>Задача не выбрана. Нажми «▶ старт» в списке задач.</em>
        </p>
      ) : (
        <>
          <p>Задача: <strong>{task.title}</strong></p>
          <p style={{ fontSize: 56, fontFamily: "monospace", margin: "8px 0" }}>
            {mmss(remain)}
          </p>
          {timer.mode === "pomodoro" && (
            <progress value={timer.elapsed} max={timer.targetSec} style={{ width: 320 }} />
          )}
          <p>
            <button onClick={() => timer.setRunning(!timer.running)}>
              {timer.running ? "⏸ Пауза" : "▶ Продолжить"}
            </button>{" "}
            <button onClick={timer.stop}>⏹ Стоп (записать как прерванную)</button>{" "}
            <button onClick={timer.complete}>✓ Готово</button>
          </p>
        </>
      )}

      <hr />
      <h3>Настройки</h3>
      <p>
        Фокус{" "}
        <input
          type="number"
          min={1}
          value={data.settings.focusMinutes}
          onChange={(e) => store.updateSettings({ focusMinutes: +e.target.value })}
          style={{ width: 60 }}
        />{" "}
        мин · Перерыв{" "}
        <input
          type="number"
          min={1}
          value={data.settings.shortBreakMinutes}
          onChange={(e) => store.updateSettings({ shortBreakMinutes: +e.target.value })}
          style={{ width: 60 }}
        />{" "}
        мин
      </p>
      <p>
        <button
          onClick={() =>
            "Notification" in window && Notification.requestPermission()
          }
        >
          Разрешить уведомления
        </button>
      </p>
    </div>
  );
}

import React from "react";

export function TimerPanel({
  display = "00:00:00",
  dateTime = "PT0S",
  actionLabel = "시작",
  statusMessage = "",
  disabled = false
}) {
  return (
    <section className="timer-panel" aria-label="학습 타이머">
      <time className="timer-display" dateTime={dateTime} data-timer-display>
        {display}
      </time>
      <div className="timer-actions">
        <button type="button" data-timer-toggle disabled={disabled}>
          {actionLabel}
        </button>
      </div>
      <p className="timer-policy" data-timer-status aria-live="polite">
        {statusMessage}
      </p>
    </section>
  );
}

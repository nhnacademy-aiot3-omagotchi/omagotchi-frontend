import React, { useId } from "react";

export function GameField({ label, hint, error, id, className = "", ...inputProps }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const messageId = `${inputId}-message`;

  return (
    <label className={["ui-field", className].filter(Boolean).join(" ")} htmlFor={inputId}>
      <span className="ui-field__label">{label}</span>
      <input
        {...inputProps}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={hint || error ? messageId : undefined}
      />
      {error ? <span id={messageId} className="ui-field__error">{error}</span> : null}
      {!error && hint ? <span id={messageId} className="ui-field__hint">{hint}</span> : null}
    </label>
  );
}

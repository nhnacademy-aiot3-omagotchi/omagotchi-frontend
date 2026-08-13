import React, { forwardRef } from "react";

export const GameButton = forwardRef(function GameButton({
  children,
  variant = "primary",
  loading = false,
  className = "",
  disabled,
  ...buttonProps
}, ref) {
  const classes = ["ui-button", `ui-button--${variant}`, loading ? "is-loading" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={ref}
      {...buttonProps}
      type={buttonProps.type ?? "button"}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? "처리 중…" : children}
    </button>
  );
});

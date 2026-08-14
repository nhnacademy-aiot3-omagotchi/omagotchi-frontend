import React from "react";

export function HomeDockButton({
  label,
  iconSrc,
  className = "",
  expanded,
  controls,
  title,
  ...buttonProps
}) {
  const classes = ["home-dock-button", className].filter(Boolean).join(" ");
  const accessibleLabel = title || label;

  return (
    <button
      {...buttonProps}
      className={classes}
      type="button"
      aria-expanded={expanded}
      aria-controls={controls}
      aria-label={accessibleLabel}
      title={accessibleLabel}
    >
      <img src={iconSrc} alt="" aria-hidden="true" />
      <span className="home-dock-label">{label}</span>
    </button>
  );
}

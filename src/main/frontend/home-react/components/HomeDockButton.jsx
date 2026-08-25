import React from "react";

export function HomeDockButton({
  label,
  iconSrc,
  iconText,
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
      {iconSrc ? <img src={iconSrc} alt="" aria-hidden="true" /> : null}
      {!iconSrc && iconText ? <span className="home-dock-glyph" aria-hidden="true">{iconText}</span> : null}
      <span className="home-dock-label">{label}</span>
    </button>
  );
}

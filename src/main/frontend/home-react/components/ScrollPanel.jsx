import React from "react";

export function ScrollPanel({
  children,
  label = "스크롤 영역",
  maxHeight = 280,
  axis = "vertical",
  className = ""
}) {
  const classes = ["home-scroll-panel", `home-scroll-panel--${axis}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={classes}
      role="region"
      aria-label={label}
      tabIndex={0}
      style={{ "--home-scroll-max-height": `${maxHeight}px` }}
    >
      {children}
    </section>
  );
}

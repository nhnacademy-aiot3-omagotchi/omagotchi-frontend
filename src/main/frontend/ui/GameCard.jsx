import React from "react";

export function GameCard({ eyebrow, title, description, tone = "mint", children, className = "" }) {
  const classes = ["ui-card", `ui-card--${tone}`, className].filter(Boolean).join(" ");

  return (
    <article className={classes}>
      {eyebrow ? <span className="ui-card__eyebrow">{eyebrow}</span> : null}
      {title ? <strong className="ui-card__title">{title}</strong> : null}
      {description ? <p className="ui-card__description">{description}</p> : null}
      {children}
    </article>
  );
}

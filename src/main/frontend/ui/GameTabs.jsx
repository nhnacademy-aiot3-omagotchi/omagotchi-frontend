import React from "react";
import { Tabs } from "radix-ui";

export function GameTabs({
  items,
  defaultValue,
  value,
  onValueChange,
  ariaLabel = "화면 전환",
  rootClassName = "ui-game-tabs",
  listClassName = "ui-game-tabs__list",
  triggerClassName = "ui-game-tabs__trigger",
  contentClassName = "ui-game-tabs__content"
}) {
  const initialValue = defaultValue || items[0]?.value;

  return (
    <Tabs.Root
      className={rootClassName}
      defaultValue={value === undefined ? initialValue : undefined}
      value={value}
      onValueChange={onValueChange}
    >
      <Tabs.List className={listClassName} aria-label={ariaLabel}>
        {items.map((item) => (
          <Tabs.Trigger
            key={item.value}
            {...item.triggerProps}
            className={triggerClassName}
            value={item.value}
          >
            {item.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {items.map((item) => item.contentHtml ? (
        <Tabs.Content
          key={item.value}
          {...item.contentProps}
          value={item.value}
          asChild
        >
          <div
            className={contentClassName}
            dangerouslySetInnerHTML={{ __html: item.contentHtml }}
          />
        </Tabs.Content>
      ) : (
        <Tabs.Content
          key={item.value}
          {...item.contentProps}
          className={contentClassName}
          value={item.value}
        >
          {item.content}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}

import React from "react";
import { Tabs } from "radix-ui";

export function GameTabs({
  items,
  defaultValue,
  value,
  onValueChange,
  ariaLabel = "화면 전환"
}) {
  const initialValue = defaultValue || items[0]?.value;

  return (
    <Tabs.Root
      className="ui-game-tabs"
      defaultValue={value === undefined ? initialValue : undefined}
      value={value}
      onValueChange={onValueChange}
    >
      <Tabs.List className="ui-game-tabs__list" aria-label={ariaLabel}>
        {items.map((item) => (
          <Tabs.Trigger key={item.value} className="ui-game-tabs__trigger" value={item.value}>
            {item.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {items.map((item) => (
        <Tabs.Content key={item.value} className="ui-game-tabs__content" value={item.value}>
          {item.content}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}

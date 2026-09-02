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
  contentClassName = "ui-game-tabs__content",
  // 기본값은 Radix 그대로(비활성 탭 언마운트)다. 켜면 모든 패널이 DOM에 남는다.
  // 탭 밖의 코드가 querySelector로 패널 내부를 갱신해야 할 때만 켠다.
  // 켠 경우 Radix가 hidden을 붙이지 않으므로 숨김은 [data-state="inactive"] CSS가 맡는다.
  forceMount = false
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
          forceMount={forceMount || undefined}
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
          forceMount={forceMount || undefined}
        >
          {item.content}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}

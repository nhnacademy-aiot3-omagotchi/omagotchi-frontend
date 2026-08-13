import React from "react";
import { ScrollPanel } from "./ScrollPanel.jsx";

const records = Array.from({ length: 14 }, (_, index) => ({
  id: index + 1,
  title: `${index + 1}번째 집중 학습`,
  detail: `${20 + index * 3}분 · 경험치 ${12 + index * 2}xp`
}));

const meta = {
  title: "Home/ScrollPanel",
  component: ScrollPanel,
  decorators: [
    (Story) => (
      <div className="home-page" style={{ minHeight: "460px", display: "grid", placeItems: "center", padding: "24px", background: "#087046" }}>
        <div style={{ width: "min(100%, 520px)" }}><Story /></div>
      </div>
    )
  ],
  args: { label: "학습 기록", maxHeight: 280, axis: "vertical" },
  parameters: { layout: "fullscreen" }
};

export default meta;

export const ShortContent = {
  render: (args) => (
    <ScrollPanel {...args}>
      <div className="home-scroll-card"><strong>오늘의 학습</strong><span>42분 · 36xp</span></div>
    </ScrollPanel>
  )
};

export const LongList = {
  render: (args) => (
    <ScrollPanel {...args}>
      <div className="home-scroll-list">
        {records.map((record) => <div className="home-scroll-card" key={record.id}><strong>{record.title}</strong><span>{record.detail}</span></div>)}
      </div>
    </ScrollPanel>
  )
};

export const Horizontal = {
  args: { axis: "horizontal", maxHeight: 170, label: "주간 학습 현황" },
  render: (args) => (
    <ScrollPanel {...args}>
      <div className="home-scroll-strip">
        {records.slice(0, 7).map((record) => <div className="home-scroll-card" key={record.id}><strong>{record.id}일차</strong><span>{record.detail}</span></div>)}
      </div>
    </ScrollPanel>
  )
};

export const Mobile = {
  args: { maxHeight: 220 },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => (
    <ScrollPanel {...args}>
      <div className="home-scroll-list">
        {records.slice(0, 8).map((record) => <div className="home-scroll-card" key={record.id}><strong>{record.title}</strong><span>{record.detail}</span></div>)}
      </div>
    </ScrollPanel>
  )
};

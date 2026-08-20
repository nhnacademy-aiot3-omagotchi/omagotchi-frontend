import React from "react";
import { HOME_MENU_ITEMS, TopMenu } from "./TopMenu.jsx";

const meta = {
  title: "Home/TopMenu",
  component: TopMenu,
  decorators: [
    (Story) => (
      <div className="home-page" style={{ minHeight: "520px", padding: "32px 20px", background: "#087046" }}>
        <section className="home-top-zone" style={{ margin: "0 auto" }}>
          <Story />
        </section>
      </div>
    )
  ],
  args: {
    title: "Omagotchi",
    items: HOME_MENU_ITEMS
  },
  parameters: {
    layout: "fullscreen"
  }
};

export default meta;

export const Default = {};

export const NoAlerts = {
  args: {
    items: HOME_MENU_ITEMS.map((item) => ({ ...item, alert: false }))
  }
};

export const MultipleAlerts = {
  args: {
    items: HOME_MENU_ITEMS.map((item) => ({
      ...item,
      alert: ["progress", "community"].includes(item.overlay)
    }))
  }
};

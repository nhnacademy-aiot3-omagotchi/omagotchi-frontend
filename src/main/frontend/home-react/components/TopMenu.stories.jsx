import React from "react";
import { expect, userEvent, within } from "storybook/test";
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

export const Default = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const menuButtons = canvas.getAllByRole("button");
    const locationBeforeClick = globalThis.location.href;

    await expect(menuButtons).toHaveLength(HOME_MENU_ITEMS.length);

    for (const item of HOME_MENU_ITEMS) {
      let requestedOverlay = null;
      const onOverlayRequest = (event) => {
        requestedOverlay = event.detail?.type;
      };

      globalThis.addEventListener("omagotchi:home-overlay-request", onOverlayRequest, { once: true });
      await userEvent.click(canvas.getByRole("button", { name: item.label }));

      await expect(requestedOverlay).toBe(item.overlay);
      await expect(globalThis.location.href).toBe(locationBeforeClick);
    }
  }
};

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

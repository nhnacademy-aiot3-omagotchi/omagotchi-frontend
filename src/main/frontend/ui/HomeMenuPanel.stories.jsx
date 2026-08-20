import React from "react";
import { HomeMenuPanel } from "./HomeMenuPanel.jsx";

const meta = {
  title: "Patterns/HomeMenuPanel",
  component: HomeMenuPanel,
  parameters: { layout: "fullscreen" },
  args: { menu: "progress" },
  argTypes: { menu: { control: "select", options: ["progress", "personal", "cohort", "records", "space", "community", "settings"] } }
};

export default meta;
export const Progress = {};
export const Personal = { args: { menu: "personal" } };
export const Cohort = { args: { menu: "cohort" } };
export const StudyRecords = { args: { menu: "records" } };
export const Space = { args: { menu: "space" } };
export const Community = { args: { menu: "community" } };
export const Settings = { args: { menu: "settings" } };
export const Mobile = { args: { menu: "community" }, parameters: { viewport: { defaultViewport: "mobile1" } } };

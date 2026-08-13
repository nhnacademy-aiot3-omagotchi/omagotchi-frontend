import React from "react";
import { AttendanceBook } from "./AttendanceBook.jsx";

const meta = {
  title: "Patterns/AttendanceBook",
  component: AttendanceBook,
  parameters: { layout: "fullscreen" },
  args: { status: "before", presentDays: [5, 6, 10], today: 13, streak: 3 },
  argTypes: { status: { control: "select", options: ["before", "checkedIn", "checkedOut"] } }
};

export default meta;
export const BeforeCheckIn = {};
export const CheckedIn = { args: { status: "checkedIn", presentDays: [5, 6, 10, 13], streak: 4 } };
export const CheckedOut = { args: { status: "checkedOut", presentDays: [5, 6, 10, 13], streak: 4 } };
export const Loading = { args: { loading: true } };
export const Empty = { args: { empty: true } };
export const Mobile = {
  args: { status: "checkedIn", presentDays: [5, 6, 10, 13], streak: 4 },
  parameters: { viewport: { defaultViewport: "mobile1" } }
};

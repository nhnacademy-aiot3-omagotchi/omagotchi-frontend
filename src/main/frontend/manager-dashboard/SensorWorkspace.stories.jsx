import { SensorWorkspace } from "./SensorWorkspace.jsx";
import "./SensorWorkspace.css";

const meta = {
  title: "SensorWorkspace",
  component: SensorWorkspace,
  parameters: { layout: "fullscreen" },
  argTypes: { defaultTab: { control: "select", options: ["dashboard", "sensors"] } }
};

export default meta;

const sensors = [
  { id: "lab-environment-01", name: "실습실 환경 센서", eui: "24E124725E123456", space: "lab", spaceLabel: "실습실", location: "본관 3F", interval: 60, metrics: ["temperature", "humidity"], active: true },
  { id: "meeting-temperature-01", name: "3층 회의실 A 온도", eui: "24E124725E220B7A", space: "meeting", spaceLabel: "회의실", location: "본관 3F · 회의실 A", interval: 60, metrics: ["temperature"], active: true },
  { id: "lab-co2-01", name: "실습실 CO₂", eui: "24E124725E5C02A1", space: "lab", spaceLabel: "실습실", location: "본관 3F · 출입구", interval: 60, metrics: ["co2"], active: false },
  { id: "library-humidity-01", name: "도서관 습도", eui: "24E124725E8A0F31", space: "library", spaceLabel: "도서관", location: "별관 2F", interval: 120, metrics: ["humidity"], active: true }
];

export const NoSensors = { name: "센서 미등록", args: { initialSensors: [] } };
export const DashboardWithData = { name: "대시보드 데이터 수신", args: { initialSensors: sensors, defaultTab: "dashboard" } };
export const SensorList = { name: "센서 목록", args: { initialSensors: sensors, defaultTab: "sensors" } };
export const Mobile = {
  args: { initialSensors: sensors, defaultTab: "dashboard" },
  parameters: { viewport: { defaultViewport: "mobile1" } }
};

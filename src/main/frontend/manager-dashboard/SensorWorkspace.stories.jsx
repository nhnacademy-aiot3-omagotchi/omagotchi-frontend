import { SensorWorkspace } from "./SensorWorkspace.jsx";
import "./SensorWorkspace.css";

const WINDOW_POINT_COUNTS = { DAY: 25, WEEK: 169, MONTH: 31 };
const METRIC_BASES = { temperature: 24, humidity: 45, co2: 600 };

function mockSeries(location, measurement, seriesWindow) {
  const count = WINDOW_POINT_COUNTS[seriesWindow] || 25;
  const stepMs = seriesWindow === "MONTH" ? 24 * 3600 * 1000 : 3600 * 1000;
  const base = METRIC_BASES[measurement] || 10;
  const start = Date.now() - (count - 1) * stepMs;
  const points = Array.from({ length: count }, (_, index) => {
    const avg = base + Math.sin(index / 4) * base * 0.08;
    const spike = index % 7 === 0 ? base * 0.09 : 0;
    return {
      time: new Date(start + index * stepMs).toISOString(),
      avg,
      min: avg - base * 0.06 - spike,
      max: avg + base * 0.06 + spike,
      minDeviceEui: "24e124725d081175",
      maxDeviceEui: "24e124785c389010",
      count: 3,
      partial: index === count - 1 ? true : undefined
    };
  });
  const seriesSensors = [
    { deviceEui: "24e124725d081175", point: "업무 공간 안쪽", displayName: "사무실 환경 센서" },
    { deviceEui: "24e124785c389010", point: "사무공간 스위치 옆", displayName: "사무실 온습도" },
    { deviceEui: "24e124128c140101", point: "전방 우측", displayName: "실습실 환경 센서" }
  ];
  return Promise.resolve({
    location,
    measurement,
    interval: seriesWindow === "MONTH" ? "1d" : "1h",
    sources: seriesWindow === "MONTH"
      ? { settled: "AVG_1D", hot: "AVG_1H" }
      : { settled: "AVG_1H", hot: "RAW" },
    sensorCount: 3,
    sensors: seriesSensors,
    points
  });
}

const meta = {
  title: "SensorWorkspace",
  component: SensorWorkspace,
  parameters: { layout: "fullscreen" },
  argTypes: { defaultTab: { control: "select", options: ["dashboard", "sensors"] } },
  decorators: [
    (Story) => {
      window.OmagotchiApi = { manager: { getSensorSpaceSeries: mockSeries } };
      return <Story />;
    }
  ]
};

export default meta;

const sensors = [
  { id: "lab-environment-01", name: "실습실 환경 센서", eui: "24E124128C140101", space: "실습실", spaceLabel: "실습실", location: "전방 우측", interval: 600, metrics: ["temperature", "humidity"], active: true },
  { id: "meeting-environment-01", name: "회의실 환경 센서", eui: "24E124725D089152", space: "회의실", spaceLabel: "회의실", location: "회의실", interval: 600, metrics: ["temperature", "humidity", "co2"], active: true },
  { id: "lab-co2-01", name: "실습실 CO₂ 센서", eui: "24E124126D152862", space: "실습실", spaceLabel: "실습실", location: "후방 오른쪽", interval: 120, metrics: ["co2"], active: false },
  { id: "office-humidity-01", name: "사무실 온습도", eui: "24E124785C389010", space: "사무실", spaceLabel: "사무실", location: "사무공간 스위치 옆", interval: 60, metrics: ["temperature", "humidity"], active: true }
];

// 실제 threshold_rules 시드와 같은 값 (co2 GTE 1000 / temperature GT 26 / humidity LT 40)
const spaceThresholds = {
  temperature: { operator: "GT", value: 26 },
  humidity: { operator: "LT", value: 40 },
  co2: { operator: "GTE", value: 1000 }
};
const thresholds = {
  실습실: spaceThresholds,
  사무실: spaceThresholds,
  회의실: spaceThresholds
};

export const NoSensors = { name: "센서 미등록", args: { initialSensors: [] } };
export const DashboardWithData = { name: "대시보드 데이터 수신", args: { initialSensors: sensors, defaultTab: "dashboard", thresholds } };
export const DashboardWithoutThresholds = { name: "대시보드 기준값 미설정", args: { initialSensors: sensors, defaultTab: "dashboard" } };
export const SensorList = { name: "센서 목록", args: { initialSensors: sensors, defaultTab: "sensors" } };
export const Mobile = {
  args: { initialSensors: sensors, defaultTab: "dashboard", thresholds },
  parameters: { viewport: { defaultViewport: "mobile1" } }
};
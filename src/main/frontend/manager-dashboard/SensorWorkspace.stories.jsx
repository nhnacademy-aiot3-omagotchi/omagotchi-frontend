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
  argTypes: { defaultTab: { control: "select", options: ["dashboard", "sensors", "thresholds"] } },
  decorators: [
    (Story) => {
      window.OmagotchiApi = { manager: { getSensorSpaceSeries: mockSeries } };
      return <Story />;
    }
  ]
};

export default meta;

// --- 아래 목업은 Learning Service 응답 모양 그대로다. 컴포넌트는 표본 데이터를 갖지 않는다. ---

// GET /api/v1/spaces
const spaces = [
  { spaceId: 1, name: "실습실" },
  { spaceId: 2, name: "사무실" },
  { spaceId: 3, name: "회의실" }
];

// GET /api/v1/sensors
const sensors = [
  { deviceEui: "24e124128c140101", spaceId: 1, displayName: "실습실 환경 센서", model: "AM103", installationPoint: "전방 우측", expectedIntervalSeconds: 600, active: true },
  { deviceEui: "24e124725d089152", spaceId: 3, displayName: "회의실 환경 센서", model: "AM103", installationPoint: "회의실", expectedIntervalSeconds: 600, active: true },
  { deviceEui: "24e124126d152862", spaceId: 1, displayName: "실습실 CO2 센서", model: "AM103", installationPoint: "후방 오른쪽", expectedIntervalSeconds: 120, active: false },
  { deviceEui: "24e124785c389010", spaceId: 2, displayName: "사무실 온습도", model: "WS202", installationPoint: "사무공간 스위치 옆", expectedIntervalSeconds: 60, active: true }
];

// GET /api/v1/threshold-rules/spaces
// 실제 threshold_rules 시드와 같은 값 (co2 GTE 1000 / temperature GT 26 / humidity LT 40)
const seedMetrics = (deviceCount) => [
  { metric: "co2", operator: "GTE", threshold: 1000, ruleCount: deviceCount, mixed: false },
  { metric: "temperature", operator: "GT", threshold: 26, ruleCount: deviceCount, mixed: false },
  { metric: "humidity", operator: "LT", threshold: 40, ruleCount: deviceCount, mixed: false }
];
const spaceThresholds = [
  { spaceId: 1, deviceCount: 2, metrics: seedMetrics(2) },
  { spaceId: 2, deviceCount: 1, metrics: seedMetrics(1) },
  { spaceId: 3, deviceCount: 1, metrics: seedMetrics(1) }
];

// 기기마다 조건이 다른 공간 — 화면이 경고를 띄워야 한다.
const mixedThresholds = [
  {
    spaceId: 1,
    deviceCount: 4,
    metrics: [
      { metric: "co2", operator: "GTE", threshold: 1000, ruleCount: 4, mixed: true },
      { metric: "temperature", operator: "GT", threshold: 26, ruleCount: 3, mixed: false },
      { metric: "humidity", operator: "LT", threshold: 40, ruleCount: 4, mixed: true }
    ]
  },
  ...spaceThresholds.slice(1)
];

// GET /api/v1/sensors/events
const alertDevices = [
  { displayName: "실습실 CO2 센서", deviceEui: "24e124126d152862" },
  { displayName: "실습실 환경 센서", deviceEui: "24e124128c140101" },
  { displayName: "사무실 온습도", deviceEui: "24e124785c389010" }
];
const alertTemplates = [
  { type: "RULE_HIT", device: 0, measurement: "co2", value: 1240, detail: "기준 1,000 이상", actionLabel: "창문 개방 환기", actionStatus: "CONFIRMED", actionSimulated: true },
  { type: "RULE_HIT", device: 1, measurement: "temperature", value: 29.1, detail: "기준 26.0 초과", actionLabel: "에어컨 냉방", actionStatus: "FAILED", actionError: "응답 시간 초과" },
  { type: "RULE_HIT", device: 0, measurement: "co2", value: 1180, detail: "기준 1,000 이상", actionLabel: "창문 개방 환기", actionStatus: "SKIPPED" },
  { type: "ANOMALY", device: 2, measurement: "humidity", value: 105, detail: "물리범위 밖", actionStatus: "NONE" },
  { type: "STUCK", device: 1, measurement: "temperature", value: 23.4, detail: "30분 동일값", actionStatus: "NONE" },
  { type: "MISSING", device: 0, measurement: "co2", value: 842, detail: "fCnt 1043 누락", actionStatus: "NONE" },
  { type: "DUPLICATE", device: 1, measurement: "temperature", value: 23.4, detail: "fCnt 1044 재도착", actionStatus: "NONE" },
  { type: "DELAYED", device: 2, measurement: "humidity", value: 48.2, detail: "12분 지연 도착", actionStatus: "NONE" }
];

function alertLogPage(count = 8) {
  const base = new Date();
  base.setHours(10, 22, 31, 0);
  const content = Array.from({ length: count }, (_, index) => {
    const template = alertTemplates[index % alertTemplates.length];
    const device = alertDevices[template.device];
    return {
      traceId: `trace-${index + 1}`,
      type: template.type,
      deviceEui: device?.deviceEui ?? null,
      displayName: device?.displayName ?? null,
      measurement: template.measurement,
      value: template.value,
      detail: template.detail,
      receivedAt: new Date(base.getTime() - index * 97000).toISOString(),
      actionLabel: template.actionLabel ?? null,
      actionStatus: template.actionStatus,
      actionSimulated: template.actionSimulated ?? null,
      actionError: template.actionError ?? null
    };
  });
  return { content, page: 0, size: 8, totalElements: 24, totalPages: 3, capacity: 1000, retention: "PT168H" };
}

const baseArgs = {
  spaces,
  initialSensors: sensors,
  initialSpaceThresholds: spaceThresholds,
  alertLog: alertLogPage()
};

export const NoSensors = { name: "센서 미등록", args: { spaces, initialSensors: [], initialSpaceThresholds: spaceThresholds, alertLog: { ...alertLogPage(0), totalPages: 1 } } };
export const DashboardWithData = { name: "대시보드 데이터 수신", args: { ...baseArgs, defaultTab: "dashboard" } };
export const DashboardWithoutThresholds = { name: "대시보드 기준값 미설정", args: { ...baseArgs, initialSpaceThresholds: [{ spaceId: 1, deviceCount: 2, metrics: [] }], defaultTab: "dashboard" } };
export const SensorList = { name: "센서 목록", args: { ...baseArgs, defaultTab: "sensors" } };

// SensorDevice 의 spaceId·displayName·installationPoint 는 nullable 이다.
export const SensorListNullable = {
  name: "센서 목록 · 빈 값 포함",
  args: {
    ...baseArgs,
    defaultTab: "sensors",
    initialSensors: [
      { deviceEui: "24e124725e000001", spaceId: null, displayName: null, model: "WS202", installationPoint: null, expectedIntervalSeconds: 60, active: true }
    ]
  }
};

export const ThresholdSettings = { name: "임계값 설정", args: { ...baseArgs, defaultTab: "thresholds" } };
// 서버 applyToSpace 는 규칙 없는 기기를 건너뛴다. 화면이 "저장되지 않습니다"라고 알려야 한다.
export const ThresholdPartialRules = {
  name: "임계값 설정 · 일부 항목 규칙 없음",
  args: {
    ...baseArgs,
    defaultTab: "thresholds",
    initialSpaceThresholds: [
      { spaceId: 1, deviceCount: 3, metrics: [{ metric: "co2", operator: "GTE", threshold: 1000, ruleCount: 1, mixed: false }] },
      ...spaceThresholds.slice(1)
    ]
  }
};

export const ThresholdMixed = {
  name: "임계값 설정 · 조건 혼재",
  args: { ...baseArgs, initialSpaceThresholds: mixedThresholds, defaultTab: "thresholds" }
};

// --- 폴백 데이터를 두지 않는 대신 필요한 상태들 ---
export const Loading = { name: "불러오는 중", args: { loading: true } };
export const LoadError = {
  name: "조회 실패",
  args: { error: "Learning Service 응답이 없습니다. (503)", onRetry: () => {} }
};
export const Forbidden = { name: "권한 없음", args: { spaces, forbidden: true } };
export const NoSpaces = { name: "공간 미등록", args: { spaces: [] } };
export const AlertLogUnavailable = {
  name: "알림 로그만 실패",
  args: { ...baseArgs, alertLog: null, defaultTab: "dashboard" }
};

// Storybook 9+ 는 viewport 를 globals 로 받는다. parameters.viewport.defaultViewport 는 무시된다.
export const Mobile = {
  name: "모바일",
  args: { ...baseArgs, defaultTab: "dashboard" },
  globals: { viewport: { value: "mobile1", isRotated: false } }
};
export const MobileThresholds = {
  name: "모바일 · 임계값 설정",
  args: { ...baseArgs, defaultTab: "thresholds" },
  globals: { viewport: { value: "mobile1", isRotated: false } }
};

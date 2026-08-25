import { SensorWorkspace } from "./SensorWorkspace.jsx";
import "./SensorWorkspace.css";

const meta = {
  title: "SensorWorkspace",
  component: SensorWorkspace,
  parameters: { layout: "fullscreen" },
  argTypes: { defaultTab: { control: "select", options: ["dashboard", "sensors", "thresholds"] } }
};

export default meta;

// GET /api/v1/spaces
const spaces = [
  { spaceId: 1, name: "실습실" },
  { spaceId: 2, name: "회의실" },
  { spaceId: 3, name: "도서관" }
];

// GET /api/v1/sensors
const sensors = [
  { deviceEui: "24e124725e123456", displayName: "실습실 환경 센서", model: "WS202", spaceId: 1, installationPoint: "본관 3F", expectedIntervalSeconds: 60, active: true },
  { deviceEui: "24e124725e220b7a", displayName: "3층 회의실 A 온도", model: "WS202", spaceId: 2, installationPoint: "본관 3F · 회의실 A", expectedIntervalSeconds: 60, active: true },
  { deviceEui: "24e124725e5c02a1", displayName: "실습실 CO2", model: "AM103", spaceId: 1, installationPoint: "본관 3F · 출입구", expectedIntervalSeconds: 60, active: false },
  { deviceEui: "24e124725e8a0f31", displayName: "도서관 습도", model: "AM103", spaceId: 3, installationPoint: "별관 2F", expectedIntervalSeconds: 120, active: true }
];

// GET /api/v1/threshold-rules/spaces
const spaceThresholds = [
  {
    spaceId: 1,
    deviceCount: 2,
    metrics: [
      { metric: "co2", operator: "GTE", threshold: 1000, ruleCount: 2, mixed: false },
      { metric: "temperature", operator: "GT", threshold: 26, ruleCount: 2, mixed: false },
      { metric: "humidity", operator: "LT", threshold: 40, ruleCount: 1, mixed: false }
    ]
  },
  {
    spaceId: 2,
    deviceCount: 1,
    metrics: [
      { metric: "temperature", operator: "GT", threshold: 28, ruleCount: 1, mixed: false }
    ]
  },
  { spaceId: 3, deviceCount: 1, metrics: [] }
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

// GET /api/v1/sensors/events — 데모 데이터는 컴포넌트가 아니라 여기에만 둔다.
const alertDevices = [
  { displayName: "실습실 CO2", deviceEui: "24e124725e5c2862" },
  { displayName: "실습실 온습도", deviceEui: "24e124725e5c2590" },
  { displayName: "회의실 온습도", deviceEui: "24e124725e5c0101" }
];

const alertTemplates = [
  { type: "RULE_HIT", device: 0, measurement: "co2", value: 1240, detail: "기준 1,000 이상", actionLabel: "창문 개방 환기", actionStatus: "CONFIRMED", actionSimulated: true },
  { type: "RULE_HIT", device: 1, measurement: "temperature", value: 29.1, detail: "기준 28.0 이상", actionLabel: "에어컨 냉방", actionStatus: "FAILED", actionError: "응답 시간 초과" },
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
    const device = template.device == null ? null : alertDevices[template.device];
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

const baseArgs = { spaces, initialSensors: sensors, initialSpaceThresholds: spaceThresholds, alertLog: alertLogPage() };

export const NoSensors = { name: "센서 미등록", args: { spaces, initialSensors: [], alertLog: { ...alertLogPage(0), totalPages: 1 } } };

// --- 폴백 데이터를 없앤 자리를 채우는 상태들 ---
export const Loading = { name: "불러오는 중", args: { loading: true } };
export const LoadError = {
  name: "조회 실패",
  args: { error: "Learning Service 응답이 없습니다. (503)", onRetry: () => {} }
};
export const NoSpaces = { name: "공간 미등록", args: { spaces: [] } };
// 하류가 센서·임계값을 SYSTEM_ADMIN 으로 제한한다. 공간 조회만 공개라 이 구분이 없으면
// 권한 없는 사용자에게 "데이터가 없는 화면"처럼 보인다.
export const Forbidden = { name: "권한 없음", args: { spaces, forbidden: true } };
export const AlertLogUnavailable = {
  name: "알림 로그만 실패",
  args: { ...baseArgs, alertLog: null, defaultTab: "dashboard" }
};
export const DashboardWithData = { name: "대시보드 데이터 수신", args: { ...baseArgs, defaultTab: "dashboard" } };
export const SensorList = { name: "센서 목록", args: { ...baseArgs, defaultTab: "sensors" } };

// SensorDevice 의 spaceId·displayName·installationPoint 는 nullable 이다.
export const SensorListNullable = {
  name: "센서 목록 · 빈 값 포함",
  args: {
    ...baseArgs,
    defaultTab: "sensors",
    initialSensors: [
      { deviceEui: "24e124725e000001", displayName: null, model: "WS202", spaceId: null, installationPoint: null, expectedIntervalSeconds: 60, active: true }
    ]
  }
};
export const ThresholdSettings = { name: "임계값 설정", args: { ...baseArgs, defaultTab: "thresholds" } };
export const ThresholdMixed = {
  name: "임계값 설정 · 조건 혼재",
  args: { ...baseArgs, initialSpaceThresholds: mixedThresholds, defaultTab: "thresholds" }
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

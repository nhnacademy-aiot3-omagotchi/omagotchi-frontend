import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
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

function alertLogPage(count = 8, page = 0, sharedTrace = false) {
  const base = new Date();
  base.setHours(10, 22, 31, 0);
  const content = Array.from({ length: count }, (_, index) => {
    const absoluteIndex = page * 8 + index;
    const template = alertTemplates[absoluteIndex % alertTemplates.length];
    const device = alertDevices[template.device];
    return {
      eventId: `event-${absoluteIndex + 1}`,
      traceId: sharedTrace ? "trace-shared-by-one-frame" : `trace-${absoluteIndex + 1}`,
      type: template.type,
      deviceEui: device?.deviceEui ?? null,
      displayName: device?.displayName ?? null,
      measurement: template.measurement,
      value: template.value,
      detail: template.detail,
      receivedAt: new Date(base.getTime() - absoluteIndex * 97000).toISOString(),
      actionLabel: template.actionLabel ?? null,
      actionStatus: template.actionStatus,
      actionSimulated: template.actionSimulated ?? null,
      actionError: template.actionError ?? null
    };
  });
  return { content, page, size: 8, totalElements: 24, totalPages: 3, capacity: 1000, retention: "PT168H" };
}

const baseArgs = {
  spaces,
  initialSensors: sensors,
  initialSpaceThresholds: spaceThresholds,
  alertLog: alertLogPage()
};

export const NoSensors = { name: "센서 미등록", args: { spaces, initialSensors: [], initialSpaceThresholds: spaceThresholds, alertLog: { ...alertLogPage(0), totalPages: 1 } } };
export const DashboardWithData = { name: "대시보드 데이터 수신", args: { ...baseArgs, defaultTab: "dashboard" } };

function PagedAlertLog() {
  const [page, setPage] = useState(0);
  return (
    <SensorWorkspace
      {...baseArgs}
      defaultTab="dashboard"
      alertLog={alertLogPage(8, page, true)}
      onAlertQueryChange={({ page: requestedPage }) => setPage(requestedPage - 1)}
    />
  );
}

export const AlertLogPagination = {
  name: "대시보드 · 로그 페이지 교체",
  render: () => <PagedAlertLog />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = canvas.getByRole("table", { name: "센서 알림 로그" });
    await expect(within(table).getAllByRole("row")).toHaveLength(9);

    await userEvent.click(canvas.getByRole("button", { name: "2" }));

    await waitFor(() => expect(canvas.getByRole("button", { name: "2" })).toHaveAttribute("aria-current", "page"));
    // 같은 traceId를 공유해도 기존 8개에 더 붙지 않고 다음 페이지 8개로 교체돼야 한다.
    await expect(within(table).getAllByRole("row")).toHaveLength(9);
  }
};
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
// 서버 applyToSpace는 규칙이 없는 기기도 생성한다. 기존 센서가 룰 없이 등록된 경우의 복구 화면이다.
const missingThresholdArgs = {
  ...baseArgs,
  defaultTab: "thresholds",
  initialSpaceThresholds: [
    { spaceId: 1, deviceCount: 3, metrics: [{ metric: "co2", operator: "GTE", threshold: 1000, ruleCount: 1, mixed: false }] },
    ...spaceThresholds.slice(1)
  ]
};

export const ThresholdMissingRules = {
  name: "임계값 설정 · 필수 룰 복구",
  args: missingThresholdArgs
};

export const ThresholdMissingRulesSaved = {
  name: "임계값 설정 · 필수 룰 저장 완료",
  args: missingThresholdArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("spinbutton", { name: "CO2 임계값" })).toHaveValue(1000);
    await expect(canvas.getByRole("spinbutton", { name: "온도 임계값" })).toHaveValue(28);
    await expect(canvas.getByRole("spinbutton", { name: "습도 임계값" })).toHaveValue(70);
    await userEvent.click(canvas.getByRole("button", { name: "저장" }));
    await expect(canvas.getByRole("status")).toHaveTextContent("8건 생성 · 1건은 이미 같은 값");
  }
};

export const ThresholdMixed = {
  name: "임계값 설정 · 조건 혼재",
  args: { ...baseArgs, initialSpaceThresholds: mixedThresholds, defaultTab: "thresholds" }
};

// --- 센서 인계 ---
// 기수가 끝나면 그 기수 공간의 센서는 어느 기수에도 속하지 않게 되는데, deviceEui가 하류의
// 기본키라 새 기수가 등록하려 하면 409다. 등록 실패를 막다른 길로 두지 않고 인계로 잇는다.

const SUBMITTED_EUI = "24e124136d151547";

/** onClaimSensor가 실제로 무엇을 받았는지 기록한다. 레이스 회귀의 유일한 증거다. */
const claimedPayloads = [];

/**
 * 등록 폼을 열고 새 센서 정보를 채운 뒤 등록을 누른다.
 *
 * 첫 입력만 findBy로 기다린다 — 클릭 직후에는 다이얼로그가 아직 마운트되지 않아
 * getBy로 잡으면 간헐적으로 실패한다.
 */
async function fillNewSensorForm(canvas) {
  await userEvent.click(canvas.getByRole("button", { name: /센서 추가/ }));

  const nameInput = await canvas.findByPlaceholderText("예: 3층 회의실 A 온도");
  await userEvent.type(nameInput, "창가 CO2 센서");
  await userEvent.type(canvas.getByPlaceholderText("예: 24e124725e5c2862"), SUBMITTED_EUI);
  await userEvent.type(canvas.getByPlaceholderText("예: WS202"), "AM103");
}

async function fillAndSubmitNewSensor(canvas) {
  await fillNewSensorForm(canvas);
  await userEvent.click(canvas.getByRole("button", { name: "등록" }));

  // 등록 요청이 끝나고 다시 그려질 때까지 기다린다.
  await waitFor(() => expect(canvas.getByRole("button", { name: "등록" })).toBeEnabled());
}

export const SensorClaimPrompt = {
  name: "센서 등록 · 이미 등록된 EUI",
  args: {
    ...baseArgs,
    defaultTab: "sensors",
    // 하류 409를 화면이 "인계로 이어갈 수 있다"로 번역한 신호다.
    onSaveSensor: async () => "claimable",
    onClaimSensor: async () => true
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fillAndSubmitNewSensor(canvas);

    // 창을 닫지 않는다 — 닫으면 입력이 전부 사라지고 인계 경로도 끊긴다.
    expect(canvas.getByText(/이미 등록된 센서입니다/)).toBeInTheDocument();
    expect(canvas.getByRole("button", { name: "인계하기" })).toBeInTheDocument();
    // 배너는 선택된 공간을 짚어 준다. 인계 대상이 어디인지 다시 묻지 않기 때문이다.
    expect(canvas.getByText("실습실", { selector: "b" })).toBeInTheDocument();
    // ㄹ 받침이면 "으로"가 아니라 "로"다. 문구가 <b>로 쪼개져 있어 textContent로 본다.
    expect(canvas.getByRole("alert")).toHaveTextContent("실습실로 인계할 수 있습니다");
  }
};

export const SensorClaimDismissedOnEdit = {
  name: "센서 등록 · 입력을 고치면 안내가 사라진다",
  args: { ...SensorClaimPrompt.args },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fillAndSubmitNewSensor(canvas);
    expect(canvas.getByRole("button", { name: "인계하기" })).toBeInTheDocument();

    await userEvent.type(canvas.getByPlaceholderText("예: 24e124725e5c2862"), "aa");

    // 입력이 달라졌으면 아까의 충돌은 더 이상 이 폼의 상태가 아니다.
    expect(canvas.queryByRole("button", { name: "인계하기" })).not.toBeInTheDocument();
  }
};

export const SensorClaimCompleted = {
  name: "센서 인계 완료",
  args: { ...SensorClaimPrompt.args },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fillAndSubmitNewSensor(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "인계하기" }));

    // 인계에 성공하면 창이 닫힌다. 실패하면 열린 채로 남는다.
    await waitFor(() => expect(canvas.queryByRole("dialog")).not.toBeInTheDocument());
  }
};

export const SensorClaimFailed = {
  name: "센서 인계 실패 · 남의 기수 소유",
  args: {
    ...baseArgs,
    defaultTab: "sensors",
    onSaveSensor: async () => "claimable",
    // 하류는 남의 기수 소유와 미등록을 구분하지 않고 404로 답한다. 화면도 그 구분을
    // 만들어내지 않고, 창을 연 채로 두어 다시 시도할 수 있게 한다.
    onClaimSensor: async () => false
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fillAndSubmitNewSensor(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "인계하기" }));

    await waitFor(() => expect(canvas.getByRole("button", { name: "인계하기" })).toBeEnabled());
    expect(canvas.getByRole("dialog")).toBeInTheDocument();
  }
};

/**
 * 409 응답 시점을 play가 직접 잡는다.
 *
 * setTimeout으로 흉내내면 Storybook의 계측된 userEvent가 얼마나 느린지에 결과가 달라진다 —
 * 응답이 편집보다 먼저 도착하면 정작 재현하려던 레이스가 아니게 된다.
 */
let releaseSave = () => {};

export const SensorClaimTargetsSubmittedValue = {
  name: "센서 인계 · 응답 대기 중 입력을 고쳐도 제출값을 인계한다",
  args: {
    ...baseArgs,
    defaultTab: "sensors",
    onSaveSensor: () => new Promise((resolve) => {
      releaseSave = () => resolve("claimable");
    }),
    onClaimSensor: async (sensor) => {
      claimedPayloads.push({ deviceEui: sensor.deviceEui, spaceId: sensor.spaceId });
      return true;
    }
  },
  play: async ({ canvasElement }) => {
    claimedPayloads.length = 0;
    const canvas = within(canvasElement);
    await fillNewSensorForm(canvas);

    // 실습실(spaceId 1)로 제출한다 — 폼의 기본 선택이다. 응답은 아직 오지 않는다.
    await userEvent.click(canvas.getByRole("button", { name: "등록" }));

    // 저장 중에 위치를 사무실로 바꾼다. 이미 날아간 요청은 취소되지 않는다.
    const dialog = within(canvas.getByRole("dialog"));
    await userEvent.selectOptions(dialog.getByRole("combobox"), "2");

    // 이제 실습실 제출에 대한 409가 도착한다.
    releaseSave();

    await waitFor(() => expect(canvas.getByRole("button", { name: "인계하기" })).toBeInTheDocument());

    // 안내는 지금 폼(사무실)이 아니라 충돌한 제출값(실습실)을 가리킨다.
    expect(canvas.getByRole("alert")).toHaveTextContent(SUBMITTED_EUI);
    expect(canvas.getByRole("alert")).toHaveTextContent("실습실로 인계할 수 있습니다");
    expect(dialog.getByRole("combobox")).toHaveValue("2");

    await userEvent.click(canvas.getByRole("button", { name: "인계하기" }));

    // 폼이 아니라 제출값이 나간다. 여기가 흔들리면 엉뚱한 공간으로 인계된다.
    await waitFor(() => expect(claimedPayloads).toEqual([
      { deviceEui: SUBMITTED_EUI, spaceId: 1 }
    ]));
  }
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

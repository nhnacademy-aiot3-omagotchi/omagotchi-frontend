import React, { useEffect, useMemo, useRef, useState } from "react";
import { Tabs } from "radix-ui";

const PERIOD_OPTIONS = [
  { value: "day", label: "일 (최근 24시간)" },
  { value: "week", label: "주 (최근 1주)" },
  { value: "month", label: "월" }
];

const METRIC_LABELS = {
  temperature: { label: "온도", unit: "°C" },
  humidity: { label: "습도", unit: "%" },
  co2: { label: "CO₂", unit: "ppm" }
};

const THRESHOLD_METRICS = [
  { value: "co2", label: "CO2" },
  { value: "temperature", label: "온도" },
  { value: "humidity", label: "습도" }
];

// site.omagotchi.learningservice.rule.domain.Operator
const THRESHOLD_OPERATORS = [
  { value: "GTE", label: "이상" },
  { value: "GT", label: "초과" },
  { value: "LTE", label: "이하" },
  { value: "LT", label: "미만" }
];

// site.omagotchi.learningservice.environment.domain.SensorEventType
const ALERT_TYPE_OPTIONS = [
  { value: "RULE_HIT", label: "룰 적중", tone: "amber" },
  { value: "ANOMALY", label: "범위 초과", tone: "neutral" },
  { value: "STUCK", label: "무변동", tone: "neutral" },
  { value: "MISSING", label: "결측", tone: "neutral" },
  { value: "DUPLICATE", label: "중복", tone: "neutral" },
  { value: "DELAYED", label: "지연", tone: "neutral" },
  { value: "DISCONNECTED", label: "끊김", tone: "neutral" },
  { value: "INVALID", label: "무효", tone: "neutral" }
];
const ALERT_TYPE_META = Object.fromEntries(ALERT_TYPE_OPTIONS.map((option) => [option.value, option]));

/** 검색어 입력이 멈춘 뒤 서버를 부르기까지 기다리는 시간. */
const QUERY_DEBOUNCE_MS = 300;

// site.omagotchi.learningservice.environment.domain.ActionStatus
const ACTION_TONES = { CONFIRMED: "success", FAILED: "danger", SKIPPED: "neutral", NONE: null };

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.7 2.5h4.6l.6 2.1 1.5.9 2.1-.5 2.3 4-1.5 1.6v1.8l1.5 1.6-2.3 4-2.1-.5-1.5.9-.6 2.1H9.7l-.6-2.1-1.5-.9-2.1.5-2.3-4 1.5-1.6v-1.8L3.2 9l2.3-4 2.1.5 1.5-.9.6-2.1Z" />
      <circle cx="12" cy="11.5" r="3.2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4l16 16M20 4 4 20" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.5 21.5 20h-19L12 3.5Z" />
      <path d="M12 9.5v4.2" />
      <circle cx="12" cy="16.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** 로딩·빈 상태·에러를 한 자리에서 그린다. 폴백 데이터를 없앤 대신 이 화면들이 필요하다. */
function StatusPanel({ tone, title, detail, onRetry }) {
  return (
    <section className={`sensor-status-panel sensor-status-panel--${tone}`} role="status">
      <div className="sensor-status-icon" aria-hidden="true">
        {tone === "error" ? <WarningIcon /> : tone === "loading" ? <span className="sensor-spinner" /> : <GearIcon />}
      </div>
      <strong>{title}</strong>
      {detail && <p>{detail}</p>}
      {onRetry && <button type="button" className="sensor-secondary-button" onClick={onRetry}>다시 시도</button>}
    </section>
  );
}

/**
 * 목록이 늦게 도착해도 선택이 깨지지 않도록 렌더 중에 유효한 값을 고른다.
 * useState 초기값으로만 잡으면 첫 렌더(빈 목록) 이후 도착한 항목을 못 따라간다.
 */
function useSelectedSpaceId(spaces) {
  const [picked, setPicked] = useState(null);
  const valid = spaces.some((space) => space.spaceId === picked);
  return [valid ? picked : (spaces[0]?.spaceId ?? null), setPicked];
}

function ChartPlaceholder({ spaceId, spaceName, deviceCount, metric, period, month }) {
  const metricInfo = METRIC_LABELS[metric];
  const periodLabel = period === "month"
    ? `월 (${month}월)`
    : PERIOD_OPTIONS.find((item) => item.value === period)?.label || "";

  return (
    <article className="sensor-chart-card" data-space-id={spaceId} data-metric={metric}>
      <header>
        <div>
          <h3>{metricInfo.label} <small>{metricInfo.unit}</small></h3>
          <p><strong>현재 평균 --</strong> <span>기준값 설정 전</span></p>
        </div>
        <span>{spaceName} 센서 {deviceCount}대 · {periodLabel}</span>
      </header>
      <div className="sensor-chart-placeholder" role="img" aria-label={`${spaceName} ${metricInfo.label} 차트 삽입 영역`}>
        <div className="sensor-chart-y-axis"><span>높음</span><span>평균</span><span>낮음</span></div>
        <div className="sensor-chart-grid">
          <canvas
            className="sensor-chart-canvas"
            data-sensor-chart-canvas
            data-space-id={spaceId}
            data-metric={metric}
            aria-label={`${spaceName} ${metricInfo.label} Chart.js canvas`}
          />
          <span className="sensor-chart-mount">Chart.js canvas mount</span>
          <div className="sensor-chart-x-axis"><span>시작</span><span>중간</span><span>현재</span></div>
        </div>
      </div>
    </article>
  );
}

function AlertTypeBadge({ type }) {
  const meta = ALERT_TYPE_META[type];
  if (!meta) return null;
  return <span className={`sensor-alert-badge sensor-alert-badge--${meta.tone}`}>{meta.label}</span>;
}

function AlertAction({ entry }) {
  const tone = ACTION_TONES[entry.actionStatus];
  if (!tone || !entry.actionLabel) return <span className="sensor-alert-action-empty">—</span>;

  const notes = [];
  if (entry.actionSimulated) notes.push("시뮬레이션");
  if (entry.actionStatus === "FAILED" && entry.actionError) notes.push(entry.actionError);
  if (entry.actionStatus === "SKIPPED") notes.push("쿨다운 중");

  return (
    <div className={`sensor-alert-action sensor-alert-action--${tone}`}>
      <strong>
        {tone === "success" && <CheckIcon />}
        {tone === "danger" && <WarningIcon />}
        {entry.actionLabel}
      </strong>
      {notes.length > 0 && <small>{notes.join(" · ")}</small>}
    </div>
  );
}

/**
 * 서버는 최근 7일치를 보관하므로 시각만 찍으면 어제 10시인지 5일 전 10시인지 구분되지 않는다.
 * 오늘이 아니면 날짜를 함께 보여준다.
 */
function formatReceivedAt(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  const time = parsed.toLocaleTimeString("ko-KR", { hour12: false });
  const isToday = parsed.toDateString() === new Date().toDateString();
  if (isToday) return time;
  return `${parsed.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })} ${time}`;
}

function formatMeasurement(entry) {
  if (!entry.measurement) return "—";
  if (entry.value == null) return `${entry.measurement} —`;
  return `${entry.measurement} ${entry.value.toLocaleString("ko-KR")}`;
}

function formatRetention(retention) {
  // 서버는 Duration.toString() 을 그대로 준다 (예: "PT168H").
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?/.exec(String(retention || ""));
  if (!match) return String(retention || "");
  const hours = Number(match[1] || 0);
  if (hours >= 24 && hours % 24 === 0) return `${hours / 24}일`;
  return hours > 0 ? `${hours}시간` : String(retention);
}

/**
 * GET /api/v1/sensors/events 응답을 그대로 그린다.
 *
 * onQueryChange 가 주어지면 서버 페이징 모드로 동작한다 — 필터·페이지 변경을 위로 올리고
 * entries 는 서버가 준 한 페이지만 받는다. 없으면 전달받은 배열을 그대로 걸러서 보여준다.
 */
function AuditLog({ entries, loaded = true, loading = false, page: pageProp, totalPages: totalPagesProp, capacity, retention, onQueryChange }) {
  const serverDriven = typeof onQueryChange === "function";
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [localPage, setLocalPage] = useState(1);
  const pageSize = 8;

  const filteredEntries = useMemo(() => {
    if (serverDriven) return entries;
    const normalizedQuery = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const queryMatches = !normalizedQuery
        || `${entry.displayName || ""} ${entry.deviceEui || ""}`.toLowerCase().includes(normalizedQuery);
      const typeMatches = type === "all" || entry.type === type;
      return queryMatches && typeMatches;
    });
  }, [serverDriven, entries, query, type]);

  const page = serverDriven ? (pageProp || 1) : localPage;
  const totalPages = serverDriven
    ? Math.max(1, totalPagesProp || 1)
    : Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const visibleEntries = serverDriven
    ? filteredEntries
    : filteredEntries.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { if (!serverDriven) setLocalPage(1); }, [serverDriven, query, type]);
  useEffect(() => { if (!serverDriven) setLocalPage((current) => Math.min(current, totalPages)); }, [serverDriven, totalPages]);

  // 입력할 때마다 서버를 부르지 않도록 검색어만 지연시킨다. 셀렉트·페이지는 즉시 반영한다.
  const queryTimer = useRef(null);
  useEffect(() => () => clearTimeout(queryTimer.current), []);

  function emit(next) {
    clearTimeout(queryTimer.current);
    onQueryChange(next);
  }
  function changeType(next) {
    setType(next);
    if (serverDriven) emit({ type: next === "all" ? null : next, deviceEui: query.trim() || null, page: 1 });
  }
  function changeQuery(next) {
    setQuery(next);
    if (!serverDriven) return;
    clearTimeout(queryTimer.current);
    queryTimer.current = setTimeout(
      () => onQueryChange({ type: type === "all" ? null : type, deviceEui: next.trim() || null, page: 1 }),
      QUERY_DEBOUNCE_MS
    );
  }
  function changePage(next) {
    if (serverDriven) emit({ type: type === "all" ? null : type, deviceEui: query.trim() || null, page: next });
    else setLocalPage(next);
  }

  return (
    <section className="sensor-audit" aria-labelledby="sensor-audit-title">
      <div className="sensor-audit-branch" aria-hidden="true"><i /><i /><i /></div>
      <header>
        <div><span>센서 알림</span><h3 id="sensor-audit-title">품질·룰 적중 로그</h3></div>
        <div className="sensor-audit-filters">
          <label><span>유형</span><select value={type} onChange={(event) => changeType(event.target.value)}><option value="all">전체</option>{ALERT_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label><span>기기</span><input value={query} onChange={(event) => changeQuery(event.target.value)} placeholder="기기명 또는 EUI" /></label>
          <button type="button" className="sensor-audit-more" aria-label="추가 옵션"><MoreIcon /></button>
        </div>
      </header>
      <div className="sensor-alert-table-wrap">
        <table className="sensor-alert-table">
          <caption className="sr-only">센서 알림 로그</caption>
          <thead><tr><th>수신</th><th>유형</th><th>기기</th><th>측정</th><th>내용</th><th>조치</th></tr></thead>
          <tbody>
            {visibleEntries.map((entry) => (
              <tr key={entry.traceId}>
                <td data-label="수신"><time dateTime={entry.receivedAt || undefined}>{formatReceivedAt(entry.receivedAt)}</time></td>
                <td data-label="유형"><AlertTypeBadge type={entry.type} /></td>
                <th scope="row" data-label="기기">
                  <strong>{entry.displayName || "알 수 없음"}</strong>
                  {entry.deviceEui && <span>{entry.deviceEui}</span>}
                </th>
                <td data-label="측정">{formatMeasurement(entry)}</td>
                <td data-label="내용">{entry.detail}</td>
                <td data-label="조치"><AlertAction entry={entry} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleEntries.length === 0 && (
          <p className="sensor-audit-empty">
            {loading ? "알림을 불러오는 중입니다."
              : !loaded ? "알림을 불러오지 못했습니다."
              : "조건에 맞는 알림이 없습니다."}
          </p>
        )}
      </div>
      <footer className="sensor-pagination" aria-label="센서 알림 페이지">
        <span>
          {capacity != null && retention != null
            ? `최근 ${capacity.toLocaleString("ko-KR")}건 / ${formatRetention(retention)} 이내만 보관합니다. 그보다 오래된 알림은 사라집니다.`
            : ""}
        </span>
        <div>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => <button type="button" key={pageNumber} className={page === pageNumber ? "is-current" : ""} aria-current={page === pageNumber ? "page" : undefined} onClick={() => changePage(pageNumber)}>{pageNumber}</button>)}
        </div>
      </footer>
    </section>
  );
}

function DashboardContent({ spaces, spaceThresholds, auditLog }) {
  const [spaceId, setSpaceId] = useSelectedSpaceId(spaces);
  const [period, setPeriod] = useState("day");
  const [month, setMonth] = useState(1);

  const spaceThreshold = spaceThresholds.find((item) => item.spaceId === spaceId);
  const spaceName = spaces.find((space) => space.spaceId === spaceId)?.name || "선택한 공간";
  const deviceCount = spaceThreshold?.deviceCount ?? 0;
  // 감시 중인 항목만 차트를 그린다 — 어떤 metric을 보는지는 임계값 룰이 정한다.
  const charts = useMemo(
    () => (spaceThreshold?.metrics || []).filter((metric) => metric.ruleCount > 0 && METRIC_LABELS[metric.metric]),
    [spaceThreshold]
  );

  return (
    <div className="sensor-dashboard">
      <section className="sensor-dashboard-toolbar" aria-label="대시보드 조회 조건">
        <label><span>공간</span><select value={spaceId ?? ""} onChange={(event) => setSpaceId(Number(event.target.value))}>{spaces.map((space) => <option key={space.spaceId} value={space.spaceId}>{space.name}</option>)}</select></label>
        <label><span>기간</span><select value={period} onChange={(event) => setPeriod(event.target.value)}>{PERIOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        {period === "month" && (
          <div className="sensor-month-picker" aria-label="조회 월 이동">
            <button type="button" aria-label="이전 월" disabled={month === 1} onClick={() => setMonth((current) => Math.max(1, current - 1))}>◀</button>
            <strong aria-live="polite">{month}월</strong>
            <button type="button" aria-label="다음 월" disabled={month === 12} onClick={() => setMonth((current) => Math.min(12, current + 1))}>▶</button>
          </div>
        )}
      </section>

      {charts.length === 0 ? (
        <section className="sensor-empty-state" role="status">
          <div className="sensor-empty-icon"><GearIcon /></div>
          <strong>표시할 센서 데이터가 없습니다.</strong>
          <p>선택한 공간에 센서를 등록하고 임계값을 설정하면 차트가 자동으로 생성됩니다.</p>
        </section>
      ) : (
        <div className="sensor-chart-list">
          {charts.map((metric) => (
            <ChartPlaceholder
              key={`${spaceId}-${metric.metric}`}
              spaceId={spaceId}
              spaceName={spaceName}
              deviceCount={deviceCount}
              metric={metric.metric}
              period={period}
              month={month}
            />
          ))}
        </div>
      )}
      <AuditLog {...auditLog} />
    </div>
  );
}

function SensorListContent({ sensors, spaces, onAdd, onEdit }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const spaceName = (spaceId) => spaces.find((space) => space.spaceId === spaceId)?.name || "미지정";
  const counts = {
    all: sensors.length,
    active: sensors.filter((sensor) => sensor.active).length,
    inactive: sensors.filter((sensor) => !sensor.active).length
  };
  const visibleSensors = sensors.filter((sensor) => {
    const statusMatches = filter === "all" || (filter === "active" ? sensor.active : !sensor.active);
    const normalizedQuery = query.trim().toLowerCase();
    const queryMatches = !normalizedQuery || [sensor.displayName, sensor.deviceEui, spaceName(sensor.spaceId), sensor.installationPoint, sensor.model]
      .filter(Boolean).join(" ").toLowerCase().includes(normalizedQuery);
    return statusMatches && queryMatches;
  });

  return (
    <div className="sensor-list-panel">
      <div className="sensor-list-toolbar">
        <div className="sensor-filter-group" role="group" aria-label="센서 상태 필터">
          {[["all", "전체"], ["active", "활성화"], ["inactive", "비활성화"]].map(([value, label]) => (
            <button type="button" key={value} className={filter === value ? "is-selected" : ""} onClick={() => setFilter(value)}>{label} <span>{counts[value]}</span></button>
          ))}
        </div>
        <label className="sensor-search"><span className="sr-only">센서 검색</span><SearchIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름, EUI, 위치 검색" /></label>
        <button type="button" className="sensor-add-button" onClick={onAdd}>＋ 센서 추가</button>
      </div>

      <div className="sensor-table-wrap">
        <table className="sensor-table">
          <caption className="sr-only">등록된 센서 목록</caption>
          <thead><tr><th>상태</th><th>디바이스</th><th>위치</th><th>모델</th><th><span className="sr-only">설정</span></th></tr></thead>
          <tbody>
            {visibleSensors.map((sensor) => (
              <tr key={sensor.deviceEui}>
                <td data-label="상태"><span className={`sensor-status ${sensor.active ? "is-active" : "is-inactive"}`}>{sensor.active ? "활성화" : "비활성화"}</span></td>
                <th scope="row" data-label="디바이스"><strong>{sensor.displayName}</strong><span>{sensor.deviceEui}</span></th>
                <td data-label="위치"><strong>{spaceName(sensor.spaceId)}</strong><span>{sensor.installationPoint || "지점 미지정"}</span></td>
                <td data-label="모델"><strong>{sensor.model}</strong></td>
                <td className="sensor-table-action"><button type="button" className="sensor-icon-button" aria-label={`${sensor.displayName} 센서 설정`} onClick={() => onEdit(sensor)}><GearIcon /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleSensors.length === 0 && <p className="sensor-list-empty">조건에 맞는 센서가 없습니다.</p>}
      </div>
    </div>
  );
}

// 아직 룰이 없는 항목. threshold 를 0 으로 채우면 그대로 저장했을 때
// "0 이상" 처럼 항상 적중하는 룰이 만들어지므로 비워 두고 입력을 강제한다.
const EMPTY_METRIC = Object.freeze({ operator: "GTE", threshold: null, ruleCount: 0, mixed: false });

/** GET /api/v1/threshold-rules/spaces 의 한 공간을 metric 키로 눕힌다. */
function metricsOf(spaceThreshold) {
  const byMetric = {};
  for (const metric of spaceThreshold?.metrics || []) byMetric[metric.metric] = metric;
  return Object.fromEntries(THRESHOLD_METRICS.map((metric) => [
    metric.value,
    byMetric[metric.value] || EMPTY_METRIC
  ]));
}

function ThresholdContent({ spaces, spaceThresholds, onSave }) {
  const [spaceId, setSpaceId] = useSelectedSpaceId(spaces);
  const current = useMemo(
    () => spaceThresholds.find((item) => item.spaceId === spaceId),
    [spaceThresholds, spaceId]
  );
  const [draft, setDraft] = useState(() => metricsOf(current));
  const [savedTick, setSavedTick] = useState(0);

  // 저장 직후 서버 재조회가 이 effect 를 깨우므로, 여기서 savedTick 을 지우면 성공 메시지가
  // 한 프레임 만에 사라진다. 메시지는 공간을 바꿀 때만 지운다.
  useEffect(() => { setDraft(metricsOf(current)); }, [current]);
  useEffect(() => { setSavedTick(0); }, [spaceId]);

  const spaceName = spaces.find((space) => space.spaceId === spaceId)?.name || "선택한 공간";
  const deviceCount = current?.deviceCount ?? 0;
  const totalRules = THRESHOLD_METRICS.reduce((sum, metric) => sum + (draft[metric.value]?.ruleCount ?? 0), 0);
  const hasMixed = THRESHOLD_METRICS.some((metric) => draft[metric.value]?.mixed);

  function update(metric, field, value) {
    setDraft((prev) => ({ ...prev, [metric]: { ...prev[metric], [field]: value } }));
    setSavedTick(0);
  }

  function submit(event) {
    event.preventDefault();
    const missing = THRESHOLD_METRICS.some((metric) => {
      const value = draft[metric.value]?.threshold;
      return value === null || value === "" || Number.isNaN(Number(value));
    });
    if (missing) return;
    // PATCH /api/v1/threshold-rules/spaces/{spaceId} 의 본문 형태
    onSave(spaceId, {
      rules: THRESHOLD_METRICS.map((metric) => ({
        metric: metric.value,
        operator: draft[metric.value].operator,
        threshold: Number(draft[metric.value].threshold)
      }))
    });
    setSavedTick((tick) => tick + 1);
  }

  return (
    <div className="sensor-threshold-panel">
      <section className="sensor-dashboard-toolbar" aria-label="임계값 설정 조회 조건">
        <label><span>공간</span><select value={spaceId ?? ""} onChange={(event) => setSpaceId(Number(event.target.value))}>{spaces.map((space) => <option key={space.spaceId} value={space.spaceId}>{space.name}</option>)}</select></label>
      </section>

      <form className="sensor-threshold-card" onSubmit={submit}>
        <header>
          <h3>임계값 설정</h3>
          <p>{spaceName} 전체에 같은 값을 적용합니다. 기기 {deviceCount}대 · 규칙 {totalRules}건이 센서마다 저장됩니다.</p>
        </header>
        {hasMixed && (
          <p className="sensor-threshold-mixed" role="status">
            <WarningIcon />
            기기마다 조건이 다릅니다. 아래는 대표값이며, 저장하면 이 공간의 모든 기기가 같은 값으로 덮어써집니다.
          </p>
        )}
        <div className="sensor-threshold-rows">
          {THRESHOLD_METRICS.map((metric) => {
            const rule = draft[metric.value];
            return (
              <div className="sensor-threshold-row" key={metric.value}>
                <span className="sensor-threshold-label">
                  {metric.label}
                  {rule.mixed && <em className="sensor-threshold-mixed-tag">혼재</em>}
                </span>
                <input type="number" required aria-label={`${metric.label} 임계값`} value={rule.threshold ?? ""} onChange={(event) => update(metric.value, "threshold", Number(event.target.value))} />
                <select aria-label={`${metric.label} 조건`} value={rule.operator} onChange={(event) => update(metric.value, "operator", event.target.value)}>
                  {THRESHOLD_OPERATORS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <small>
                  {rule.ruleCount === 0
                    ? `기기 ${deviceCount}대에 새로 만듭니다.`
                    : rule.ruleCount < deviceCount
                      ? `기기 ${deviceCount}대 중 ${rule.ruleCount}대만 이 항목을 감시합니다.`
                      : `센서 ${rule.ruleCount}대에 각각 저장됩니다.`}
                </small>
              </div>
            );
          })}
        </div>
        <footer>
          <button type="button" className="sensor-secondary-button" onClick={() => { setDraft(metricsOf(current)); setSavedTick(0); }}>되돌리기</button>
          <button type="submit" className="sensor-primary-button">저장</button>
        </footer>
        {savedTick > 0 && <p className="sensor-threshold-saved" role="status">저장되었습니다.</p>}
      </form>
    </div>
  );
}

const EUI_PATTERN = "[0-9a-f]{1,32}";

function SensorDialog({ mode, sensor, spaces, onClose, onSave }) {
  const isEdit = mode === "edit";
  // SensorDevice 의 displayName·installationPoint·spaceId 는 nullable 이다.
  // null 을 controlled input 에 그대로 넣으면 React 가 uncontrolled 로 보고 경고한다.
  const toForm = (device) => ({
    deviceEui: device?.deviceEui ?? "",
    displayName: device?.displayName ?? "",
    model: device?.model ?? "",
    spaceId: device?.spaceId ?? spaces[0]?.spaceId ?? null,
    installationPoint: device?.installationPoint ?? "",
    expectedIntervalSeconds: device?.expectedIntervalSeconds ?? 60,
    active: device?.active ?? true
  });
  const [form, setForm] = useState(() => toForm(sensor));
  useEffect(() => { if (sensor) setForm(toForm(sensor)); }, [sensor]);
  function update(field, value) { setForm((current) => ({ ...current, [field]: value })); }
  function submit(event) {
    event.preventDefault();
    onSave(form);
  }

  return (
    <div className="sensor-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="sensor-dialog" role="dialog" aria-modal="true" aria-labelledby="sensor-dialog-title">
        <form onSubmit={submit}>
          <header>
            <div><span>{isEdit ? "센서 설정" : "새 센서"}</span><h2 id="sensor-dialog-title">{isEdit ? form.displayName || "센서 설정" : "센서 추가"}</h2><p>{isEdit ? "센서 EUI와 기본 정보를 확인합니다." : "디바이스 정보를 등록합니다."}</p></div>
            <button type="button" className="sensor-dialog-close" onClick={onClose} aria-label="닫기"><CloseIcon /></button>
          </header>
          <fieldset>
            <legend>기본 정보</legend>
            <label className="sensor-field sensor-field--wide"><span>디바이스 이름</span><input required maxLength={64} value={form.displayName} onChange={(event) => update("displayName", event.target.value)} placeholder="예: 3층 회의실 A 온도" /></label>
            <label className="sensor-field sensor-field--wide">
              <span>디바이스 EUI</span>
              <input required disabled={isEdit} maxLength={32} pattern={EUI_PATTERN} value={form.deviceEui} onChange={(event) => update("deviceEui", event.target.value.toLowerCase())} placeholder="예: 24e124725e5c2862" />
              <small>{isEdit ? "등록 후에는 변경할 수 없습니다." : "16진수 소문자만 사용합니다 (최대 32자)."}</small>
            </label>
            <div className="sensor-field-row">
              <label className="sensor-field"><span>위치</span><select value={form.spaceId ?? ""} onChange={(event) => update("spaceId", event.target.value === "" ? null : Number(event.target.value))}>{spaces.map((space) => <option key={space.spaceId} value={space.spaceId}>{space.name}</option>)}</select></label>
              <label className="sensor-field"><span>모델</span><input required disabled={isEdit} maxLength={32} value={form.model} onChange={(event) => update("model", event.target.value)} placeholder="예: WS202" />{isEdit && <small>등록 후에는 변경할 수 없습니다.</small>}</label>
            </div>
            <label className="sensor-field sensor-field--wide"><span>설치 지점</span><input maxLength={64} value={form.installationPoint} onChange={(event) => update("installationPoint", event.target.value)} placeholder="예: 회의실 A 출입구" /></label>
            <label className="sensor-field sensor-field--wide"><span>예상 수집 주기</span><div className="sensor-input-unit"><input type="number" min="1" required value={form.expectedIntervalSeconds} onChange={(event) => update("expectedIntervalSeconds", Number(event.target.value))} /><b>초</b></div><small>이 센서가 값을 올려보내는 평균 간격입니다.</small></label>
            <div className="sensor-field sensor-field--wide"><span>운영 상태</span><label className="sensor-switch-row"><strong>수집 활성화</strong><input type="checkbox" checked={form.active} onChange={(event) => update("active", event.target.checked)} /><i aria-hidden="true" /></label><small>센서는 삭제할 수 없습니다. 수집을 멈추려면 비활성화하세요.</small></div>
          </fieldset>
          <footer>
            <div><button type="button" className="sensor-secondary-button" onClick={onClose}>취소</button><button type="submit" className="sensor-primary-button">{isEdit ? "변경 사항 저장" : "등록"}</button></div>
          </footer>
        </form>
      </section>
    </div>
  );
}

/**
 * 관리자 센서 워크스페이스.
 *
 * 모든 prop 은 Learning Service 응답 모양 그대로다 — 브릿지가 이름을 바꾸지 않아도 되도록.
 * - spaces          : GET  /api/v1/spaces
 * - sensors         : GET  /api/v1/sensors
 * - spaceThresholds : GET  /api/v1/threshold-rules/spaces
 * - alertLog        : GET  /api/v1/sensors/events  (content/page/totalPages/capacity/retention)
 *
 * 이 컴포넌트는 표본 데이터를 갖지 않는다. 데모 데이터는 스토리에만 둔다 —
 * 기본값으로 두면 조회 실패 시 지어낸 값이 실제 데이터처럼 표시된다.
 *
 * onSaveSensor / onSaveThresholds 를 넘기면 저장을 위로 올린다. 없으면 로컬 state 만 바꾼다.
 */
export function SensorWorkspace({
  spaces = [],
  initialSensors = [],
  alertLog = null,
  initialSpaceThresholds = [],
  loading = false,
  error = null,
  forbidden = false,
  onSaveSensor,
  onSaveThresholds,
  onAlertQueryChange,
  onRetry,
  defaultTab = "dashboard",
  embedded = false
}) {
  const [sensors, setSensors] = useState(initialSensors);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [dialog, setDialog] = useState(null);
  const [spaceThresholds, setSpaceThresholds] = useState(initialSpaceThresholds);

  useEffect(() => { setSensors(initialSensors); }, [initialSensors]);
  useEffect(() => { setSpaceThresholds(initialSpaceThresholds); }, [initialSpaceThresholds]);

  function saveSensor(next) {
    if (onSaveSensor) {
      onSaveSensor(next, dialog?.mode === "edit" ? "update" : "create");
    } else {
      setSensors((current) => current.some((sensor) => sensor.deviceEui === next.deviceEui)
        ? current.map((sensor) => sensor.deviceEui === next.deviceEui ? next : sensor)
        : [...current, next]);
    }
    setDialog(null);
  }

  function saveThresholds(spaceId, body) {
    if (onSaveThresholds) {
      onSaveThresholds(spaceId, body);
      return;
    }
    // 로컬 모드에서는 서버가 돌려줄 모양을 흉내낸다.
    setSpaceThresholds((current) => current.map((item) => item.spaceId !== spaceId ? item : {
      ...item,
      metrics: body.rules.map((rule) => ({
        metric: rule.metric,
        operator: rule.operator,
        threshold: rule.threshold,
        ruleCount: item.deviceCount || item.metrics.find((m) => m.metric === rule.metric)?.ruleCount || 0,
        mixed: false
      }))
    }));
  }

  const auditLog = {
    // 조회에 실패했으면 빈 목록이다. 지어낸 값으로 채우지 않는다.
    entries: alertLog?.content ?? [],
    loaded: Boolean(alertLog),
    loading,
    page: alertLog ? (alertLog.page ?? 0) + 1 : 1,
    totalPages: alertLog?.totalPages,
    capacity: alertLog?.capacity,
    retention: alertLog?.retention,
    onQueryChange: onAlertQueryChange
  };

  return (
    <main className={`sensor-story-canvas${embedded ? " is-embedded" : ""}`}>
      <section className="sensor-workspace" aria-label="관리자 센서 워크스페이스">
        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List className="sensor-tabs" aria-label="센서 관리 메뉴">
            <Tabs.Trigger value="dashboard">대시보드</Tabs.Trigger>
            <Tabs.Trigger value="sensors">센서 목록</Tabs.Trigger>
            <Tabs.Trigger value="thresholds">임계값 설정</Tabs.Trigger>
          </Tabs.List>
          <div className="sensor-content-shell">
            {forbidden ? (
              <StatusPanel
                tone="error"
                title="센서 관리 권한이 없습니다."
                detail="센서와 임계값은 시스템 관리자만 조회·변경할 수 있습니다."
              />
            ) : error ? (
              <StatusPanel tone="error" title="센서 정보를 불러오지 못했습니다." detail={error} onRetry={onRetry} />
            ) : loading && spaces.length === 0 ? (
              <StatusPanel tone="loading" title="센서 정보를 불러오는 중입니다." />
            ) : spaces.length === 0 ? (
              <StatusPanel tone="empty" title="등록된 공간이 없습니다." detail="공간을 먼저 등록하면 센서와 임계값을 설정할 수 있습니다." />
            ) : (
              <>
                <Tabs.Content value="dashboard"><DashboardContent spaces={spaces} spaceThresholds={spaceThresholds} auditLog={auditLog} /></Tabs.Content>
                <Tabs.Content value="sensors"><SensorListContent sensors={sensors} spaces={spaces} onAdd={() => setDialog({ mode: "add" })} onEdit={(item) => setDialog({ mode: "edit", sensor: item })} /></Tabs.Content>
                <Tabs.Content value="thresholds"><ThresholdContent spaces={spaces} spaceThresholds={spaceThresholds} onSave={saveThresholds} /></Tabs.Content>
              </>
            )}
          </div>
        </Tabs.Root>
      </section>
      {dialog && <SensorDialog mode={dialog.mode} sensor={dialog.sensor} spaces={spaces} onClose={() => setDialog(null)} onSave={saveSensor} />}
    </main>
  );
}

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Tabs } from "radix-ui";

// 공간은 GET /api/v1/spaces 가 내려준다: [{ spaceId, name }].
// 시계열 API는 location을 이름 문자열로 받고, 센서·임계값 API는 spaceId(숫자)를 받는다.
// 두 모델이 다르므로 목록을 그대로 들고 다니면서 필요한 쪽으로 골라 쓴다.

/** 검색어 입력이 멈춘 뒤 서버를 부르기까지 기다리는 시간. */
const QUERY_DEBOUNCE_MS = 300;

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

// site.omagotchi.learningservice.environment.domain.ActionStatus
const ACTION_TONES = { CONFIRMED: "success", FAILED: "danger", SKIPPED: "neutral", NONE: null };

const PERIOD_OPTIONS = [
  { value: "day", label: "일 (최근 24시간)" },
  { value: "week", label: "주 (최근 1주)" },
  { value: "month", label: "월 (최근 30일)" }
];

const WINDOW_BY_PERIOD = {
  day: "DAY",
  week: "WEEK",
  month: "MONTH"
};

const METRIC_LABELS = {
  temperature: { label: "온도", unit: "°C" },
  humidity: { label: "습도", unit: "%" },
  co2: { label: "CO₂", unit: "ppm" }
};

function formatPointLabel(isoTime, period) {
  const date = new Date(isoTime);
  if (period === "month") return `${date.getMonth() + 1}/${date.getDate()}`;
  if (period === "week") return `${date.getDate()}일 ${date.getHours()}시`;
  return `${date.getHours()}시`;
}

const THRESHOLD_OPERATOR_LABELS = { GT: "초과", GTE: "이상", LT: "미만", LTE: "이하" };

// 구간 안에서 센서 하나라도 기준을 벗어났는지 본다. 상한 규칙은 최고값, 하한 규칙은 최저값 기준.
function isExceeded(point, threshold) {
  if (!threshold || point.count === 0) return false;
  if (threshold.operator === "GT") return point.max > threshold.value;
  if (threshold.operator === "GTE") return point.max >= threshold.value;
  if (threshold.operator === "LT") return point.min < threshold.value;
  return point.min <= threshold.value;
}

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

/** 로딩·빈 상태·에러를 한 자리에서 그린다. 폴백 데이터를 두지 않는 대신 이 화면들이 필요하다. */
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
function useSelectedSpace(spaces) {
  const [picked, setPicked] = useState(null);
  const valid = spaces.some((space) => space.spaceId === picked);
  return [valid ? picked : (spaces[0]?.spaceId ?? null), setPicked];
}

function SensorChart({ space, metric, period, refreshKey, threshold }) {
  const metricInfo = METRIC_LABELS[metric];
  const periodLabel = PERIOD_OPTIONS.find((item) => item.value === period)?.label || "";
  const [series, setSeries] = useState(null);
  const [status, setStatus] = useState("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const canvasRef = useRef(null);

  useEffect(() => {
    const fetchSpaceSeries = window.OmagotchiApi?.manager?.getSensorSpaceSeries;
    if (!fetchSpaceSeries) {
      setStatus("error");
      return undefined;
    }
    const controller = new AbortController();
    let cancelled = false;
    setStatus("loading");
    fetchSpaceSeries(space, metric, WINDOW_BY_PERIOD[period], { signal: controller.signal })
        .then((response) => {
          if (cancelled) return;
          const points = Array.isArray(response?.points) ? response.points : [];
          setSeries(response);
          setStatus(points.some((point) => point.count > 0) ? "ready" : "empty");
        })
        .catch(() => {
          if (!cancelled) setStatus("error");
        });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [space, metric, period, reloadKey, refreshKey]);

  useEffect(() => {
    if (status !== "ready" || !canvasRef.current || !window.Chart) {
      return undefined;
    }
    const points = series.points;
    const nameByEui = new Map((Array.isArray(series.sensors) ? series.sensors : [])
        .map((sensor) => [sensor.deviceEui, sensor.displayName || sensor.deviceEui]));
    const unit = metricInfo.unit;
    const chart = new window.Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: points.map((point) => formatPointLabel(point.time, period)),
        datasets: [
          { label: "최저", data: points.map((point) => point.min), borderWidth: 0, pointRadius: 0, fill: false },
          { label: "최고", data: points.map((point) => point.max), borderWidth: 0, pointRadius: 0, fill: "-1", backgroundColor: "rgba(47, 111, 237, 0.12)" },
          {
            label: "평균",
            data: points.map((point) => point.avg),
            borderColor: "#2f6fed",
            borderWidth: 2,
            pointRadius: points.map((point) => (isExceeded(point, threshold) ? 3.5 : 0)),
            pointHoverRadius: points.map((point) => (isExceeded(point, threshold) ? 5 : 3)),
            pointBackgroundColor: "#a63d2f",
            pointBorderColor: "#a63d2f",
            tension: 0.35,
            segment: { borderDash: (context) => (points[context.p1DataIndex]?.partial ? [6, 6] : undefined) }
          },
          ...(threshold ? [{
            label: "임계값",
            data: points.map(() => threshold.value),
            borderColor: "#b0413e",
            borderWidth: 1.5,
            borderDash: [6, 5],
            pointRadius: 0,
            fill: false
          }] : [])
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            filter: (item) => item.datasetIndex === 2,
            callbacks: {
              label: (item) => {
                const point = points[item.dataIndex];
                if (!point || point.count === 0) return "측정값 없음";
                const lines = [`평균 ${point.avg.toFixed(1)}${unit}`];
                if (point.max != null) {
                  lines.push(`최고 ${point.max.toFixed(1)}${unit} · ${nameByEui.get(point.maxDeviceEui) || point.maxDeviceEui || "-"}`);
                }
                if (point.min != null) {
                  lines.push(`최저 ${point.min.toFixed(1)}${unit} · ${nameByEui.get(point.minDeviceEui) || point.minDeviceEui || "-"}`);
                }
                if (point.partial) lines.push("집계 진행 중");
                return lines;
              }
            }
          }
        },
        scales: { x: { ticks: { maxTicksLimit: 8 } } }
      }
    });
    return () => chart.destroy();
  }, [status, series, period, threshold]);

  const lastPoint = status === "ready"
      ? series.points.findLast((point) => point.count > 0)
      : null;
  const exceededCount = status === "ready" && threshold
      ? series.points.filter((point) => isExceeded(point, threshold)).length
      : 0;

  return (
      <article className="sensor-chart-card" data-space={space} data-metric={metric}>
        <header>
          <div>
            <h3>{metricInfo.label} <small>{metricInfo.unit}</small></h3>
            <p>
              <strong>현재 평균 {lastPoint ? `${lastPoint.avg.toFixed(1)} ${metricInfo.unit}` : "--"}</strong>
              {threshold
                  ? <span className="sensor-threshold-note">기준 {threshold.value}{metricInfo.unit} {THRESHOLD_OPERATOR_LABELS[threshold.operator] || ""}</span>
                  : <span>기준값 설정 전</span>}
              {exceededCount > 0 && <em className="sensor-threshold-badge">⚠ {exceededCount}개 구간에서 센서 초과</em>}
            </p>
          </div>
          <span>
            {status === "ready"
                ? `${space} 센서 ${series.sensorCount}대 평균 · ${series.interval === "1d" ? "1일" : "1시간"} 단위`
                : `${space} 공간 평균 · ${periodLabel}`}
          </span>
        </header>
        <div className={`sensor-chart-placeholder${status === "ready" ? " is-ready" : ""}`} role="img" aria-label={`${space} ${metricInfo.label} 차트 영역`}>
          {status !== "ready" && <div className="sensor-chart-y-axis"><span>높음</span><span>평균</span><span>낮음</span></div>}
          <div className="sensor-chart-grid">
            <canvas
                ref={canvasRef}
                className="sensor-chart-canvas"
                data-sensor-chart-canvas
                data-metric={metric}
                aria-label={`${space} ${metricInfo.label} Chart.js canvas`}
            />
            {status === "loading" && <span className="sensor-chart-mount">불러오는 중…</span>}
            {status === "empty" && <span className="sensor-chart-mount">선택한 기간에 측정값이 없습니다.</span>}
            {status === "error" && (
                <span className="sensor-chart-mount">
              조회에 실패했습니다.{" "}
                  <button type="button" onClick={() => setReloadKey((current) => current + 1)}>재시도</button>
            </span>
            )}
            {status !== "ready" && <div className="sensor-chart-x-axis"><span>시작</span><span>중간</span><span>현재</span></div>}
          </div>
        </div>
        {status === "ready" && (
            <footer className="sensor-chart-legend" aria-hidden="true">
              <span className="legend-avg">공간 평균</span>
              <span className="legend-band">센서 최소–최대</span>
              {threshold && <span className="legend-threshold">임계값</span>}
              {exceededCount > 0 && <span className="legend-exceeded">센서 초과 발생</span>}
            </footer>
        )}
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
  // 서버는 Duration.toString()을 그대로 준다 (예: "PT168H").
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?/.exec(String(retention || ""));
  if (!match) return String(retention || "");
  const hours = Number(match[1] || 0);
  if (hours >= 24 && hours % 24 === 0) return `${hours / 24}일`;
  return hours > 0 ? `${hours}시간` : String(retention);
}

/**
 * 현재 페이지 주변만 번호로 보여준다. 알림이 쌓이면 페이지가 수십 개가 되므로
 * 전부 그리면 버튼이 한 줄을 가득 채운다. null 은 생략 표시(…) 자리다.
 */
function pageWindow(page, totalPages, span = 2) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set([1, totalPages]);
  for (let offset = -span; offset <= span; offset += 1) {
    const candidate = page + offset;
    if (candidate >= 1 && candidate <= totalPages) pages.add(candidate);
  }
  const sorted = [...pages].sort((left, right) => left - right);
  const withGaps = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) withGaps.push(null);
    withGaps.push(value);
  });
  return withGaps;
}

/**
 * GET /api/v1/sensors/events 응답을 그대로 그린다.
 *
 * onQueryChange가 주어지면 서버 페이징 모드로 동작한다 — 필터·페이지 변경을 위로 올리고
 * entries는 서버가 준 한 페이지만 받는다. 없으면 전달받은 배열을 그대로 걸러서 보여준다.
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
          <button type="button" disabled={page === 1} onClick={() => changePage(page - 1)} aria-label="이전 페이지">‹</button>
          {pageWindow(page, totalPages).map((pageNumber, index) => (
            pageNumber === null
              ? <span key={`gap-${index}`} className="sensor-pagination-gap" aria-hidden="true">…</span>
              : <button type="button" key={pageNumber} className={page === pageNumber ? "is-current" : ""} aria-current={page === pageNumber ? "page" : undefined} onClick={() => changePage(pageNumber)}>{pageNumber}</button>
          ))}
          <button type="button" disabled={page === totalPages} onClick={() => changePage(page + 1)} aria-label="다음 페이지">›</button>
        </div>
      </footer>
    </section>
  );
}

function DashboardContent({ spaces, thresholds, auditLog }) {
  // 시계열 API는 공간을 이름 문자열로 받는다. 목록은 서버에서 오므로 하드코딩하지 않는다.
  const [spaceId, setSpaceId] = useSelectedSpace(spaces);
  const space = spaces.find((item) => item.spaceId === spaceId)?.name || "";
  const [period, setPeriod] = useState("day");
  const [refreshKey, setRefreshKey] = useState(0);

  // 확정 데이터는 다운샘플 태스크(offset 5m)가 채우므로 정각이 아니라 매시 6분에 갱신한다.
  useEffect(() => {
    const now = new Date();
    const nextRefresh = new Date(now);
    nextRefresh.setHours(now.getHours() + 1, 6, 0, 0);
    const timer = setTimeout(() => setRefreshKey((current) => current + 1), nextRefresh - now);
    return () => clearTimeout(timer);
  }, [refreshKey]);

  return (
      <div className="sensor-dashboard">
        <section className="sensor-dashboard-toolbar" aria-label="대시보드 조회 조건">
          <label><span>공간</span><select value={spaceId ?? ""} onChange={(event) => setSpaceId(Number(event.target.value))}>{spaces.map((option) => <option key={option.spaceId} value={option.spaceId}>{option.name}</option>)}</select></label>
          <label><span>기간</span><select value={period} onChange={(event) => setPeriod(event.target.value)}>{PERIOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </section>

        <div className="sensor-chart-list">
          {Object.keys(METRIC_LABELS).map((metric) => (
              <div className="sensor-chart-row" key={`${space}-${metric}`}>
                <SensorChart space={space} metric={metric} period={period} refreshKey={refreshKey} threshold={thresholds?.[space]?.[metric] || null} />
              </div>
          ))}
        </div>
        <AuditLog {...auditLog} />
      </div>
  );
}

// 아직 룰이 없는 항목. threshold를 0으로 채우면 그대로 저장했을 때
// "0 이상"처럼 항상 적중하는 룰이 만들어지므로 비워 두고 입력을 강제한다.
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
  const [spaceId, setSpaceId] = useSelectedSpace(spaces);
  const current = useMemo(
    () => spaceThresholds.find((item) => item.spaceId === spaceId),
    [spaceThresholds, spaceId]
  );
  const [draft, setDraft] = useState(() => metricsOf(current));
  const [savedTick, setSavedTick] = useState(0);
  const [saveResult, setSaveResult] = useState(null);
  const [saving, setSaving] = useState(false);

  // 저장 직후 서버 재조회가 이 effect를 깨우므로, 여기서 savedTick을 지우면 성공 메시지가
  // 한 프레임 만에 사라진다. 메시지는 공간을 바꿀 때만 지운다.
  useEffect(() => { setDraft(metricsOf(current)); }, [current]);
  useEffect(() => { setSavedTick(0); setSaveResult(null); }, [spaceId]);

  const spaceName = spaces.find((space) => space.spaceId === spaceId)?.name || "선택한 공간";
  const deviceCount = current?.deviceCount ?? 0;
  const totalRules = THRESHOLD_METRICS.reduce((sum, metric) => sum + (draft[metric.value]?.ruleCount ?? 0), 0);
  const hasMixed = THRESHOLD_METRICS.some((metric) => draft[metric.value]?.mixed);

  function update(metric, field, value) {
    setDraft((prev) => ({ ...prev, [metric]: { ...prev[metric], [field]: value } }));
    setSavedTick(0);
    setSaveResult(null);
  }

  async function submit(event) {
    event.preventDefault();
    const missing = THRESHOLD_METRICS.some((metric) => {
      const value = draft[metric.value]?.threshold;
      return value === null || value === undefined || value === "" || Number.isNaN(Number(value));
    });
    if (missing) return;

    // 저장 결과를 확인하기 전에 성공 메시지를 띄우면, 서버가 거절해도 초록 메시지가 뜬다.
    setSaving(true);
    setSaveResult(null);
    try {
      // PATCH /api/v1/threshold-rules/spaces/{spaceId} 의 본문 형태
      const result = await onSave(spaceId, {
        rules: THRESHOLD_METRICS.map((metric) => ({
          metric: metric.value,
          operator: draft[metric.value].operator,
          threshold: Number(draft[metric.value].threshold)
        }))
      });
      if (result === false) return;          // 저장 실패 — 말풍선이 이미 알렸다
      setSaveResult(result || null);
      setSavedTick((tick) => tick + 1);
    } finally {
      setSaving(false);
    }
  }

  // 서버는 규칙이 없는 (기기 × 항목)을 missing 으로 돌려준다. 0이 아니면 화면이 알려야 한다.
  function savedMessage() {
    if (!saveResult) return "저장되었습니다.";
    const { applied = 0, unchanged = 0, missing: skipped = 0 } = saveResult;
    const parts = [];
    if (applied) parts.push(`${applied}건 적용`);
    if (unchanged) parts.push(`${unchanged}건은 이미 같은 값`);
    if (skipped) parts.push(`${skipped}건은 규칙이 없어 건너뜀`);
    return parts.length ? parts.join(" · ") : "변경된 규칙이 없습니다.";
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
                <input type="number" required aria-label={`${metric.label} 임계값`} value={rule.threshold ?? ""} onChange={(event) => update(metric.value, "threshold", event.target.value === "" ? null : Number(event.target.value))} />
                <select aria-label={`${metric.label} 조건`} value={rule.operator} onChange={(event) => update(metric.value, "operator", event.target.value)}>
                  {THRESHOLD_OPERATORS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                {/* 서버(applyToSpace)는 규칙 없는 기기를 만나면 만들지 않고 건너뛴다. */}
                <small className={rule.ruleCount === 0 ? "sensor-threshold-hint--none" : undefined}>
                  {rule.ruleCount === 0
                    ? `이 항목을 감시하는 기기가 없어 저장되지 않습니다.`
                    : rule.ruleCount < deviceCount
                      ? `기기 ${deviceCount}대 중 ${rule.ruleCount}대만 이 항목을 감시합니다.`
                      : `센서 ${rule.ruleCount}대에 각각 저장됩니다.`}
                </small>
              </div>
            );
          })}
        </div>
        <footer>
          <button type="button" className="sensor-secondary-button" onClick={() => { setDraft(metricsOf(current)); setSavedTick(0); setSaveResult(null); }}>되돌리기</button>
          <button type="submit" className="sensor-primary-button" disabled={saving}>{saving ? "저장 중…" : "저장"}</button>
        </footer>
        {savedTick > 0 && (
          <p className={`sensor-threshold-saved${saveResult?.missing ? " has-skipped" : ""}`} role="status">
            {savedMessage()}
          </p>
        )}
      </form>
    </div>
  );
}

function SensorListContent({ sensors, spaces, onAdd, onEdit }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const spaceName = (spaceId) => spaces.find((space) => space.spaceId === spaceId)?.name || "미지정";
  // displayName은 nullable이다. 비워두면 이름 칸이 공백이 되고 aria-label이 "null …"이 된다.
  const deviceName = (sensor) => sensor.displayName || "이름 없음";
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
                <th scope="row" data-label="디바이스"><strong>{deviceName(sensor)}</strong><span>{sensor.deviceEui}</span></th>
                <td data-label="위치"><strong>{spaceName(sensor.spaceId)}</strong><span>{sensor.installationPoint || "지점 미지정"}</span></td>
                <td data-label="모델"><strong>{sensor.model}</strong></td>
                <td className="sensor-table-action"><button type="button" className="sensor-icon-button" aria-label={`${deviceName(sensor)} 센서 설정`} onClick={() => onEdit(sensor)}><GearIcon /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleSensors.length === 0 && <p className="sensor-list-empty">조건에 맞는 센서가 없습니다.</p>}
      </div>
    </div>
  );
}

// 서버 검증: @Pattern("[0-9a-f]+") @Size(max = 32)
const EUI_PATTERN = "[0-9a-f]{1,32}";

/**
 * 방향 조사를 받침에 맞춰 고른다. 받침이 없거나 ㄹ이면 "로", 아니면 "으로".
 *
 * 공간 이름은 관리자가 자유롭게 짓는다 — "실습실"과 "강의동"이 같은 조사를 쓸 수 없다.
 * 한글 음절이 아니면(예: "A101") 판정할 근거가 없으므로 "(으)로"로 둔다.
 */
function directionParticle(word) {
  const last = word?.trim().slice(-1);
  if (!last) return "로";
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "(으)로";
  const jongseong = (code - 0xac00) % 28;
  return jongseong === 0 || jongseong === 8 ? "로" : "으로";
}

function SensorDialog({ mode, sensor, spaces, onClose, onSave, onClaim }) {
  const isEdit = mode === "edit";
  // SensorDevice의 displayName·installationPoint·spaceId는 nullable이다.
  // null을 controlled input에 그대로 넣으면 React가 uncontrolled로 보고 경고한다.
  const toForm = (device) => ({
    deviceEui: device?.deviceEui ?? "",
    displayName: device?.displayName ?? "",
    model: device?.model ?? "",
    spaceId: device?.spaceId ?? spaces[0]?.spaceId ?? null,
    installationPoint: device?.installationPoint ?? "",
    expectedIntervalSeconds: device?.expectedIntervalSeconds ?? 60,
    // 서버 update()는 installedAt을 조건 없이 덮어쓴다. 그대로 돌려보내지 않으면 지워진다.
    installedAt: device?.installedAt ?? null,
    active: device?.active ?? true
  });
  const [form, setForm] = useState(() => toForm(sensor));
  const [saving, setSaving] = useState(false);
  // 409가 난 <b>제출 시점의 값</b>. 불리언으로 두면 인계할 때 "지금 폼"을 다시 읽게 되는데,
  // 저장 요청이 날아가 있는 동안 입력이 바뀌면 충돌한 센서와 인계하는 센서가 어긋난다.
  const [claimCandidate, setClaimCandidate] = useState(null);
  useEffect(() => { if (sensor) setForm(toForm(sensor)); }, [sensor]);
  function update(field, value) {
    // 입력을 고치면 아까의 충돌은 더 이상 이 폼의 상태가 아니다.
    setClaimCandidate(null);
    setForm((current) => ({ ...current, [field]: value }));
  }
  async function submit(event) {
    event.preventDefault();
    // 응답을 기다리는 동안 form이 바뀔 수 있다. 이 요청이 무엇을 보냈는지는 지금 붙잡는다.
    const submitted = form;
    setSaving(true);
    try {
      setClaimCandidate(await onSave(submitted) === "claimable" ? submitted : null);
    } finally {
      setSaving(false);
    }
  }
  async function claim() {
    if (!claimCandidate) return;
    setSaving(true);
    try {
      await onClaim(claimCandidate);
    } finally {
      setSaving(false);
    }
  }

  // 대상 공간도 지금 폼이 아니라 충돌한 제출값에서 읽는다.
  const claimTargetName =
      spaces.find((space) => space.spaceId === claimCandidate?.spaceId)?.name ?? "선택한 공간";

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
            {claimCandidate && (
              <p className="sensor-dialog-conflict sensor-field--wide" role="alert">
                {/* 어느 EUI가 막혔는지 적는다. 응답을 기다리는 사이 입력을 고쳤다면
                    폼의 값과 다를 수 있고, 그 차이는 감추는 것보다 드러내는 편이 낫다. */}
                <span>
                  <b>{claimCandidate.deviceEui}</b> — 이미 등록된 센서입니다. 이전 기수에서
                  쓰던 센서라면{" "}
                  <b>{claimTargetName}</b>{directionParticle(claimTargetName)} 인계할 수 있습니다.
                </span>
                <button type="button" className="sensor-claim-button" onClick={claim} disabled={saving}>
                  {saving ? "인계 중…" : "인계하기"}
                </button>
              </p>
            )}
            <div className="sensor-field-row">
              <label className="sensor-field"><span>위치</span><select value={form.spaceId ?? ""} onChange={(event) => update("spaceId", event.target.value === "" ? null : Number(event.target.value))}>{spaces.map((space) => <option key={space.spaceId} value={space.spaceId}>{space.name}</option>)}</select></label>
              <label className="sensor-field"><span>모델</span><input required disabled={isEdit} maxLength={32} value={form.model} onChange={(event) => update("model", event.target.value)} placeholder="예: WS202" />{isEdit && <small>등록 후에는 변경할 수 없습니다.</small>}</label>
            </div>
            <label className="sensor-field sensor-field--wide"><span>설치 지점</span><input maxLength={64} value={form.installationPoint} onChange={(event) => update("installationPoint", event.target.value)} placeholder="예: 회의실 A 출입구" /></label>
            <label className="sensor-field sensor-field--wide"><span>예상 수집 주기</span><div className="sensor-input-unit"><input type="number" min="1" required value={form.expectedIntervalSeconds} onChange={(event) => update("expectedIntervalSeconds", Number(event.target.value))} /><b>초</b></div><small>이 센서가 값을 올려보내는 평균 간격입니다.</small></label>
            <div className="sensor-field sensor-field--wide"><span>운영 상태</span><label className="sensor-switch-row"><strong>수집 활성화</strong><input type="checkbox" checked={form.active} onChange={(event) => update("active", event.target.checked)} /><i aria-hidden="true" /></label><small>센서는 삭제할 수 없습니다. 수집을 멈추려면 비활성화하세요.</small></div>
          </fieldset>
          <footer>
            <div><button type="button" className="sensor-secondary-button" onClick={onClose}>취소</button><button type="submit" className="sensor-primary-button" disabled={saving}>{saving ? "저장 중…" : (isEdit ? "변경 사항 저장" : "등록")}</button></div>
          </footer>
        </form>
      </section>
    </div>
  );
}

/**
 * 관리자 센서 워크스페이스.
 *
 * 모든 prop은 Learning Service 응답 모양 그대로다 — 브릿지가 이름을 바꾸지 않아도 되도록.
 * - spaces          : GET  /api/v1/spaces                    [{ spaceId, name }]
 * - sensors         : GET  /api/v1/sensors
 * - spaceThresholds : GET  /api/v1/threshold-rules/spaces
 * - alertLog        : GET  /api/v1/sensors/events            (content/page/totalPages/capacity/retention)
 *
 * 이 컴포넌트는 표본 데이터를 갖지 않는다. 데모 데이터는 스토리에만 둔다 —
 * 기본값으로 두면 조회 실패 시 지어낸 값이 실제 데이터처럼 표시된다.
 */
export function SensorWorkspace({
  spaces = [],
  initialSensors = [],
  initialSpaceThresholds = [],
  alertLog = null,
  loading = false,
  error = null,
  forbidden = false,
  onSaveSensor,
  onClaimSensor,
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

  // SensorChart는 임계값을 { [공간이름]: { [측정항목]: { operator, value } } } 로 읽는다.
  // 서버 응답(spaceId 기준)을 그 모양으로 바꿔 차트 계약을 그대로 지킨다.
  const chartThresholds = useMemo(() => {
    const byName = {};
    for (const item of spaceThresholds) {
      const name = spaces.find((space) => space.spaceId === item.spaceId)?.name;
      if (!name) continue;
      const metrics = {};
      for (const metric of item.metrics || []) {
        if (metric.threshold == null) continue;
        metrics[metric.metric] = { operator: metric.operator, value: metric.threshold };
      }
      byName[name] = metrics;
    }
    return byName;
  }, [spaceThresholds, spaces]);

  async function saveSensor(next) {
    if (onSaveSensor) {
      // 서버가 거절하면(예: 중복 EUI 409) 창을 닫지 않는다. 닫으면 입력이 전부 사라진다.
      const ok = await onSaveSensor(next, dialog?.mode === "edit" ? "update" : "create");
      // 인계로 이어갈 수 있는 충돌은 창을 연 채로 다이얼로그에 알려 준다.
      if (ok === "claimable") return "claimable";
      if (ok === false) return false;
    } else {
      setSensors((current) => current.some((sensor) => sensor.deviceEui === next.deviceEui)
        ? current.map((sensor) => sensor.deviceEui === next.deviceEui ? next : sensor)
        : [...current, next]);
    }
    setDialog(null);
    return true;
  }

  async function claimSensor(next) {
    if (!onClaimSensor) return false;
    if (await onClaimSensor(next) === false) return false;
    setDialog(null);
    return true;
  }

  async function saveThresholds(spaceId, body) {
    if (onSaveThresholds) {
      return onSaveThresholds(spaceId, body);
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
    return null;
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
            <Tabs.Trigger value="dashboard">센서 대시보드</Tabs.Trigger>
            <Tabs.Trigger value="sensors">센서 관리</Tabs.Trigger>
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
                <Tabs.Content value="dashboard"><DashboardContent spaces={spaces} thresholds={chartThresholds} auditLog={auditLog} /></Tabs.Content>
                <Tabs.Content value="sensors"><SensorListContent sensors={sensors} spaces={spaces} onAdd={() => setDialog({ mode: "add" })} onEdit={(item) => setDialog({ mode: "edit", sensor: item })} /></Tabs.Content>
                <Tabs.Content value="thresholds"><ThresholdContent spaces={spaces} spaceThresholds={spaceThresholds} onSave={saveThresholds} /></Tabs.Content>
              </>
            )}
          </div>
        </Tabs.Root>
      </section>
      {dialog && <SensorDialog mode={dialog.mode} sensor={dialog.sensor} spaces={spaces} onClose={() => setDialog(null)} onSave={saveSensor} onClaim={claimSensor} />}
    </main>
  );
}

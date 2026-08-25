import React, { useEffect, useMemo, useRef, useState } from "react";
import { Tabs } from "radix-ui";

const SPACE_OPTIONS = [
  { value: "실습실", label: "실습실" },
  { value: "사무실", label: "사무실" },
  { value: "회의실", label: "회의실" }
];

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

const INITIAL_AUDIT_ENTRIES = Array.from({ length: 23 }, (_, index) => {
  const spaces = SPACE_OPTIONS;
  const selectedSpace = spaces[index % spaces.length];
  const active = index % 4 !== 3;
  return {
    id: index + 1,
    time: index === 0 ? "오늘 09:42" : index < 4 ? `오늘 0${8 - index}:1${index}` : `${Math.min(index, 30)}일 전`,
    ageDays: index < 4 ? 0 : Math.min(index, 30),
    title: index === 0 ? "센서 수신 상태 확인" : active ? "센서 설정 변경" : "센서 수집 비활성화",
    detail: `${selectedSpace.label} 센서의 ${active ? "수집 설정이 정상 반영" : "수집 상태가 비활성화"}되었습니다.`,
    space: selectedSpace.value,
    spaceLabel: selectedSpace.label,
    status: active ? "active" : "inactive"
  };
});

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

function AuditLog({ entries }) {
  const [query, setQuery] = useState("");
  const [timeRange, setTimeRange] = useState("all");
  const [space, setSpace] = useState("all");
  const [status, setStatus] = useState("all");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  const filteredEntries = useMemo(() => entries.filter((entry) => {
    const normalizedQuery = query.trim().toLowerCase();
    const queryMatches = !normalizedQuery || `${entry.title} ${entry.detail}`.toLowerCase().includes(normalizedQuery);
    const timeMatches = timeRange === "all"
      || (timeRange === "today" && entry.ageDays === 0)
      || (timeRange === "week" && entry.ageDays <= 7)
      || (timeRange === "month" && entry.ageDays <= 30);
    const spaceMatches = space === "all" || entry.space === space;
    const statusMatches = status === "all" || entry.status === status;
    return queryMatches && timeMatches && spaceMatches && statusMatches;
  }), [entries, query, timeRange, space, status]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const visibleEntries = filteredEntries.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [query, timeRange, space, status, pageSize]);
  useEffect(() => { setPage((current) => Math.min(current, totalPages)); }, [totalPages]);

  return (
    <section className="sensor-audit" aria-labelledby="sensor-audit-title">
      <div className="sensor-audit-branch" aria-hidden="true"><i /><i /><i /></div>
      <header>
        <div><span>ACTIVITY</span><h3 id="sensor-audit-title">감사 로그</h3></div>
        <small>총 {filteredEntries.length}건의 센서 변경 이력</small>
      </header>
      <div className="sensor-audit-toolbar">
        <label className="sensor-audit-search"><span className="sr-only">감사 로그 검색</span><SearchIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="변경 내용 검색" /></label>
        <label><span>시간</span><select value={timeRange} onChange={(event) => setTimeRange(event.target.value)}><option value="all">전체 시간</option><option value="today">오늘</option><option value="week">최근 7일</option><option value="month">최근 30일</option></select></label>
        <label><span>공간</span><select value={space} onChange={(event) => setSpace(event.target.value)}><option value="all">전체 공간</option>{SPACE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label><span>상태</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">전체 상태</option><option value="active">활성화</option><option value="inactive">비활성화</option></select></label>
        <label className="sensor-audit-page-size"><span>페이지당</span><select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value="10">10개</option><option value="20">20개</option><option value="50">50개</option></select></label>
      </div>
      <ol>
        {visibleEntries.map((entry) => (
          <li key={entry.id}>
            <time>{entry.time}</time>
            <div><strong>{entry.title}</strong><span>{entry.detail}</span><small>{entry.spaceLabel} · {entry.status === "active" ? "활성화" : "비활성화"}</small></div>
          </li>
        ))}
      </ol>
      {visibleEntries.length === 0 && <p className="sensor-audit-empty">조건에 맞는 감사 로그가 없습니다.</p>}
      <footer className="sensor-pagination" aria-label="감사 로그 페이지">
        <span>{filteredEntries.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredEntries.length)} / {filteredEntries.length}</span>
        <div>
          <button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)} aria-label="이전 페이지">‹</button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => <button type="button" key={pageNumber} className={page === pageNumber ? "is-current" : ""} aria-current={page === pageNumber ? "page" : undefined} onClick={() => setPage(pageNumber)}>{pageNumber}</button>)}
          <button type="button" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)} aria-label="다음 페이지">›</button>
        </div>
      </footer>
    </section>
  );
}

function DashboardContent({ auditEntries, thresholds }) {
  const [space, setSpace] = useState("실습실");
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
          <label><span>공간</span><select value={space} onChange={(event) => setSpace(event.target.value)}>{SPACE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label><span>기간</span><select value={period} onChange={(event) => setPeriod(event.target.value)}>{PERIOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </section>

        <div className="sensor-chart-list">
          {Object.keys(METRIC_LABELS).map((metric) => (
              <div className="sensor-chart-row" key={`${space}-${metric}`}>
                <SensorChart space={space} metric={metric} period={period} refreshKey={refreshKey} threshold={thresholds?.[space]?.[metric] || null} />
              </div>
          ))}
        </div>
        <AuditLog entries={auditEntries} />
      </div>
  );
}

function SensorListContent({ sensors, onAdd, onEdit }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const counts = {
    all: sensors.length,
    active: sensors.filter((sensor) => sensor.active).length,
    inactive: sensors.filter((sensor) => !sensor.active).length
  };
  const visibleSensors = sensors.filter((sensor) => {
    const statusMatches = filter === "all" || (filter === "active" ? sensor.active : !sensor.active);
    const normalizedQuery = query.trim().toLowerCase();
    const queryMatches = !normalizedQuery || [sensor.name, sensor.eui, sensor.spaceLabel, sensor.location].join(" ").toLowerCase().includes(normalizedQuery);
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
          <thead><tr><th>상태</th><th>디바이스</th><th>위치</th><th>측정 항목</th><th><span className="sr-only">설정</span></th></tr></thead>
          <tbody>
            {visibleSensors.map((sensor) => (
              <tr key={sensor.id}>
                <td data-label="상태"><span className={`sensor-status ${sensor.active ? "is-active" : "is-inactive"}`}>{sensor.active ? "활성화" : "비활성화"}</span></td>
                <th scope="row" data-label="디바이스"><strong>{sensor.name}</strong><span>{sensor.eui}</span></th>
                <td data-label="위치"><strong>{sensor.spaceLabel}</strong><span>{sensor.location}</span></td>
                <td data-label="측정 항목"><strong>{sensor.metrics.map((metric) => METRIC_LABELS[metric].label).join(" · ")}</strong></td>
                <td className="sensor-table-action"><button type="button" className="sensor-icon-button" aria-label={`${sensor.name} 센서 설정`} onClick={() => onEdit(sensor)}><GearIcon /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleSensors.length === 0 && <p className="sensor-list-empty">조건에 맞는 센서가 없습니다.</p>}
      </div>
    </div>
  );
}

function SensorDialog({ mode, sensor, onClose, onSave, onDelete }) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState(() => sensor || { name: "", eui: "", space: "실습실", spaceLabel: "실습실", location: "", interval: 60, metrics: ["temperature"], active: true });
  useEffect(() => { if (sensor) setForm(sensor); }, [sensor]);
  function update(field, value) { setForm((current) => ({ ...current, [field]: value })); }
  function toggleMetric(metric) {
    setForm((current) => ({ ...current, metrics: current.metrics.includes(metric) ? current.metrics.filter((item) => item !== metric) : [...current.metrics, metric] }));
  }
  function submit(event) {
    event.preventDefault();
    const spaceLabel = SPACE_OPTIONS.find((option) => option.value === form.space)?.label || form.spaceLabel;
    onSave({ ...form, id: form.id || `sensor-${Date.now()}`, spaceLabel });
  }

  return (
    <div className="sensor-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="sensor-dialog" role="dialog" aria-modal="true" aria-labelledby="sensor-dialog-title">
        <form onSubmit={submit}>
          <header>
            <div><span>{isEdit ? "센서 설정" : "새 센서"}</span><h2 id="sensor-dialog-title">{isEdit ? form.name || "센서 설정" : "센서 추가"}</h2><p>{isEdit ? "센서 EUI와 기본 정보를 확인합니다." : "디바이스 정보와 측정 항목을 등록합니다."}</p></div>
            <button type="button" className="sensor-dialog-close" onClick={onClose} aria-label="닫기"><CloseIcon /></button>
          </header>
          <fieldset>
            <legend>기본 정보</legend>
            <label className="sensor-field sensor-field--wide"><span>디바이스 이름</span><input required value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="예: 3층 회의실 A 온도" /></label>
            <label className="sensor-field sensor-field--wide"><span>디바이스 EUI</span><input required disabled={isEdit} maxLength={16} value={form.eui} onChange={(event) => update("eui", event.target.value.toUpperCase())} placeholder="16자리 EUI 주소" /><small>{isEdit ? "등록 후에는 변경할 수 없습니다." : "LoRaWAN 디바이스 식별자 16자리를 입력하세요."}</small></label>
            <div className="sensor-field-row">
              <label className="sensor-field"><span>위치</span><select value={form.space} onChange={(event) => update("space", event.target.value)}>{SPACE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className="sensor-field"><span>지점</span><input required value={form.location} onChange={(event) => update("location", event.target.value)} placeholder="예: 회의실 A" /></label>
            </div>
            <label className="sensor-field sensor-field--wide"><span>예상 수집 주기</span><div className="sensor-input-unit"><input type="number" min="1" required value={form.interval} onChange={(event) => update("interval", Number(event.target.value))} /><b>초</b></div><small>이 센서가 값을 올려보내는 평균 간격입니다.</small></label>
            <div className="sensor-field sensor-field--wide"><span>측정 항목</span><div className="sensor-metric-picker">{Object.entries(METRIC_LABELS).map(([value, info]) => <button type="button" key={value} className={form.metrics.includes(value) ? "is-selected" : ""} onClick={() => toggleMetric(value)}>{info.label}</button>)}</div></div>
            <div className="sensor-field sensor-field--wide"><span>운영 상태</span><label className="sensor-switch-row"><strong>수집 활성화</strong><input type="checkbox" checked={form.active} onChange={(event) => update("active", event.target.checked)} /><i aria-hidden="true" /></label></div>
          </fieldset>
          <footer>
            {isEdit && <button type="button" className="sensor-delete-button" onClick={() => onDelete(form.id)}>삭제</button>}
            <div><button type="button" className="sensor-secondary-button" onClick={onClose}>취소</button><button type="submit" className="sensor-primary-button" disabled={form.metrics.length === 0}>{isEdit ? "변경 사항 저장" : "등록"}</button></div>
          </footer>
        </form>
      </section>
    </div>
  );
}

export function SensorWorkspace({
  initialSensors = [],
  initialAuditEntries = INITIAL_AUDIT_ENTRIES,
  defaultTab = "dashboard",
  embedded = false,
  // 화면 내부 모델: { [공간]: { [측정항목]: { operator, value } } }. 임계값 조회 API가 연결되면 여기로 주입한다.
  thresholds = null
}) {
  const [sensors, setSensors] = useState(initialSensors);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [dialog, setDialog] = useState(null);
  const [auditEntries, setAuditEntries] = useState(initialAuditEntries);

  function saveSensor(nextSensor) {
    const exists = sensors.some((sensor) => sensor.id === nextSensor.id);
    setSensors((current) => exists ? current.map((sensor) => sensor.id === nextSensor.id ? nextSensor : sensor) : [...current, nextSensor]);
    setAuditEntries((current) => [{ id: Date.now(), time: "방금 전", ageDays: 0, title: exists ? "센서 설정 변경" : "센서 추가", detail: `${nextSensor.name} 센서가 ${exists ? "변경" : "등록"}되었습니다.`, space: nextSensor.space, spaceLabel: nextSensor.spaceLabel, status: nextSensor.active ? "active" : "inactive" }, ...current]);
    setDialog(null);
  }
  function deleteSensor(id) {
    const target = sensors.find((sensor) => sensor.id === id);
    setSensors((current) => current.filter((sensor) => sensor.id !== id));
    setAuditEntries((current) => [{ id: Date.now(), time: "방금 전", ageDays: 0, title: "센서 삭제", detail: `${target?.name || "센서"}가 삭제되었습니다.`, space: target?.space || "실습실", spaceLabel: target?.spaceLabel || "실습실", status: target?.active ? "active" : "inactive" }, ...current]);
    setDialog(null);
  }

  return (
    <main className={`sensor-story-canvas${embedded ? " is-embedded" : ""}`}>
      <section className="sensor-workspace" aria-label="관리자 센서 워크스페이스">
        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List className="sensor-tabs" aria-label="센서 관리 메뉴">
            <Tabs.Trigger value="dashboard">대시보드</Tabs.Trigger>
            <Tabs.Trigger value="sensors">센서 목록</Tabs.Trigger>
          </Tabs.List>
          <div className="sensor-content-shell">
            <Tabs.Content value="dashboard"><DashboardContent auditEntries={auditEntries} thresholds={thresholds} /></Tabs.Content>
            <Tabs.Content value="sensors"><SensorListContent sensors={sensors} onAdd={() => setDialog({ mode: "add" })} onEdit={(item) => setDialog({ mode: "edit", sensor: item })} /></Tabs.Content>
          </div>
        </Tabs.Root>
      </section>
      {dialog && <SensorDialog mode={dialog.mode} sensor={dialog.sensor} onClose={() => setDialog(null)} onSave={saveSensor} onDelete={deleteSensor} />}
    </main>
  );
}

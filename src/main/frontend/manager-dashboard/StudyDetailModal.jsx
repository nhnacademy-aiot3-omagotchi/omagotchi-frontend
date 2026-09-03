import React, { useEffect, useRef, useState } from "react";

export function addDays(isoDate, amount) {
  if (!isoDate) return "";
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function currentKstAggregationDate() {
  const shifted = new Date(Date.now() - 4 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(shifted);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatDuration(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  if (value === 0) return "0분";
  if (value < 60) return "1분 미만";
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  if (hours && minutes) return `${hours}시간 ${minutes}분`;
  if (hours) return `${hours}시간`;
  return `${minutes}분`;
}

export function formatTimelineDuration(seconds) {
  const totalMinutes = Math.max(1, Math.round((Number(seconds) || 0) / 60));
  if (totalMinutes < 120) return `${totalMinutes}분`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}시간 ${minutes}분` : `${hours}시간`;
}

export function formatDateLabel(isoDate) {
  if (!isoDate) return "날짜를 선택해 주세요.";
  const date = new Date(`${isoDate}T00:00:00Z`);
  const dateLabel = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
  const weekday = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "UTC",
    weekday: "short"
  }).format(date);
  return `${dateLabel} (${weekday})`;
}

export function formatChartDate(isoDate) {
  if (!isoDate) return "";
  const date = new Date(`${isoDate}T00:00:00Z`);
  return `${date.getUTCMonth() + 1}.${date.getUTCDate()}`;
}

export function formatKstTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

export function formatKstDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date).map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

export function calculateTimelinePosition(record, selectedDate) {
  const startOfDay = new Date(`${selectedDate}T04:00:00+09:00`).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
  const start = Math.max(startOfDay, new Date(record.startTime).getTime());
  const end = Math.min(endOfDay, new Date(record.endTime).getTime());
  const left = Math.max(0, ((start - startOfDay) / (24 * 60 * 60 * 1000)) * 100);
  const width = Math.max(0.5, ((end - start) / (24 * 60 * 60 * 1000)) * 100);
  return { left, width };
}

export function StudyDetailModal({
  isOpen = true,
  onClose,
  memberName = "수강생",
  memberEmail = "",
  periodDays: controlledPeriod,
  onPeriodChange,
  selectedDate: controlledDate,
  onSelectDate,
  today = "2026-09-02",
  overview,
  records = [],
  loadingOverview = false,
  loadingRecords = false,
  error = null
}) {
  const [internalPeriod, setInternalPeriod] = useState(controlledPeriod || 7);
  const [internalDate, setInternalDate] = useState(controlledDate || today);
  const [activeRecordId, setActiveRecordId] = useState(null);

  const chartCanvasRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const recordListRef = useRef(null);
  const modalRef = useRef(null);

  const currentPeriod = controlledPeriod ?? internalPeriod;
  const currentDate = controlledDate ?? internalDate;

  // 기간에 따른 from / to 계산
  const toDate = overview?.to || today;
  const fromDate = overview?.from || addDays(toDate, -(currentPeriod - 1));

  // 기간 탭 클릭 핸들러
  const handlePeriodClick = (days) => {
    if (days === currentPeriod) return;
    setInternalPeriod(days);
    onPeriodChange?.(days);
  };

  // 날짜 선택 핸들러
  const handleSelectDate = (date) => {
    if (!date) return;
    setInternalDate(date);
    setActiveRecordId(null);
    onSelectDate?.(date);
  };

  // 타임라인 바 클릭 시 레코드 포커스 핸들러
  const handleTimelineBarClick = (recordId) => {
    setActiveRecordId(recordId);
    if (!recordListRef.current) return;
    const targetCard = recordListRef.current.querySelector(
      `[data-detail-record-id="${recordId}"]`
    );
    if (targetCard) {
      targetCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  // ESC 키 닫기 이벤트 핸들러
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Chart.js 바 차트 렌더링
  useEffect(() => {
    if (!isOpen) return;

    const Chart = typeof window !== "undefined" ? window.Chart : null;
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    if (!Chart || !chartCanvasRef.current) return;

    const totals = (overview?.dailyTotals || []).map((item) => ({
      date: item.aggregationDate,
      seconds: Number(item.studySeconds) || 0
    }));

    const hasRecords = totals.some((item) => item.seconds > 0);
    if (!hasRecords) return;

    chartInstanceRef.current = new Chart(chartCanvasRef.current, {
      type: "bar",
      data: {
        labels: totals.map((item) => formatChartDate(item.date)),
        datasets: [
          {
            label: "학습 시간",
            data: totals.map((item) => Number((item.seconds / 3600).toFixed(2))),
            backgroundColor: totals.map((item) =>
              item.date === currentDate ? "#176044" : "#9ad9ba"
            ),
            hoverBackgroundColor: "#20b978",
            borderRadius: 5,
            maxBarThickness: 28
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        resizeDelay: 100,
        onClick: (_event, activeElements) => {
          const selected = activeElements[0];
          if (!selected) return;
          const clickedDate = totals[selected.index].date;
          handleSelectDate(clickedDate);
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => formatDateLabel(totals[items[0].dataIndex].date),
              label: (context) => ` ${formatDuration(totals[context.dataIndex].seconds)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              autoSkip: true,
              color: "#66736c",
              maxRotation: 0,
              maxTicksLimit: currentPeriod === 30 ? 10 : 7
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: "#edf2ee" },
            ticks: {
              color: "#66736c",
              callback: (val) => `${val}h`
            }
          }
        }
      }
    });

    return () => {
      chartInstanceRef.current?.destroy();
      chartInstanceRef.current = null;
    };
  }, [isOpen, overview, currentDate, currentPeriod]);

  if (!isOpen) return null;

  const totals = (overview?.dailyTotals || []).map((item) => ({
    date: item.aggregationDate,
    seconds: Number(item.studySeconds) || 0
  }));

  const totalStudySeconds = Math.max(0, Number(overview?.totalStudySeconds) || 0);
  const averageDailyStudySeconds = Math.max(0, Number(overview?.averageDailyStudySeconds) || 0);
  const activeStudyDays = Number(overview?.activeStudyDays) || 0;
  const recordCount = Number(overview?.recordCount) || 0;

  const isLoading = loadingOverview || loadingRecords;
  const isPreviousDisabled = currentDate <= fromDate;
  const isNextDisabled = currentDate >= toDate;

  return (
    <div
      className="manager-dialog-backdrop"
      data-study-detail-dialog
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <section
        ref={modalRef}
        className="manager-dialog study-detail-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="study-detail-title"
      >
        {/* 헤더 */}
        <header className="study-detail-header">
          <div>
            <span className="study-detail-eyebrow">개인 공부 통계</span>
            <h2 id="study-detail-title">
              <span data-detail-name>{memberName}</span> 님의 공부 기록
            </h2>
          </div>
          <button
            type="button"
            className="study-detail-close"
            data-detail-close
            aria-label="상세 보기 닫기"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        {/* 조회 기간 툴바 */}
        <section className="study-detail-toolbar" aria-label="개인 통계 조회 조건">
          <div className="study-detail-period-tabs" role="group" aria-label="조회 기간">
            <button
              type="button"
              className={currentPeriod === 7 ? "is-active" : ""}
              data-detail-period-days="7"
              aria-pressed={currentPeriod === 7}
              onClick={() => handlePeriodClick(7)}
            >
              최근 7일
            </button>
            <button
              type="button"
              className={currentPeriod === 30 ? "is-active" : ""}
              data-detail-period-days="30"
              aria-pressed={currentPeriod === 30}
              onClick={() => handlePeriodClick(30)}
            >
              최근 30일
            </button>
          </div>
          <p data-detail-period>{`최근 ${currentPeriod}일의 학습 기록입니다.`}</p>
        </section>

        {/* 상태 메시지 */}
        {(isLoading || error) && (
          <p className="study-detail-status" data-detail-status role="status" aria-live="polite">
            {isLoading ? "개인 공부 통계를 불러오는 중입니다." : error}
          </p>
        )}

        {/* KPI 요약 그리드 */}
        <section className="study-detail-kpi-grid" aria-label="개인 공부 통계 요약">
          <article>
            <span>기간 총 학습</span>
            <strong data-detail-total>{formatDuration(totalStudySeconds)}</strong>
          </article>
          <article>
            <span>학습일 평균</span>
            <strong data-detail-average>{formatDuration(averageDailyStudySeconds)}</strong>
          </article>
          <article>
            <span>학습한 날</span>
            <strong data-detail-active-days>{`${activeStudyDays}일`}</strong>
          </article>
          <article>
            <span>공부 세션</span>
            <strong data-detail-record-count>{`${recordCount}회`}</strong>
          </article>
        </section>

        {/* 개인 학습량 추이 차트 */}
        <section className="chart-card study-detail-chart-card" aria-labelledby="study-detail-chart-title">
          <div className="study-detail-section-heading">
            <div>
              <span>날짜별 통계</span>
              <h3 id="study-detail-chart-title">개인 학습량 추이</h3>
            </div>
            <small>막대를 선택하면 해당 날짜의 기록을 확인할 수 있습니다.</small>
          </div>
          <div className="study-detail-chart-container">
            <canvas
              id="memberStudyTrendChart"
              data-detail-trend-chart
              ref={chartCanvasRef}
              hidden={!hasRecordsInChart(totals)}
            />
            {(!hasRecordsInChart(totals) && !loadingOverview && !error) && (
              <p className="study-detail-chart-empty" data-detail-chart-empty>
                표시할 학습 기록이 없습니다.
              </p>
            )}
          </div>
        </section>

        {/* 선택 날짜 타임라인 & 세션 목록 */}
        <section className="study-detail-day-card" aria-labelledby="study-detail-day-title">
          <header className="study-detail-day-header">
            <div>
              <span>선택 날짜 타임라인</span>
              <h3 id="study-detail-day-title" data-detail-selected-date-label>
                {formatDateLabel(currentDate)}
              </h3>
            </div>
            <div className="study-detail-date-controls">
              <button
                type="button"
                className="secondary-button"
                data-detail-previous-date
                aria-label="이전 날짜"
                disabled={isPreviousDisabled}
                onClick={() => handleSelectDate(addDays(currentDate, -1))}
              >
                ‹
              </button>
              <label>
                <span className="visually-hidden">확인할 날짜</span>
                <input
                  type="date"
                  data-detail-date
                  value={currentDate || ""}
                  onChange={(e) => handleSelectDate(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="secondary-button"
                data-detail-next-date
                aria-label="다음 날짜"
                disabled={isNextDisabled}
                onClick={() => handleSelectDate(addDays(currentDate, 1))}
              >
                ›
              </button>
              <button
                type="button"
                className="secondary-button"
                data-detail-today
                onClick={() => handleSelectDate(today)}
              >
                오늘
              </button>
            </div>
          </header>

          <p className="study-detail-boundary-note">오전 4시부터 다음 날 오전 4시까지를 하루로 표시합니다.</p>

          {/* 24시간 타임라인 */}
          <div className="study-timeline" data-detail-timeline aria-label="선택 날짜의 24시간 공부 타임라인">
            <div className="study-timeline-axis" aria-hidden="true">
              <span style={{ left: 0 }}>04</span>
              <span style={{ left: "12.5%" }}>07</span>
              <span style={{ left: "25%" }}>10</span>
              <span style={{ left: "37.5%" }}>13</span>
              <span style={{ left: "50%" }}>16</span>
              <span style={{ left: "62.5%" }}>19</span>
              <span style={{ left: "75%" }}>22</span>
              <span style={{ left: "87.5%" }}>01</span>
              <span style={{ left: "100%" }}>04</span>
            </div>
            <div className="study-timeline-track" data-detail-timeline-track>
              {records.map((record) => {
                const position = calculateTimelinePosition(record, currentDate);
                const label = `${formatKstTime(record.startTime)}부터 ${formatKstTime(record.endTime)}, ${formatDuration(record.studySeconds)}`;
                const isSelected = String(record.id) === String(activeRecordId);
                return (
                  <button
                    key={record.id}
                    type="button"
                    className={`study-timeline-bar ${isSelected ? "is-active" : ""}`}
                    data-timeline-record={record.id}
                    style={{
                      left: `${position.left.toFixed(4)}%`,
                      width: `${position.width.toFixed(4)}%`
                    }}
                    aria-label={label}
                    title={label}
                    onClick={() => handleTimelineBarClick(record.id)}
                  >
                    <span data-detail-timeline-duration>
                      {formatTimelineDuration(record.studySeconds)}
                    </span>
                  </button>
                );
              })}
            </div>
            {records.length === 0 && (
              <p className="study-timeline-empty" data-detail-timeline-empty>
                이 날짜에는 공부 기록이 없습니다.
              </p>
            )}
          </div>

          {/* 공부 상세 시간 세션 목록 */}
          <div className="study-detail-record-heading">
            <h4>공부 상세 시간</h4>
            <span data-detail-selected-count>{`${records.length}개 세션`}</span>
          </div>
          <div className="study-detail-record-list" data-study-detail-list ref={recordListRef}>
            {loadingRecords ? (
              <p className="study-detail-empty">날짜별 기록을 불러오는 중입니다.</p>
            ) : records.length === 0 ? (
              <p className="study-detail-empty">선택한 날짜에는 공부 기록이 없습니다.</p>
            ) : (
              records.map((record, index) => {
                const isSelected = String(record.id) === String(activeRecordId);
                return (
                  <article
                    key={record.id}
                    className={`study-detail-record ${isSelected ? "is-active" : ""}`}
                    data-detail-record-id={record.id}
                  >
                    <span className="study-detail-record-index" data-detail-record-index>
                      {index + 1}
                    </span>
                    <div>
                      <strong data-detail-record-range>
                        {`${formatKstTime(record.startTime)} ~ ${formatKstTime(record.endTime)}`}
                      </strong>
                      <small>실제 공부 구간</small>
                    </div>
                    <div>
                      <strong data-detail-record-duration>
                        {formatDuration(record.studySeconds)}
                      </strong>
                      <small>인정 학습 시간</small>
                    </div>
                    <div>
                      <strong data-detail-record-updated-at>
                        {formatKstDateTime(record.updatedAt)}
                      </strong>
                      <small>최종 수정</small>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* 푸터 */}
        <footer className="study-detail-footer">
          <button type="button" data-detail-close onClick={onClose}>
            닫기
          </button>
        </footer>
      </section>
    </div>
  );
}

function hasRecordsInChart(totals) {
  return totals.some((item) => item.seconds > 0);
}

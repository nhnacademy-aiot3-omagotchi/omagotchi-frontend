import React, { useEffect, useMemo, useRef, useState } from "react";
import { StudyStatsStudentList, formatDuration } from "./StudyStatsStudentList.jsx";

const DEFAULT_BOUNDARY_NOTE = "Asia/Seoul 오전 4시를 하루의 시작으로 집계합니다.";

const BUCKET_LABELS = {
  NO_RECORD: "기록 없음",
  UNDER_ONE_HOUR: "1시간 미만",
  ONE_TO_TWO_HOURS: "1~2시간",
  TWO_TO_FOUR_HOURS: "2~4시간",
  FOUR_HOURS_OR_MORE: "4시간 이상"
};

export function StudyStatsWorkspace({
  todayStats,
  trendStats,
  membersStats,
  memberProfiles = [],
  loading = false,
  error = null,
  period = 7,
  onPeriodChange,
  onSelectMember,
  embedded = false
}) {
  const [search, setSearch] = useState("");

  const trendCanvasRef = useRef(null);
  const topCanvasRef = useRef(null);
  const distributionCanvasRef = useRef(null);

  const trendChartInstanceRef = useRef(null);
  const topChartInstanceRef = useRef(null);
  const distributionChartInstanceRef = useRef(null);

  // 기간 변경 핸들러
  const handlePeriodChange = (e) => {
    const nextPeriod = Number(e.target.value);
    onPeriodChange?.(nextPeriod);
  };

  // 프로필 매핑된 멤버 리스트
  const membersWithProfiles = useMemo(() => {
    if (!membersStats?.items) return [];
    const profileByUserId = new Map(
      memberProfiles.map((m) => [String(m.userId ?? m.id), m])
    );
    const profileByMembershipId = new Map(
      memberProfiles
        .filter((m) => m.cohortMembershipId ?? m.membershipId)
        .map((m) => [String(m.cohortMembershipId ?? m.membershipId), m])
    );

    return membersStats.items.map((stat) => {
      const profile = profileByUserId.get(String(stat.userId))
        || profileByMembershipId.get(String(stat.cohortMembershipId));
      const name = stat.nickname
        || profile?.nickname
        || profile?.name
        || `수강생-${String(stat.userId || stat.cohortMembershipId).slice(0, 8)}`;
      return {
        ...stat,
        name,
        email: profile?.email || "-"
      };
    });
  }, [membersStats, memberProfiles]);

  // 차트 렌더링
  useEffect(() => {
    const Chart = typeof window !== "undefined" ? window.Chart : null;
    if (!Chart) return;

    // 1. 기수 학습량 추이 차트 (Line)
    if (trendChartInstanceRef.current) {
      trendChartInstanceRef.current.destroy();
      trendChartInstanceRef.current = null;
    }

    const dailyTotals = trendStats?.dailyTotals || [];
    if (trendCanvasRef.current && dailyTotals.length > 0) {
      trendChartInstanceRef.current = new Chart(trendCanvasRef.current, {
        type: "line",
        data: {
          labels: dailyTotals.map((item) => String(item.aggregationDate).slice(5).replace("-", "/")),
          datasets: [{
            label: "학습량 (시간)",
            data: dailyTotals.map((item) => Number(((Number(item.studySeconds) || 0) / 3600).toFixed(2))),
            borderColor: "#2b5c43",
            backgroundColor: "rgba(43, 92, 67, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          resizeDelay: 100,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              ticks: {
                autoSkip: true,
                maxRotation: 0,
                maxTicksLimit: period === 30 ? 8 : 7
              }
            },
            y: { beginAtZero: true }
          }
        }
      });
    }

    // 2. 학습량 Top 5 차트 (Bar)
    if (topChartInstanceRef.current) {
      topChartInstanceRef.current.destroy();
      topChartInstanceRef.current = null;
    }

    const topMembers = membersWithProfiles
      .filter((m) => m.periodStudySeconds > 0)
      .sort((a, b) => b.periodStudySeconds - a.periodStudySeconds)
      .slice(0, 5);

    if (topCanvasRef.current) {
      topChartInstanceRef.current = new Chart(topCanvasRef.current, {
        type: "bar",
        data: {
          labels: topMembers.length ? topMembers.map((m) => m.name) : ["기록 없음"],
          datasets: [{
            label: "조회 기간 학습 (시간)",
            data: topMembers.length ? topMembers.map((m) => Number(((Number(m.periodStudySeconds) || 0) / 3600).toFixed(2))) : [0],
            backgroundColor: "#529b74",
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          resizeDelay: 100,
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true },
            y: { ticks: { autoSkip: false } }
          }
        }
      });
    }

    // 3. 오늘 학습 시간 분포 (Doughnut)
    if (distributionChartInstanceRef.current) {
      distributionChartInstanceRef.current.destroy();
      distributionChartInstanceRef.current = null;
    }

    if (distributionCanvasRef.current && todayStats?.durationBuckets) {
      distributionChartInstanceRef.current = new Chart(distributionCanvasRef.current, {
        type: "doughnut",
        data: {
          labels: todayStats.durationBuckets.map((b) => BUCKET_LABELS[b.code] || b.code),
          datasets: [{
            data: todayStats.durationBuckets.map((b) => Number(b.memberCount) || 0),
            backgroundColor: ["#d7e4dc", "#c2e3d3", "#8ecbb0", "#529b74", "#2b5c43"],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          resizeDelay: 100,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                boxWidth: 10,
                padding: 12,
                usePointStyle: true
              }
            }
          }
        }
      });
    }

    return () => {
      trendChartInstanceRef.current?.destroy();
      topChartInstanceRef.current?.destroy();
      distributionChartInstanceRef.current?.destroy();
    };
  }, [trendStats, todayStats, membersWithProfiles, period]);

  const activeStudentCount = Number(todayStats?.activeStudentCount) || 0;
  const participantCount = Number(todayStats?.participantCount) || 0;
  const participationRate = activeStudentCount
    ? Math.round((participantCount * 100) / activeStudentCount)
    : 0;

  const content = (
    <>
      <div className="panel-heading study-statistics-heading">
        <div>
          <span>공부 통계</span>
          <h2>수강생 공부 기록</h2>
        </div>
        <div className="study-statistics-controls">
          <label className="date-field">
            <span>조회 기간</span>
            <select data-studystats-period value={period} onChange={handlePeriodChange}>
              <option value="7">최근 7일</option>
              <option value="30">최근 30일</option>
            </select>
          </label>
          <label className="search-field">
            <span>검색</span>
            <input
              type="search"
              data-studystats-search
              placeholder="이름 또는 이메일"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
      </div>
      <p className="study-boundary-note" data-study-boundary-note>
        {DEFAULT_BOUNDARY_NOTE}
      </p>

      {/* KPI 카드 그리드 */}
      <div className="stats-kpi-grid" aria-label="공부 통계 요약">
        <article className="kpi-card">
          <span>오늘 기수 총 학습</span>
          <strong data-kpi-total-time>{formatDuration(todayStats?.totalStudySeconds)}</strong>
        </article>
        <article className="kpi-card">
          <span>오늘 참여</span>
          <strong data-kpi-participation>{`${participantCount} / ${activeStudentCount}명 (${participationRate}%)`}</strong>
        </article>
        <article className="kpi-card">
          <span>참여자 평균 학습</span>
          <strong data-kpi-avg-time>{formatDuration(todayStats?.averageParticipantStudySeconds)}</strong>
        </article>
        <article className="kpi-card">
          <span>공부 중인 학생</span>
          <strong data-kpi-running-timer>{`${Number(todayStats?.runningTimerCount) || 0}명`}</strong>
        </article>
      </div>

      {/* 차트 그리드 */}
      <div className="stats-chart-grid">
        <div className="chart-card wide-chart">
          <h3 data-trend-chart-title>{`최근 ${period}일 기수 학습량 추이`}</h3>
          <div className="chart-container">
            <canvas id="trendChart" ref={trendCanvasRef} />
          </div>
        </div>
        <div className="chart-card">
          <h3 data-top-chart-title>{`최근 ${period}일 학습량 Top 5`}</h3>
          <div className="chart-container">
            <canvas id="topStudentsChart" ref={topCanvasRef} />
          </div>
        </div>
        <div className="chart-card">
          <h3>오늘 학습 시간 분포</h3>
          <div className="chart-container">
            <canvas id="durationDistributionChart" ref={distributionCanvasRef} />
          </div>
        </div>
      </div>

      {/* 수강생 테이블 및 페이지네이션 */}
      <StudyStatsStudentList
        members={membersWithProfiles}
        loading={loading}
        error={error}
        search={search}
        onSelectMember={onSelectMember}
      />
    </>
  );

  if (embedded) return content;

  return (
    <section className="dashboard-panel is-active" data-dashboard-panel="studyStats">
      {content}
    </section>
  );
}

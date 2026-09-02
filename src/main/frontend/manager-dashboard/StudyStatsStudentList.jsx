import React, { useEffect, useMemo, useState } from "react";
import "../../resources/static/css/managerDashboard.css";

const DEFAULT_PAGE_SIZE = 5;

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

export function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

export function StudyStatsStudentList({
  members = [],
  loading = false,
  error = null,
  search = "",
  pageSize = DEFAULT_PAGE_SIZE,
  initialSort = { key: "period", dir: "desc" },
  onSelectMember
}) {
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState(initialSort);

  // 검색어가 바뀌면 페이지를 첫 페이지로 리셋
  useEffect(() => {
    setPage(0);
  }, [search]);

  // 검색 및 정렬된 목록 계산
  const filteredAndSortedMembers = useMemo(() => {
    const query = (search || "").trim().toLowerCase();
    const direction = sort.dir === "desc" ? -1 : 1;

    const selectors = {
      name: (m) => (m.name || "").toLocaleLowerCase("ko-KR"),
      today: (m) => Number(m.todayStudySeconds) || 0,
      period: (m) => Number(m.periodStudySeconds) || 0,
      days: (m) => Number(m.activeStudyDays) || 0,
      last: (m) => m.lastStudiedAt || ""
    };
    const selector = selectors[sort.key] || selectors.period;

    return members
      .filter((m) => {
        if (!query) return true;
        const nameMatch = (m.name || "").toLowerCase().includes(query);
        const emailMatch = (m.email || "").toLowerCase().includes(query);
        return nameMatch || emailMatch;
      })
      .sort((left, right) => {
        const a = selector(left);
        const b = selector(right);
        if (typeof a === "string") return a.localeCompare(b, "ko-KR") * direction;
        return (a - b) * direction;
      });
  }, [members, search, sort]);

  // 페이지네이션
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedMembers.length / pageSize));
  const currentPageMembers = filteredAndSortedMembers.slice(
    page * pageSize,
    (page + 1) * pageSize
  );

  // 정렬 핸들러
  const handleSort = (key) => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: "desc" };
    });
    setPage(0);
  };

  return (
    <>
      {/* 수강생 테이블 */}
      <div className="table-wrap">
        <table>
          <colgroup>
            <col style={{ width: "14%" }} />
            <col style={{ width: "23%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>
          <thead>
            <tr>
              <th
                className="sortable"
                data-sort="name"
                data-dir={sort.key === "name" ? sort.dir : undefined}
                onClick={() => handleSort("name")}
              >
                구성원
              </th>
              <th>이메일</th>
              <th
                className="sortable"
                data-sort="today"
                data-dir={sort.key === "today" ? sort.dir : undefined}
                onClick={() => handleSort("today")}
              >
                오늘 학습
              </th>
              <th
                className="sortable"
                data-sort="period"
                data-dir={sort.key === "period" ? sort.dir : undefined}
                onClick={() => handleSort("period")}
              >
                조회 기간 누적
              </th>
              <th
                className="sortable"
                data-sort="days"
                data-dir={sort.key === "days" ? sort.dir : undefined}
                onClick={() => handleSort("days")}
              >
                학습일
              </th>
              <th
                className="sortable"
                data-sort="last"
                data-dir={sort.key === "last" ? sort.dir : undefined}
                onClick={() => handleSort("last")}
              >
                최근 기록
              </th>
              <th>기록 확인</th>
            </tr>
          </thead>
          <tbody data-studystats-list>
            {loading ? (
              <tr>
                <td className="empty-row" colSpan={7}>
                  공부 통계를 불러오는 중입니다.
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td className="empty-row" colSpan={7}>
                  공부 통계를 불러오지 못했습니다.
                </td>
              </tr>
            ) : currentPageMembers.length === 0 ? (
              <tr>
                <td className="empty-row" colSpan={7}>
                  조회된 수강생이 없습니다.
                </td>
              </tr>
            ) : (
              currentPageMembers.map((member) => {
                const membershipId = String(member.cohortMembershipId ?? "");
                return (
                  <tr key={membershipId || member.userId}>
                    <td>
                      <button
                        type="button"
                        className="study-member-link"
                        onClick={() => onSelectMember?.(member)}
                      >
                        <strong data-studystats-member-name>{member.name}</strong>
                        {member.isRunning && (
                          <span
                            className="study-running-light"
                            data-studystats-running
                            title="공부 중"
                            aria-label="공부 중"
                          />
                        )}
                      </button>
                    </td>
                    <td>
                      <small data-studystats-member-email>{member.email}</small>
                    </td>
                    <td data-studystats-today>{formatDuration(member.todayStudySeconds)}</td>
                    <td data-studystats-period-total>{formatDuration(member.periodStudySeconds)}</td>
                    <td data-studystats-active-days>{`${Number(member.activeStudyDays) || 0}일`}</td>
                    <td data-studystats-last-studied>{formatDateTime(member.lastStudiedAt)}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => onSelectMember?.(member)}
                        >
                          상세 보기
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="pagination-wrap">
          <div className="page-numbers" data-page-numbers aria-label="공부 통계 페이지">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                type="button"
                className={`page-btn ${i === page ? "is-active" : ""}`}
                data-go-page={i}
                onClick={() => setPage(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

import { escapeHtml } from "../home/utils.js";

/**
 * 실습실 탭 화면.
 *
 * spaceRoom.js 는 상태를 들고 있고, 이 모듈은 그 상태를 받아 마크업만 만든다.
 * 렌더링을 분리해 두면 Storybook 이 서버 없이 같은 화면을 그릴 수 있다.
 * (js/home/rankingBoard.js 와 같은 방식)
 */

/** 한 페이지에 보여 주는 실습실 수. 2열 × 2행 한 판. */
export const LAB_PAGE_SIZE = 4;

/**
 * 실내 환경 카드에 쓰는 측정 항목.
 *
 * 좋다·나쁘다는 붙이지 않는다. 기수마다 다른 임계값 룰(learning-service threshold-rules)이
 * 판정의 근거인데 그 값을 학생 화면에 내려주는 계약이 아직 없다. 근거 없는 등급을 화면이
 * 지어내는 대신 측정값과 측정 시각만 보여 준다.
 */
const ENVIRONMENT_METRICS = [
    {
        key: "co2",
        label: "CO₂",
        unit: "ppm",
        format: (value) => String(Math.round(value))
    },
    {
        key: "temperature",
        label: "온도",
        unit: "℃",
        format: (value) => value.toFixed(1)
    },
    {
        key: "humidity",
        label: "습도",
        unit: "%",
        format: (value) => String(Math.round(value))
    }
];

/**
 * 측정값 하나를 숫자로 읽는다.
 *
 * Number(null) 은 0이라 서버가 "값 없음"으로 내려준 항목이 0ppm·주의로 보인다.
 * 값이 아닌 것은 전부 NaN 으로 눕혀 측정 대기로 흐르게 한다.
 */
function toMetricNumber(value) {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : Number.NaN;
    }
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : Number.NaN;
    }
    return Number.NaN;
}

function sameId(left, right) {
    return left !== undefined && left !== null && right !== undefined && right !== null
        && String(left) === String(right);
}

export function getLabReservedCount(lab) {
    if (lab?.reservedCount == null) {
        return null;
    }
    const reservedCount = Number(lab.reservedCount);
    return Number.isInteger(reservedCount) && reservedCount >= 0
        ? reservedCount
        : null;
}

export function isLabFull(lab) {
    const reservedCount = getLabReservedCount(lab);
    return reservedCount != null && reservedCount >= lab.capacity;
}

export function getLabPageCount(labCount) {
    return Math.max(1, Math.ceil(Math.max(0, Number(labCount) || 0) / LAB_PAGE_SIZE));
}

export function clampLabPage(page, pageCount) {
    const safePage = Number.isFinite(Number(page)) ? Math.trunc(Number(page)) : 0;
    return Math.min(Math.max(0, safePage), Math.max(0, pageCount - 1));
}

/** 측정 시각은 "몇 시 값인지"만 알면 된다. 날짜까지 붙이면 카드가 시끄러워진다. */
export function formatMeasuredAt(value) {
    if (!value) {
        return "";
    }
    const measured = new Date(value);
    if (Number.isNaN(measured.getTime())) {
        return "";
    }
    const hours = String(measured.getHours()).padStart(2, "0");
    const minutes = String(measured.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes} 기준`;
}

function renderEnvironment(sensor = {}) {
    const values = ENVIRONMENT_METRICS.map((metric) => ({
        metric,
        value: toMetricNumber(sensor?.[metric.key])
    }));
    const measured = values.some((item) => Number.isFinite(item.value));
    // 값이 없는 이유를 구분해 말한다. 센서가 없는 공간에 "측정 대기"라고 하면
    // 곧 값이 올 것처럼 읽히는데, 설치 전에는 영영 오지 않는다.
    // deviceCount 를 주지 않는 하류(예전 버전)면 이유를 모르므로 측정 대기로 둔다.
    const caption = measured
        ? formatMeasuredAt(sensor?.measuredAt)
        : (sensor?.deviceCount === 0 ? "센서 없음" : "측정 대기");

    const metrics = values.map(({ metric, value }) => {
        const known = Number.isFinite(value);
        return `
            <article class="space-room-lab-metric">
                <span class="space-room-lab-metric__label">${metric.label}</span>
                <strong class="space-room-lab-metric__value">
                    ${known ? escapeHtml(metric.format(value)) : "—"}
                    <small>${known ? metric.unit : ""}</small>
                </strong>
            </article>
        `;
    }).join("");

    return `
        <section class="space-room-lab-environment">
            <header class="space-room-lab-environment__head">
                <h5>실내 환경</h5>
                ${caption
                    ? `<span class="space-room-lab-environment__time">${escapeHtml(caption)}</span>`
                    : ""}
            </header>
            <div class="space-room-lab-metrics">
                ${metrics}
            </div>
        </section>
    `;
}

function renderLabCard(lab, context) {
    const active = lab.operationalStatus === "ACTIVE";
    const current = sameId(lab.spaceId, context.currentSpaceId);
    const reservedCount = getLabReservedCount(lab);
    const full = isLabFull(lab);
    const selectable = active && context.checkedIn && !context.inMeeting && !current && !full;
    const selectionStatus = active
        ? current
            ? "현재 이용 중"
            : full
                ? "정원 마감"
                : context.inMeeting
                    ? "회의 종료 후 선택 가능"
                    : (context.checkedIn ? "선택 가능" : "체크인 후 선택 가능")
        : "선택 불가";
    const capacityDetail = reservedCount != null
        ? `${reservedCount} / ${lab.capacity}명`
        : `정원 ${lab.capacity}명`;

    return `
        <article class="space-room-lab-stage${active ? "" : " is-inactive"}${current ? " is-current" : ""}" role="listitem">
            <header class="space-room-lab-stage__head">
                <div class="space-room-lab-stage__identity">
                    <span class="space-room-status ${active ? "is-active" : "is-inactive"}">
                        ${active ? "운영 중" : "운영 중지"}
                    </span>
                    <strong>${escapeHtml(lab.name)}</strong>
                    ${lab.inactiveReason
                        ? `<small>${escapeHtml(lab.inactiveReason)}</small>`
                        : ""}
                </div>
                <div class="space-room-lab-stage__meta">
                    <strong>${escapeHtml(capacityDetail)}</strong>
                    <span class="${full ? "is-full" : selectable ? "is-selectable" : ""}">
                        ${selectionStatus}
                    </span>
                </div>
            </header>
            ${renderEnvironment(lab.sensor)}
            <footer class="space-room-lab-stage__actions">
                <button type="button" data-space-lab-move="${escapeHtml(lab.spaceId)}"${selectable ? "" : " disabled"}>
                    ${current ? "현재 이용 중" : full ? "정원 마감" : "이 실습실로 이동"}
                </button>
            </footer>
        </article>
    `;
}

function renderPager(page, pageCount) {
    if (pageCount <= 1) {
        return "";
    }

    const dots = Array.from({ length: pageCount }, (unused, index) => `
        <button
            type="button"
            class="${index === page ? "is-active" : ""}"
            data-space-lab-page="${index}"
            aria-label="${index + 1}페이지 보기"
            aria-current="${index === page ? "page" : "false"}"
        ></button>
    `).join("");

    return `
        <footer class="space-room-lab-pager">
            <div class="space-room-lab-pager__dots">${dots}</div>
            <span class="space-room-lab-pager__count">${page + 1} / ${pageCount}</span>
        </footer>
    `;
}

function renderLabList(labs, page, context) {
    const pageCount = getLabPageCount(labs.length);
    const safePage = clampLabPage(page, pageCount);
    const visibleLabs = labs.slice(safePage * LAB_PAGE_SIZE, (safePage + 1) * LAB_PAGE_SIZE);
    const paged = pageCount > 1;

    return `
        <section class="space-room-lab-list" aria-labelledby="space-lab-list-title">
            <header>
                <h4 id="space-lab-list-title">실습실 목록</h4>
                <span>${labs.length}개</span>
            </header>
            <div class="space-room-lab-carousel${paged ? " is-paged" : ""}">
                ${paged ? `
                    <button
                        type="button"
                        class="space-room-lab-carousel__nav is-prev"
                        data-space-lab-page="prev"
                        aria-label="이전 실습실 보기"
                        ${safePage === 0 ? "disabled" : ""}
                    ><span aria-hidden="true">‹</span></button>
                ` : ""}
                <div class="space-room-lab-grid" role="list" aria-label="실습실 목록">
                    ${visibleLabs.map((lab) => renderLabCard(lab, context)).join("")}
                </div>
                ${paged ? `
                    <button
                        type="button"
                        class="space-room-lab-carousel__nav is-next"
                        data-space-lab-page="next"
                        aria-label="다음 실습실 보기"
                        ${safePage >= pageCount - 1 ? "disabled" : ""}
                    ><span aria-hidden="true">›</span></button>
                ` : ""}
            </div>
            ${renderPager(safePage, pageCount)}
        </section>
    `;
}

/**
 * 실습실 탭 전체를 그린다.
 *
 * @param {object} view
 * @param {Array} view.labs 내 기수에 배정된 실습실 목록
 * @param {number} view.page 현재 페이지(0부터)
 * @param {boolean} view.loading 공간 목록 조회 중 여부
 * @param {string} view.error 공간 목록 조회 실패 메시지
 * @param {boolean} view.hasCohort 승인된 기수 보유 여부
 * @param {boolean} view.checkedIn 오늘 출석 여부
 * @param {boolean} view.inMeeting 회의실 이용 중 여부
 * @param {string|number|null} view.currentSpaceId 현재 머무는 공간 id
 */
export function renderLabPanel({
    labs = [],
    page = 0,
    loading = false,
    error = "",
    hasCohort = true,
    checkedIn = false,
    inMeeting = false,
    currentSpaceId = null
} = {}) {
    if (loading) {
        return `
            <section class="space-room-lab" aria-labelledby="space-lab-title">
                <p class="space-room-empty-state" role="status">실습실 정보를 불러오는 중입니다.</p>
            </section>
        `;
    }

    if (error) {
        return `
            <section class="space-room-lab" aria-labelledby="space-lab-title">
                <div class="space-room-empty-state" role="alert">
                    <h3 id="space-lab-title">실습실 정보를 불러오지 못했습니다</h3>
                    <p>${escapeHtml(error)}</p>
                    <button type="button" data-space-retry>다시 시도</button>
                </div>
            </section>
        `;
    }

    const emptyTitle = hasCohort
        ? "배정된 실습실이 없습니다"
        : "참여 중인 기수가 없습니다";
    const emptyDescription = hasCohort
        ? "활성 기수에 LAB이 배정되면 이 영역에 표시됩니다."
        : "승인된 기수에 참여하면 배정된 실습실을 확인할 수 있습니다.";

    return `
        <section class="space-room-lab" aria-labelledby="space-lab-title">
            <header class="space-room-section-head">
                <div>
                    <span class="space-room-kicker">MY COHORT LAB</span>
                    <h3 id="space-lab-title">실습실</h3>
                </div>
                <span class="space-room-status ${labs.length ? "is-active" : ""}">
                    ${labs.length ? `${labs.length}곳 배정` : "미배정"}
                </span>
            </header>
            ${labs.length
                ? renderLabList(labs, page, { checkedIn, inMeeting, currentSpaceId })
                : `
                    <div class="space-room-empty-state">
                        <h4>${emptyTitle}</h4>
                        <p>${emptyDescription}</p>
                    </div>
                `}
        </section>
    `;
}

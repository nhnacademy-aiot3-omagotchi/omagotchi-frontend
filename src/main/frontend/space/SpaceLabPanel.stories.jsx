import React, { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { renderLabPanel } from "../../resources/static/js/space/labPanel.js";
import { escapeHtml } from "../../resources/static/js/home/utils.js";
import { HomeOverlay } from "../home-react/components/HomeOverlay.jsx";

/**
 * 공간 오버레이의 실습실 탭.
 *
 * 화면은 실제 운영 코드(js/space/labPanel.js)가 그대로 그린다.
 * 탭 줄과 현재 위치 줄은 spaceRoom.js 가 만드는 마크업을 그대로 옮긴 스토리용 껍데기다.
 * (한쪽만 고치면 스토리북과 운영 화면이 어긋나므로 spaceRoom.js 를 바꾸면 여기도 함께 본다.)
 */

const SPACE_META = {
    icon: "/images/app/door.png",
    title: "공간",
    description: "함께 공부할 공간을 선택하고 입장하세요."
};

const TABS = [
    ["lab", "실습실"],
    ["meeting", "회의실"],
    ["library", "도서관"]
];

const UNSELECTED_LOCATION = {
    state: "unselected",
    name: "실습실을 선택해 주세요.",
    detail: "출석은 완료됐지만 현재 위치가 선택되지 않았습니다."
};

const CHECKED_OUT_LOCATION = {
    state: "checked-out",
    name: "입실 전",
    detail: "오늘 체크인하면 이용할 공간을 선택할 수 있습니다."
};

// BFF(/bff/v1/spaces/environment) 응답과 같은 모양: 값과 측정 시각만 온다. 등급은 없다.
const MEASURED_AT = "2026-09-03T10:00:00Z";

const COHORT_LABS = [
    { spaceId: 1, name: "AIoT 실습실", capacity: 50, reservedCount: 4, operationalStatus: "ACTIVE", sensor: { co2: 612, temperature: 23.4, humidity: 48, measuredAt: MEASURED_AT } },
    { spaceId: 2, name: "로봇 실습실", capacity: 30, reservedCount: 12, operationalStatus: "ACTIVE", sensor: { co2: 728, temperature: 24.1, humidity: 52, measuredAt: MEASURED_AT } },
    { spaceId: 3, name: "데이터 실습실", capacity: 40, reservedCount: 18, operationalStatus: "ACTIVE", sensor: { co2: 845, temperature: 22.8, humidity: 46, measuredAt: MEASURED_AT } },
    { spaceId: 4, name: "네트워크 실습실", capacity: 24, reservedCount: 7, operationalStatus: "ACTIVE", sensor: { co2: 590, temperature: 23.7, humidity: 49, measuredAt: MEASURED_AT } },
    { spaceId: 5, name: "클라우드 실습실", capacity: 36, reservedCount: 21, operationalStatus: "ACTIVE", sensor: { co2: 962, temperature: 25.2, humidity: 58, measuredAt: MEASURED_AT } },
    { spaceId: 6, name: "보안 실습실", capacity: 20, reservedCount: 20, operationalStatus: "ACTIVE", sensor: { co2: 1180, temperature: 27.6, humidity: 63, measuredAt: MEASURED_AT } },
    { spaceId: 7, name: "임베디드 실습실", capacity: 28, reservedCount: 9, operationalStatus: "ACTIVE", sensor: { co2: 704, temperature: 23.1, humidity: 44, measuredAt: MEASURED_AT } },
    { spaceId: 8, name: "AI 실습실", capacity: 32, reservedCount: 0, operationalStatus: "INACTIVE", inactiveReason: "설비 점검으로 이번 주 휴실", sensor: {} }
];

function renderTabs(activeTab) {
    return `
        <nav class="space-room-tabs" aria-label="공간 종류">
            ${TABS.map(([key, label]) => `
                <button
                    class="${activeTab === key ? "is-active" : ""}"
                    type="button"
                    role="tab"
                    data-space-tab="${key}"
                    aria-selected="${activeTab === key}"
                    aria-pressed="${activeTab === key}"
                >${label}</button>
            `).join("")}
        </nav>
    `;
}

function renderCurrentLocation(location) {
    return `
        <aside class="space-room-current-location" data-location-state="${location.state}" aria-live="polite">
            <span>현재 내 위치</span>
            <div>
                <strong>${escapeHtml(location.name)}</strong>
                <small>${escapeHtml(location.detail)}</small>
            </div>
        </aside>
    `;
}

function SpaceLabPanel({
    labs = COHORT_LABS,
    checkedIn = true,
    inMeeting = false,
    hasCohort = true,
    loading = false,
    error = "",
    location = UNSELECTED_LOCATION,
    currentSpaceId = null
}) {
    const [page, setPage] = useState(0);
    const [activeTab, setActiveTab] = useState("lab");
    const [presentSpaceId, setPresentSpaceId] = useState(currentSpaceId);

    const labPanel = renderLabPanel({
        labs,
        page,
        loading,
        error,
        hasCohort,
        checkedIn,
        inMeeting,
        currentSpaceId: presentSpaceId
    });

    const otherTab = `
        <section class="space-room-lab">
            <div class="space-room-empty-state">
                <h4>이 스토리는 실습실 탭만 다룹니다</h4>
                <p>회의실·도서관 화면은 공간 오버레이의 다른 스토리에서 확인합니다.</p>
            </div>
        </section>
    `;

    const content = `
        <div class="space-room-app" data-space-room-app>
            <div class="space-room-app-inner">
                ${renderTabs(activeTab)}
                ${renderCurrentLocation(location)}
                <div class="space-room-content">
                    ${activeTab === "lab" ? labPanel : otherTab}
                </div>
            </div>
        </div>
    `;

    // 실제 화면에서는 spaceRoom.js 의 클릭 위임이 하는 일을 스토리에서 대신한다.
    // 서버 없이도 페이지 넘기기·탭 전환·이동 버튼이 실제와 같은 순서로 반응한다.
    function handleClick(event) {
        const pageButton = event.target.closest("[data-space-lab-page]");
        if (pageButton) {
            const target = pageButton.dataset.spaceLabPage;
            setPage((current) => (
                target === "prev" ? current - 1
                    : target === "next" ? current + 1
                        : Number(target)
            ));
            return;
        }

        const tabButton = event.target.closest("[data-space-tab]");
        if (tabButton) {
            setActiveTab(tabButton.dataset.spaceTab);
            return;
        }

        const moveButton = event.target.closest("[data-space-lab-move]");
        if (moveButton) {
            setPresentSpaceId(moveButton.dataset.spaceLabMove);
        }
    }

    return (
        <div onClick={handleClick}>
            <HomeOverlay type="space" meta={SPACE_META} content={content} />
        </div>
    );
}

const meta = {
    title: "Space/실습실 탭",
    component: SpaceLabPanel,
    parameters: { layout: "fullscreen" },
    argTypes: {
        checkedIn: { control: "boolean" },
        inMeeting: { control: "boolean" },
        hasCohort: { control: "boolean" },
        loading: { control: "boolean" },
        error: { control: "text" }
    }
};

export default meta;

export const Default = {
    name: "기수 실습실 8곳 · 2페이지",
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // 한 판은 카드 네 장이다. 5번째 실습실은 다음 페이지로 넘겨야 보인다.
        expect(canvas.getByRole("heading", { name: "실습실 목록" })).toBeInTheDocument();
        expect(canvas.getByText("8개")).toBeInTheDocument();
        expect(canvas.getByText("8곳 배정")).toBeInTheDocument();
        expect(canvas.getByText("AIoT 실습실")).toBeInTheDocument();
        expect(canvas.queryByText("클라우드 실습실")).not.toBeInTheDocument();
        expect(canvas.getByText("1 / 2")).toBeInTheDocument();
        expect(canvas.getByRole("button", { name: "이전 실습실 보기" })).toBeDisabled();

        // 측정값에는 등급을 붙이지 않는다. 언제 잰 값인지만 덧붙는다.
        expect(canvas.getByText("612")).toBeInTheDocument();
        expect(canvas.queryByText("쾌적")).not.toBeInTheDocument();
        expect(canvas.queryByText("보통")).not.toBeInTheDocument();
        expect(canvas.getAllByText(/\d{2}:\d{2} 기준/)).toHaveLength(4);

        await userEvent.click(canvas.getByRole("button", { name: "다음 실습실 보기" }));
        expect(canvas.getByText("2 / 2")).toBeInTheDocument();
        expect(canvas.getByText("클라우드 실습실")).toBeInTheDocument();
        expect(canvas.queryByText("AIoT 실습실")).not.toBeInTheDocument();
        expect(canvas.getByRole("button", { name: "다음 실습실 보기" })).toBeDisabled();

        // 정원이 찬 실습실과 운영이 멈춘 실습실은 이동 버튼이 열리지 않는다.
        // "정원 마감"은 우측 상단 상태와 버튼 두 곳에 같이 나온다.
        expect(canvas.getAllByText("정원 마감")).toHaveLength(2);
        expect(canvas.getByText("운영 중지")).toBeInTheDocument();
        expect(canvas.getByText("설비 점검으로 이번 주 휴실")).toBeInTheDocument();

        await userEvent.click(canvas.getByRole("button", { name: "이전 실습실 보기" }));
        expect(canvas.getByText("1 / 2")).toBeInTheDocument();
        expect(canvas.getByText("AIoT 실습실")).toBeInTheDocument();
    }
};

export const MoveToLab = {
    name: "이동 버튼 · 현재 이용 중으로 전환",
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // 이동을 누른 카드는 "현재 이용 중"으로 잠기고 버튼도 함께 닫힌다.
        const moveButtons = canvas.getAllByRole("button", { name: "이 실습실로 이동" });
        await userEvent.click(moveButtons[0]);

        expect(canvas.getAllByText("현재 이용 중")).toHaveLength(2);
        expect(canvas.getAllByRole("button", { name: "이 실습실로 이동" })).toHaveLength(3);
    }
};

export const SinglePage = {
    name: "실습실 3곳 · 넘기기 없음",
    args: { labs: COHORT_LABS.slice(0, 3) },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.queryByRole("button", { name: "다음 실습실 보기" })).not.toBeInTheDocument();
        expect(canvas.queryByText("1 / 1")).not.toBeInTheDocument();
    }
};

export const BeforeCheckIn = {
    name: "체크인 전 · 선택 잠김",
    args: { checkedIn: false, location: CHECKED_OUT_LOCATION },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getAllByText("체크인 후 선택 가능")).toHaveLength(4);
        canvas.getAllByRole("button", { name: "이 실습실로 이동" })
            .forEach((button) => expect(button).toBeDisabled());
    }
};

export const InMeeting = {
    name: "회의 중 · 회의 종료 후 선택",
    args: { inMeeting: true }
};

export const SensorPending = {
    name: "센서는 있는데 값 없음 · 측정 대기",
    args: {
        labs: COHORT_LABS.slice(0, 4).map((lab) => ({ ...lab, sensor: { deviceCount: 2 } }))
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        // 카드마다 한 번씩만 알린다
        expect(canvas.getAllByText("측정 대기")).toHaveLength(4);
    }
};

export const NoSensorInstalled = {
    name: "센서 미설치 · 센서 없음",
    args: {
        labs: COHORT_LABS.slice(0, 4).map((lab) => ({ ...lab, sensor: { deviceCount: 0 } }))
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        // 설치 전인 공간에 "측정 대기"라고 하면 곧 값이 올 것처럼 읽힌다
        expect(canvas.getAllByText("센서 없음")).toHaveLength(4);
        expect(canvas.queryByText("측정 대기")).not.toBeInTheDocument();
    }
};

export const PartialSensor = {
    name: "일부 항목만 측정됨",
    args: {
        // BFF(/bff/v1/spaces/environment)는 값이 없는 항목을 null 로 내려준다.
        labs: [
            { ...COHORT_LABS[0], sensor: { co2: 845, temperature: null, humidity: 46, measuredAt: MEASURED_AT } },
            { ...COHORT_LABS[1], sensor: { co2: null, temperature: 24.1, humidity: null, measuredAt: MEASURED_AT } }
        ]
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        // null 을 0 으로 읽으면 "0 ppm" 이 된다. 빈 자리로 남아야 한다.
        expect(canvas.queryByText("0")).not.toBeInTheDocument();
        expect(canvas.getAllByText("—")).toHaveLength(3);
        expect(canvas.getByText("845")).toBeInTheDocument();
        expect(canvas.getByText("24.1")).toBeInTheDocument();
    }
};

export const Empty = {
    name: "배정된 실습실 없음",
    args: { labs: [] }
};

export const NoCohort = {
    name: "참여 중인 기수 없음",
    args: { labs: [], hasCohort: false }
};

export const LoadFailed = {
    name: "목록 조회 실패",
    args: { error: "공간 정보를 불러오지 못했습니다." }
};

export const Loading = {
    name: "목록 불러오는 중",
    args: { loading: true }
};

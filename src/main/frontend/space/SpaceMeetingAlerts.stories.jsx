import React, { useEffect, useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { HomeOverlay } from "../home-react/components/HomeOverlay.jsx";
import {
    renderTelegramControl,
    renderVacancyAlertList
} from "../../resources/static/js/space/vacancyAlertPanel.js";

const SPACE_META = {
    icon: "/images/app/door.png",
    title: "공간",
    description: "함께 공부할 공간을 선택하고 입장하세요."
};

const ROOMS = [
    { id: 301, name: "공용 회의실 A" },
    { id: 302, name: "프로젝트룸 B" }
];

const ALERTS = [
    { alertId: 91, spaceId: 301, cohortId: 11, createdAt: "2026-09-08T01:00:00Z" },
    { alertId: 92, spaceId: 302, cohortId: 11, createdAt: "2026-09-08T01:15:00Z" }
];

function renderMeetingBody() {
    return `
        <div class="space-room-master-detail">
            <section class="ui-space-list" aria-labelledby="storybook-room-list-title">
                <header><h3 id="storybook-room-list-title">회의실 목록</h3><span>2개</span></header>
                <div class="ui-space-list__grid" role="list" aria-label="회의실 목록">
                    <article class="ui-space-room-card is-occupied is-selected" role="listitem" aria-current="true">
                        <div><h4>공용 회의실 A</h4><p>8인실</p></div>
                        <span class="ui-menu-chip">사용 중</span>
                        <strong>4 / 8</strong>
                    </article>
                    <article class="ui-space-room-card is-occupied" role="listitem" aria-current="false">
                        <div><h4>프로젝트룸 B</h4><p>6인실</p></div>
                        <span class="ui-menu-chip">사용 중</span>
                        <strong>3 / 6</strong>
                    </article>
                </div>
            </section>
            <article class="space-room-detail is-occupied" aria-label="공용 회의실 A 상세">
                <header class="space-room-detail-head">
                    <div>
                        <span class="space-room-status is-occupied">사용 중</span>
                        <h3>공용 회의실 A</h3>
                        <p>8인실</p>
                    </div>
                    <div class="space-room-time"><span>남은 시간</span><strong>01:24:36</strong></div>
                </header>
                <section class="space-room-detail-environment" aria-label="공용 회의실 A 환경 정보">
                    <header class="space-room-environment-head"><h4>실내 환경</h4><span class="space-room-environment-time">10:20 기준</span></header>
                    <div class="space-room-detail-sensors">
                        <article class="space-room-sensor"><span>CO₂</span><strong>704<small>ppm</small></strong></article>
                        <article class="space-room-sensor"><span>온도</span><strong>23.1<small>℃</small></strong></article>
                        <article class="space-room-sensor"><span>습도</span><strong>44<small>%</small></strong></article>
                    </div>
                </section>
                <section class="space-room-private-state">
                    <h4>다른 기수에서 사용 중</h4>
                    <p>다른 기수의 참여자 정보는 표시하지 않습니다.</p>
                </section>
                <section class="space-room-alert-panel">
                    <div><h4>공실 알림</h4><p>방이 비면 알려드립니다. 알림은 예약이 아니며 사용은 선착순입니다.</p></div>
                    <button class="is-active" type="button" aria-pressed="true">공실 알림 취소</button>
                </section>
            </article>
        </div>
    `;
}

function renderContent({ telegramStatus, open, alerts, alertsLoading, alertsError }) {
    const control = renderTelegramControl({ status: telegramStatus, open });
    const alertPanel = telegramStatus === "enabled" && open
        ? renderVacancyAlertList({
            alerts,
            rooms: ROOMS,
            loading: alertsLoading,
            error: alertsError
        })
        : "";

    return `
        <div class="space-room-app" data-space-room-app>
            <div class="space-room-app-inner">
                <nav class="space-room-tabs" aria-label="공간 종류">
                    <button type="button" role="tab" aria-selected="false">실습실</button>
                    <button class="is-active" type="button" role="tab" aria-selected="true">회의실</button>
                    <button type="button" role="tab" aria-selected="false">도서관</button>
                </nav>
                <aside class="space-room-current-location" data-location-state="lab" aria-live="polite">
                    <span>현재 내 위치</span>
                    <div><strong>AIoT 실습실</strong><small>실습실 이용 중</small></div>
                </aside>
                <div class="space-room-content">
                    <section class="ui-space-meeting" aria-labelledby="storybook-meeting-title">
                        <header>
                            <div><span class="ui-menu-eyebrow">MEETING ROOMS</span><h3 id="storybook-meeting-title">회의실</h3></div>
                            <div class="ui-space-meeting__tools">${control}</div>
                        </header>
                        ${alertPanel}
                        <div class="ui-space-meeting__body">${renderMeetingBody()}</div>
                    </section>
                </div>
            </div>
        </div>
    `;
}

function SpaceMeetingAlerts({
    telegramStatus = "enabled",
    alerts = ALERTS,
    alertsLoading = false,
    alertsError = "",
    initiallyOpen = false
}) {
    const [open, setOpen] = useState(initiallyOpen);

    useEffect(() => {
        setOpen(initiallyOpen);
    }, [initiallyOpen, telegramStatus]);

    const content = renderContent({
        telegramStatus,
        open,
        alerts,
        alertsLoading,
        alertsError
    });

    function handleClick(event) {
        if (event.target.closest("[data-vacancy-alerts-toggle]")) {
            setOpen((current) => !current);
        }
    }

    return (
        <div onClick={handleClick}>
            <HomeOverlay type="space" meta={SPACE_META} content={content} />
        </div>
    );
}

const meta = {
    title: "Space/회의실 텔레그램 알림",
    component: SpaceMeetingAlerts,
    parameters: { layout: "fullscreen" },
    args: {
        telegramStatus: "enabled",
        alerts: ALERTS,
        alertsLoading: false,
        alertsError: "",
        initiallyOpen: false
    },
    argTypes: {
        telegramStatus: {
            control: "select",
            options: ["enabled", "disabled", "unlinked", "loading", "error"]
        },
        initiallyOpen: { control: "boolean" },
        alertsLoading: { control: "boolean" },
        alertsError: { control: "text" }
    }
};

export default meta;

export const LinkedWithApplications = {
    name: "연동됨 · 신청 2건",
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole("button", { name: "내 알림 신청 보기" }));

        const alertPanel = canvas.getByRole("region", { name: "내 공실 알림 신청" });
        expect(within(alertPanel).getByText("2건")).toBeInTheDocument();
        expect(within(alertPanel).getByText("공용 회의실 A")).toBeInTheDocument();
        expect(within(alertPanel).getByText("프로젝트룸 B")).toBeInTheDocument();
        expect(within(alertPanel).getAllByText("대기 중")).toHaveLength(2);
    }
};

export const LinkedWithoutApplications = {
    name: "연동됨 · 신청 없음",
    args: { alerts: [], initiallyOpen: true },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getByText("현재 대기 중인 공실 알림 신청이 없습니다.")).toBeInTheDocument();
    }
};

export const Unlinked = {
    name: "텔레그램 미연동",
    args: { telegramStatus: "unlinked" },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getByText("텔레그램 연동 안됨")).toBeInTheDocument();
        expect(canvas.queryByRole("button", { name: "내 알림 신청 보기" })).not.toBeInTheDocument();
    }
};

export const NotificationsDisabled = {
    name: "연동됨 · 알림 꺼짐",
    args: { telegramStatus: "disabled" },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getByText("텔레그램 알림 꺼짐")).toBeInTheDocument();
    }
};

export const AlertListLoading = {
    name: "신청 내역 불러오는 중",
    args: { initiallyOpen: true, alertsLoading: true }
};

export const AlertListFailed = {
    name: "신청 내역 조회 실패",
    args: {
        initiallyOpen: true,
        alertsError: "공실 알림 신청 내역을 불러오지 못했습니다."
    }
};

export const TelegramStatusFailed = {
    name: "텔레그램 상태 조회 실패",
    args: { telegramStatus: "error" }
};

export const Mobile = {
    name: "모바일 · 신청 내역 열림",
    args: { initiallyOpen: true },
    globals: { viewport: { value: "mobile1", isRotated: false } }
};

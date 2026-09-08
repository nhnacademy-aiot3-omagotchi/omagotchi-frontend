function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#039;");
}

function sameId(left, right) {
    return left !== undefined && left !== null && right !== undefined && right !== null
        && String(left) === String(right);
}

function formatCreatedAt(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "신청 시각 정보 없음";
    }
    return `${date.toLocaleDateString("ko-KR", {
        month: "numeric",
        day: "numeric"
    })} ${date.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit"
    })} 신청`;
}

export function renderTelegramControl({ status, open = false }) {
    if (status === "loading") {
        return '<span class="ui-space-telegram-status">텔레그램 연동 확인 중</span>';
    }
    if (status === "error") {
        return '<button class="ui-space-telegram-link" type="button" data-telegram-link-retry>텔레그램 상태 다시 확인</button>';
    }
    if (status === "enabled") {
        return `
            <button
                class="ui-space-telegram-link"
                type="button"
                data-vacancy-alerts-toggle
                aria-expanded="${open}"
                aria-controls="space-my-vacancy-alerts"
            >내 알림 신청 보기</button>
        `;
    }
    if (status === "disabled") {
        return '<span class="ui-space-telegram-status is-disabled">텔레그램 알림 꺼짐</span>';
    }
    return '<span class="ui-space-telegram-status is-unlinked">텔레그램 연동 안됨</span>';
}

export function renderVacancyAlertList({
    alerts = [],
    rooms = [],
    loading = false,
    error = ""
}) {
    let content;
    if (loading) {
        content = '<p class="space-room-vacancy-alerts__state" role="status">신청 내역을 불러오는 중입니다.</p>';
    } else if (error) {
        content = `
            <div class="space-room-vacancy-alerts__state" role="alert">
                <p>${escapeHtml(error)}</p>
                <button type="button" data-vacancy-alerts-retry>다시 시도</button>
            </div>
        `;
    } else if (alerts.length === 0) {
        content = '<p class="space-room-vacancy-alerts__state">현재 대기 중인 공실 알림 신청이 없습니다.</p>';
    } else {
        content = `
            <ul class="space-room-vacancy-alerts__list">
                ${alerts.map((alert) => {
                    const room = rooms.find((item) => sameId(item.id, alert.spaceId));
                    const roomName = room?.name || `회의실 #${alert.spaceId}`;
                    return `
                        <li>
                            <div>
                                <strong>${escapeHtml(roomName)}</strong>
                                <span>${escapeHtml(formatCreatedAt(alert.createdAt))}</span>
                            </div>
                            <span>대기 중</span>
                        </li>
                    `;
                }).join("")}
            </ul>
        `;
    }

    return `
        <section class="space-room-vacancy-alerts" id="space-my-vacancy-alerts" aria-label="내 공실 알림 신청">
            <header>
                <div>
                    <strong>내 알림 신청</strong>
                    <span>${alerts.length}건</span>
                </div>
                <button type="button" data-vacancy-alerts-toggle aria-label="내 알림 신청 내역 닫기">닫기</button>
            </header>
            ${content}
        </section>
    `;
}

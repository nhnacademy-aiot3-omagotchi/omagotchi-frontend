import {isCheckedInToday} from "./attendanceState.js";

const SNAPSHOT_KEY = "omagotchiAttendanceSnapshot";

function readSnapshot() {
    try {
        return JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "null");
    } catch {
        return null;
    }
}

function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function isPresentToday(snapshot) {
    return Boolean(snapshot && snapshot.date === localDateKey() && isCheckedInToday());
}

function formatTime(value) {
    if (!value) {
        return "-";
    }
    return new Intl.DateTimeFormat("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).format(new Date(value));
}

function makePresencePanel(snapshot) {
    if (document.querySelector(".home-presence-panel")) {
        return;
    }

    const panel = document.createElement("aside");
    panel.className = "home-presence-panel";
    panel.setAttribute("aria-label", "현재 실습실 및 센서 상태");
    panel.innerHTML = `
        <div class="presence-heading">
            <span class="presence-dot" aria-hidden="true"></span>
            <strong>${snapshot.cohortName}</strong>
        </div>
        <div class="presence-location">
            <span>${snapshot.labName}</span>
            <b>재실 중</b>
        </div>
        <dl class="presence-sensors">
            <div><dt>온도</dt><dd>24°C</dd></div>
            <div><dt>습도</dt><dd>42%</dd></div>
            <div><dt>CO₂</dt><dd>410ppm</dd></div>
            <div><dt>미세먼지</dt><dd>좋음</dd></div>
        </dl>
    `;
    document.body.append(panel);
}

function hideCheckInControls() {
    document.querySelectorAll(
        "#check-in-button, [data-attendance-action='check-in'], .check-in-button"
    ).forEach((element) => element.remove());

    document.querySelectorAll("button, a").forEach((element) => {
        if (element.textContent.trim() === "입실하기") {
            element.remove();
        }
    });
}

function updateAttendanceSummary(snapshot) {
    const labels = document.querySelectorAll(
        "[data-attendance-check-in], .attendance-check-in-time, #today-check-in-time"
    );
    labels.forEach((element) => {
        element.textContent = formatTime(snapshot.checkInAt);
    });

    document.querySelectorAll("[data-attendance-status], .attendance-status").forEach((element) => {
        element.textContent = "재실";
    });
}

function markTodayInCalendars() {
    const today = new Date().getDate();
    const calendarRoots = document.querySelectorAll(
        "[data-attendance-calendar], .attendance-calendar, .calendar-grid, .monthly-calendar"
    );

    calendarRoots.forEach((root) => {
        root.querySelectorAll("button, li, div, span").forEach((cell) => {
            if (cell.children.length === 0 && Number(cell.textContent.trim()) === today) {
                cell.classList.add("is-attended", "is-today-attended");
                cell.setAttribute("aria-label", `${today}일 출석 완료`);
            }
        });
    });
}

function updateStreak() {
    document.querySelectorAll(
        "[data-current-streak-day], .is-current-streak, .streak-today"
    ).forEach((element) => element.classList.add("is-attended"));
}

function patchPersonalOverlay(snapshot, root = document) {
    root.querySelectorAll("[data-personal-attendance], .personal-attendance-status").forEach((element) => {
        element.textContent = `오늘 ${formatTime(snapshot.checkInAt)} 입실`;
    });
}

function applyAttendance(snapshot) {
    document.documentElement.classList.add("is-checked-in");
    makePresencePanel(snapshot);
    hideCheckInControls();
    updateAttendanceSummary(snapshot);
    markTodayInCalendars();
    updateStreak();
    patchPersonalOverlay(snapshot);
}

const snapshot = readSnapshot();
if (isPresentToday(snapshot)) {
    applyAttendance(snapshot);

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    patchPersonalOverlay(snapshot, node);
                    markTodayInCalendars();
                }
            });
        });
    });
    observer.observe(document.body, {childList: true, subtree: true});
}


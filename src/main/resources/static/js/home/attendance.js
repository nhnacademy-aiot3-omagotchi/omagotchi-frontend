import { getLocalDateKey } from "./utils.js";
import { getServiceDate } from "../attendanceState.js";

export function createAttendance({
    button,
    checkInTime,
    checkOutTime,
    earlyLeave,
    lateMinutes,
    calendarGrid,
    calendarTitle,
    calendarPeriod,
    calendarPrev,
    calendarNext,
    streakCount,
    streakList,
    api,
    onCheckOutSuccess,
    onCheckOutError,
    confirmCheckOut,
    onChange
}) {
    let renderedDateKey = getLocalDateKey();
    let serverHistory = {};
    let visibleMonth = new Date();
    visibleMonth.setDate(1);
    visibleMonth.setHours(12, 0, 0, 0);

    function formatTime(date) {
        return new Intl.DateTimeFormat("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }).format(date);
    }

    function isWeekend(date) {
        const day = date.getDay();
        return day === 0 || day === 6;
    }

    function moveToPreviousWeekday(date) {
        while (isWeekend(date)) {
            date.setDate(date.getDate() - 1);
        }
    }

    function normalizeHistory(payload) {
        if (!Array.isArray(payload)) {
            throw new Error("Attendance history API returned an invalid response");
        }
        return payload.reduce((history, entry) => {
            if (entry?.attendanceDate) history[entry.attendanceDate] = entry;
            return history;
        }, {});
    }

    function getHistory() {
        return serverHistory;
    }

    async function loadServerHistory() {
        const panel = calendarGrid?.closest("[data-ui-state]");
        const stateMessage = panel?.querySelector("[data-attendance-state-message]");
        if (!api?.getHistory) {
            if (panel) panel.dataset.uiSource = "local-prototype";
            return;
        }

        if (panel) panel.dataset.uiState = "loading";
        if (stateMessage) {
            stateMessage.hidden = false;
            stateMessage.textContent = "출석 기록을 불러오는 중입니다.";
        }
        try {
            const history = await api.getHistory();
            if (!Array.isArray(history)) {
                throw new Error("Attendance history API returned an invalid response");
            }

            // 서버 응답이 도착한 뒤에는 서버 이력을 정본으로 사용한다.
            serverHistory = normalizeHistory(history);
            if (panel) panel.dataset.uiSource = "server";
            if (stateMessage) stateMessage.hidden = true;
            render();
        } catch {
            if (panel) {
                panel.dataset.uiState = "error";
                panel.dataset.uiSource = "server-error";
            }
            if (stateMessage) {
                stateMessage.hidden = false;
                stateMessage.textContent = "출석 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
            }
        }
    }

    function saveToday(attendance) {
        const dateKey = attendance.attendanceDate || getServiceDate();
        serverHistory = {...serverHistory, [dateKey]: attendance};
    }

    function renderCalendar(history) {
        if (!calendarGrid) return;

        const today = new Date();
        const year = visibleMonth.getFullYear();
        const month = visibleMonth.getMonth();
        const monthLabel = new Intl.DateTimeFormat("ko-KR", { month: "long" }).format(visibleMonth);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstWeekday = Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1))
            .find((date) => !isWeekend(date));
        const offset = firstWeekday ? firstWeekday.getDay() - 1 : 0;
        const fragment = document.createDocumentFragment();

        if (calendarTitle) calendarTitle.textContent = `${monthLabel} 출석 기록`;
        if (calendarPeriod) calendarPeriod.textContent = `${year}년 ${monthLabel}`;

        calendarGrid.setAttribute("aria-label", `${year}년 ${monthLabel} 출석 달력`);
        calendarGrid.querySelectorAll(".calendar-day, .calendar-blank").forEach((node) => node.remove());

        for (let index = 0; index < offset; index += 1) {
            const blank = document.createElement("span");
            blank.className = "calendar-blank ui-calendar-day ui-calendar-day--empty";
            blank.setAttribute("aria-hidden", "true");
            fragment.append(blank);
        }

        for (let day = 1; day <= daysInMonth; day += 1) {
            const date = new Date(year, month, day);
            if (isWeekend(date)) continue;

            const dayNode = document.createElement("span");
            dayNode.className = "calendar-day ui-calendar-day";
            dayNode.textContent = String(day);

            if (
                day === today.getDate()
                && month === today.getMonth()
                && year === today.getFullYear()
            ) {
                dayNode.classList.add("is-today");
                dayNode.classList.add("ui-calendar-day--today");
            }
            if (history[getLocalDateKey(date)]?.checkedInAt) {
                dayNode.classList.add("is-present");
                dayNode.classList.add("ui-calendar-day--present");
                dayNode.setAttribute("aria-label", `${day}일 출석`);
            }
            fragment.append(dayNode);
        }
        calendarGrid.append(fragment);
    }

    function getStreakCount(history) {
        const hasAttendance = (date) => Boolean(history[getLocalDateKey(date)]?.checkedInAt);
        const cursor = new Date();
        let count = 0;

        moveToPreviousWeekday(cursor);
        if (!hasAttendance(cursor)) {
            cursor.setDate(cursor.getDate() - 1);
            moveToPreviousWeekday(cursor);
        }
        while (hasAttendance(cursor)) {
            count += 1;
            cursor.setDate(cursor.getDate() - 1);
            moveToPreviousWeekday(cursor);
        }

        return count;
    }

    function renderStreak(history) {
        const count = getStreakCount(history);

        if (!streakCount || !streakList) return count;

        const hasAttendance = (date) => Boolean(history[getLocalDateKey(date)]?.checkedInAt);
        streakCount.textContent = `${count}일`;
        streakList.replaceChildren();

        const streakDates = [];
        const cursor = new Date();
        moveToPreviousWeekday(cursor);

        while (streakDates.length < 5) {
            const date = new Date(cursor);
            date.setHours(12, 0, 0, 0);
            streakDates.unshift(date);
            cursor.setDate(cursor.getDate() - 1);
            moveToPreviousWeekday(cursor);
        }
        let latestAttendedIndex = -1;

        streakDates.forEach((date, index) => {
            if (hasAttendance(date)) latestAttendedIndex = index;
        });

        streakDates.forEach((date, index, dates) => {
            const item = document.createElement("li");
            const marker = document.createElement("span");
            const label = document.createElement("strong");
            item.classList.add("ui-streak-item");
            marker.classList.add("ui-streak-dot");
            const attended = hasAttendance(date);

            if (attended) item.classList.add("is-active");
            if (count > 0  && attended && index === latestAttendedIndex) {
                item.classList.add("is-current-streak");
            }
            label.textContent = getLocalDateKey(date) === getLocalDateKey(new Date())
                ? "오늘"
                : `${date.getMonth() + 1}/${date.getDate()}`;
            item.append(marker, label);
            streakList.append(item);
        });

        return count;
    }

    function render() {
        const history = getHistory();
        const attendance = history[getServiceDate()] || {};
        const hasCheckIn = Boolean(attendance.checkedInAt);
        const hasCheckOut = hasCheckIn && Boolean(attendance.checkedOutAt);

        const panel = calendarGrid?.closest("[data-ui-state]");
        if (panel && panel.dataset.uiState !== "error") {
            panel.dataset.uiState = hasCheckOut ? "complete" : hasCheckIn ? "active" : "empty";
        }

        if (checkInTime) checkInTime.textContent = hasCheckIn ? formatTime(new Date(attendance.checkedInAt)) : "아직 입실 전";
        if (checkOutTime) checkOutTime.textContent = hasCheckOut ? formatTime(new Date(attendance.checkedOutAt)) : "아직 퇴실 전";
        if (earlyLeave) earlyLeave.textContent = hasCheckOut ? `${attendance.earlyLeaveMinutes || 0}분` : "기록 없음";
        if (lateMinutes) lateMinutes.textContent = hasCheckIn ? `${attendance.lateMinutes || 0}분` : "기록 없음";

        if (button) {
            const buttonLabel = button.querySelector("[data-attendance-label]");
            button.classList.toggle("is-checked-in", hasCheckIn && !hasCheckOut);
            button.classList.toggle("is-complete", hasCheckOut);
            button.hidden = !hasCheckIn;
            if (buttonLabel) {
                buttonLabel.textContent = hasCheckOut ? "완료" : "퇴실";
            } else {
                button.textContent = "퇴실하기";
            }
            button.setAttribute("aria-label", hasCheckOut ? "퇴실 완료" : "퇴실하기");
            button.setAttribute("title", hasCheckOut ? "퇴실 완료" : "퇴실하기");
            button.disabled = !hasCheckIn || hasCheckOut;
        }

        renderCalendar(history);
        const currentStreakCount = renderStreak(history);
        onChange?.({ streakCount: currentStreakCount, history });
    }
    async function toggle() {
        const history = getHistory();
        const attendance = history[getServiceDate()] || {};
        if (!attendance.checkedInAt || attendance.checkedOutAt) {
            render();
            return;
        }

        const nextAction = "checkOut";
        const confirmed = await confirmCheckOut?.();
        if (confirmed === false) {
            render();
            return;
        }

        if (button) button.disabled = true;
        try {
            if (typeof api?.[nextAction] !== "function") {
                throw new Error("Attendance check-out API is unavailable");
            }
            const response = await api[nextAction]();
            if (!response || typeof response !== "object") {
                throw new Error("Attendance check-out API returned an invalid response");
            }
            const serverAttendance = response;
            if (!serverAttendance.checkedOutAt) {
                throw new Error("Attendance check-out response is missing checkedOutAt");
            }
            saveToday(serverAttendance);
            render();
            onCheckOutSuccess?.();
        } catch {
            render();
            onCheckOutError?.();
        }
    }

    function refreshDate() {
        const currentDateKey = getLocalDateKey();
        if (currentDateKey === renderedDateKey) return;
        renderedDateKey = currentDateKey;
        render();
    }

    function init() {
        button?.addEventListener("click", toggle);
        calendarPrev?.addEventListener("click", () => {
            visibleMonth.setMonth(visibleMonth.getMonth() - 1);
            render();
        });
        calendarNext?.addEventListener("click", () => {
            visibleMonth.setMonth(visibleMonth.getMonth() + 1);
            render();
        });
        render();
        loadServerHistory();
        window.setInterval(refreshDate, 30_000);
        window.addEventListener("focus", refreshDate);
        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) refreshDate();
        });
    }

    return { init, render, getHistory };
}

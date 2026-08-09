import { getLocalDateKey } from "./utils.js";

export function createAttendance({
    button,
    checkInTime,
    checkOutTime,
    earlyLeave,
    lateMinutes,
    calendarGrid,
    calendarTitle,
    calendarPeriod,
    streakCount,
    streakList,
    storageKey,
    api,
    onCheckOutSuccess,
    onChange
}) {
    let renderedDateKey = getLocalDateKey();
    let serverHistory = null;

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

    function getLocalHistory() {
        try {
            const saved = JSON.parse(localStorage.getItem(storageKey)) || {};

            if (saved.checkInAt) {
                const dateKey = getLocalDateKey(new Date(saved.checkInAt));
                const migrated = { [dateKey]: saved };
                localStorage.setItem(storageKey, JSON.stringify(migrated));
                return migrated;
            }
            return saved;
        } catch {
            return {};
        }
    }

    function normalizeAttendance(entry = {}) {
        return {
            ...entry,
            checkInAt: entry.checkInAt || entry.checkedInAt,
            checkOutAt: entry.checkOutAt || entry.checkedOutAt
        };
    }

    function normalizeHistory(payload) {
        const source = payload?.history || payload?.records || payload || {};
        if (Array.isArray(source)) {
            return source.reduce((history, entry) => {
                const dateKey = entry.date || entry.serviceDate || getLocalDateKey(new Date(entry.checkInAt || entry.checkedInAt));
                history[dateKey] = normalizeAttendance(entry);
                return history;
            }, {});
        }

        return Object.fromEntries(
            Object.entries(source).map(([dateKey, entry]) => [dateKey, normalizeAttendance(entry)])
        );
    }

    function getHistory() {
        return serverHistory || getLocalHistory();
    }

    async function loadServerHistory() {
        if (!api?.getHistory) return;

        const history = await api.getHistory();
        if (!history) return;

        serverHistory = normalizeHistory(history);
        render();
    }

    function saveToday(attendance) {
        const history = serverHistory || getLocalHistory();
        history[getLocalDateKey()] = attendance;
        if (serverHistory) {
            serverHistory = history;
        }
        localStorage.setItem(storageKey, JSON.stringify(history));
    }

    function renderCalendar(history) {
        if (!calendarGrid) return;

        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const monthLabel = new Intl.DateTimeFormat("ko-KR", { month: "long" }).format(today);
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
            blank.className = "calendar-blank";
            blank.setAttribute("aria-hidden", "true");
            fragment.append(blank);
        }

        for (let day = 1; day <= daysInMonth; day += 1) {
            const date = new Date(year, month, day);
            if (isWeekend(date)) continue;

            const dayNode = document.createElement("span");
            dayNode.className = "calendar-day";
            dayNode.textContent = String(day);

            if (day === today.getDate()) dayNode.classList.add("is-today");
            if (history[getLocalDateKey(date)]?.checkInAt) {
                dayNode.classList.add("is-present");
                dayNode.setAttribute("aria-label", `${day}일 출석`);
            }
            fragment.append(dayNode);
        }
        calendarGrid.append(fragment);
    }

    function getStreakCount(history) {
        const hasAttendance = (date) => Boolean(history[getLocalDateKey(date)]?.checkInAt);
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

        const hasAttendance = (date) => Boolean(history[getLocalDateKey(date)]?.checkInAt);
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
        const attendance = history[getLocalDateKey()] || {};
        const hasCheckIn = Boolean(attendance.checkInAt);
        const hasCheckOut = hasCheckIn && Boolean(attendance.checkOutAt);

        if (checkInTime) checkInTime.textContent = hasCheckIn ? formatTime(new Date(attendance.checkInAt)) : "아직 입실 전";
        if (checkOutTime) checkOutTime.textContent = hasCheckOut ? formatTime(new Date(attendance.checkOutAt)) : "아직 퇴실 전";
        if (earlyLeave) earlyLeave.textContent = hasCheckOut ? "0분" : "기록 없음";
        if (lateMinutes) lateMinutes.textContent = hasCheckIn ? "0분" : "기록 없음";

        if (button) {
            button.classList.toggle("is-checked-in", hasCheckIn && !hasCheckOut);
            button.classList.toggle("is-complete", hasCheckOut);
            button.hidden = !hasCheckIn;
            button.textContent = "퇴실하기";
            button.disabled = !hasCheckIn || hasCheckOut;
        }

        renderCalendar(history);
        const currentStreakCount = renderStreak(history);
        onChange?.({ streakCount: currentStreakCount, history });
    }
    async function toggle() {
        const history = getHistory();
        const attendance = history[getLocalDateKey()] || {};
        if (!attendance.checkInAt || attendance.checkOutAt) {
            render();
            return;
        }

        const nextAction = "checkOut";

        if (button) button.disabled = true;
        const serverAttendance = await api?.[nextAction]?.();
        if (serverAttendance) {
            saveToday(normalizeAttendance(serverAttendance));
            render();
            onCheckOutSuccess?.();
            return;
        }

        attendance.checkOutAt = new Date().toISOString();
        saveToday(attendance);
        render();
        onCheckOutSuccess?.();
    }

    function refreshDate() {
        const currentDateKey = getLocalDateKey();
        if (currentDateKey === renderedDateKey) return;
        renderedDateKey = currentDateKey;
        render();
    }

    function init() {
        button?.addEventListener("click", toggle);
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

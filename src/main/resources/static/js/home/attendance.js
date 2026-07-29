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
    onChange
}) {
    let renderedDateKey = getLocalDateKey();

    function formatTime(date) {
        return new Intl.DateTimeFormat("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }).format(date);
    }

    function getHistory() {
        try {
            const saved = JSON.parse(localStorage.getItem(storageKey)) || {};

            // 예전에 저장한 단일 출석 데이터가 있으면 날짜별 구조로 한 번만 바꾼다.
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
    // 저장
    function saveToday(attendance) {
        const history = getHistory();
        history[getLocalDateKey()] = attendance;
        localStorage.setItem(storageKey, JSON.stringify(history));
    }
    // 달력 (철석)
    function renderCalendar(history) {
        if (!calendarGrid) return;

        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const monthLabel = new Intl.DateTimeFormat("ko-KR", { month: "long" }).format(today);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        const offset = firstDay === 0 ? 6 : firstDay - 1;
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
            const dayNode = document.createElement("span");
            dayNode.className = "calendar-day";
            dayNode.textContent = String(day);

            if (date.getDay() === 0 || date.getDay() === 6) dayNode.classList.add("is-weekend");
            if (day === today.getDate()) dayNode.classList.add("is-today");
            if (history[getLocalDateKey(date)]?.checkInAt) {
                dayNode.classList.add("is-present");
                dayNode.setAttribute("aria-label", `${day}일 출석`);
            }
            fragment.append(dayNode);
        }
        calendarGrid.append(fragment);
    }
    // 스트릭
    function renderStreak(history) {
        if (!streakCount || !streakList) return;

        const hasAttendance = (date) => Boolean(history[getLocalDateKey(date)]?.checkInAt);
        const cursor = new Date();
        let count = 0;

        if (!hasAttendance(cursor)) cursor.setDate(cursor.getDate() - 1);
        while (hasAttendance(cursor)) {
            count += 1;
            cursor.setDate(cursor.getDate() - 1);
        }
        streakCount.textContent = `${count}일`;
        streakList.replaceChildren();

        const streakDates = Array.from({ length: 7 }, (_, index) => {
            const date = new Date();
            date.setHours(12, 0, 0, 0);
            date.setDate(date.getDate() - (6 - index));
            return date;
        });
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
            // 연속 출석이 끊긴다면 불 멈추기
            if (count > 0  && attended && index === latestAttendedIndex) {
                const fire = document.createElement("img");
                fire.src = "/images/streak/Streak_fire.gif";
                fire.alt = "";
                fire.setAttribute("aria-hidden", "true");
                marker.append(fire);
                item.classList.add("is-current-streak");
            }
            label.textContent = index === dates.length - 1 ? "오늘" : `${date.getMonth() + 1}/${date.getDate()}`;
            item.append(marker, label);
            streakList.append(item);
        });
    }
    // 렌더러
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
            button.textContent = hasCheckOut ? "✓ 퇴실 완료" : hasCheckIn ? "퇴실하기" : "입실하기";
            button.disabled = hasCheckOut;
        }

        renderCalendar(history);
        renderStreak(history);
        onChange?.();
    }
    // 토글
    function toggle() {
        const history = getHistory();
        const attendance = history[getLocalDateKey()] || {};

        if (attendance.checkInAt && !attendance.checkOutAt) {
            attendance.checkOutAt = new Date().toISOString();
        } else if (!attendance.checkInAt) {
            attendance.checkInAt = new Date().toISOString();
            delete attendance.checkOutAt;
        } else {
            return;
        }
        saveToday(attendance);
        render();
    }
    // 새로고침
    function refreshDate() {
        const currentDateKey = getLocalDateKey();
        if (currentDateKey === renderedDateKey) return;
        renderedDateKey = currentDateKey;
        render();
    }

    function init() {
        button?.addEventListener("click", toggle);
        render();
        window.setInterval(refreshDate, 30_000);
        window.addEventListener("focus", refreshDate);
        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) refreshDate();
        });
    }

    return { init, render, getHistory };
}

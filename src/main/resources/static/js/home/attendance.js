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
    // [API-REPLACE] 서버 출석 기록 조회 API로 교체
    function getLocalHistory() {
        try {
            const saved = JSON.parse(localStorage.getItem(storageKey)) || {};

            // 예전에 저장한 단일 출석 데이터가 있으면 날짜별 구조로 한 번만 바꾼다.
            // [Mock] 실제 서비스에서는 필요하지 않은 이전 로컬 저장소 마이그레이션입니다. 1~5
            // [MOCK-DELETE] 로컬 스토리지 이전 형식 마이그레이션
            // 서버 DB 연동이 완료되면 삭제
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
    // 저장
    // [API-REPLACE] 입실 퇴실 저장 API로 교체
    function saveToday(attendance) {
        const history = serverHistory || getLocalHistory();
        history[getLocalDateKey()] = attendance;
        if (serverHistory) {
            serverHistory = history;
        }
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
        const offset = firstDay;
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
        // [Mock] 실제 서비스에서는 필요하지 않은 임시 지각/조퇴 표시입니다. 1~2
        // [MOCK-DELETE] 실제 지각, 조퇴 시간 계산 결과로 교체
        if (earlyLeave) earlyLeave.textContent = hasCheckOut ? "0분" : "기록 없음";
        if (lateMinutes) lateMinutes.textContent = hasCheckIn ? "0분" : "기록 없음";

        if (button) {
            button.classList.toggle("is-checked-in", hasCheckIn && !hasCheckOut);
            button.classList.toggle("is-complete", hasCheckOut);
            button.hidden = !hasCheckIn || hasCheckOut;
            button.textContent = "퇴실하기";
            button.disabled = !hasCheckIn || hasCheckOut;
        }

        renderCalendar(history);
        renderStreak(history);
        onChange?.();
    }
    // 토글
    // [API-REPLACE] 브라우저 시간이 아니라 서버에서 입실 퇴실 시간을 기록해야 함
    async function toggle() {
        const history = getHistory();
        const attendance = history[getLocalDateKey()] || {};
        if (!attendance.checkInAt || attendance.checkOutAt) {
            render();
            return;
        }

        const nextAction = "checkOut";

        if (button) button.disabled = true;
        let serverAttendance = null;
        try {
            serverAttendance = await api?.[nextAction]?.();
        } catch (error) {
            if (button) {
                button.disabled = false;
                button.textContent = error.message || "퇴실 실패";
                window.setTimeout(render, 1800);
            }
            return;
        }

        if (serverAttendance) {
            saveToday(normalizeAttendance(serverAttendance));
            render();
            return;
        }

        if (button) button.disabled = false;
        render();
        if (button) {
            button.textContent = "퇴실 실패";
            window.setTimeout(render, 1800);
        }
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
        loadServerHistory();
        window.setInterval(refreshDate, 30_000);
        window.addEventListener("focus", refreshDate);
        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) refreshDate();
        });
    }

    return { init, render, getHistory };
}

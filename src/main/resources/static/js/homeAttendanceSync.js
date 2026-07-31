(() => {
    const attendanceKey = "omagotchiAttendance";

    const readAttendance = () => {
        try {
            return JSON.parse(localStorage.getItem(attendanceKey)) || {};
        } catch {
            return {};
        }
    };

    const localDateKey = (date = new Date()) => [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");

    const formatTime = (iso) => {
        const date = new Date(iso);
        return Number.isNaN(date.getTime())
            ? "-"
            : new Intl.DateTimeFormat("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            }).format(date);
    };

    const calculateStreak = (history) => {
        let streak = 0;
        const cursor = new Date();

        while (history[localDateKey(cursor)]) {
            streak += 1;
            cursor.setDate(cursor.getDate() - 1);
        }
        return streak;
    };

    const setText = (selectors, value) => {
        const element = document.querySelector(selectors);
        if (element && element.textContent !== value) {
            element.textContent = value;
        }
    };

    const hideCheckInButtons = () => {
        document.querySelectorAll("button, a, input[type='button'], input[type='submit']").forEach((element) => {
            const label = (element.textContent || element.value || "").trim();
            if (label === "입실하기" || label === "출석하기") {
                element.hidden = true;
                element.setAttribute("aria-hidden", "true");
            }
        });
    };

    const markTodayOnCalendar = () => {
        const today = new Date();
        const day = String(today.getDate());
        const calendar = document.querySelector(
            "[data-attendance-calendar], .attendance-calendar, .monthly-attendance, .calendar-grid"
        );

        if (!calendar) {
            return;
        }

        const explicitCell = calendar.querySelector(
            `[data-date="${localDateKey(today)}"], [data-day="${day}"]`
        );
        if (explicitCell) {
            explicitCell.classList.add("is-attended", "is-today");
            explicitCell.setAttribute("aria-label", `${day}일 출석 완료`);
            return;
        }

        [...calendar.querySelectorAll("button, li, div, span")].find((element) => (
            element.children.length === 0 && element.textContent.trim() === day
        ))?.classList.add("is-attended", "is-today");
    };

    const createLabPanel = (attendance) => {
        let panel = document.querySelector("[data-home-lab-status]");
        if (!panel) {
            panel = document.createElement("aside");
            panel.className = "home-lab-status";
            panel.dataset.homeLabStatus = "";
            panel.setAttribute("aria-label", "현재 실습실 및 센서 상태");
            panel.innerHTML = `
                <div class="home-lab-status__heading">
                    <div>
                        <strong data-home-lab-name></strong>
                        <span data-home-cohort-name></span>
                    </div>
                    <span class="home-lab-status__badge">재실</span>
                </div>
                <dl class="home-lab-sensors">
                    <div><dt>CO₂</dt><dd>410ppm</dd></div>
                    <div><dt>온도</dt><dd>24°C</dd></div>
                    <div><dt>습도</dt><dd>42%</dd></div>
                    <div><dt>미세먼지</dt><dd>18㎍/㎥</dd></div>
                </dl>
            `;
            document.body.append(panel);
        }

        setText("[data-home-lab-name]", attendance.labName || "실습실");
        setText("[data-home-cohort-name]", attendance.cohortName || "AIoT 3기");
    };

    const syncPersonalInfo = (attendance, streak) => {
        sessionStorage.setItem("omagotchiAttendanceStatus", "PRESENT");
        sessionStorage.setItem("omagotchiCheckInAt", attendance.checkedInAt);
        sessionStorage.setItem("omagotchiCohortName", attendance.cohortName || "AIoT 3기");
        sessionStorage.setItem("omagotchiLabName", attendance.labName || "실습실");
        sessionStorage.setItem("omagotchiStreak", String(streak));

        document.querySelectorAll("[data-attendance-status]").forEach((element) => {
            element.textContent = "재실";
        });
        document.querySelectorAll("[data-cohort-name]").forEach((element) => {
            element.textContent = attendance.cohortName || "AIoT 3기";
        });
        document.querySelectorAll("[data-lab-name]").forEach((element) => {
            element.textContent = attendance.labName || "실습실";
        });
    };

    const sync = () => {
        const attendance = readAttendance();
        if (attendance.date !== localDateKey() || !attendance.checkedInAt) {
            document.documentElement.classList.remove("is-checked-in");
            return;
        }

        const history = attendance.history || {};
        const streak = calculateStreak(history);
        document.documentElement.classList.add("is-checked-in");

        hideCheckInButtons();
        markTodayOnCalendar();
        createLabPanel(attendance);
        syncPersonalInfo(attendance, streak);

        setText(
            "[data-today-check-in], [data-check-in-time], .today-check-in-time",
            formatTime(attendance.checkedInAt)
        );
        setText(
            "[data-today-attendance-status], .today-attendance-status",
            "입실 완료"
        );
        document.querySelectorAll("[data-attendance-streak], .attendance-streak-value").forEach((element) => {
            element.textContent = `${streak}일`;
        });
    };

    let queued = false;
    const observer = new MutationObserver(() => {
        if (queued) {
            return;
        }
        queued = true;
        window.requestAnimationFrame(() => {
            queued = false;
            sync();
        });
    });

    const initialize = () => {
        sync();
        observer.observe(document.body, { childList: true, subtree: true });
        window.addEventListener("storage", sync);
        window.addEventListener("omagotchi:checked-in", sync);
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();

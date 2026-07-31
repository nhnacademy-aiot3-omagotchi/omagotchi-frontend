const ATTENDANCE_PREFIX = "omagotchiAttendance:";
const SEOUL_TIME_ZONE = "Asia/Seoul";

function getSeoulParts(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: SEOUL_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hourCycle: "h23"
    }).formatToParts(now);

    return Object.fromEntries(parts.map(({type, value}) => [type, value]));
}

export function getServiceDate(now = new Date()) {
    const parts = getSeoulParts(now);
    const date = new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00+09:00`);

    // 학습일은 오전 4시에 전환된다.
    if (Number(parts.hour) < 4) {
        date.setDate(date.getDate() - 1);
    }

    return new Intl.DateTimeFormat("en-CA", {
        timeZone: SEOUL_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(date);
}

export function getCurrentUserKey() {
    return sessionStorage.getItem("omagotchiEmail")
        || localStorage.getItem("omagotchiLastEmail")
        || "student@omagotchi.site";
}

function getAttendanceKey(userKey = getCurrentUserKey()) {
    return `${ATTENDANCE_PREFIX}${userKey}:${getServiceDate()}`;
}

export function getTodayAttendance() {
    const raw = localStorage.getItem(getAttendanceKey());
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function isCheckedInToday() {
    return Boolean(getTodayAttendance()?.checkedInAt);
}

export function checkInToday() {
    const attendance = {
        serviceDate: getServiceDate(),
        checkedInAt: new Date().toISOString(),
        status: "PRESENT",
        spaceStatus: "IN_LAB"
    };

    localStorage.setItem(getAttendanceKey(), JSON.stringify(attendance));
    window.dispatchEvent(new CustomEvent("omagotchi:attendance", {detail: attendance}));
    return attendance;
}

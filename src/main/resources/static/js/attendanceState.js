const SEOUL_TIME_ZONE = "Asia/Seoul";
let todayAttendance = null;

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

export function getTodayAttendance() {
    return todayAttendance;
}

export async function loadTodayAttendance() {
    const getToday = window.OmagotchiApi?.attendance?.getToday;
    if (typeof getToday !== "function") {
        throw new Error("Attendance today API is unavailable");
    }
    todayAttendance = await getToday();
    return todayAttendance;
}

export function canCheckIn() {
    return true;
}

export function isCheckedInToday() {
    return Boolean(todayAttendance?.checkedInAt);
}

export async function checkInToday() {
    const checkIn = window.OmagotchiApi?.attendance?.checkIn;
    if (typeof checkIn !== "function") {
        throw new Error("Attendance check-in API is unavailable");
    }

    const attendance = await checkIn();
    if (!attendance || typeof attendance !== "object" || !attendance.checkedInAt) {
        throw new Error("Attendance check-in API returned an invalid response");
    }

    todayAttendance = attendance;
    window.dispatchEvent(new CustomEvent("omagotchi:attendance", {detail: attendance}));
    return attendance;
}

// [API-REPLACE] localStorage용 출석 키, 서버 연동 후 삭제
const ATTENDANCE_PREFIX = "omagotchiAttendance:";
const LEGACY_ATTENDANCE_PREFIX = "omagotchiAttendance:";
// [UI-KEEP] 한국 서비스 기준 시간대
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
// [POLICY-CHECK] 출석일이 오전 4시에 전환되는 것이 실제 요구사항인지 확인
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
// [API-REPLACE] 로그인 사용자는 서버 세션 또는 인증 객체에서 받아야 함
export function getCurrentUserKey() {
    return sessionStorage.getItem("omagotchiEmail")
        || localStorage.getItem("omagotchiLastEmail")
        || "guest";
}
// [API-REPLACE] GET /api/attendance/today 같은 조회 API로 교체
function getAttendanceKey(userKey = getCurrentUserKey()) {
    return `${ATTENDANCE_PREFIX}${userKey}`;
}

function getLegacyAttendanceKey(userKey = getCurrentUserKey()) {
    return `${LEGACY_ATTENDANCE_PREFIX}${userKey}:${getServiceDate()}`;
}

function normalizeAttendance(entry = {}) {
    return {
        ...entry,
        checkInAt: entry.checkInAt || entry.checkedInAt,
        checkOutAt: entry.checkOutAt || entry.checkedOutAt
    };
}

export function getTodayAttendance() {
    const dateKey = getServiceDate();
    const raw = localStorage.getItem(getAttendanceKey());

    if (raw) {
        try {
            const history = JSON.parse(raw) || {};
            if (history[dateKey]) {
                return normalizeAttendance(history[dateKey]);
            }
        } catch {
            return null;
        }
    }

    const legacyRaw = localStorage.getItem(getLegacyAttendanceKey());
    if (!legacyRaw) return null;

    try {
        return normalizeAttendance(JSON.parse(legacyRaw));
    } catch {
        return null;
    }
}
// [API-REPLACE] POST 입실 API로 교체
// checkedInAt은 브라우저 시간이 아니라 서버 시간이 되어야 함
export function isCheckedInToday() {
    return Boolean(getTodayAttendance()?.checkInAt);
}

export async function checkInToday() {
    const serverAttendance = await window.OmagotchiApi?.attendance?.checkIn?.();
    const attendance = normalizeAttendance(serverAttendance || {
        serviceDate: getServiceDate(),
        checkInAt: new Date().toISOString(),
        status: "PRESENT",
        spaceStatus: "IN_LAB"
    });
    const dateKey = attendance.serviceDate || getServiceDate();
    let history = {};

    try {
        history = JSON.parse(localStorage.getItem(getAttendanceKey()) || "{}") || {};
    } catch {
        history = {};
    }

    history[dateKey] = {
        ...history[dateKey],
        ...attendance,
        checkInAt: attendance.checkInAt || new Date().toISOString(),
        serviceDate: dateKey,
        status: "PRESENT",
        spaceStatus: "IN_LAB"
    };

    localStorage.setItem(getAttendanceKey(), JSON.stringify(history));
    window.dispatchEvent(new CustomEvent("omagotchi:attendance", {detail: attendance}));
    return attendance;
}

(() => {
const store = window.OmagotchiDashboardStore.create();
let dialogCallback = null;
const SENSOR_LOCATION_ORDER = Object.freeze(["LAB", "OFFICE", "MEETING_ROOM"]);

function maskedUserLabel(userId) {
    const value = String(userId || "");
    return value ? `사용자 ${value.slice(0, 8)}` : "사용자 정보 없음";
}

function timeLabel(value) {
    if (!value) return "-";
    return new Date(value).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

async function hydrateDashboard(
    attendanceDate = store.getState().today,
    { rejectAttendanceFailure = false } = {}
) {
    try {
        const api = globalThis.OmagotchiApi;
        const [accessContext, account] = await Promise.all([
            api.access.getContext(),
            api.account.get().catch(() => null)
        ]);
        const source = Array.isArray(accessContext?.managedCohorts)
            ? accessContext.managedCohorts.map((cohort) => ({
                ...cohort,
                id: cohort.cohortId
            }))
            : [];
        const applications = [];
        let partialFailure = false;
        let attendanceFailure = null;
        let notices = [];
        try {
            const noticePage = await api.community.listPosts({ page: 0, size: 100, type: "NOTICE" });
            notices = Array.isArray(noticePage?.items) ? noticePage.items : [];
        } catch (error) {
            partialFailure = true;
            console.error("관리자 공지 목록을 불러오지 못했습니다.", error);
        }
        const hydratedCohorts = await Promise.all(source.map(async (cohort) => {
            const [membersResult, applicationsResult, attendanceResult, joinCodeResult] = await Promise.allSettled([
                api.manager.getMembers(cohort.id),
                api.manager.getApplications(cohort.id),
                api.manager.getAttendanceRecords(cohort.id, attendanceDate),
                api.manager.getJoinCode(cohort.id)
            ]);
            const joinCodeMissing = joinCodeResult.status === "rejected"
                && joinCodeResult.reason?.code === "JOIN_CODE_NOT_FOUND";
            partialFailure ||= [membersResult, applicationsResult, attendanceResult]
                .some((result) => result.status === "rejected");
            partialFailure ||= joinCodeResult.status === "rejected" && !joinCodeMissing;
            if (attendanceResult.status === "rejected") {
                attendanceFailure ??= attendanceResult.reason;
            }

            const members = membersResult.status === "fulfilled" && Array.isArray(membersResult.value)
                ? membersResult.value.map((member) => ({
                    ...member,
                    id: member.id ?? member.userId,
                    name: member.nickname || maskedUserLabel(member.userId),
                    nickname: member.nickname || null,
                    email: "Identity 정보 미연결"
                }))
                : [];
            if (applicationsResult.status === "fulfilled" && Array.isArray(applicationsResult.value)) {
                applications.push(...applicationsResult.value.map((application) => ({
                    ...application,
                    cohortId: cohort.id,
                    name: application.nickname || maskedUserLabel(application.userId),
                    nickname: application.nickname || null,
                    email: "Identity 정보 미연결"
                })));
            }
            const attendanceItems = attendanceResult.status === "fulfilled"
                ? (Array.isArray(attendanceResult.value) ? attendanceResult.value : attendanceResult.value?.items)
                : [];
            const attendance = Array.isArray(attendanceItems)
                ? attendanceItems.map((record) => ({
                    ...record,
                    date: record.attendanceDate,
                    checkIn: timeLabel(record.checkedInAt),
                    checkOut: timeLabel(record.checkedOutAt)
                }))
                : [];
            const joinCode = joinCodeResult.status === "fulfilled" ? joinCodeResult.value : null;
            return {
                ...cohort,
                members,
                attendance,
                joinCode: joinCode?.code
                    ? { ...joinCode, value: joinCode.code }
                    : joinCode
            };
        }));
        if (rejectAttendanceFailure && attendanceFailure) {
            throw attendanceFailure;
        }
        store.dispatch({
            type: "HYDRATE_DASHBOARD",
            dashboard: {
                cohorts: hydratedCohorts,
                applications,
                notices,
                manager: account ? {
                    name: account.name || "관리자",
                    email: account.email || "",
                    organization: hydratedCohorts.length
                        ? `${hydratedCohorts.length}개 기수 관리`
                        : "기수 관리자"
                } : undefined,
                selectedCohortId: store.getState().selectedCohortId || hydratedCohorts[0]?.id
            }
        });
        if (partialFailure) setBubble("일부 관리자 데이터는\n권한 또는 계약을 확인해 주세요.");
    } catch (error) {
        console.error("대시보드 데이터를 불러오지 못했습니다.", error);
        setBubble("대시보드 데이터를\n불러오지 못했습니다.");
        throw error;
    }
}

const elements = {
    navigation: document.querySelector("[data-dashboard-navigation]"),
    cohortSelect: document.querySelector("[data-cohort-select]"),
    name: document.querySelector("[data-manager-name]"),
    email: document.querySelector("[data-manager-email]"),
    organization: document.querySelector("[data-manager-organization]"),
    cohortTitle: document.querySelector("[data-current-cohort-name]"),
    bubble: document.querySelector("[data-dashboard-bubble]"),
    dialog: document.querySelector("[data-dialog-backdrop]"),
    dialogTitle: document.querySelector("[data-dialog-title]"),
    dialogMessage: document.querySelector("[data-dialog-message]"),
    dialogInputWrap: document.querySelector("[data-dialog-input-wrap]"),
    dialogInput: document.querySelector("[data-dialog-input]"),
    dialogInputLabel: document.querySelector("[data-dialog-input-label]")
};

function statusLabel(status) {
    return {
        MANAGER: "기수 관리자",
        MENTOR: "멘토",
        STUDENT: "수강생",
        ACTIVE: "활성",
        EXPIRED: "만료",
        INACTIVE: "비활성",
        ENDED: "종료",
        PREPARING: "준비 중",
        CLOSED: "종료",
        PENDING: "대기",
        PRESENT: "정상",
        LATE: "지각",
        ABSENT: "결석",
        LEFT_EARLY: "조퇴",
        LATE_LEFT_EARLY: "지각·조퇴",
        MISSING_CHECK_OUT: "퇴실 누락",
        REJECTED: "거절"
    }[status] || status;
}

function labSensorFor(cohort) {
    const fallback = cohort.sensor || {};
    let source = [];
    if (Array.isArray(fallback.locations)) source = fallback.locations;
    else if (Array.isArray(cohort.sensors)) source = cohort.sensors;
    else if (Array.isArray(cohort.sensorReadings)) source = cohort.sensorReadings;
    if (!source.length) return fallback;

    for (let index = 0; index < source.length; index += 1) {
        const sensor = source[index];
        const location = String(
            sensor.location
            || sensor.locationType
            || sensor.place
            || sensor.roomType
            || SENSOR_LOCATION_ORDER[index]
            || ""
        ).toUpperCase();
        if (location === "LAB") return sensor;
    }
    return {};
}

function setBubble(message) {
    const fragment = document.createDocumentFragment();
    String(message ?? "").split("\n").forEach((line, index) => {
        if (index) fragment.append(document.createElement("br"));
        fragment.append(document.createTextNode(line));
    });
    elements.bubble.replaceChildren(fragment);
}

function openDialog({ title, message, inputLabel, inputType = "text", initialValue = "", confirmText = "확인" }, callback) {
    elements.dialogTitle.textContent = title;
    elements.dialogMessage.textContent = message;
    elements.dialogInputWrap.hidden = !inputLabel;
    elements.dialogInputLabel.textContent = inputLabel || "";
    elements.dialogInput.type = inputType;
    elements.dialogInput.value = initialValue;
    document.querySelector("[data-dialog-confirm]").textContent = confirmText;
    elements.dialog.hidden = false;
    dialogCallback = callback;
    if (inputLabel) elements.dialogInput.focus();
}

function closeDialog() {
    elements.dialog.hidden = true;
    dialogCallback = null;
}

function renderSession() {
    const { manager } = store.getState();
    elements.name.textContent = manager.name;
    elements.email.textContent = manager.email;
    elements.organization.textContent = manager.organization;
}

function renderCohortSelect({ cohorts, selectedCohortId }) {
    const fragment = document.createDocumentFragment();
    cohorts.forEach((cohort) => {
        const option = document.createElement("option");
        option.value = String(cohort.id ?? "");
        option.textContent = cohort.name ?? "";
        option.selected = cohort.id === selectedCohortId;
        fragment.append(option);
    });
    elements.cohortSelect.replaceChildren(fragment);
}

function renderSummary(state) {
    const cohort = state.currentCohort;
    const sensor = labSensorFor(cohort);
    const activeMembers = cohort.members.filter((member) => member.status === "ACTIVE");
    const pending = state.applications.filter(
        (item) => item.cohortId === cohort.id && item.status === "PENDING"
    );
    const attendance = cohort.attendance.filter(
        (item) => item.date === state.today && item.checkIn !== "-"
    );

    elements.cohortTitle.textContent = cohort.name;
    document.querySelector("[data-summary-members]").textContent = activeMembers.length;
    document.querySelector("[data-summary-applications]").textContent = pending.length;
    document.querySelector("[data-summary-attendance]").textContent = attendance.length;
    document.querySelector("[data-summary-co2]").textContent = sensor.co2 == null ? "--" : `${sensor.co2}ppm`;
    document.querySelector("[data-summary-sensor-status]").textContent = sensor.updatedAt || "수신 데이터 없음";
}

function renderShell() {
    const state = store.getState();
    renderSession();
    renderCohortSelect(state);
    renderSummary(state);
}

function updateCurrentCohort(patch) {
    const state = store.getState();
    const cohorts = state.cohorts.map((cohort) => (
        String(cohort.id) === String(state.selectedCohortId) ? { ...cohort, ...patch } : cohort
    ));
    store.dispatch({
        type: "HYDRATE_DASHBOARD",
        dashboard: {
            cohorts,
            applications: state.applications,
            selectedCohortId: state.selectedCohortId
        }
    });
}

store.subscribe(({ changes, message }) => {
    if (changes.includes("shell")) renderShell();
    if (message) setBubble(message);
});

elements.cohortSelect.addEventListener("change", () => {
    const cohort = store.getState().cohorts.find(
        (item) => String(item.id) === elements.cohortSelect.value
    );
    if (cohort) store.dispatch({ type: "SELECT_COHORT", cohortId: cohort.id });
});

document.querySelector("[data-dialog-confirm]").addEventListener("click", () => {
    if (!dialogCallback) return closeDialog();
    const accepted = dialogCallback(elements.dialogInputWrap.hidden ? "" : elements.dialogInput.value);
    if (accepted !== false) closeDialog();
});
document.querySelector("[data-dialog-cancel]").addEventListener("click", closeDialog);
elements.dialog.addEventListener("click", (event) => {
    if (event.target === elements.dialog) closeDialog();
});

document.querySelector("[data-manager-logout-form]").addEventListener("submit", () => {
    try {
        store.dispatch({ type: "CLEAR_SESSION" });
    } catch (error) {
        // Browser 저장소 정리에 실패해도 Spring Security Logout Form은 제출한다.
        console.warn("관리자 화면 상태를 정리하지 못했습니다.", error);
    }
});

renderSession();
renderShell();
window.OmagotchiDashboardPanels.start({
    store,
    navigation: elements.navigation,
    shared: {
        statusLabel,
        openDialog,
        setBubble,
        fetchTodayStats: (cohortId) => (
            window.OmagotchiApi?.manager?.getStudyStatsToday?.(cohortId)
        ),
        fetchTrendStats: (cohortId, windowParam) => (
            window.OmagotchiApi?.manager?.getStudyStatsTrend?.(cohortId, windowParam)
        ),
        fetchMemberStats: (cohortId, query) => (
            window.OmagotchiApi?.manager?.getStudyStatsMembers?.(cohortId, query)
        ),
        fetchMemberOverview: (cohortId, membershipId, windowParam) => (
            window.OmagotchiApi?.manager?.getStudyStatsMemberOverview?.(cohortId, membershipId, windowParam)
        ),
        fetchMemberRecords: (cohortId, membershipId, date) => (
            window.OmagotchiApi?.manager?.getStudyStatsMemberDailyRecords?.(cohortId, membershipId, date)
        ),
        getMemberProfiles: () => store.getState().currentCohort.members,
        refreshDashboard: hydrateDashboard,
        updateCurrentCohort,
        openMemberDetail: (options) => {
            if (typeof window.openStudyDetailModal === "function") {
                window.openStudyDetailModal(options);
                return;
            }
            console.warn("studyDetailModal.js is not loaded.");
        }
    }
});
hydrateDashboard().catch(() => {
    // 최초 로딩 오류는 hydrateDashboard에서 사용자 안내까지 완료한다.
});
})();

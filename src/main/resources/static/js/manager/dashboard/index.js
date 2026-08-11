(() => {
const store = window.OmagotchiDashboardStore.create();
let dialogCallback = null;
const SENSOR_LOCATION_ORDER = Object.freeze(["LAB", "OFFICE", "MEETING_ROOM"]);

async function hydrateDashboard() {
    try {
        const dashboard = await window.OmagotchiApi?.manager?.getDashboard?.();
        if (dashboard) {
            if (Array.isArray(dashboard.cohorts)) {
                dashboard.cohorts.forEach((cohort) => {
                    cohort.members = Array.isArray(cohort.members) ? cohort.members : [];
                    cohort.attendance = Array.isArray(cohort.attendance) ? cohort.attendance : [];
                });
            }
            store.dispatch({ type: "HYDRATE_DASHBOARD", dashboard });
        }
    } catch (error) {
        console.error("대시보드 데이터를 불러오지 못했습니다.", error);
        setBubble("대시보드 데이터를\n불러오지 못했습니다.");
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
        INACTIVE: "비활성",
        ENDED: "종료",
        PREPARING: "준비 중",
        CLOSED: "종료",
        PENDING: "대기",
        NORMAL: "정상",
        LATE: "지각",
        ABSENT: "결석",
        EARLY_LEAVE: "조퇴",
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
    renderCohortSelect(state);
    renderSummary(state);
}

store.subscribe(({ changes, message }) => {
    if (changes.includes("shell")) renderShell();
    if (message) setBubble(message);
});

elements.cohortSelect.addEventListener("change", () => {
    store.dispatch({ type: "SELECT_COHORT", cohortId: elements.cohortSelect.value });
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

document.querySelector("[data-manager-logout]").addEventListener("click", () => {
    store.dispatch({ type: "CLEAR_SESSION" });
    window.location.href = "/";
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
        fetchStatistics: (cohortId, range) => (
            window.OmagotchiApi?.manager?.getStudyStatistics?.(cohortId, range)
        ),
        getMemberProfiles: () => store.getState().currentCohort.members,
        openMemberDetail: (options) => {
            if (typeof window.openStudyDetailModal === "function") {
                window.openStudyDetailModal(options);
                return;
            }
            console.warn("studyDetailModal.js is not loaded.");
        }
    }
});
hydrateDashboard();
})();

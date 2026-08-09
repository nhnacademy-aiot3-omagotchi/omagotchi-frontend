// 관리자 권한·기수 소속 미검증 Browser Prototype 대시보드
// 관리자 대시보드가 공유하는 로컬 저장소 키
const OPERATIONS_KEY = "omagotchiCohortOperations";
const APPLICATIONS_KEY = "omagotchiCohortApplications";
const NOTICES_KEY = "omagotchiCohortNotices";
const AUDITS_KEY = "omagotchiCohortAudits";
const DEFAULT_SENSOR_THRESHOLDS = {
    temperatureMin: 20,
    temperatureMax: 26,
    humidityMin: 40,
    humidityMax: 60,
    co2Max: 1000,
    occupancyMax: 30
};

const today = new Date().toISOString().slice(0, 10);
const managerEmail = sessionStorage.getItem("omagotchiManagerEmail") || "";
const managerName = sessionStorage.getItem("omagotchiManagerName") || "관리자";
const managerOrganization = sessionStorage.getItem("omagotchiManagerOrganization") || "";
const emptyCohort = {
    id: "",
    name: "기수 없음",
    description: "등록된 기수가 없습니다.",
    startDate: "-",
    endDate: "-",
    status: "PREPARING",
    capacity: 0,
    members: [],
    attendance: [],
    sensor: {},
    joinCode: null
};

// 로컬 저장소 JSON 읽기/쓰기
function readJson(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : structuredClone(fallback);
    } catch {
        return structuredClone(fallback);
    }
}

function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// 현재 선택한 기수와 활성 패널 상태
let cohorts = readJson(OPERATIONS_KEY, []);
let applications = readJson(APPLICATIONS_KEY, []);
let notices = readJson(NOTICES_KEY, []);
let audits = readJson(AUDITS_KEY, []);
let selectedCohortId = sessionStorage.getItem("omagotchiManagerCohort") || cohorts[0]?.id;
let activePanel = sessionStorage.getItem("omagotchiManagerDashboardTab") || "overview";
const availablePanels = ["overview", "codes", "applications", "members", "attendance", "sensors", "community", "audits"];

if (!availablePanels.includes(activePanel)) {
    activePanel = "overview";
}

let dialogCallback = null;

async function hydrateDashboard() {
    const dashboard = await window.OmagotchiApi?.manager?.getDashboard?.();
    if (!dashboard) return;

    cohorts = Array.isArray(dashboard.cohorts) ? dashboard.cohorts : cohorts;
    applications = Array.isArray(dashboard.applications) ? dashboard.applications : applications;
    notices = Array.isArray(dashboard.notices) ? dashboard.notices : notices;
    audits = Array.isArray(dashboard.audits) ? dashboard.audits : audits;
    selectedCohortId = dashboard.selectedCohortId || selectedCohortId || cohorts[0]?.id;
    renderAll();
}

// 반복 조회를 줄이기 위한 대시보드 요소 모음
const elements = {
    cohortSelect: document.querySelector("[data-cohort-select]"),
    name: document.querySelector("[data-manager-name]"),
    email: document.querySelector("[data-manager-email]"),
    organization: document.querySelector("[data-manager-organization]"),
    cohortTitle: document.querySelector("[data-current-cohort-name]"),
    bubble: document.querySelector("[data-dashboard-bubble]"),
    memberSearch: document.querySelector("[data-member-search]"),
    attendanceDate: document.querySelector("[data-attendance-date]"),
    applicationList: document.querySelector("[data-application-list]"),
    memberList: document.querySelector("[data-member-list]"),
    attendanceList: document.querySelector("[data-attendance-list]"),
    communityList: document.querySelector("[data-community-list]"),
    auditList: document.querySelector("[data-audit-list]"),
    codeCard: document.querySelector("[data-code-card]"),
    editForm: document.querySelector("[data-cohort-edit-form]"),
    sensorThresholdForm: document.querySelector("[data-sensor-threshold-form]"),
    noticeForm: document.querySelector("[data-notice-form]"),
    dialog: document.querySelector("[data-dialog-backdrop]"),
    dialogTitle: document.querySelector("[data-dialog-title]"),
    dialogMessage: document.querySelector("[data-dialog-message]"),
    dialogInputWrap: document.querySelector("[data-dialog-input-wrap]"),
    dialogInput: document.querySelector("[data-dialog-input]"),
    dialogInputLabel: document.querySelector("[data-dialog-input-label]")
};

// 선택 기수 조회와 화면 상태 저장
function currentCohort() {
    return cohorts.find((cohort) => cohort.id === selectedCohortId) || cohorts[0] || emptyCohort;
}

function saveState() {
    writeJson(OPERATIONS_KEY, cohorts);
    writeJson(APPLICATIONS_KEY, applications);
    writeJson(NOTICES_KEY, notices);
    writeJson(AUDITS_KEY, audits);
}

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

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function setBubble(message) {
    elements.bubble.innerHTML = message;
}

function sensorThresholds(cohort = currentCohort()) {
    cohort.sensor ??= {};
    cohort.sensor.thresholds = {
        ...DEFAULT_SENSOR_THRESHOLDS,
        ...(cohort.sensor.thresholds || {})
    };
    return cohort.sensor.thresholds;
}

function addAudit(action, target, detail) {
    audits.unshift({
        id: crypto.randomUUID?.() || `audit-${Date.now()}`,
        cohortId: selectedCohortId,
        occurredAt: new Date().toLocaleString("ko-KR", { hour12: false }),
        action,
        target,
        detail,
        actor: managerEmail
    });
    audits = audits.slice(0, 100);
}

// 사이드 메뉴 활성화 및 관리자 세션 정보 표시
function activatePanel(panel) {
    activePanel = panel;
    sessionStorage.setItem("omagotchiManagerDashboardTab", panel);
    document.querySelectorAll("[data-dashboard-tab]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.dashboardTab === panel);
    });
    document.querySelectorAll("[data-dashboard-panel]").forEach((section) => {
        section.classList.toggle("is-active", section.dataset.dashboardPanel === panel);
    });
}

function renderSession() {
    elements.name.textContent = managerName;
    elements.email.textContent = managerEmail;
    elements.organization.textContent = managerOrganization;
}

function renderCohortSelect() {
    elements.cohortSelect.innerHTML = cohorts.map((cohort) => (
        `<option value="${escapeHtml(cohort.id)}" ${cohort.id === selectedCohortId ? "selected" : ""}>${escapeHtml(cohort.name)}</option>`
    )).join("");
}

// 선택한 기수에 한정된 요약 및 세부 패널 렌더링
function renderSummary() {
    const cohort = currentCohort();
    if (!cohort) return;
    cohort.sensor ??= {};
    const activeMembers = cohort.members.filter((member) => member.status === "ACTIVE");
    const pending = applications.filter((item) => item.cohortId === cohort.id && item.status === "PENDING");
    const attendance = cohort.attendance.filter((item) => item.date === today && item.checkIn !== "-");
    const late = cohort.attendance.filter((item) => item.date === today && ["LATE", "PENDING", "ABSENT"].includes(item.finalStatus));
    const reported = notices.filter((item) => item.cohortId === cohort.id && item.reports > 0);

    elements.cohortTitle.textContent = cohort.name;
    document.querySelector("[data-summary-members]").textContent = activeMembers.length;
    document.querySelector("[data-summary-applications]").textContent = pending.length;
    document.querySelector("[data-summary-attendance]").textContent = attendance.length;
    document.querySelector("[data-summary-co2]").textContent = cohort.sensor.co2 == null ? "--" : `${cohort.sensor.co2}ppm`;
    document.querySelector("[data-summary-sensor-status]").textContent = cohort.sensor.updatedAt || "수신 데이터 없음";
    document.querySelector("[data-todo-applications]").textContent = `${pending.length}건`;
    document.querySelector("[data-todo-late]").textContent = `${late.length}명`;
    document.querySelector("[data-todo-community]").textContent = `${reported.length}건`;
}

function renderOverview() {
    const cohort = currentCohort();
    document.querySelector("[data-cohort-name]").textContent = cohort.name;
    document.querySelector("[data-cohort-period]").textContent = `${cohort.startDate} ~ ${cohort.endDate}`;
    document.querySelector("[data-cohort-status]").textContent = statusLabel(cohort.status);
    document.querySelector("[data-cohort-capacity]").textContent = `${cohort.members.filter((member) => member.status === "ACTIVE").length} / ${cohort.capacity}명`;
    elements.editForm.elements.namedItem("description").value = cohort.description;
    elements.editForm.elements.namedItem("capacity").value = cohort.capacity;
}

function renderCode() {
    const code = currentCohort().joinCode;
    if (!code?.value) {
        elements.codeCard.innerHTML = `<div><strong>발급된 가입 코드가 없습니다.</strong><p class="panel-description">새 코드를 발급하면 이전 코드는 즉시 폐기됩니다.</p></div>`;
        return;
    }
    elements.codeCard.innerHTML = `
        <div>
            <div class="code-value"><strong>${escapeHtml(code.value)}</strong><span class="status-badge">${statusLabel(code.status)}</span></div>
            <div class="code-meta"><span>만료 ${escapeHtml(code.expiresAt)}</span><span>발급 ${escapeHtml(code.issuedAt)}</span><span>사용 ${code.used || 0}회</span></div>
        </div>
        <div class="code-actions">
            <button class="is-primary" type="button" data-code-copy>복사</button>
            <button class="is-danger" type="button" data-code-revoke ${code.status !== "ACTIVE" ? "disabled" : ""}>폐기</button>
        </div>`;
}

function renderApplications() {
    const rows = applications.filter((item) => item.cohortId === selectedCohortId);
    document.querySelector("[data-application-count]").textContent = `${rows.filter((item) => item.status === "PENDING").length}건`;
    elements.applicationList.innerHTML = rows.length ? rows.map((item) => `
        <tr>
            <td><strong>${escapeHtml(item.name)}</strong></td>
            <td>${escapeHtml(item.email)}</td>
            <td>${escapeHtml(item.requestedAt)}</td>
            <td><span class="status-badge">${statusLabel(item.status)}</span></td>
            <td><div class="table-actions">
                <button class="is-primary" type="button" data-approve="${item.id}" ${item.status !== "PENDING" ? "disabled" : ""}>승인</button>
                <button class="is-danger" type="button" data-reject="${item.id}" ${item.status !== "PENDING" ? "disabled" : ""}>거절</button>
            </div></td>
        </tr>`).join("") : `<tr><td class="empty-row" colspan="5">참가 신청이 없습니다.</td></tr>`;
}

function renderMembers() {
    const query = elements.memberSearch.value.trim().toLowerCase();
    const rows = currentCohort().members.filter((member) => (
        member.name.toLowerCase().includes(query) || member.email.toLowerCase().includes(query)
    ));
    elements.memberList.innerHTML = rows.map((member) => `
        <tr>
            <td><strong>${escapeHtml(member.name)}</strong></td>
            <td>${escapeHtml(member.email)}</td>
            <td>${statusLabel(member.role)}</td>
            <td><span class="status-badge">${statusLabel(member.status)}</span></td>
            <td><div class="table-actions">
                ${member.role === "MANAGER"
                    ? `<small>시스템 관리자만 변경 가능</small>`
                    : `<button type="button" data-member-status="${member.id}">${member.status === "ACTIVE" ? "비활성화" : "활성화"}</button>
                       <button class="is-danger" type="button" data-member-end="${member.id}" ${member.status === "ENDED" ? "disabled" : ""}>소속 종료</button>`}
            </div></td>
        </tr>`).join("");
}

function renderAttendance() {
    const date = elements.attendanceDate.value || today;
    const cohort = currentCohort();
    const students = cohort.members.filter((member) => member.role !== "MANAGER" && member.status !== "ENDED");
    elements.attendanceList.innerHTML = students.map((member) => {
        const record = cohort.attendance.find((item) => item.memberId === member.id && item.date === date);
        return `<tr>
            <td><strong>${escapeHtml(member.name)}</strong><small>${escapeHtml(member.email)}</small></td>
            <td>${record?.checkIn || "-"}</td><td>${record?.checkOut || "-"}</td>
            <td>${statusLabel(record?.autoStatus || "PENDING")}</td>
            <td><span class="status-badge">${statusLabel(record?.finalStatus || "PENDING")}</span></td>
            <td><div class="table-actions"><button type="button" data-attendance-edit="${member.id}">상태 변경</button></div></td>
        </tr>`;
    }).join("") || `<tr><td class="empty-row" colspan="6">조회할 구성원이 없습니다.</td></tr>`;
}

function renderSensors() {
    const cohort = currentCohort();
    cohort.sensor ??= {};
    const sensor = cohort.sensor;
    const thresholds = sensorThresholds();
    const temperatureWarning = sensor.temperature != null
        && (sensor.temperature < thresholds.temperatureMin || sensor.temperature > thresholds.temperatureMax);
    const humidityWarning = sensor.humidity != null
        && (sensor.humidity < thresholds.humidityMin || sensor.humidity > thresholds.humidityMax);
    const co2Warning = sensor.co2 != null && sensor.co2 >= thresholds.co2Max;
    const occupancyWarning = sensor.occupancy != null && sensor.occupancy > thresholds.occupancyMax;
    document.querySelector("[data-sensor-temperature]").textContent = sensor.temperature == null ? "--" : `${sensor.temperature}℃`;
    document.querySelector("[data-sensor-humidity]").textContent = sensor.humidity == null ? "--" : `${sensor.humidity}%`;
    document.querySelector("[data-sensor-co2]").textContent = sensor.co2 == null ? "--" : `${sensor.co2}ppm`;
    document.querySelector("[data-sensor-occupancy]").textContent = `${sensor.occupancy ?? 0}명`;
    document.querySelector("[data-sensor-updated]").textContent = sensor.updatedAt ? `마지막 수신 ${sensor.updatedAt}` : "수신 데이터 없음";
    document.querySelector("[data-sensor-temperature-range]").textContent = `권장 ${thresholds.temperatureMin}~${thresholds.temperatureMax}℃`;
    document.querySelector("[data-sensor-humidity-range]").textContent = `권장 ${thresholds.humidityMin}~${thresholds.humidityMax}%`;
    document.querySelector("[data-sensor-occupancy-range]").textContent = `최대 ${thresholds.occupancyMax}명`;
    document.querySelector("[data-sensor-co2-state]").textContent = co2Warning ? "환기가 필요합니다" : sensor.co2 == null ? "수신 대기" : "쾌적";
    document.querySelector("[data-sensor-temperature]").closest("article").classList.toggle("is-warning", temperatureWarning);
    document.querySelector("[data-sensor-humidity]").closest("article").classList.toggle("is-warning", humidityWarning);
    document.querySelector("[data-sensor-co2]").closest("article").classList.toggle("is-warning", co2Warning);
    document.querySelector("[data-sensor-occupancy]").closest("article").classList.toggle("is-warning", occupancyWarning);
    Object.entries(thresholds).forEach(([key, value]) => {
        const field = elements.sensorThresholdForm.elements.namedItem(key);
        if (field) field.value = value;
    });
}

function renderCommunity() {
    const rows = notices.filter((item) => item.cohortId === selectedCohortId).sort((a, b) => Number(b.pinned) - Number(a.pinned));
    elements.communityList.innerHTML = rows.length ? rows.map((item) => `
        <article class="community-item ${item.reports ? "is-reported" : ""}">
            <span class="status-badge">${item.type === "NOTICE" ? "공지" : "자유"}</span>
            <div><h3>${item.pinned ? "고정 · " : ""}${escapeHtml(item.title)}</h3><p>${escapeHtml(item.content)} · 신고 ${item.reports || 0}건</p></div>
            <button type="button" data-community-action="${item.id}">${item.pinned ? "고정 해제" : item.reports ? "신고 확인" : "고정"}</button>
        </article>`).join("") : `<p class="scope-note">등록된 게시글이 없습니다.</p>`;
}

function renderAudits() {
    const rows = audits.filter((item) => item.cohortId === selectedCohortId);
    elements.auditList.innerHTML = rows.length ? rows.map((item) => `
        <tr><td>${escapeHtml(item.occurredAt)}</td><td>${escapeHtml(item.action)}</td><td>${escapeHtml(item.target)}</td><td>${escapeHtml(item.detail)}</td></tr>
    `).join("") : `<tr><td class="empty-row" colspan="4">기록된 작업 이력이 없습니다.</td></tr>`;
}

function renderAll() {
    renderCohortSelect();
    renderSummary();
    renderOverview();
    renderCode();
    renderApplications();
    renderMembers();
    renderAttendance();
    renderSensors();
    renderCommunity();
    renderAudits();
}

// 사유 입력이나 확인이 필요한 관리자 작업용 공통 대화상자
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

// 기수 선택과 대시보드 탭 이동
document.querySelectorAll("[data-dashboard-tab]").forEach((button) => {
    button.addEventListener("click", () => activatePanel(button.dataset.dashboardTab));
});

elements.cohortSelect.addEventListener("change", () => {
    selectedCohortId = elements.cohortSelect.value;
    sessionStorage.setItem("omagotchiManagerCohort", selectedCohortId);
    elements.editForm.hidden = true;
    setBubble(`${currentCohort().name} 업무만<br />표시하고 있습니다.`);
    renderAll();
});

// 담당 기수 기본 정보 수정
document.querySelector("[data-edit-cohort]").addEventListener("click", () => {
    elements.editForm.hidden = false;
});
document.querySelector("[data-cancel-cohort-edit]").addEventListener("click", () => {
    elements.editForm.hidden = true;
});
elements.editForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const cohort = currentCohort();
    cohort.description = elements.editForm.elements.namedItem("description").value.trim();
    cohort.capacity = Math.max(1, Number(elements.editForm.elements.namedItem("capacity").value) || cohort.capacity);
    addAudit("기수 정보 수정", cohort.name, "설명과 정원 변경");
    elements.editForm.hidden = true;
    saveState();
    renderAll();
    setBubble("기수 정보를<br />저장했습니다.");
});

// 가입 코드 발급, 복사 및 폐기
document.querySelector("[data-issue-code]").addEventListener("click", () => {
    const defaultExpiry = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    openDialog({
        title: "가입 코드 발급",
        message: "새 코드를 발급하면 기존 코드는 폐기됩니다. 만료일을 지정하세요.",
        inputLabel: "만료일",
        inputType: "date",
        initialValue: defaultExpiry,
        confirmText: "발급"
    }, (expiresAt) => {
        if (!expiresAt) return false;
        const code = `${currentCohort().name.replace(/[^A-Za-z0-9가-힣]/g, "").slice(0, 3).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        currentCohort().joinCode = { value: code, status: "ACTIVE", expiresAt, issuedAt: today, used: 0 };
        addAudit("가입 코드 발급", currentCohort().name, `만료일 ${expiresAt}`);
        saveState();
        renderAll();
        setBubble("새 가입 코드를<br />발급했습니다.");
        return true;
    });
});

elements.codeCard.addEventListener("click", async (event) => {
    if (event.target.closest("[data-code-copy]")) {
        try {
            await navigator.clipboard.writeText(currentCohort().joinCode.value);
            setBubble("가입 코드를<br />복사했습니다.");
        } catch {
            setBubble(`가입 코드<br />${currentCohort().joinCode.value}`);
        }
    }
    if (event.target.closest("[data-code-revoke]")) {
        openDialog({ title: "가입 코드 폐기", message: "현재 코드를 더 이상 사용할 수 없게 합니다.", confirmText: "폐기" }, () => {
            currentCohort().joinCode.status = "REVOKED";
            addAudit("가입 코드 폐기", currentCohort().name, currentCohort().joinCode.value);
            saveState();
            renderAll();
            return true;
        });
    }
});

// 사용자 참가 신청 승인 및 거절
elements.applicationList.addEventListener("click", (event) => {
    const approve = event.target.closest("[data-approve]");
    const reject = event.target.closest("[data-reject]");
    const application = applications.find((item) => item.id === (approve?.dataset.approve || reject?.dataset.reject));
    if (!application || application.status !== "PENDING") return;

    if (approve) {
        application.status = "ACTIVE";
        currentCohort().members.push({ id: application.userId, name: application.name, email: application.email, role: "STUDENT", status: "ACTIVE" });
        const joinedKey = `omagotchiJoinedCohorts:${application.userId}`;
        const joined = readJson(joinedKey, []);
        writeJson(joinedKey, [...new Set([...joined, application.cohortId])]);
        addAudit("참가 신청 승인", application.email, "PENDING → ACTIVE");
        saveState();
        renderAll();
        setBubble(`${application.name} 님을<br />승인했습니다.`);
    }

    if (reject) {
        openDialog({ title: "참가 신청 거절", message: `${application.name} 님의 신청을 거절합니다.`, inputLabel: "거절 사유", confirmText: "거절" }, (reason) => {
            if (!reason.trim()) return false;
            application.status = "REJECTED";
            application.rejectReason = reason.trim();
            addAudit("참가 신청 거절", application.email, reason.trim());
            saveState();
            renderAll();
            return true;
        });
    }
});

// 담당 기수 구성원의 소속 상태 변경
elements.memberSearch.addEventListener("input", renderMembers);
elements.memberList.addEventListener("click", (event) => {
    const statusButton = event.target.closest("[data-member-status]");
    const endButton = event.target.closest("[data-member-end]");
    const memberId = statusButton?.dataset.memberStatus || endButton?.dataset.memberEnd;
    const member = currentCohort().members.find((item) => item.id === memberId);
    if (!member || member.role === "MANAGER") return;
    const nextStatus = endButton ? "ENDED" : member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    openDialog({ title: "소속 상태 변경", message: `${member.name} 님의 소속을 ${statusLabel(nextStatus)} 상태로 변경합니다.`, inputLabel: "변경 사유" }, (reason) => {
        if (!reason.trim()) return false;
        const previous = member.status;
        member.status = nextStatus;
        addAudit("소속 상태 변경", member.email, `${previous} → ${nextStatus}: ${reason.trim()}`);
        saveState();
        renderAll();
        return true;
    });
});

// 선택 날짜의 출결 최종 상태 변경
elements.attendanceDate.value = today;
elements.attendanceDate.addEventListener("change", renderAttendance);
elements.attendanceList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-attendance-edit]");
    if (!button) return;
    const member = currentCohort().members.find((item) => item.id === button.dataset.attendanceEdit);
    const date = elements.attendanceDate.value;
    openDialog({
        title: "출결 상태 변경",
        message: `${member.name} 님의 ${date} 최종 출결 상태를 입력하세요. NORMAL, LATE, ABSENT, EARLY_LEAVE 중 하나를 사용합니다.`,
        inputLabel: "최종 상태",
        initialValue: "NORMAL"
    }, (value) => {
        const next = value.trim().toUpperCase();
        if (!["NORMAL", "LATE", "ABSENT", "EARLY_LEAVE"].includes(next)) return false;
        let record = currentCohort().attendance.find((item) => item.memberId === member.id && item.date === date);
        if (!record) {
            record = { memberId: member.id, date, checkIn: "-", checkOut: "-", autoStatus: "PENDING", finalStatus: next };
            currentCohort().attendance.push(record);
        } else {
            record.finalStatus = next;
        }
        addAudit("최종 출결 변경", member.email, `${date} ${next}`);
        saveState();
        renderAll();
        return true;
    });
});

// 실습실 센서 임계치 수정
document.querySelector("[data-open-sensor-thresholds]").addEventListener("click", () => {
    elements.sensorThresholdForm.hidden = false;
});
document.querySelector("[data-cancel-sensor-thresholds]").addEventListener("click", () => {
    elements.sensorThresholdForm.hidden = true;
    renderSensors();
});
elements.sensorThresholdForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = elements.sensorThresholdForm;
    const next = {
        temperatureMin: Number(form.elements.namedItem("temperatureMin").value),
        temperatureMax: Number(form.elements.namedItem("temperatureMax").value),
        humidityMin: Number(form.elements.namedItem("humidityMin").value),
        humidityMax: Number(form.elements.namedItem("humidityMax").value),
        co2Max: Number(form.elements.namedItem("co2Max").value),
        occupancyMax: Number(form.elements.namedItem("occupancyMax").value)
    };

    const invalid = Object.values(next).some((value) => Number.isNaN(value))
        || next.temperatureMin > next.temperatureMax
        || next.humidityMin > next.humidityMax
        || next.co2Max < 1
        || next.occupancyMax < 1;

    if (invalid) {
        setBubble("임계치 값을<br />확인해 주세요.");
        return;
    }

    const cohort = currentCohort();
    cohort.sensor ??= {};
    cohort.sensor.thresholds = next;
    addAudit(
        "센서 임계치 수정",
        cohort.name,
        `온도 ${next.temperatureMin}~${next.temperatureMax}℃, 습도 ${next.humidityMin}~${next.humidityMax}%, CO₂ ${next.co2Max}ppm, 재실 ${next.occupancyMax}명`
    );
    elements.sensorThresholdForm.hidden = true;
    saveState();
    renderAll();
    setBubble("센서 임계치를<br />저장했습니다.");
});

// 담당 기수 공지 작성과 커뮤니티 게시글 관리
document.querySelector("[data-open-notice-form]").addEventListener("click", () => {
    elements.noticeForm.hidden = false;
});
document.querySelector("[data-cancel-notice]").addEventListener("click", () => {
    elements.noticeForm.hidden = true;
});
elements.noticeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = elements.noticeForm.elements.namedItem("title").value.trim();
    const content = elements.noticeForm.elements.namedItem("content").value.trim();
    if (!title || !content) return;
    notices.unshift({ id: `notice-${Date.now()}`, cohortId: selectedCohortId, type: "NOTICE", title, content, pinned: false, reports: 0 });
    addAudit("공지 등록", title, "기수 공지 작성");
    elements.noticeForm.reset();
    elements.noticeForm.hidden = true;
    saveState();
    renderAll();
});
elements.communityList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-community-action]");
    if (!button) return;
    const post = notices.find((item) => item.id === button.dataset.communityAction);
    if (!post) return;
    if (post.reports) {
        post.reports = 0;
        addAudit("커뮤니티 신고 확인", post.title, "신고 검토 완료");
    } else {
        post.pinned = !post.pinned;
        addAudit("게시글 고정 변경", post.title, post.pinned ? "고정" : "고정 해제");
    }
    saveState();
    renderAll();
});

// 공통 대화상자 처리
document.querySelector("[data-dialog-confirm]").addEventListener("click", () => {
    if (!dialogCallback) return closeDialog();
    const accepted = dialogCallback(elements.dialogInputWrap.hidden ? "" : elements.dialogInput.value);
    if (accepted !== false) closeDialog();
});
document.querySelector("[data-dialog-cancel]").addEventListener("click", closeDialog);
elements.dialog.addEventListener("click", (event) => {
    if (event.target === elements.dialog) closeDialog();
});

document.querySelector("[data-manager-logout-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector("[type='submit']");
    if (submitButton) submitButton.disabled = true;

    try {
        const response = await fetch(event.currentTarget.action, {
            method: "POST",
            credentials: "same-origin",
            body: new FormData(event.currentTarget)
        });

        // 완료되었거나 이미 만료된 Session의 관리자 Prototype 표시 상태 정리
        if (response.ok || response.status === 401 || response.status === 403) {
            ["omagotchiManagerEmail", "omagotchiManagerName", "omagotchiManagerOrganization", "omagotchiManagerCohort", "omagotchiManagerDashboardTab"]
                .forEach((key) => sessionStorage.removeItem(key));
            window.location.href = "/login";
            return;
        }
        throw new Error("로그아웃 요청에 실패했습니다.");
    } catch (error) {
        if (submitButton) submitButton.disabled = false;
        setBubble(escapeHtml(error.message || "로그아웃 요청에 실패했습니다."));
    }
});

// 저장 상태를 동기화하고 최초 대시보드 렌더링
saveState();
renderSession();
renderAll();
activatePanel(activePanel);
hydrateDashboard();

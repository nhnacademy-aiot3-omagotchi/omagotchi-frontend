const cohortForm = document.querySelector("[data-cohort-form]");
const previewName = document.querySelector("[data-preview-name]");
const previewPeriod = document.querySelector("[data-preview-period]");
const previewCode = document.querySelector("[data-preview-code]");
const issueCodeButtons = document.querySelectorAll("[data-issue-code]");
const cohortList = document.querySelector("[data-cohort-list]");
const codeList = document.querySelector("[data-code-list]");
const auditList = document.querySelector("[data-audit-list]");
const tabButtons = document.querySelectorAll("[data-dashboard-tab]");
const panels = document.querySelectorAll("[data-dashboard-panel]");
const panelStatus = document.querySelector(".panel-status");
const dashboardBubble = document.querySelector("[data-dashboard-bubble]");

const cohortsStorageKey = "omagotchiManagerCohorts";
const auditsStorageKey = "omagotchiManagerAuditLogs";
let selectedCohortId = null;

const readJson = (key, fallbackValue) => {
    try {
        return JSON.parse(sessionStorage.getItem(key)) || fallbackValue;
    } catch {
        return fallbackValue;
    }
};

const writeJson = (key, value) => {
    sessionStorage.setItem(key, JSON.stringify(value));
};

const getCohorts = () => readJson(cohortsStorageKey, []);
const saveCohorts = (cohorts) => writeJson(cohortsStorageKey, cohorts);
const getAudits = () => readJson(auditsStorageKey, []);
const saveAudits = (audits) => writeJson(auditsStorageKey, audits);

const formatDate = (dateValue) => {
    if (!dateValue) {
        return "";
    }

    return dateValue.replaceAll("-", ".");
};

const getStatusLabel = (status) => {
    const labels = {
        READY: "준비",
        RUNNING: "운영",
        ENDED: "종료"
    };

    return labels[status] || status || "준비";
};

const addAudit = (action, target, detail) => {
    const audits = getAudits();
    audits.unshift({
        id: `audit-${Date.now()}`,
        occurredAt: new Date().toLocaleString("ko-KR"),
        action,
        target,
        detail
    });
    saveAudits(audits.slice(0, 12));
};

const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "COH-";

    for (let index = 0; index < 6; index += 1) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }

    return code;
};

const updatePreview = () => {
    const cohortName = cohortForm.cohortName.value.trim();
    const startDate = formatDate(cohortForm.startDate.value);
    const endDate = formatDate(cohortForm.endDate.value);
    const capacity = cohortForm.capacity.value.trim();

    previewName.textContent = cohortName || "아직 기수 이름이 없습니다";

    if (startDate && endDate) {
        previewPeriod.textContent = `${startDate} - ${endDate}${capacity ? ` / 정원 ${capacity}명` : ""}`;
    } else if (startDate) {
        previewPeriod.textContent = `${startDate} 시작${capacity ? ` / 정원 ${capacity}명` : ""}`;
    } else if (endDate) {
        previewPeriod.textContent = `${endDate} 종료${capacity ? ` / 정원 ${capacity}명` : ""}`;
    } else if (capacity) {
        previewPeriod.textContent = `정원 ${capacity}명`;
    } else {
        previewPeriod.textContent = "기간을 입력하면 여기에 표시됩니다.";
    }
};

const renderCohorts = () => {
    const cohorts = getCohorts();

    if (cohorts.length === 0) {
        cohortList.innerHTML = `
            <tr>
                <td colspan="5">아직 생성된 기수가 없습니다.</td>
            </tr>
        `;
        return;
    }

    cohortList.innerHTML = cohorts.map((cohort) => {
        const period = cohort.startDate && cohort.endDate
            ? `${formatDate(cohort.startDate)} - ${formatDate(cohort.endDate)}`
            : "기간 미정";
        const codeLabel = cohort.joinCode || cohort.codeStatus || "미발급";
        const codeClass = cohort.joinCode ? "" : " is-muted";

        return `
            <tr data-cohort-id="${cohort.id}">
                <td>${cohort.name}</td>
                <td><span class="table-badge">${getStatusLabel(cohort.status)}</span></td>
                <td>${period}</td>
                <td>${cohort.memberCount || 0}명</td>
                <td><span class="table-badge${codeClass}">${codeLabel}</span></td>
            </tr>
        `;
    }).join("");
};

const renderCodes = () => {
    const cohorts = getCohorts();

    if (cohorts.length === 0) {
        codeList.innerHTML = `
            <tr>
                <td colspan="5">기수를 만든 뒤 가입 코드를 발급할 수 있습니다.</td>
            </tr>
        `;
        return;
    }

    codeList.innerHTML = cohorts.map((cohort) => {
        const codeLabel = cohort.joinCode || "미발급";
        const status = cohort.joinCode ? "활성" : "대기";
        const expiresAt = cohort.expiresAt ? formatDate(cohort.expiresAt) : "기수 종료일 기준";
        const used = cohort.joinCode ? `${cohort.memberCount || 0}/${cohort.capacity || "-"}명` : "-";

        return `
            <tr data-cohort-id="${cohort.id}">
                <td>${cohort.name}</td>
                <td><span class="table-badge${cohort.joinCode ? "" : " is-muted"}">${codeLabel}</span></td>
                <td>${status}</td>
                <td>${expiresAt}</td>
                <td>${used}</td>
            </tr>
        `;
    }).join("");
};

const renderAudits = () => {
    const audits = getAudits();

    if (audits.length === 0) {
        auditList.innerHTML = `
            <tr>
                <td colspan="4">아직 세션 작업 이력이 없습니다.</td>
            </tr>
        `;
        return;
    }

    auditList.innerHTML = audits.map((audit) => `
        <tr>
            <td>${audit.occurredAt}</td>
            <td>${audit.action}</td>
            <td>${audit.target}</td>
            <td>${audit.detail}</td>
        </tr>
    `).join("");
};

const renderAll = () => {
    renderCohorts();
    renderCodes();
    renderAudits();

    const cohorts = getCohorts();
    const selected = cohorts.find((cohort) => cohort.id === selectedCohortId);

    if (selected) {
        previewCode.textContent = selected.joinCode || "기수 생성 후 발급";
        issueCodeButtons.forEach((button) => {
            button.disabled = false;
        });
        return;
    }

    selectedCohortId = null;
    previewCode.textContent = "기수 생성 후 발급";
    issueCodeButtons.forEach((button) => {
        button.disabled = true;
    });
};

const activatePanel = (panelName) => {
    tabButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.dashboardTab === panelName);
    });

    panels.forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.dashboardPanel === panelName);
    });

    sessionStorage.setItem("omagotchiManagerDashboardTab", panelName);
};

const createCohort = () => {
    const name = cohortForm.cohortName.value.trim();

    if (!name) {
        panelStatus.textContent = "이름 필요";
        dashboardBubble.innerHTML = "일단 만들어봐요<br />기수 이름부터 적어주세요.";
        cohortForm.cohortName.focus();
        return;
    }

    const cohort = {
        id: `cohort-${Date.now()}`,
        name,
        description: cohortForm.description.value.trim(),
        startDate: cohortForm.startDate.value,
        endDate: cohortForm.endDate.value,
        status: cohortForm.status.value,
        capacity: cohortForm.capacity.value.trim(),
        memberCount: 0,
        joinCode: "",
        codeStatus: "미발급",
        expiresAt: cohortForm.endDate.value
    };
    const cohorts = getCohorts();

    cohorts.unshift(cohort);
    saveCohorts(cohorts);
    selectedCohortId = cohort.id;
    panelStatus.textContent = "생성됨";
    dashboardBubble.innerHTML = "기수 생성 완료!<br />이제 가입 코드를 발급하세요.";
    addAudit("기수 생성", cohort.name, `${getStatusLabel(cohort.status)} 상태로 생성`);
    renderAll();
    activatePanel("cohorts");
};

const issueJoinCode = () => {
    const cohorts = getCohorts();
    const selectedIndex = cohorts.findIndex((cohort) => cohort.id === selectedCohortId);

    if (selectedIndex < 0) {
        panelStatus.textContent = "기수 필요";
        return;
    }

    const selected = cohorts[selectedIndex];
    if (selected.joinCode) {
        previewCode.textContent = selected.joinCode;
        panelStatus.textContent = "발급 완료";
        dashboardBubble.innerHTML = "이미 발급 되었습니다.<br />기존 코드를 사용하세요.";
        renderAll();
        activatePanel("codes");
        return;
    }

    selected.joinCode = selected.joinCode || generateCode();
    selected.codeStatus = "활성";
    selected.expiresAt = selected.endDate;
    cohorts[selectedIndex] = selected;
    saveCohorts(cohorts);
    previewCode.textContent = selected.joinCode;
    panelStatus.textContent = "코드 발급";
    dashboardBubble.innerHTML = "가입 코드 발급 완료!<br />이 코드를 참가자에게 공유하세요.";
    addAudit("가입 코드 발급", selected.name, selected.joinCode);
    renderAll();
    activatePanel("codes");
};

cohortForm.addEventListener("input", updatePreview);

cohortForm.addEventListener("submit", (event) => {
    event.preventDefault();
    updatePreview();
    createCohort();
});

issueCodeButtons.forEach((button) => {
    button.addEventListener("click", issueJoinCode);
});

tabButtons.forEach((button) => {
    button.addEventListener("click", () => activatePanel(button.dataset.dashboardTab));
});

cohortList.addEventListener("click", (event) => {
    const row = event.target.closest("[data-cohort-id]");

    if (!row) {
        return;
    }

    selectedCohortId = row.dataset.cohortId;
    renderAll();
});

updatePreview();
renderAll();
activatePanel(sessionStorage.getItem("omagotchiManagerDashboardTab") || "cohorts");

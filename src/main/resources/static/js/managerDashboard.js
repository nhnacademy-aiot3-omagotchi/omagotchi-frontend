// 관리자 대시보드 DOM 요소
const cohortForm = document.querySelector("[data-cohort-form]");
const cohortFormTitle = document.querySelector("[data-cohort-form-title]");
const cohortSubmit = document.querySelector("[data-cohort-submit]");
const cohortCancel = document.querySelector("[data-cohort-cancel]");
const cohortEditor = document.querySelector("[data-cohort-editor]");
const openCohortFormButton = document.querySelector("[data-open-cohort-form]");
const previewName = document.querySelector("[data-preview-name]");
const previewPeriod = document.querySelector("[data-preview-period]");
const previewCode = document.querySelector("[data-preview-code]");
const issueCodeButtons = document.querySelectorAll("[data-issue-code]");
const cohortList = document.querySelector("[data-cohort-list]");
const codeList = document.querySelector("[data-code-list]");
const applicationList = document.querySelector("[data-application-list]");
const memberList = document.querySelector("[data-member-list]");
const memberSearch = document.querySelector("[data-member-search]");
const seedApplicationsButton = document.querySelector("[data-seed-applications]");
const seedMembersButton = document.querySelector("[data-seed-members]");
const auditList = document.querySelector("[data-audit-list]");
const navTabButtons = document.querySelectorAll(".manager-dashboard-nav [data-dashboard-tab]");
const tabTriggers = document.querySelectorAll("[data-dashboard-tab]");
const panels = document.querySelectorAll("[data-dashboard-panel]");
const panelStatus = document.querySelector(".panel-status");
const dashboardBubble = document.querySelector("[data-dashboard-bubble]");
const cohortDetail = document.querySelector("[data-cohort-detail]");
const managerOrganization = document.querySelector("[data-manager-organization]");
const managerName = document.querySelector("[data-manager-name]");
const managerLoginId = document.querySelector("[data-manager-login-id]");

// 현재 관리자 목업 세션
const currentManager = {
    loginId: sessionStorage.getItem("omagotchiManagerLoginId") || "manager",
    name: sessionStorage.getItem("omagotchiManagerName") || "관리자",
    organization: sessionStorage.getItem("omagotchiManagerOrganization") || "소속기관 미등록"
};
const managerStorageScope = `${currentManager.organization}:${currentManager.loginId}`.replaceAll(/\s+/g, "_");
const cohortsStorageKey = `omagotchiManagerCohorts:${managerStorageScope}`;
const applicationsStorageKey = `omagotchiManagerApplications:${managerStorageScope}`;
const auditsStorageKey = `omagotchiManagerAuditLogs:${managerStorageScope}`;
let selectedCohortId = null;
let editingCohortId = null;

// 대시보드 목업 관리자 추가 지정에 사용
const sampleMembers = [
    { id: "user-01", name: "손재민", loginId: "jaemin.son", status: "ACTIVE", role: "USER" },
    { id: "user-02", name: "문재민", loginId: "jaemin.mun", status: "ACTIVE", role: "COHORT_MANAGER" },
    { id: "user-03", name: "박지우", loginId: "jioo.park", status: "PENDING", role: "USER" },
    { id: "user-04", name: "박상민", loginId: "sangmin.park", status: "ACTIVE", role: "USER" }
];

// 참가 신청 목업 사용자
const sampleApplicants = [
    { id: "apply-user-01", name: "권세윤", loginId: "seyoon.gwun" },
    { id: "apply-user-02", name: "강영진", loginId: "yungjin.kang" },
    { id: "apply-user-03", name: "박찬주", loginId: "chanju.park" },
    { id: "apply-user-04", name: "장재혁", loginId: "jaehyuk.jang" }
];

// 세션 저장소 JSON 유틸
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

// 관리자 세션 표시
const renderManagerSession = () => {
    managerOrganization.textContent = currentManager.organization;
    managerName.textContent = `${currentManager.name} 관리자`;
    managerLoginId.textContent = currentManager.loginId;
};

// 기수 데이터 정규화
const normalizeCohort = (cohort) => ({
    id: cohort.id || `cohort-${Date.now()}`,
    name: cohort.name || "이름 없는 기수",
    description: cohort.description || "",
    startDate: cohort.startDate || "",
    endDate: cohort.endDate || "",
    status: cohort.status || "READY",
    capacity: cohort.capacity || "",
    memberCount: Number(cohort.memberCount || cohort.members?.length || 0),
    joinCode: cohort.joinCode || "",
    codeStatus: cohort.codeStatus || (cohort.joinCode ? "ACTIVE" : "미발급"),
    expiresAt: cohort.expiresAt || cohort.endDate || "",
    members: Array.isArray(cohort.members) ? cohort.members : []
});

// 참가 신청 데이터 정규화
const normalizeApplication = (application) => ({
    id: application.id || `application-${Date.now()}`,
    cohortId: application.cohortId || "",
    cohortName: application.cohortName || "기수 미지정",
    userId: application.userId || "",
    name: application.name || "이름 없음",
    loginId: application.loginId || "",
    status: application.status || "PENDING",
    requestedAt: application.requestedAt || new Date().toLocaleString("ko-KR"),
    rejectReason: application.rejectReason || ""
});

// 기수/감사 로그 저장소 접근
const getCohorts = () => readJson(cohortsStorageKey, []).map(normalizeCohort);
const saveCohorts = (cohorts) => writeJson(cohortsStorageKey, cohorts.map(normalizeCohort));
const getApplications = () => readJson(applicationsStorageKey, []).map(normalizeApplication);
const saveApplications = (applications) => writeJson(applicationsStorageKey, applications.map(normalizeApplication));
const getAudits = () => readJson(auditsStorageKey, []);
const saveAudits = (audits) => writeJson(auditsStorageKey, audits);

// 표시용 포맷 변환
const formatDate = (dateValue) => {
    if (!dateValue) {
        return "";
    }

    return dateValue.replaceAll("-", ".");
};

const getPeriod = (cohort) => {
    if (cohort.startDate && cohort.endDate) {
        return `${formatDate(cohort.startDate)} - ${formatDate(cohort.endDate)}`;
    }

    return "기간 미정";
};

const getStatusLabel = (status) => {
    const labels = {
        READY: "준비",
        RUNNING: "운영",
        ENDED: "종료"
    };

    return labels[status] || status || "준비";
};

const getMemberStatusLabel = (status) => {
    const labels = {
        ACTIVE: "활성",
        PENDING: "대기",
        INACTIVE: "비활성",
        ENDED: "종료"
    };

    return labels[status] || status || "활성";
};

const getApplicationStatusLabel = (status) => {
    const labels = {
        PENDING: "대기",
        APPROVED: "승인",
        REJECTED: "거절"
    };

    return labels[status] || status || "대기";
};

const getRoleLabel = (role) => {
    if (role === "COHORT_MANAGER") {
        return "기수 관리자";
    }

    return "일반";
};

const getCodeStatusLabel = (cohort) => {
    if (!cohort.joinCode) {
        return "미발급";
    }

    return cohort.codeStatus === "INACTIVE" ? "비활성" : "활성";
};

// 소속 인원 수 갱신
const syncMemberCount = (cohort) => {
    cohort.memberCount = cohort.members.filter((member) => member.status !== "ENDED").length;
    return cohort;
};

// 감사 로그 추가
const addAudit = (action, target, detail) => {
    const audits = getAudits();
    audits.unshift({
        id: `audit-${Date.now()}`,
        occurredAt: new Date().toLocaleString("ko-KR"),
        action,
        target,
        detail
    });
    saveAudits(audits.slice(0, 20));
};

// 대시보드 말풍선
const showBubble = (message) => {
    dashboardBubble.innerHTML = message;
};

// 버튼 피드백
const flashButton = (button, text) => {
    if (!button) {
        return;
    }

    const originalText = button.textContent;
    button.textContent = text;
    button.classList.add("is-feedback");

    window.setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove("is-feedback");
    }, 1200);
};

// 가입 코드 생성
const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "COH-";

    for (let index = 0; index < 6; index += 1) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }

    return code;
};

// 기수 생성 미리보기 갱신
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

// 기수 편집기 열기/닫기
const openCohortEditor = () => {
    cohortEditor.classList.add("is-editor-open");
};

const closeCohortEditor = () => {
    cohortEditor.classList.remove("is-editor-open");
};

// 기수 폼 모드 변경
const setFormMode = (mode, cohort = null, shouldOpen = true) => {
    if (shouldOpen) {
        openCohortEditor();
    } else {
        closeCohortEditor();
    }

    if (mode === "edit" && cohort) {
        editingCohortId = cohort.id;
        cohortFormTitle.textContent = "기수 수정";
        cohortSubmit.textContent = "기수 저장";
        cohortCancel.hidden = false;
        cohortForm.cohortName.value = cohort.name;
        cohortForm.description.value = cohort.description;
        cohortForm.startDate.value = cohort.startDate;
        cohortForm.endDate.value = cohort.endDate;
        cohortForm.status.value = cohort.status;
        cohortForm.capacity.value = cohort.capacity;
        panelStatus.textContent = "수정중";
        showBubble("기수 정보를 고친 뒤<br />저장하면 됩니다.");
        updatePreview();
        return;
    }

    editingCohortId = null;
    cohortFormTitle.textContent = "기수 만들기";
    cohortSubmit.textContent = "기수 만들기";
    cohortCancel.hidden = !shouldOpen;
    cohortForm.reset();
    panelStatus.textContent = "준비중";
    updatePreview();
};

// 기수 목록 렌더링
const renderCohorts = () => {
    const cohorts = getCohorts();

    if (cohorts.length === 0) {
        cohortList.innerHTML = `
            <tr>
                <td colspan="6">아직 생성된 기수가 없습니다.</td>
            </tr>
        `;
        return;
    }

    cohortList.innerHTML = cohorts.map((cohort) => {
        const codeLabel = cohort.joinCode || "미발급";
        const codeClass = cohort.joinCode ? "" : " is-muted";

        return `
            <tr data-cohort-id="${cohort.id}">
                <td>${cohort.name}</td>
                <td><span class="table-badge">${getStatusLabel(cohort.status)}</span></td>
                <td>${getPeriod(cohort)}</td>
                <td>${cohort.memberCount || cohort.members.length}명</td>
                <td><span class="table-badge${codeClass}">${codeLabel}</span></td>
                <td>
                    <div class="manager-action-group">
                        <button class="manager-action-button" type="button" data-action="detail" data-cohort-id="${cohort.id}">상세</button>
                        <button class="manager-action-button" type="button" data-action="edit" data-cohort-id="${cohort.id}">수정</button>
                        <button class="manager-action-button" type="button" data-action="show-code" data-cohort-id="${cohort.id}">코드</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
};

// 기수 상세 렌더링
const renderDetail = () => {
    const selected = getCohorts().find((cohort) => cohort.id === selectedCohortId);

    if (!selected) {
        cohortDetail.dataset.expanded = "false";
        cohortDetail.innerHTML = `
            <span class="panel-kicker">기수 상세</span>
            <strong>기수를 선택하면 상세 정보가 표시됩니다.</strong>
            <p>상세, 수정, 코드 발급, 소속 사용자 관리 흐름을 이 영역에서 확인합니다.</p>
        `;
        return;
    }

    cohortDetail.dataset.expanded = "true";

    cohortDetail.innerHTML = `
        <span class="panel-kicker">기수 상세</span>
        <strong>${selected.name}</strong>
        <p>${selected.description || "등록된 설명이 없습니다."}</p>
        <div class="cohort-detail-grid">
            <div class="cohort-detail-item">
                <span>운영 상태</span>
                <strong>${getStatusLabel(selected.status)}</strong>
            </div>
            <div class="cohort-detail-item">
                <span>운영 기간</span>
                <strong>${getPeriod(selected)}</strong>
            </div>
            <div class="cohort-detail-item">
                <span>정원</span>
                <strong>${selected.capacity || "-"}명</strong>
            </div>
            <div class="cohort-detail-item">
                <span>가입 코드</span>
                <strong>${selected.joinCode || "미발급"}</strong>
            </div>
        </div>
    `;
};

// 가입 코드 목록 렌더링
const renderCodes = () => {
    const cohorts = getCohorts();

    if (cohorts.length === 0) {
        codeList.innerHTML = `
            <tr>
                <td colspan="6">기수를 만든 뒤 가입 코드를 발급할 수 있습니다.</td>
            </tr>
        `;
        return;
    }

    codeList.innerHTML = cohorts.map((cohort) => {
        const codeLabel = cohort.joinCode || "미발급";
        const status = getCodeStatusLabel(cohort);
        const expiresAt = cohort.expiresAt ? formatDate(cohort.expiresAt) : "기수 종료일 기준";
        const used = cohort.joinCode ? `${cohort.members.length || cohort.memberCount || 0}/${cohort.capacity || "-"}명` : "-";
        const toggleLabel = cohort.codeStatus === "INACTIVE" ? "활성화" : "폐기";
        const issueLabel = cohort.joinCode ? "재발급" : "발급";

        return `
            <tr data-cohort-id="${cohort.id}">
                <td>${cohort.name}</td>
                <td><span class="table-badge${cohort.joinCode ? "" : " is-muted"}">${codeLabel}</span></td>
                <td>${status}</td>
                <td>${expiresAt}</td>
                <td>${used}</td>
                <td>
                    <div class="manager-action-group">
                        <button class="manager-action-button" type="button" data-action="copy-code" data-cohort-id="${cohort.id}" ${cohort.joinCode ? "" : "disabled"}>복사</button>
                        <button class="manager-action-button" type="button" data-action="toggle-code" data-cohort-id="${cohort.id}" ${cohort.joinCode ? "" : "disabled"}>${toggleLabel}</button>
                        <button class="manager-action-button" type="button" data-action="issue" data-cohort-id="${cohort.id}">${issueLabel}</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
};

// 참가 신청 목록 렌더링
const renderApplications = () => {
    const applications = getApplications();

    if (applications.length === 0) {
        applicationList.innerHTML = `
            <tr>
                <td colspan="7">아직 참가 신청이 없습니다.</td>
            </tr>
        `;
        return;
    }

    applicationList.innerHTML = applications.map((application) => {
        const isPending = application.status === "PENDING";
        const badgeClass = application.status === "REJECTED" ? " is-danger" : "";

        return `
            <tr data-application-id="${application.id}">
                <td>${application.name}</td>
                <td>${application.loginId}</td>
                <td>${application.cohortName}</td>
                <td><span class="table-badge${badgeClass}">${getApplicationStatusLabel(application.status)}</span></td>
                <td>${application.requestedAt}</td>
                <td>${application.rejectReason || "-"}</td>
                <td>
                    <div class="manager-action-group">
                        <button class="manager-action-button is-active" type="button" data-action="approve-application" data-application-id="${application.id}" ${isPending ? "" : "disabled"}>승인</button>
                        <button class="manager-action-button is-danger" type="button" data-action="reject-application" data-application-id="${application.id}" ${isPending ? "" : "disabled"}>거절</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
};

// 소속 사용자 목록 렌더링
const renderMembers = () => {
    const selected = getCohorts().find((cohort) => cohort.id === selectedCohortId);

    if (!selected) {
        memberList.innerHTML = `
            <tr>
                <td colspan="5">기수를 선택하면 소속 사용자 목록을 확인할 수 있습니다.</td>
            </tr>
        `;
        return;
    }

    const keyword = memberSearch.value.trim().toLowerCase();
    const members = selected.members.filter((member) => {
        if (!keyword) {
            return true;
        }

        return member.name.toLowerCase().includes(keyword) || member.loginId.toLowerCase().includes(keyword);
    });

    if (members.length === 0) {
        memberList.innerHTML = `
            <tr>
                <td colspan="5">표시할 사용자가 없습니다.</td>
            </tr>
        `;
        return;
    }

    memberList.innerHTML = members.map((member) => {
        const isManager = member.role === "COHORT_MANAGER";

        return `
            <tr data-member-id="${member.id}">
                <td>${member.name}</td>
                <td>${member.loginId}</td>
                <td>${getMemberStatusLabel(member.status)}</td>
                <td><span class="table-badge${isManager ? "" : " is-muted"}">${getRoleLabel(member.role)}</span></td>
                <td>
                    <div class="manager-action-group">
                        <button class="manager-action-button${isManager ? " is-danger" : " is-active"}" type="button" data-action="toggle-manager" data-member-id="${member.id}" ${member.status === "ENDED" ? "disabled" : ""}>
                            ${isManager ? "관리자 해제" : "관리자 지정"}
                        </button>
                        <button class="manager-action-button" type="button" data-action="toggle-member-status" data-member-id="${member.id}" ${member.status === "ENDED" ? "disabled" : ""}>
                            ${member.status === "INACTIVE" ? "활성화" : "비활성화"}
                        </button>
                        <button class="manager-action-button is-danger" type="button" data-action="end-member" data-member-id="${member.id}" ${member.status === "ENDED" ? "disabled" : ""}>
                            종료
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
};

// 감사 로그 렌더링
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

// 선택 상태 갱신
const updateSelectionState = () => {
    const selected = getCohorts().find((cohort) => cohort.id === selectedCohortId);

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

// 전체 렌더링
const renderAll = () => {
    renderCohorts();
    renderDetail();
    renderCodes();
    renderApplications();
    renderMembers();
    renderAudits();
    updateSelectionState();
};

// 탭 전환
const activatePanel = (panelName) => {
    if (panelName !== "cohorts") {
        closeCohortEditor();
    }

    navTabButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.dashboardTab === panelName);
    });

    panels.forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.dashboardPanel === panelName);
    });

    sessionStorage.setItem("omagotchiManagerDashboardTab", panelName);
};

// 기수 폼 값 수집
const getFormPayload = () => ({
    name: cohortForm.cohortName.value.trim(),
    description: cohortForm.description.value.trim(),
    startDate: cohortForm.startDate.value,
    endDate: cohortForm.endDate.value,
    status: cohortForm.status.value,
    capacity: cohortForm.capacity.value.trim()
});

// 기수 생성/수정 저장
const saveCohortFromForm = () => {
    const payload = getFormPayload();

    if (!payload.name) {
        panelStatus.textContent = "이름 필요";
        showBubble("일단 만들어봐요<br />기수 이름부터 적어주세요.");
        cohortForm.cohortName.focus();
        return;
    }

    const cohorts = getCohorts();

    if (editingCohortId) {
        const index = cohorts.findIndex((cohort) => cohort.id === editingCohortId);

        if (index < 0) {
            setFormMode("create", null, false);
            return;
        }

        cohorts[index] = normalizeCohort({
            ...cohorts[index],
            ...payload,
            expiresAt: payload.endDate || cohorts[index].expiresAt
        });
        saveCohorts(cohorts);
        selectedCohortId = cohorts[index].id;
        panelStatus.textContent = "수정됨";
        showBubble("기수 수정 완료!<br />목록과 상세에 반영했습니다.");
        addAudit("기수 수정", cohorts[index].name, "기본 정보 수정");
        setFormMode("create", null, false);
        renderAll();
        activatePanel("cohorts");
        return;
    }

    const cohort = normalizeCohort({
        id: `cohort-${Date.now()}`,
        ...payload,
        memberCount: 0,
        joinCode: "",
        codeStatus: "미발급",
        expiresAt: payload.endDate,
        members: []
    });

    cohorts.unshift(cohort);
    saveCohorts(cohorts);
    selectedCohortId = cohort.id;
    panelStatus.textContent = "생성됨";
    showBubble("기수 생성 완료!<br />이제 가입 코드를 발급하세요.");
    addAudit("기수 생성", cohort.name, `${getStatusLabel(cohort.status)} 상태로 생성`);
    setFormMode("create", null, false);
    renderAll();
    activatePanel("cohorts");
};

// 가입 코드 발급
const issueJoinCode = (cohortId = selectedCohortId, feedbackButton = null) => {
    const cohorts = getCohorts();
    const selectedIndex = cohorts.findIndex((cohort) => cohort.id === cohortId);

    if (selectedIndex < 0) {
        panelStatus.textContent = "기수 필요";
        showBubble("코드를 발급할<br />기수를 먼저 선택해주세요.");
        return;
    }

    const selected = cohorts[selectedIndex];
    selectedCohortId = selected.id;

    selected.joinCode = generateCode();
    selected.codeStatus = "ACTIVE";
    selected.expiresAt = selected.endDate;
    cohorts[selectedIndex] = selected;
    saveCohorts(cohorts);
    previewCode.textContent = selected.joinCode;
    panelStatus.textContent = "코드 발급";
    flashButton(feedbackButton, "발급됨");
    addAudit("가입 코드 발급/재발급", selected.name, selected.joinCode);
    window.setTimeout(() => {
        renderAll();
        activatePanel("codes");
    }, 900);
};

// 클립보드 복사
const copyText = async (text) => {
    if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
};

// 가입 코드 복사
const copyCode = async (cohortId, feedbackButton = null) => {
    const cohort = getCohorts().find((item) => item.id === cohortId);

    if (!cohort?.joinCode) {
        return;
    }

    try {
        await copyText(cohort.joinCode);
    } catch {
        flashButton(feedbackButton, "실패");
        return;
    }

    selectedCohortId = cohort.id;
    flashButton(feedbackButton, "복사됨");
    addAudit("가입 코드 복사", cohort.name, cohort.joinCode);
};

// 가입 코드 활성/비활성 전환
const toggleCodeStatus = (cohortId, feedbackButton = null) => {
    const cohorts = getCohorts();
    const index = cohorts.findIndex((cohort) => cohort.id === cohortId);

    if (index < 0 || !cohorts[index].joinCode) {
        return;
    }

    cohorts[index].codeStatus = cohorts[index].codeStatus === "INACTIVE" ? "ACTIVE" : "INACTIVE";
    saveCohorts(cohorts);
    selectedCohortId = cohorts[index].id;
    const label = getCodeStatusLabel(cohorts[index]);
    flashButton(feedbackButton, label === "활성" ? "활성됨" : "비활성됨");
    addAudit("가입 코드 상태 변경", cohorts[index].name, label === "활성" ? "활성화" : "폐기");
    window.setTimeout(renderAll, 900);
};

// 참가 신청 목업 추가
const seedApplications = () => {
    const cohorts = getCohorts();

    if (cohorts.length === 0) {
        showBubble("신청을 넣을<br />기수를 먼저 만들어주세요.");
        return;
    }

    const applications = getApplications();
    const pendingExists = applications.some((application) => application.status === "PENDING");

    if (pendingExists) {
        showBubble("이미 대기 중인<br />목업 신청이 있습니다.");
        return;
    }

    const targetCohort = cohorts.find((cohort) => cohort.id === selectedCohortId) || cohorts[0];
    const nextApplications = sampleApplicants.map((applicant, index) => normalizeApplication({
        id: `application-${Date.now()}-${index}`,
        cohortId: targetCohort.id,
        cohortName: targetCohort.name,
        userId: applicant.id,
        name: applicant.name,
        loginId: applicant.loginId,
        status: "PENDING"
    }));

    saveApplications([...nextApplications, ...applications]);
    selectedCohortId = targetCohort.id;
    addAudit("참가 신청 목업 추가", targetCohort.name, `${nextApplications.length}건 추가`);
    showBubble("참가 신청이<br />대기 목록에 들어왔습니다.");
    renderAll();
    activatePanel("applications");
};

// 참가 신청 승인
const approveApplication = (applicationId, feedbackButton = null) => {
    const applications = getApplications();
    const applicationIndex = applications.findIndex((application) => application.id === applicationId);

    if (applicationIndex < 0) {
        return;
    }

    const application = applications[applicationIndex];
    const cohorts = getCohorts();
    const cohortIndex = cohorts.findIndex((cohort) => cohort.id === application.cohortId);

    if (cohortIndex < 0) {
        showBubble("신청한 기수를<br />찾을 수 없습니다.");
        return;
    }

    const duplicateMember = cohorts[cohortIndex].members.some((member) => member.loginId === application.loginId);

    if (duplicateMember) {
        applications[applicationIndex].status = "REJECTED";
        applications[applicationIndex].rejectReason = "중복 소속";
        saveApplications(applications);
        showBubble("중복 가입은<br />불가능합니다.");
        addAudit("참가 신청 거절", application.cohortName, `${application.loginId}: 중복 소속`);
        renderAll();
        return;
    }

    cohorts[cohortIndex].members.push({
        id: application.userId,
        name: application.name,
        loginId: application.loginId,
        status: "ACTIVE",
        role: "USER"
    });
    syncMemberCount(cohorts[cohortIndex]);
    applications[applicationIndex].status = "APPROVED";
    applications[applicationIndex].rejectReason = "";
    saveCohorts(cohorts);
    saveApplications(applications);
    selectedCohortId = cohorts[cohortIndex].id;
    flashButton(feedbackButton, "승인됨");
    showBubble(`${application.name} 님을<br />${application.cohortName}에 승인했습니다.`);
    addAudit("참가 신청 승인", application.cohortName, application.loginId);
    renderAll();
};

// 참가 신청 거절
const rejectApplication = (applicationId, feedbackButton = null) => {
    const applications = getApplications();
    const index = applications.findIndex((application) => application.id === applicationId);

    if (index < 0) {
        return;
    }

    const reason = window.prompt("거절 사유를 입력하세요.", "가입 코드 또는 신청 정보 확인 필요");

    if (reason === null) {
        return;
    }

    applications[index].status = "REJECTED";
    applications[index].rejectReason = reason.trim() || "사유 미입력";
    saveApplications(applications);
    flashButton(feedbackButton, "거절됨");
    showBubble("참가 신청을<br />거절 처리했습니다.");
    addAudit("참가 신청 거절", applications[index].cohortName, `${applications[index].loginId}: ${applications[index].rejectReason}`);
    renderAll();
};

// 소속 사용자 목업 추가
const seedMembers = () => {
    const cohorts = getCohorts();
    const index = cohorts.findIndex((cohort) => cohort.id === selectedCohortId);

    if (index < 0) {
        showBubble("소속 사용자를 넣을<br />기수를 먼저 선택해주세요.");
        return;
    }

    if (cohorts[index].members.length > 0) {
        showBubble("이미 목업 사용자가<br />등록되어 있습니다.");
        return;
    }

    cohorts[index].members = sampleMembers.map((member) => ({ ...member }));
    syncMemberCount(cohorts[index]);
    saveCohorts(cohorts);
    addAudit("소속 사용자 목업 추가", cohorts[index].name, `${sampleMembers.length}명 추가`);
    showBubble("소속 사용자 목업을<br />추가했습니다.");
    renderAll();
};

// 기수 관리자 역할 변경
const toggleManagerRole = (memberId) => {
    const cohorts = getCohorts();
    const index = cohorts.findIndex((cohort) => cohort.id === selectedCohortId);

    if (index < 0) {
        return;
    }

    const member = cohorts[index].members.find((item) => item.id === memberId);

    if (!member) {
        return;
    }

    member.role = member.role === "COHORT_MANAGER" ? "USER" : "COHORT_MANAGER";
    syncMemberCount(cohorts[index]);
    saveCohorts(cohorts);
    showBubble(`${member.name} 님을<br />${getRoleLabel(member.role)}로 변경했습니다.`);
    addAudit("기수 관리자 변경", cohorts[index].name, `${member.name}: ${getRoleLabel(member.role)}`);
    renderAll();
};

// 소속 상태 변경
const toggleMemberStatus = (memberId) => {
    const cohorts = getCohorts();
    const index = cohorts.findIndex((cohort) => cohort.id === selectedCohortId);

    if (index < 0) {
        return;
    }

    const member = cohorts[index].members.find((item) => item.id === memberId);

    if (!member || member.status === "ENDED") {
        return;
    }

    member.status = member.status === "INACTIVE" ? "ACTIVE" : "INACTIVE";
    syncMemberCount(cohorts[index]);
    saveCohorts(cohorts);
    showBubble(`${member.name} 님의<br />소속 상태를 변경했습니다.`);
    addAudit("소속 상태 변경", cohorts[index].name, `${member.loginId}: ${getMemberStatusLabel(member.status)}`);
    renderAll();
};

// 소속 종료 처리
const endMember = (memberId) => {
    const cohorts = getCohorts();
    const index = cohorts.findIndex((cohort) => cohort.id === selectedCohortId);

    if (index < 0) {
        return;
    }

    const member = cohorts[index].members.find((item) => item.id === memberId);

    if (!member) {
        return;
    }

    member.status = "ENDED";
    member.role = "USER";
    syncMemberCount(cohorts[index]);
    saveCohorts(cohorts);
    showBubble(`${member.name} 님의<br />소속을 종료했습니다.`);
    addAudit("소속 종료", cohorts[index].name, member.loginId);
    renderAll();
};

// 기수 폼 이벤트
cohortForm.addEventListener("input", updatePreview);

cohortForm.addEventListener("submit", (event) => {
    event.preventDefault();
    updatePreview();
    saveCohortFromForm();
});

cohortCancel.addEventListener("click", () => {
    setFormMode("create", null, false);
    showBubble("기수 작업을 닫았습니다.<br />목록에서 다시 시작하세요.");
});

openCohortFormButton.addEventListener("click", () => {
    setFormMode("create", null, true);
    showBubble("새 기수 정보를<br />입력해주세요.");
});

// 가입 코드 발급 버튼 이벤트
issueCodeButtons.forEach((button) => {
    button.addEventListener("click", () => issueJoinCode(selectedCohortId, button));
});

// 참가 신청 목업 버튼 이벤트
seedApplicationsButton.addEventListener("click", seedApplications);

// 탭 버튼 이벤트
tabTriggers.forEach((button) => {
    button.addEventListener("click", () => activatePanel(button.dataset.dashboardTab));
});

// 기수 목록 액션 이벤트
cohortList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    const row = event.target.closest("[data-cohort-id]");

    if (!row) {
        return;
    }

    selectedCohortId = row.dataset.cohortId;
    const cohort = getCohorts().find((item) => item.id === selectedCohortId);

    if (!button) {
        renderAll();
        return;
    }

    if (button.dataset.action === "detail") {
        if (selectedCohortId === row.dataset.cohortId && cohortDetail.dataset.expanded === "true") {
            selectedCohortId = null;
            cohortDetail.dataset.expanded = "false";
            renderAll();
            return;
        }

        cohortDetail.dataset.expanded = "true";
        showBubble("기수 상세를<br />아래에 표시했습니다.");
        renderAll();
        return;
    }

    if (button.dataset.action === "edit") {
        setFormMode("edit", cohort);
        renderAll();
        return;
    }

    if (button.dataset.action === "show-code") {
        renderAll();
        activatePanel("codes");
    }
});

// 가입 코드 목록 액션 이벤트
codeList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");

    if (!button) {
        return;
    }

    const cohortId = button.dataset.cohortId;
    selectedCohortId = cohortId;

    if (button.dataset.action === "copy-code") {
        copyCode(cohortId, button);
        return;
    }

    if (button.dataset.action === "toggle-code") {
        toggleCodeStatus(cohortId, button);
        return;
    }

    if (button.dataset.action === "issue") {
        issueJoinCode(cohortId, button);
    }
});

// 참가 신청 목록 액션 이벤트
applicationList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");

    if (!button) {
        return;
    }

    if (button.dataset.action === "approve-application") {
        approveApplication(button.dataset.applicationId, button);
        return;
    }

    if (button.dataset.action === "reject-application") {
        rejectApplication(button.dataset.applicationId, button);
    }
});

// 소속 사용자 이벤트
seedMembersButton.addEventListener("click", seedMembers);

memberSearch.addEventListener("input", renderMembers);

memberList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");

    if (!button) {
        return;
    }

    if (button.dataset.action === "toggle-manager") {
        toggleManagerRole(button.dataset.memberId);
        return;
    }

    if (button.dataset.action === "toggle-member-status") {
        toggleMemberStatus(button.dataset.memberId);
        return;
    }

    if (button.dataset.action === "end-member") {
        endMember(button.dataset.memberId);
    }
});

// 관리자 대시보드 초기화
renderManagerSession();
setFormMode("create", null, false);
renderAll();
activatePanel(sessionStorage.getItem("omagotchiManagerDashboardTab") || "cohorts");

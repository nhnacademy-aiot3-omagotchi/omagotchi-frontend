(() => {
const store = window.OmagotchiDashboardStore.create();
let dialogCallback = null;

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
        // 게시판이 기수에 속하므로 공지도 기수마다 조회한다.
        // 예전에는 전 기수 공지를 한 번에 100건만 받아 화면에서 걸렀고,
        // 그 한도를 넘는 기수의 공지는 통째로 사라졌다.
        const notices = [];
        let partialFailure = false;
        let attendanceFailure = null;
        const hydratedCohorts = await Promise.all(source.map(async (cohort) => {
            const [
                membersResult,
                applicationsResult,
                attendanceResult,
                joinCodeResult,
                noticesResult
            ] = await Promise.allSettled([
                api.manager.getMembers(cohort.id),
                api.manager.getApplications(cohort.id),
                api.manager.getAttendanceRecords(cohort.id, attendanceDate),
                api.manager.getJoinCode(cohort.id),
                api.manager.getNotices(cohort.id, { page: 0, size: 100 })
            ]);
            const joinCodeMissing = joinCodeResult.status === "rejected"
                && joinCodeResult.reason?.code === "JOIN_CODE_NOT_FOUND";
            partialFailure ||= [membersResult, applicationsResult, attendanceResult, noticesResult]
                .some((result) => result.status === "rejected");
            partialFailure ||= joinCodeResult.status === "rejected" && !joinCodeMissing;
            if (attendanceResult.status === "rejected") {
                attendanceFailure ??= attendanceResult.reason;
            }
            if (noticesResult.status === "rejected") {
                console.error("관리자 공지 목록을 불러오지 못했습니다.", noticesResult.reason);
            } else {
                // 고정 공지는 items에서 빠져 pinned로 따로 온다. 사용자 홈은 배너에만 쓰지만
                // 관리자는 고정 해제도 해야 하므로 목록에 함께 넣는다.
                const noticePage = noticesResult.value;
                if (noticePage?.pinned) {
                    notices.push({ ...noticePage.pinned, cohortId: cohort.id });
                }
                if (Array.isArray(noticePage?.items)) {
                    notices.push(...noticePage.items.map((notice) => ({
                        ...notice,
                        cohortId: cohort.id
                    })));
                }
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
            // 출결 행은 소속 식별자만 갖고 오므로 구성원 목록과 이어 붙여야 이름을 그릴 수 있다.
            // 멤버 조회가 실패하면 members가 빈 배열이라 조회는 그대로 실패하고 이름만 빠진다.
            const membersByMembershipId = new Map(
                members.map((member) => [String(member.id), member])
            );
            const membersByUserId = new Map(
                members.filter((member) => member.userId).map((member) => [String(member.userId), member])
            );
            const attendance = Array.isArray(attendanceItems)
                ? attendanceItems.map((record) => {
                    const member = membersByMembershipId.get(String(record.cohortMembershipId))
                        || membersByUserId.get(String(record.userId));
                    return {
                        ...record,
                        date: record.attendanceDate,
                        checkIn: timeLabel(record.checkedInAt),
                        checkOut: timeLabel(record.checkedOutAt),
                        // 서버 닉네임 > 구성원 목록 닉네임 > 마스킹 순으로 내려간다.
                        memberName: record.nickname
                            || member?.nickname
                            || (record.userId ? maskedUserLabel(record.userId) : ""),
                        memberRole: member?.role || "",
                        cohortMembershipId: record.cohortMembershipId ?? member?.id ?? null
                    };
                })
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
    dialogInputLabel: document.querySelector("[data-dialog-input-label]"),
    dialogSelectWrap: document.querySelector("[data-dialog-select-wrap]"),
    dialogSelect: document.querySelector("[data-dialog-select]"),
    dialogSelectLabel: document.querySelector("[data-dialog-select-label]"),
    dialogError: document.querySelector("[data-dialog-error]")
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

function setBubble(message) {
    const fragment = document.createDocumentFragment();
    String(message ?? "").split("\n").forEach((line, index) => {
        if (index) fragment.append(document.createElement("br"));
        fragment.append(document.createTextNode(line));
    });
    elements.bubble.replaceChildren(fragment);
}

function setDialogError(message) {
    if (!elements.dialogError) return;
    elements.dialogError.textContent = message || "";
    elements.dialogError.hidden = !message;
}

/**
 * options를 주면 자유 입력 대신 select를 띄운다.
 * 정해진 값 중 하나를 고르는 입력을 텍스트로 받으면 오타가 그대로 요청 실패가 된다.
 */
function openDialog(
    { title, message, inputLabel, inputType = "text", initialValue = "", confirmText = "확인", options = null },
    callback
) {
    const useSelect = Array.isArray(options) && options.length > 0;
    elements.dialogTitle.textContent = title;
    elements.dialogMessage.textContent = message;
    setDialogError("");

    elements.dialogInputWrap.hidden = useSelect || !inputLabel;
    elements.dialogInputLabel.textContent = useSelect ? "" : (inputLabel || "");
    elements.dialogInput.type = inputType;
    elements.dialogInput.value = useSelect ? "" : initialValue;

    if (elements.dialogSelectWrap) {
        elements.dialogSelectWrap.hidden = !useSelect;
        elements.dialogSelectLabel.textContent = useSelect ? (inputLabel || "선택") : "";
        if (useSelect) {
            const fragment = document.createDocumentFragment();
            options.forEach(({ value, label }) => {
                const option = document.createElement("option");
                option.value = String(value);
                option.textContent = label ?? String(value);
                fragment.append(option);
            });
            elements.dialogSelect.replaceChildren(fragment);
            // 현재 값이 목록에 없으면 브라우저가 첫 항목을 고른다. 임의 값으로 덮어쓰지 않는다.
            elements.dialogSelect.value = String(initialValue ?? "");
            if (!elements.dialogSelect.value && options.length) {
                elements.dialogSelect.value = String(options[0].value);
            }
        } else {
            elements.dialogSelect.replaceChildren();
        }
    }

    document.querySelector("[data-dialog-confirm]").textContent = confirmText;
    elements.dialog.hidden = false;
    dialogCallback = callback;
    if (useSelect) elements.dialogSelect?.focus();
    else if (inputLabel) elements.dialogInput.focus();
}

function closeDialog() {
    elements.dialog.hidden = true;
    setDialogError("");
    dialogCallback = null;
}

function readDialogValue() {
    if (elements.dialogSelectWrap && !elements.dialogSelectWrap.hidden) {
        return elements.dialogSelect.value;
    }
    return elements.dialogInputWrap.hidden ? "" : elements.dialogInput.value;
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
    const activeMembers = cohort.members.filter((member) => member.status === "ACTIVE");
    const pending = state.applications.filter(
        (item) => item.cohortId === cohort.id && item.status === "PENDING"
    );
    // 카드가 세는 것은 "입실 완료 인원"이다. 입실 시각이 있어도 결석으로 정정된 건은 빼야
    // 하므로 시각 유무만으로 세지 않는다. 정시 입실은 퇴실 전까지 PENDING이라 상태
    // 화이트리스트로 세면 정시 입실자가 통째로 빠진다.
    const attendance = cohort.attendance.filter(
        (item) => item.date === state.today
            && item.checkIn !== "-"
            && item.finalStatus !== "ABSENT"
    );

    elements.cohortTitle.textContent = cohort.name;
    document.querySelector("[data-summary-members]").textContent = activeMembers.length;
    document.querySelector("[data-summary-applications]").textContent = pending.length;
    document.querySelector("[data-summary-attendance]").textContent = attendance.length;
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
    const accepted = dialogCallback(readDialogValue());
    // false는 "입력이 유효하지 않다"는 뜻이다. 예전에는 조용히 멈춰 사용자가 이유를 알 수 없었다.
    if (accepted === false) {
        setDialogError("입력한 값을 처리할 수 없습니다. 값을 확인해 주세요.");
        return;
    }
    if (accepted && typeof accepted === "object" && accepted.ok === false) {
        setDialogError(accepted.message || "입력한 값을 처리할 수 없습니다.");
        return;
    }
    closeDialog();
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
        setDialogError,
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

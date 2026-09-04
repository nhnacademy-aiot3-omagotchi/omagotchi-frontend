(() => {
    // 서버가 받는 최종 상태 전부. 순서가 곧 드롭다운 순서다.
    const STATUS_OPTIONS = Object.freeze([
        "PRESENT",
        "LATE",
        "ABSENT",
        "LEFT_EARLY",
        "LATE_LEFT_EARLY",
        "MISSING_CHECK_OUT"
    ]);
    const ALLOWED_STATUSES = new Set(STATUS_OPTIONS);
    const ROLE_LABELS = Object.freeze({
        MANAGER: "기수 관리자",
        MENTOR: "멘토",
        STUDENT: "수강생"
    });

    /** "09:10:00" / "09:10" 을 "09:10"으로 좁힌다. 형식이 다르면 원문을 그대로 보여준다. */
    function timeText(value) {
        const matched = /^(\d{2}):(\d{2})/.exec(String(value ?? ""));
        return matched ? `${matched[1]}:${matched[2]}` : "";
    }

    /**
     * 행에 그릴 구성원 표기를 고른다.
     *
     * <p>이름은 부가 정보다. 없다고 행을 숨기면 관리자가 정정해야 할 출결이 통째로
     * 사라지므로, 마지막에는 기록 번호로라도 행을 남긴다.</p>
     */
    function memberLabels(record) {
        const name = (record?.memberName || "").trim();
        const roleLabel = ROLE_LABELS[record?.memberRole] || "";
        if (name) {
            return { name, meta: roleLabel || `기록 #${record.id}` };
        }
        return {
            name: `출결 기록 #${record?.id ?? "-"}`,
            meta: roleLabel || "구성원 정보를 불러오지 못했습니다."
        };
    }

    function createAttendanceRow(template, record, statusLabel) {
        const row = template.content.firstElementChild.cloneNode(true);
        const labels = memberLabels(record);
        row.querySelector("[data-attendance-member-name]").textContent = labels.name;
        row.querySelector("[data-attendance-member-meta]").textContent = labels.meta;
        row.querySelector("[data-attendance-check-in]").textContent = record?.checkIn || "-";
        row.querySelector("[data-attendance-check-out]").textContent = record?.checkOut || "-";
        row.querySelector("[data-attendance-auto-status]").textContent = statusLabel(record?.autoStatus || "PENDING");
        row.querySelector("[data-attendance-final-status]").textContent = statusLabel(record?.finalStatus || "PENDING");
        row.querySelector("[data-attendance-edit]").dataset.attendanceEdit = String(record.id);
        return row;
    }

    function create({ root, store, statusLabel, openDialog, setDialogError, setBubble, refreshDashboard }) {
        if (!root) throw new Error("Attendance panel root is required.");

        const dateInput = root.querySelector("[data-attendance-date]");
        const list = root.querySelector("[data-attendance-list]");
        const rowTemplate = root.querySelector("[data-attendance-row-template]");
        const emptyTemplate = root.querySelector("[data-attendance-empty-template]");
        const today = store.getState().today;
        let displayedDate = today;
        let pendingEdit = null;
        let submitting = false;
        dateInput.value = today;

        function getCohort() {
            return store.getState().currentCohort;
        }

        function activate() {
            const date = dateInput.value || today;
            const cohort = getCohort();
            const fragment = document.createDocumentFragment();
            let rowCount = 0;

            for (const record of cohort.attendance.filter((item) => item.date === date)) {
                fragment.append(createAttendanceRow(rowTemplate, record, statusLabel));
                rowCount += 1;
            }

            if (!rowCount) fragment.append(emptyTemplate.content.cloneNode(true));
            list.replaceChildren(fragment);

            // 기수를 바꾸면 판정 기준도 달라진다. 안내가 열려 있으면 그 기수 기준으로 다시 그린다.
            if (helpPanel && !helpPanel.hidden) loadPolicy();
        }

        // 사유는 감사 로그에 그대로 남는다. 비워 두면 "누가 왜 고쳤는지"가 사라지므로
        // 관리자가 적지 않았을 때만 기본 문구로 대신한다.
        const DEFAULT_REASON = "관리자 화면에서 수동 정정";
        const REASON_MAX_LENGTH = 200;

        function submitStatus(value, { note = "" } = {}) {
            if (!pendingEdit) return { ok: false, message: "변경 대상을 찾지 못했습니다. 다시 시도해 주세요." };
            // 더블클릭으로 같은 정정이 두 번 나가는 것을 막는다.
            if (submitting) return { ok: false, message: "변경을 처리하는 중입니다." };

            const nextStatus = String(value ?? "").trim().toUpperCase();
            if (!ALLOWED_STATUSES.has(nextStatus)) {
                return { ok: false, message: "허용되지 않는 상태입니다." };
            }
            if (nextStatus === pendingEdit.currentStatus) {
                return { ok: false, message: "현재 상태와 동일합니다." };
            }

            const reason = String(note ?? "").trim();
            if (reason.length > REASON_MAX_LENGTH) {
                return { ok: false, message: `사유는 ${REASON_MAX_LENGTH}자 이내로 적어 주세요.` };
            }

            submitting = true;
            const target = pendingEdit;
            globalThis.OmagotchiApi.manager.updateAttendanceStatus(
                getCohort().id,
                target.recordId,
                nextStatus,
                reason || DEFAULT_REASON
            ).then(() => refreshDashboard(target.date))
                .then(() => {
                    // 조회일이 그대로일 때만 목록을 다시 그린다. 그 사이 날짜를 바꿨다면
                    // 여기서 그리면 사용자가 보고 있는 날짜를 덮어쓴다.
                    if (dateInput.value === target.date) activate();
                })
                .catch((error) => {
                    console.error("출결 상태를 변경하지 못했습니다.", error);
                    setBubble("출결 상태를\n변경하지 못했습니다.");
                })
                .finally(() => {
                    submitting = false;
                    if (pendingEdit === target) pendingEdit = null;
                });
            return true;
        }

        function handleListClick(event) {
            const button = event.target.closest("[data-attendance-edit]");
            if (!button) return;
            const record = getCohort().attendance.find(
                (item) => String(item.id) === String(button.dataset.attendanceEdit)
            );
            if (!record) {
                setBubble("출결 기록을\n찾지 못했습니다.");
                return;
            }
            const date = dateInput.value;
            const currentStatus = ALLOWED_STATUSES.has(record.finalStatus) ? record.finalStatus : "";
            pendingEdit = { recordId: record.id, date, currentStatus };

            const labels = memberLabels(record);
            openDialog({
                title: "출결 상태 변경",
                message: `${date} · ${labels.name}의 최종 상태를 선택하세요.`
                    + (currentStatus ? ` 현재 상태는 "${statusLabel(currentStatus)}"입니다.` : ""),
                inputLabel: "최종 상태",
                // 라벨 없는 빈 칸이 떠 있어 무엇을 적는 칸인지 알 수 없었다. 이제 사유 칸임을 밝힌다.
                noteLabel: "변경 사유 (선택)",
                notePlaceholder: "예: 병원 진료 확인서 제출",
                // 현재 상태를 기본값으로 둔다. 예전에는 항상 PRESENT라 실수로 정상 처리되기 쉬웠다.
                initialValue: currentStatus || STATUS_OPTIONS[0],
                options: STATUS_OPTIONS.map((status) => ({
                    value: status,
                    label: `${statusLabel(status)} (${status})`
                }))
            }, submitStatus);
            setDialogError?.("");
        }

        dateInput.addEventListener("change", () => {
            const requestedDate = dateInput.value;
            refreshDashboard(requestedDate, { rejectAttendanceFailure: true })
                .then(() => {
                    displayedDate = requestedDate;
                    activate();
                })
                .catch((error) => {
                    dateInput.value = displayedDate;
                    activate();
                    console.error("출결을 불러오지 못했습니다.", error);
                    setBubble("출결 기록을\n불러오지 못했습니다.");
                });
        });
        list.addEventListener("click", handleListClick);

        // --- 출결 판정 기준 안내 ---
        const helpToggle = root.querySelector("[data-attendance-policy-help]");
        const helpPanel = root.querySelector("[data-attendance-policy-panel]");
        const helpState = root.querySelector("[data-attendance-policy-state]");
        const helpRules = root.querySelector("[data-attendance-policy-rules]");
        const helpNotes = root.querySelector("[data-attendance-policy-notes]");
        // 기수를 바꾸면 기준도 달라지므로 기수별로 담아 둔다.
        const policyCache = new Map();
        let policyLoading = false;

        function renderPolicy(policy) {
            if (!helpRules || !helpNotes) return;
            const timezone = policy?.timezone || "";
            const start = timeText(policy?.scheduledStartTime);
            const end = timeText(policy?.scheduledEndTime);
            const away = Number.isFinite(Number(policy?.allowedAwayMinutes))
                ? Number(policy.allowedAwayMinutes)
                : null;

            // 필수 두 값이 없으면 규칙표를 띄우지 않는다. 빈칸을 기준처럼 보여주면 잘못 읽힌다.
            if (!start || !end) {
                helpRules.hidden = true;
                helpNotes.hidden = true;
                helpState.hidden = false;
                helpState.textContent = "이 기수에는 출결 정책이 없습니다. 정책이 없으면 구성원이 입실할 수 없습니다.";
                return;
            }

            root.querySelector("[data-policy-timezone]").textContent = timezone || "미지정";
            root.querySelector("[data-policy-late]").textContent = `${start} 이후 입실은 지각`;
            root.querySelector("[data-policy-early]").textContent = `${end} 이전 퇴실은 조퇴`;
            root.querySelector("[data-policy-away]").textContent = away == null ? "미지정" : `${away}분`;
            helpRules.hidden = false;
            helpNotes.hidden = false;
            helpState.hidden = true;
        }

        function loadPolicy() {
            const cohortId = getCohort().id;
            if (!cohortId) {
                helpRules.hidden = true;
                helpNotes.hidden = true;
                helpState.hidden = false;
                helpState.textContent = "기수를 먼저 선택해 주세요.";
                return;
            }
            if (policyCache.has(cohortId)) {
                renderPolicy(policyCache.get(cohortId));
                return;
            }
            if (policyLoading) return;

            policyLoading = true;
            helpRules.hidden = true;
            helpNotes.hidden = true;
            helpState.hidden = false;
            helpState.textContent = "기준을 불러오는 중입니다.";

            const request = globalThis.OmagotchiApi?.manager?.getAttendancePolicy;
            if (typeof request !== "function") {
                policyLoading = false;
                helpState.textContent = "기준을 불러올 수 없습니다.";
                return;
            }

            request(cohortId)
                .then((policy) => {
                    policyCache.set(cohortId, policy);
                    // 불러오는 사이 기수를 바꿨다면 지금 화면의 기수 기준만 그린다.
                    if (getCohort().id === cohortId) renderPolicy(policy);
                })
                .catch((error) => {
                    console.error("출결 정책을 불러오지 못했습니다.", error);
                    if (getCohort().id !== cohortId) return;
                    helpRules.hidden = true;
                    helpNotes.hidden = true;
                    helpState.hidden = false;
                    helpState.textContent = error?.code === "ATTENDANCE_POLICY_NOT_FOUND"
                        ? "이 기수에는 출결 정책이 없습니다. 정책이 없으면 구성원이 입실할 수 없습니다."
                        : "기준을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
                })
                .finally(() => {
                    policyLoading = false;
                });
        }

        if (helpToggle && helpPanel) {
            helpToggle.addEventListener("click", () => {
                const opening = helpPanel.hidden;
                helpPanel.hidden = !opening;
                helpToggle.setAttribute("aria-expanded", String(opening));
                if (opening) loadPolicy();
            });
        }

        return Object.freeze({ activate });
    }

    window.OmagotchiDashboardPanels.register({
        key: "attendance",
        route: "attendance",
        label: "출결 관리",
        order: 50,
        topics: ["members", "attendance", "selection"],
        create
    });
})();

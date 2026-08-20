(() => {
    const STORAGE_KEYS = Object.freeze({
        cohorts: "omagotchiCohortOperations",
        applications: "omagotchiCohortApplications",
        notices: "omagotchiCohortNotices",
        audits: "omagotchiCohortAudits"
    });
    const SESSION_KEYS = Object.freeze({
        email: "omagotchiManagerEmail",
        name: "omagotchiManagerName",
        organization: "omagotchiManagerOrganization",
        cohort: "omagotchiManagerCohort",
        panel: "omagotchiManagerDashboardTab"
    });
    const EMPTY_COHORT = Object.freeze({
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
    });
    const STORAGE_KEYS_TO_CLEAR = Object.freeze(Object.values(STORAGE_KEYS));
    const SESSION_KEYS_TO_CLEAR = Object.freeze(Object.values(SESSION_KEYS));
    const MEMBER_STATUSES = new Set(["ACTIVE", "INACTIVE", "ENDED"]);
    const ATTENDANCE_STATUSES = new Set(["NORMAL", "LATE", "ABSENT", "EARLY_LEAVE"]);
    const SENSOR_LOCATION_NAMES = Object.freeze({
        LAB: "실습실",
        OFFICE: "사무실",
        MEETING_ROOM: "회의실"
    });
    const SENSOR_LOCATION_IDS = new Set(Object.keys(SENSOR_LOCATION_NAMES));
    const SENSOR_OPERATOR_LABELS = Object.freeze({
        GTE: "이상",
        LT: "미만",
        GT: "초과",
        LTE: "이하"
    });
    const SENSOR_OPERATORS = new Set(Object.keys(SENSOR_OPERATOR_LABELS));
    const SENSOR_METRICS = Object.freeze(["temperature", "humidity", "co2"]);
    const SENSOR_UNITS = Object.freeze({ temperature: "℃", humidity: "%", co2: "ppm" });
    const KST_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });

    function currentKstAggregationDate(date) {
        const shifted = new Date(date.getTime() - 4 * 60 * 60 * 1000);
        const parts = KST_DATE_FORMATTER.formatToParts(shifted);
        const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
        return `${values.year}-${values.month}-${values.day}`;
    }

    function validSensorThresholds(thresholds) {
        for (const metric of SENSOR_METRICS) {
            const rule = thresholds?.[metric];
            if (!SENSOR_OPERATORS.has(rule?.operator) || !Number.isFinite(rule?.value)) return false;
        }
        return true;
    }

    function formatSensorThreshold(metric, rule) {
        return `${SENSOR_OPERATOR_LABELS[rule.operator]} ${rule.value}${SENSOR_UNITS[metric]}`;
    }

    function clone(value) {
        if (typeof structuredClone === "function") return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function create({
        local = window.localStorage,
        session = window.sessionStorage,
        now = () => new Date(),
        random = Math.random,
        createId = () => crypto.randomUUID?.() || `audit-${Date.now()}`
    } = {}) {
        const listeners = new Set();

        function readJson(key, fallback) {
            try {
                const value = local.getItem(key);
                return value ? JSON.parse(value) : clone(fallback);
            } catch {
                return clone(fallback);
            }
        }

        function readSession(key, fallback = "") {
            try {
                return session.getItem(key) || fallback;
            } catch {
                return fallback;
            }
        }

        const initialDate = now();
        let state = {
            today: currentKstAggregationDate(initialDate),
            manager: {
                email: readSession(SESSION_KEYS.email),
                name: readSession(SESSION_KEYS.name, "관리자"),
                organization: readSession(SESSION_KEYS.organization)
            },
            cohorts: readJson(STORAGE_KEYS.cohorts, []),
            applications: readJson(STORAGE_KEYS.applications, []),
            notices: readJson(STORAGE_KEYS.notices, []),
            audits: readJson(STORAGE_KEYS.audits, []),
            selectedCohortId: readSession(SESSION_KEYS.cohort),
            activePanel: readSession(SESSION_KEYS.panel, "overview")
        };

        function normalizeSelection(target) {
            if (!target.cohorts.some((cohort) => cohort.id === target.selectedCohortId)) {
                target.selectedCohortId = target.cohorts[0]?.id || "";
            }
            if (typeof target.activePanel !== "string" || !target.activePanel.trim()) {
                target.activePanel = "overview";
            }
        }

        normalizeSelection(state);

        function currentCohort(target) {
            return target.cohorts.find((cohort) => cohort.id === target.selectedCohortId)
                || target.cohorts[0]
                || clone(EMPTY_COHORT);
        }

        function getState() {
            const snapshot = clone(state);
            snapshot.currentCohort = currentCohort(snapshot);
            return snapshot;
        }

        function restore(storage, key, previousValue) {
            if (previousValue == null) storage.removeItem(key);
            else storage.setItem(key, previousValue);
        }

        function writeAtomically(writes) {
            const applied = [];
            try {
                writes.forEach(({ storage, key, value }) => {
                    const previousValue = storage.getItem(key);
                    if (value == null) storage.removeItem(key);
                    else storage.setItem(key, value);
                    applied.push({ storage, key, previousValue });
                });
            } catch (error) {
                [...applied].reverse().forEach(({ storage, key, previousValue }) => {
                    try {
                        restore(storage, key, previousValue);
                    } catch {
                        // 원래 저장 상태 복구가 불가능한 경우 최초 저장 오류를 유지한다.
                    }
                });
                throw error;
            }
        }

        function operationWrites(next, extraWrites = []) {
            return [
                { storage: local, key: STORAGE_KEYS.cohorts, value: JSON.stringify(next.cohorts) },
                { storage: local, key: STORAGE_KEYS.applications, value: JSON.stringify(next.applications) },
                { storage: local, key: STORAGE_KEYS.notices, value: JSON.stringify(next.notices) },
                { storage: local, key: STORAGE_KEYS.audits, value: JSON.stringify(next.audits) },
                ...extraWrites
            ];
        }

        function appendAudit(next, action, target, detail) {
            next.audits.unshift({
                id: createId(),
                cohortId: next.selectedCohortId,
                occurredAt: now().toLocaleString("ko-KR", { hour12: false }),
                action,
                target,
                detail,
                actor: next.manager.email
            });
            next.audits = next.audits.slice(0, 100);
        }

        function notify(command, changes, message) {
            const event = Object.freeze({
                command,
                changes: Object.freeze([...new Set(changes)]),
                message: message || ""
            });
            listeners.forEach((listener) => listener(event));
        }

        function commit(command, next, { changes, message = "", writes = operationWrites(next) }) {
            writeAtomically(writes);
            state = next;
            notify(command, changes, message);
            return Object.freeze({ ok: true, message });
        }

        function rejected() {
            return Object.freeze({ ok: false, message: "" });
        }

        function selectPanel(command) {
            const panel = typeof command.panel === "string" && command.panel.trim()
                ? command.panel
                : "overview";
            const next = clone(state);
            next.activePanel = panel;
            return commit(command.type, next, {
                changes: ["panel"],
                writes: [{ storage: session, key: SESSION_KEYS.panel, value: panel }]
            });
        }

        function selectCohort(command) {
            if (!state.cohorts.some((cohort) => cohort.id === command.cohortId)) return rejected();
            const next = clone(state);
            next.selectedCohortId = command.cohortId;
            return commit(command.type, next, {
                changes: ["selection", "shell", "all"],
                message: `${currentCohort(next).name} 업무만\n표시하고 있습니다.`,
                writes: [{ storage: session, key: SESSION_KEYS.cohort, value: command.cohortId }]
            });
        }

        function hydrateDashboard(command) {
            const dashboard = command.dashboard;
            if (!dashboard) return rejected();
            const next = clone(state);
            next.cohorts = Array.isArray(dashboard.cohorts) ? clone(dashboard.cohorts) : next.cohorts;
            next.applications = Array.isArray(dashboard.applications) ? clone(dashboard.applications) : next.applications;
            next.notices = Array.isArray(dashboard.notices) ? clone(dashboard.notices) : next.notices;
            next.audits = Array.isArray(dashboard.audits) ? clone(dashboard.audits) : next.audits;
            next.selectedCohortId = dashboard.selectedCohortId || next.selectedCohortId;
            normalizeSelection(next);
            return commit(command.type, next, {
                changes: ["selection", "shell", "all"],
                writes: [
                    ...operationWrites(next),
                    { storage: session, key: SESSION_KEYS.cohort, value: next.selectedCohortId }
                ]
            });
        }

        function clearSession(command) {
            const next = {
                today: state.today,
                manager: { email: "", name: "관리자", organization: "" },
                cohorts: [],
                applications: [],
                notices: [],
                audits: [],
                selectedCohortId: "",
                activePanel: "overview"
            };
            const writes = [
                ...SESSION_KEYS_TO_CLEAR.map((key) => ({ storage: session, key, value: null })),
                ...STORAGE_KEYS_TO_CLEAR.map((key) => ({ storage: local, key, value: null }))
            ];
            return commit(command.type, next, {
                changes: ["selection", "shell", "all"],
                writes
            });
        }

        function updateCohort(command) {
            const next = clone(state);
            const cohort = currentCohort(next);
            if (!cohort.id) return rejected();
            cohort.description = command.description;
            cohort.capacity = command.capacity;
            appendAudit(next, "기수 정보 수정", cohort.name, "설명과 정원 변경");
            return commit(command.type, next, {
                changes: ["cohortInfo", "audits"],
                message: "기수 정보를\n저장했습니다."
            });
        }

        function issueJoinCode(command) {
            const next = clone(state);
            const cohort = currentCohort(next);
            if (!cohort.id || !command.expiresAt) return rejected();
            const code = `${cohort.name.replace(/[^A-Za-z0-9가-힣]/g, "").slice(0, 3).toUpperCase()}${random().toString(36).slice(2, 6).toUpperCase()}`;
            cohort.joinCode = {
                value: code,
                status: "ACTIVE",
                expiresAt: command.expiresAt,
                issuedAt: next.today,
                used: 0
            };
            appendAudit(next, "가입 코드 발급", cohort.name, `만료일 ${command.expiresAt}`);
            return commit(command.type, next, {
                changes: ["joinCode", "audits"],
                message: "새 가입 코드를\n발급했습니다."
            });
        }

        function revokeJoinCode(command) {
            const next = clone(state);
            const cohort = currentCohort(next);
            if (!cohort.joinCode?.value) return rejected();
            cohort.joinCode.status = "REVOKED";
            appendAudit(next, "가입 코드 폐기", cohort.name, cohort.joinCode.value);
            return commit(command.type, next, { changes: ["joinCode", "audits"] });
        }

        function approveApplication(command) {
            const next = clone(state);
            const cohort = currentCohort(next);
            const application = next.applications.find(
                (item) => String(item.id) === String(command.applicationId)
            );
            if (
                !cohort.id
                || !application
                || application.cohortId !== cohort.id
                || application.status !== "PENDING"
            ) return rejected();
            application.status = "ACTIVE";
            cohort.members.push({
                id: application.userId,
                name: application.name,
                email: application.email,
                role: "STUDENT",
                status: "ACTIVE"
            });
            const joinedKey = `omagotchiJoinedCohorts:${application.userId}`;
            const joined = readJson(joinedKey, []);
            const joinedValue = JSON.stringify([...new Set([...joined, application.cohortId])]);
            appendAudit(next, "참가 신청 승인", application.email, "PENDING → ACTIVE");
            return commit(command.type, next, {
                changes: ["shell", "members", "applications", "audits"],
                message: `${application.name} 님을\n승인했습니다.`,
                writes: operationWrites(next, [{ storage: local, key: joinedKey, value: joinedValue }])
            });
        }

        function rejectApplication(command) {
            const next = clone(state);
            const cohort = currentCohort(next);
            const application = next.applications.find(
                (item) => String(item.id) === String(command.applicationId)
            );
            if (
                !application
                || application.cohortId !== cohort.id
                || application.status !== "PENDING"
                || !command.reason
            ) return rejected();
            application.status = "REJECTED";
            application.rejectReason = command.reason;
            appendAudit(next, "참가 신청 거절", application.email, command.reason);
            return commit(command.type, next, {
                changes: ["shell", "applications", "audits"]
            });
        }

        function changeMemberStatus(command) {
            const next = clone(state);
            const cohort = currentCohort(next);
            const member = cohort.members.find((item) => String(item.id) === String(command.memberId));
            if (
                !member
                || member.role === "MANAGER"
                || !MEMBER_STATUSES.has(command.status)
                || !command.reason
            ) return rejected();
            const previous = member.status;
            member.status = command.status;
            appendAudit(next, "소속 상태 변경", member.email, `${previous} → ${command.status}: ${command.reason}`);
            return commit(command.type, next, {
                changes: ["shell", "members", "audits"]
            });
        }

        function changeAttendanceStatus(command) {
            const next = clone(state);
            const cohort = currentCohort(next);
            const member = cohort.members.find((item) => String(item.id) === String(command.memberId));
            if (!member || !command.date || !ATTENDANCE_STATUSES.has(command.status)) return rejected();
            let record = cohort.attendance.find(
                (item) => String(item.memberId) === String(member.id) && item.date === command.date
            );
            if (!record) {
                record = {
                    memberId: member.id,
                    date: command.date,
                    checkIn: "-",
                    checkOut: "-",
                    autoStatus: "PENDING",
                    finalStatus: command.status
                };
                cohort.attendance.push(record);
            } else {
                record.finalStatus = command.status;
            }
            appendAudit(next, "최종 출결 변경", member.email, `${command.date} ${command.status}`);
            return commit(command.type, next, {
                changes: ["shell", "attendance", "audits"]
            });
        }

        function saveSensorThresholds(command) {
            const next = clone(state);
            const cohort = currentCohort(next);
            const location = command.location || "LAB";
            const thresholds = command.thresholds;
            if (
                !cohort.id
                || !SENSOR_LOCATION_IDS.has(location)
                || !validSensorThresholds(thresholds)
            ) return rejected();
            cohort.sensor ??= {};
            cohort.sensor.thresholds = {
                ...(cohort.sensor.thresholds || {}),
                [location]: clone(thresholds)
            };
            appendAudit(
                next,
                "센서 임계치 수정",
                `${cohort.name} ${SENSOR_LOCATION_NAMES[location]}`,
                `온도 ${formatSensorThreshold("temperature", thresholds.temperature)}, 습도 ${formatSensorThreshold("humidity", thresholds.humidity)}, CO₂ ${formatSensorThreshold("co2", thresholds.co2)}`
            );
            return commit(command.type, next, {
                changes: ["sensors", "audits"],
                message: "센서 임계치를\n저장했습니다."
            });
        }

        function createNotice(command) {
            const next = clone(state);
            const cohort = currentCohort(next);
            if (!cohort.id || !command.title || !command.content) return rejected();
            next.notices.unshift({
                id: `notice-${now().getTime()}`,
                cohortId: next.selectedCohortId,
                type: "NOTICE",
                title: command.title,
                content: command.content,
                pinned: false,
                reports: 0
            });
            appendAudit(next, "공지 등록", command.title, "기수 공지 작성");
            return commit(command.type, next, {
                changes: ["notices", "audits"]
            });
        }

        function moderatePost(command) {
            const next = clone(state);
            const cohort = currentCohort(next);
            const post = next.notices.find((item) => String(item.id) === String(command.postId));
            if (!post || post.cohortId !== cohort.id) return rejected();
            if (post.reports) {
                post.reports = 0;
                appendAudit(next, "커뮤니티 신고 확인", post.title, "신고 검토 완료");
            } else {
                post.pinned = !post.pinned;
                appendAudit(next, "게시글 고정 변경", post.title, post.pinned ? "고정" : "고정 해제");
            }
            return commit(command.type, next, {
                changes: ["notices", "audits"]
            });
        }

        const commandHandlers = new Map([
            ["SELECT_PANEL", selectPanel],
            ["SELECT_COHORT", selectCohort],
            ["HYDRATE_DASHBOARD", hydrateDashboard],
            ["CLEAR_SESSION", clearSession],
            ["UPDATE_COHORT", updateCohort],
            ["ISSUE_JOIN_CODE", issueJoinCode],
            ["REVOKE_JOIN_CODE", revokeJoinCode],
            ["APPROVE_APPLICATION", approveApplication],
            ["REJECT_APPLICATION", rejectApplication],
            ["CHANGE_MEMBER_STATUS", changeMemberStatus],
            ["CHANGE_ATTENDANCE_STATUS", changeAttendanceStatus],
            ["SAVE_SENSOR_THRESHOLDS", saveSensorThresholds],
            ["CREATE_NOTICE", createNotice],
            ["MODERATE_POST", moderatePost]
        ]);

        function dispatch(command) {
            if (!command?.type) throw new Error("Dashboard command type is required.");
            const handler = commandHandlers.get(command.type);
            if (!handler) throw new Error(`Unknown dashboard command: ${command.type}`);
            return handler(command);
        }

        function subscribe(listener) {
            if (typeof listener !== "function") throw new Error("Dashboard listener is required.");
            listeners.add(listener);
            return () => listeners.delete(listener);
        }

        return Object.freeze({ getState, dispatch, subscribe });
    }

    window.OmagotchiDashboardStore = Object.freeze({ create });
})();

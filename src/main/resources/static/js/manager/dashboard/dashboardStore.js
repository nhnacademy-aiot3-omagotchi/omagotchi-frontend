(() => {
    const SESSION_KEYS = Object.freeze({
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
    const SESSION_KEYS_TO_CLEAR = Object.freeze(Object.values(SESSION_KEYS));
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

    function clone(value) {
        if (typeof structuredClone === "function") return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function create({
        session = window.sessionStorage,
        now = () => new Date()
    } = {}) {
        const listeners = new Set();

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
            manager: { email: "", name: "관리자", organization: "기수 관리자" },
            cohorts: [],
            applications: [],
            notices: [],
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

        function notify(command, changes, message) {
            const event = Object.freeze({
                command,
                changes: Object.freeze([...new Set(changes)]),
                message: message || ""
            });
            listeners.forEach((listener) => listener(event));
        }

        function commit(command, next, { changes, message = "", writes = [] }) {
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
            next.manager = dashboard.manager && typeof dashboard.manager === "object"
                ? { ...next.manager, ...clone(dashboard.manager) }
                : next.manager;
            next.selectedCohortId = dashboard.selectedCohortId || next.selectedCohortId;
            normalizeSelection(next);
            return commit(command.type, next, {
                changes: ["selection", "shell", "all"],
                writes: [{ storage: session, key: SESSION_KEYS.cohort, value: next.selectedCohortId }]
            });
        }

        function clearSession(command) {
            const next = {
                today: state.today,
                manager: { email: "", name: "관리자", organization: "기수 관리자" },
                cohorts: [],
                applications: [],
                notices: [],
                selectedCohortId: "",
                activePanel: "overview"
            };
            const writes = SESSION_KEYS_TO_CLEAR.map((key) => ({ storage: session, key, value: null }));
            return commit(command.type, next, {
                changes: ["selection", "shell", "all"],
                writes
            });
        }

        const commandHandlers = new Map([
            ["SELECT_PANEL", selectPanel],
            ["SELECT_COHORT", selectCohort],
            ["HYDRATE_DASHBOARD", hydrateDashboard],
            ["CLEAR_SESSION", clearSession]
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

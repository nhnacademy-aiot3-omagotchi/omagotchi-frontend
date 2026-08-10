(() => {
    const definitions = [];
    let started = false;

    function normalizeTopics(topics) {
        return Object.freeze([...new Set(Array.isArray(topics) ? topics : [])]);
    }

    function compareOrder(left, right) {
        return left.order - right.order;
    }

    function createNavigationButton(definition) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.dashboardTab = definition.key;
        button.textContent = definition.label;
        return button;
    }

    function hasMatchingTopic(topics, changes) {
        for (const topic of topics) {
            if (changes.includes(topic)) return true;
        }
        return false;
    }

    function register(definition) {
        if (started) throw new Error("Dashboard panels cannot be registered after start.");
        if (!definition?.key || !definition.route || !definition.label || typeof definition.create !== "function") {
            throw new Error("Dashboard panel requires key, route, label, and create.");
        }
        if (definitions.some((item) => item.key === definition.key)) {
            throw new Error(`Duplicate dashboard panel key: ${definition.key}`);
        }
        if (definitions.some((item) => item.route === definition.route)) {
            throw new Error(`Duplicate dashboard panel route: ${definition.route}`);
        }

        definitions.push(Object.freeze({
            key: definition.key,
            route: definition.route,
            label: definition.label,
            order: Number.isFinite(definition.order) ? definition.order : 100,
            topics: normalizeTopics(definition.topics),
            invalidateOn: normalizeTopics(definition.invalidateOn),
            create: definition.create
        }));
    }

    function start({ store, navigation, shared = {}, defaultPanel = "overview" } = {}) {
        if (started) throw new Error("Dashboard panel registry has already started.");
        if (!store?.getState || !store.dispatch || !store.subscribe) {
            throw new Error("Dashboard panel registry requires a store.");
        }
        if (!navigation) throw new Error("Dashboard navigation root is required.");
        if (!definitions.length) throw new Error("No dashboard panels are registered.");

        started = true;
        const ordered = [...definitions].sort(compareOrder);
        const byKey = new Map();
        const byRoute = new Map();

        for (const definition of ordered) {
            const root = document.querySelector(`[data-dashboard-panel='${definition.key}']`);
            if (!root) throw new Error(`Dashboard panel root is missing: ${definition.key}`);
            const controller = definition.create({ ...shared, store, root });
            if (typeof controller?.activate !== "function") {
                throw new Error(`Dashboard panel must expose activate(): ${definition.key}`);
            }
            const panel = Object.freeze({ definition, controller, root });
            byKey.set(definition.key, panel);
            byRoute.set(definition.route, panel);
        }

        const fallback = byKey.has(defaultPanel) ? defaultPanel : ordered[0].key;
        navigation.replaceChildren(...ordered.map(createNavigationButton));

        function panelFromLocation() {
            const route = new URLSearchParams(window.location.search).get("panel");
            return byRoute.get(route)?.definition.key || null;
        }

        function syncLocation(panel, historyMode) {
            if (historyMode === "none") return;
            const url = new URL(window.location.href);
            url.searchParams.set("panel", byKey.get(panel).definition.route);
            const method = historyMode === "replace" ? "replaceState" : "pushState";
            window.history[method]({ panel }, "", `${url.pathname}${url.search}${url.hash}`);
        }

        function panelContext() {
            const state = store.getState();
            return Object.freeze({ cohortId: state.selectedCohortId });
        }

        function renderActive() {
            const active = byKey.get(store.getState().activePanel);
            active?.controller.activate(panelContext());
        }

        function syncActiveDom(panel) {
            for (const button of navigation.querySelectorAll("[data-dashboard-tab]")) {
                const active = button.dataset.dashboardTab === panel;
                button.classList.toggle("is-active", active);
                button.setAttribute("aria-pressed", String(active));
            }
            for (const [key, entry] of byKey) {
                entry.root.classList.toggle("is-active", key === panel);
            }
        }

        function activate(panel, { historyMode = "push" } = {}) {
            const nextPanel = byKey.has(panel) ? panel : fallback;
            const state = store.getState();
            const panelChanged = state.activePanel !== nextPanel;
            if (panelChanged) {
                byKey.get(state.activePanel)?.controller.deactivate?.();
                store.dispatch({ type: "SELECT_PANEL", panel: nextPanel });
            }
            syncActiveDom(nextPanel);
            if (historyMode === "replace" || panelChanged) {
                syncLocation(nextPanel, historyMode);
            }
            renderActive();
        }

        function handleStoreChange({ changes }) {
            for (const { definition, controller } of byKey.values()) {
                if (hasMatchingTopic(definition.invalidateOn, changes)) {
                    controller.invalidate?.();
                }
            }

            const active = byKey.get(store.getState().activePanel);
            if (
                changes.includes("all")
                || hasMatchingTopic(active?.definition.topics || [], changes)
            ) {
                renderActive();
            }
        }

        const unsubscribe = store.subscribe(handleStoreChange);
        const onNavigationClick = (event) => {
            const button = event.target.closest("[data-dashboard-tab]");
            if (button) activate(button.dataset.dashboardTab);
        };
        const onPopState = () => {
            activate(panelFromLocation() || fallback, { historyMode: "none" });
        };
        navigation.addEventListener("click", onNavigationClick);
        window.addEventListener("popstate", onPopState);

        const initialState = store.getState();
        activate(panelFromLocation() || initialState.activePanel, { historyMode: "replace" });

        return Object.freeze({
            destroy() {
                unsubscribe();
                navigation.removeEventListener("click", onNavigationClick);
                window.removeEventListener("popstate", onPopState);
                byKey.get(store.getState().activePanel)?.controller.deactivate?.();
            }
        });
    }

    window.OmagotchiDashboardPanels = Object.freeze({ register, start });
})();

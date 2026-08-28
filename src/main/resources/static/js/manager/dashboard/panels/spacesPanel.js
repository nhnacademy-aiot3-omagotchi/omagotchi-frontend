(() => {
    const CONTEXT_EVENT = "omagotchi:manager-spaces:context";

    function create({ root, store, setBubble }) {
        if (!root) throw new Error("Spaces panel root is required.");
        if (!root.querySelector("[data-manager-space-react-root]")) {
            throw new Error("Spaces React island root is missing.");
        }

        let loaded = false;
        let loadSequence = 0;
        let spaces = [];
        let loading = false;
        let error = null;

        function publish() {
            const context = Object.freeze({
                spaces,
                selectedCohortId: store.getState().selectedCohortId,
                loading,
                error,
                onSave: saveSpace,
                onChangeStatus: changeSpaceStatus,
                onDelete: deleteSpace,
                onChangeCohort: changeSpaceCohort,
                onRetry: loadSpaces
            });
            window.OmagotchiManagerSpaceContext = context;
            if (window.OmagotchiManagerSpaceIsland?.render) {
                window.OmagotchiManagerSpaceIsland.render(context);
            } else {
                window.dispatchEvent(new CustomEvent(CONTEXT_EVENT, { detail: context }));
            }
        }

        function warn(message, cause) {
            console.error(message, cause);
            setBubble?.(message);
        }

        async function loadSpaces() {
            const api = window.OmagotchiApi?.sensor;
            if (!api?.listSpaces) {
                error = "공간 API를 사용할 수 없습니다.";
                publish();
                return;
            }

            const sequence = ++loadSequence;
            loading = true;
            error = null;
            publish();
            try {
                const response = await api.listSpaces();
                if (sequence !== loadSequence) return;
                spaces = Array.isArray(response) ? response : [];
                loaded = true;
            } catch (cause) {
                if (sequence !== loadSequence) return;
                error = cause?.message || "공간 목록을 불러오지 못했습니다.";
                warn("공간 목록을\n불러오지 못했습니다.", cause);
            } finally {
                if (sequence === loadSequence) {
                    loading = false;
                    publish();
                }
            }
        }

        async function saveSpace(payload, mode, spaceId) {
            const api = window.OmagotchiApi?.adminSpaces;
            if (!api) return false;
            try {
                if (mode === "create") await api.create(payload);
                else await api.update(spaceId, payload);
                await loadSpaces();
                return true;
            } catch (cause) {
                warn("공간을 저장하지 못했습니다.", cause);
                return false;
            }
        }

        async function changeSpaceStatus(space, inactiveReason) {
            const api = window.OmagotchiApi?.adminSpaces;
            if (!api) return false;
            try {
                if (space.operationalStatus === "ACTIVE") await api.deactivate(space.spaceId, inactiveReason);
                else await api.activate(space.spaceId);
                await loadSpaces();
                return true;
            } catch (cause) {
                warn("공간 운영 상태를 변경하지 못했습니다.", cause);
                return false;
            }
        }

        async function deleteSpace(spaceId) {
            const api = window.OmagotchiApi?.adminSpaces;
            if (!api) return false;
            try {
                await api.remove(spaceId);
                await loadSpaces();
                return true;
            } catch (cause) {
                warn("공간을 삭제하지 못했습니다.", cause);
                return false;
            }
        }

        async function changeSpaceCohort(space, assign) {
            const api = window.OmagotchiApi?.adminSpaces;
            if (!api) return false;
            try {
                if (assign) await api.assignCohort(space.spaceId, store.getState().selectedCohortId);
                else await api.unassignCohort(space.spaceId);
                await loadSpaces();
                return true;
            } catch (cause) {
                warn("공간 기수 배정을 변경하지 못했습니다.", cause);
                return false;
            }
        }

        function activate() {
            publish();
            if (!loaded) loadSpaces();
        }

        return Object.freeze({ activate });
    }

    window.OmagotchiDashboardPanels.register({
        key: "spaces",
        route: "spaces",
        label: "공간 관리",
        order: 65,
        topics: ["selection"],
        create
    });
})();

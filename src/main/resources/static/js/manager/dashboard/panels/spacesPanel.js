(() => {
    const CONTEXT_EVENT = "omagotchi:manager-spaces:context";

    function create({ root, store, setBubble }) {
        if (!root) throw new Error("Spaces panel root is required.");
        if (!root.querySelector("[data-manager-space-react-root]")) {
            throw new Error("Spaces React island root is missing.");
        }

        let loaded = false;
        let loadSequence = 0;
        let occupancyLoadSequence = 0;
        let spaces = [];
        let loading = false;
        let error = null;
        let occupancies = [];
        let occupancyLoading = false;
        let occupancyError = null;

        function publish() {
            const context = Object.freeze({
                spaces,
                selectedCohortId: store.getState().selectedCohortId,
                loading,
                error,
                occupancies,
                occupancyLoading,
                occupancyError,
                onSave: saveSpace,
                onChangeStatus: changeSpaceStatus,
                onDelete: deleteSpace,
                onChangeCohort: changeSpaceCohort,
                onLoadOccupancies: loadOccupancies,
                onLoadParticipants: loadParticipants,
                onForceEndOccupancy: forceEndOccupancy,
                onRetry: loadSpaces
            });
            window.OmagotchiManagerSpaceContext = context;
            if (window.OmagotchiManagerSpaceIsland?.render) {
                window.OmagotchiManagerSpaceIsland.render(context);
            } else {
                window.dispatchEvent(new CustomEvent(CONTEXT_EVENT, { detail: context }));
            }
        }

        async function loadOccupancies() {
            const api = window.OmagotchiApi?.adminOccupancies;
            if (!api?.list) {
                occupancyError = "점유 API를 사용할 수 없습니다.";
                publish();
                return false;
            }

            const sequence = ++occupancyLoadSequence;
            occupancyLoading = true;
            occupancyError = null;
            publish();

            try {
                const response = await api.list();

                if (sequence !== occupancyLoadSequence) {
                    return false;
                }

                occupancies = Array.isArray(response) ? response : [];
                return true;
            } catch (cause) {
                if (sequence !== occupancyLoadSequence) {
                    return false;
                }

                occupancyError = cause?.message || "활성 점유 목록을 불러오지 못했습니다.";
                warn("활성 점유 목록을 불러오지 못했습니다.", cause);
                return false;
            } finally {
                if (sequence === occupancyLoadSequence) {
                    occupancyLoading = false;
                    publish();
                }
            }
        }

        async function loadParticipants(spaceId) {
            const api = window.OmagotchiApi?.adminOccupancies;
            if (!api?.participants) throw new Error("참여자 API를 사용할 수 없습니다.");
            return api.participants(spaceId);
        }

        async function forceEndOccupancy(spaceId) {
            const api = window.OmagotchiApi?.adminOccupancies;
            if (!api?.forceRelease) return false;
            try {
                await api.forceRelease(spaceId);
                await loadOccupancies();
                return true;
            } catch (cause) {
                warn("점유를 강제 종료하지 못했습니다.", cause);
                return false;
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
            loadOccupancies();
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

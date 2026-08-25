(() => {
    const CONTEXT_EVENT = "omagotchi:manager-sensors:context";
    const EVENT_PAGE_SIZE = 8;

    /**
     * 이 패널은 Learning Service 응답을 변환하지 않는다.
     *
     * React 섬(SensorWorkspace)이 서버 필드명을 그대로 읽도록 만들어져 있으므로,
     * 여기에서 이름을 바꾸면 화면과 어긋난다. 배열 여부만 확인해서 실어 보낸다.
     */
    function asArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function sensorApi() {
        return window.OmagotchiApi?.sensor || null;
    }

    function create({ root, setBubble }) {
        if (!root) throw new Error("Sensors panel root is required.");
        if (!root.querySelector("[data-manager-sensor-react-root]")) {
            throw new Error("Sensors React island root is missing.");
        }

        // loadSequence: 공간·기기·임계값 쓰기를 지킨다.
        // alertSequence: alertLog 쓰기를 지킨다 — loadAll 과 loadEvents 가 모두 쓰므로 공유한다.
        let loadSequence = 0;
        let alertSequence = 0;
        let loaded = false;
        let spaces = [];
        let devices = [];
        let spaceThresholds = [];
        let alertLog = null;
        let alertQuery = { type: null, deviceEui: null, page: 0, size: EVENT_PAGE_SIZE };
        let loading = false;
        let error = null;
        let forbidden = false;

        function publish() {
            const context = Object.freeze({
                spaces,
                sensors: devices,
                spaceThresholds,
                alertLog,
                loading,
                error,
                forbidden,
                onSaveSensor: saveSensor,
                onSaveThresholds: saveThresholds,
                onAlertQueryChange: changeAlertQuery,
                onRetry: loadAll
            });
            window.OmagotchiManagerSensorContext = context;
            if (window.OmagotchiManagerSensorIsland?.render) {
                window.OmagotchiManagerSensorIsland.render(context);
            } else {
                window.dispatchEvent(new CustomEvent(CONTEXT_EVENT, { detail: context }));
            }
        }

        function warn(message, error) {
            console.error(message, error);
            setBubble?.(message);
        }

        async function loadAll() {
            const api = sensorApi();
            if (!api) {
                warn("센서 API를 사용할 수 없습니다.\napi.js 로드를 확인해 주세요.");
                return;
            }

            const sequence = ++loadSequence;
            const alertSeq = ++alertSequence;
            loading = true;
            error = null;
            forbidden = false;
            publish();

            const [spaceResult, deviceResult, thresholdResult, eventResult] = await Promise.allSettled([
                api.listSpaces(),
                api.listDevices(),
                api.listSpaceThresholds(),
                api.listEvents(alertQuery)
            ]);

            // 알림 로그는 그 사이 더 최신 질의가 시작됐으면 건드리지 않는다.
            if (alertSeq === alertSequence) {
                alertLog = eventResult.status === "fulfilled" && Array.isArray(eventResult.value?.content)
                    ? eventResult.value
                    : null;
            }
            if (sequence !== loadSequence) return;

            spaces = spaceResult.status === "fulfilled" ? asArray(spaceResult.value) : [];
            devices = deviceResult.status === "fulfilled" ? asArray(deviceResult.value) : [];
            spaceThresholds = thresholdResult.status === "fulfilled" ? asArray(thresholdResult.value) : [];

            loaded = true;
            loading = false;

            const failed = [spaceResult, deviceResult, thresholdResult, eventResult]
                .filter((result) => result.status === "rejected");

            // 하류는 센서·임계값을 SYSTEM_ADMIN 으로 제한한다. 공간 조회만 공개라
            // 권한이 없으면 "빈 화면"처럼 보이므로, 403 은 따로 구분해 알린다.
            forbidden = failed.some((result) => result.reason?.status === 403);
            // 공간을 못 받으면 화면을 그릴 수 없다. 나머지는 부분 실패로 두고 받은 만큼 그린다.
            error = !forbidden && spaceResult.status === "rejected"
                ? (spaceResult.reason?.message || "공간 목록을 불러오지 못했습니다.")
                : null;
            publish();

            if (forbidden) {
                warn("센서 관리 권한이\n없습니다.", failed[0].reason);
            } else if (failed.length) {
                warn("일부 센서 데이터를\n불러오지 못했습니다.", failed[0].reason);
            }
        }

        /** 알림 로그만 다시 부른다 — 필터·페이징은 서버가 처리한다. */
        async function loadEvents() {
            const api = sensorApi();
            if (!api) return;
            const alertSeq = ++alertSequence;
            try {
                const response = await api.listEvents(alertQuery);
                if (alertSeq !== alertSequence) return;
                alertLog = Array.isArray(response?.content) ? response : null;
                publish();
            } catch (error) {
                if (alertSeq !== alertSequence) return;
                warn("센서 알림 로그를\n불러오지 못했습니다.", error);
            }
        }

        function changeAlertQuery({ type, deviceEui, page }) {
            // 화면은 1-base, 서버는 0-base.
            alertQuery = {
                type: type || null,
                deviceEui: deviceEui || null,
                page: Math.max(0, (page || 1) - 1),
                size: EVENT_PAGE_SIZE
            };
            loadEvents();
        }

        async function saveSensor(sensor, mode) {
            const api = sensorApi();
            if (!api) return;
            try {
                if (mode === "create") {
                    await api.createDevice({
                        deviceEui: sensor.deviceEui,
                        spaceId: sensor.spaceId,
                        model: sensor.model,
                        displayName: sensor.displayName,
                        installationPoint: sensor.installationPoint,
                        expectedIntervalSeconds: sensor.expectedIntervalSeconds
                    });
                    // 등록 API는 active를 받지 않는다. 기본값과 다를 때만 따로 맞춘다.
                    if (sensor.active === false) {
                        await api.updateDeviceActive(sensor.deviceEui, false);
                    }
                } else {
                    // UpdateSensorDeviceRequest 에는 model 이 없다. 보내도 무시되므로 넣지 않는다.
                    await api.updateDevice(sensor.deviceEui, {
                        spaceId: sensor.spaceId,
                        displayName: sensor.displayName,
                        installationPoint: sensor.installationPoint,
                        expectedIntervalSeconds: sensor.expectedIntervalSeconds
                    });
                    await api.updateDeviceActive(sensor.deviceEui, sensor.active !== false);
                }
                await loadAll();
            } catch (error) {
                warn("센서를 저장하지 못했습니다.", error);
            }
        }

        async function saveThresholds(spaceId, body) {
            const api = sensorApi();
            if (!api) return;
            try {
                await api.applySpaceThreshold(spaceId, body.rules);
                // 저장 결과(ruleCount·mixed)는 서버가 다시 계산하므로 재조회한다.
                spaceThresholds = asArray(await api.listSpaceThresholds());
                publish();
            } catch (error) {
                warn("임계값을 저장하지 못했습니다.", error);
            }
        }

        function activate() {
            publish();
            if (!loaded) loadAll();
        }

        return Object.freeze({ activate });
    }

    window.OmagotchiDashboardPanels.register({
        key: "sensors",
        route: "sensors",
        label: "공간·센서",
        order: 60,
        // 센서·공간·임계값은 설비 자원이라 기수에 매이지 않는다. 기수 변경으로 다시 부르지 않는다.
        topics: [],
        create
    });
})();

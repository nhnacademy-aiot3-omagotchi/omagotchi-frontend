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

    function create({ root, store, setBubble }) {
        if (!root) throw new Error("Sensors panel root is required.");
        if (!root.querySelector("[data-manager-sensor-react-root]")) {
            throw new Error("Sensors React island root is missing.");
        }

        // loadSequence: 공간·기기·임계값 쓰기를 지킨다.
        // alertSequence: alertLog 쓰기를 지킨다 — loadAll과 loadEvents가 모두 쓰므로 공유한다.
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

        function warn(message, cause) {
            console.error(message, cause);
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

            // 하류는 센서·임계값을 SYSTEM_ADMIN으로 제한한다. 공간 조회만 공개라
            // 권한이 없으면 "빈 화면"처럼 보이므로, 403은 따로 구분해 알린다.
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
            } catch (cause) {
                if (alertSeq !== alertSequence) return;
                warn("센서 알림 로그를\n불러오지 못했습니다.", cause);
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

        /** 성공하면 true, 실패하면 false. 화면은 이 값으로 다이얼로그를 닫을지 정한다. */
        async function saveSensor(sensor, mode) {
            const api = sensorApi();
            if (!api) return false;

            const previous = devices.find((device) => device.deviceEui === sensor.deviceEui);
            try {
                if (mode === "create") {
                    await api.createDevice({
                        deviceEui: sensor.deviceEui,
                        spaceId: sensor.spaceId,
                        model: sensor.model,
                        displayName: sensor.displayName,
                        installationPoint: sensor.installationPoint,
                        expectedIntervalSeconds: sensor.expectedIntervalSeconds,
                        installedAt: sensor.installedAt ?? null
                    });
                    // 등록 API는 active를 받지 않는다(서버 기본값 true).
                    if (sensor.active === false) {
                        try {
                            await api.updateDeviceActive(sensor.deviceEui, false);
                        } catch (cause) {
                            // 센서는 이미 등록됐다. "저장 실패"로 뭉뚱그리면 오해를 부른다.
                            await loadAll();
                            warn("센서는 등록됐지만\n비활성화에 실패했습니다.", cause);
                            return true;
                        }
                    }
                } else {
                    // UpdateSensorDeviceRequest에는 model이 없다. 보내도 무시되므로 넣지 않는다.
                    // installedAt은 서버가 조건 없이 덮어쓰므로, 빼면 설치일자가 지워진다.
                    await api.updateDevice(sensor.deviceEui, {
                        spaceId: sensor.spaceId,
                        displayName: sensor.displayName,
                        installationPoint: sensor.installationPoint,
                        expectedIntervalSeconds: sensor.expectedIntervalSeconds,
                        installedAt: sensor.installedAt ?? null
                    });
                    // 값이 실제로 달라졌을 때만 부른다. 저장 한 번에 요청이 두 번 나가지 않도록.
                    const nextActive = sensor.active !== false;
                    if (!previous || previous.active !== nextActive) {
                        await api.updateDeviceActive(sensor.deviceEui, nextActive);
                    }
                }
                await loadAll();
                return true;
            } catch (cause) {
                warn("센서를 저장하지 못했습니다.", cause);
                return false;
            }
        }

        /** 서버 응답 { applied, unchanged, missing }을 그대로 돌려준다. 실패하면 false. */
        async function saveThresholds(spaceId, body) {
            const api = sensorApi();
            if (!api) return false;
            try {
                const result = await api.applySpaceThreshold(spaceId, body.rules);
                // 저장 결과(ruleCount·mixed)는 서버가 다시 계산하므로 재조회한다.
                spaceThresholds = asArray(await api.listSpaceThresholds());
                publish();
                return result || null;
            } catch (cause) {
                warn("임계값을 저장하지 못했습니다.", cause);
                return false;
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
        topics: ["selection"],
        create
    });
})();

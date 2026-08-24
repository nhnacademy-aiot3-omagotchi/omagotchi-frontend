(() => {
    const CONTEXT_EVENT = "omagotchi:manager-sensors:context";
    const SPACE_MAP = Object.freeze({
        LAB: Object.freeze({ value: "lab", label: "실습실" }),
        MEETING: Object.freeze({ value: "meeting", label: "회의실" }),
        MEETING_ROOM: Object.freeze({ value: "meeting", label: "회의실" }),
        LIBRARY: Object.freeze({ value: "library", label: "도서관" }),
        // 기존 Prototype의 OFFICE 데이터는 새 공간 분류가 확정될 때까지 도서관 표시로 호환한다.
        OFFICE: Object.freeze({ value: "library", label: "도서관" })
    });

    function sensorSource(cohort) {
        if (Array.isArray(cohort.sensor?.devices)) return cohort.sensor.devices;
        if (Array.isArray(cohort.sensors)) return cohort.sensors;
        if (Array.isArray(cohort.sensorReadings)) return cohort.sensorReadings;
        if (Array.isArray(cohort.sensor?.locations)) return cohort.sensor.locations;
        return [];
    }

    function normalizeMetric(value) {
        const metric = String(value || "").trim().toUpperCase();
        if (["TEMPERATURE", "TEMP", "온도"].includes(metric)) return "temperature";
        if (["HUMIDITY", "HUM", "습도"].includes(metric)) return "humidity";
        if (["CO2", "CO₂", "이산화탄소"].includes(metric)) return "co2";
        return null;
    }

    function sensorMetrics(sensor) {
        const declared = Array.isArray(sensor.metrics)
            ? sensor.metrics.map(normalizeMetric).filter(Boolean)
            : [];
        if (declared.length) return [...new Set(declared)];

        const inferred = [];
        if (sensor.temperature != null) inferred.push("temperature");
        if (sensor.humidity != null) inferred.push("humidity");
        if (sensor.co2 != null) inferred.push("co2");
        return inferred.length ? inferred : ["temperature"];
    }

    function sensorSpace(sensor, index) {
        const raw = String(
            sensor.spaceCode
            || sensor.locationType
            || sensor.roomType
            || sensor.space
            || sensor.location
            || (index === 0 ? "LAB" : "")
        ).toUpperCase();
        return SPACE_MAP[raw] || SPACE_MAP.LAB;
    }

    function normalizeSensor(sensor, index) {
        const space = sensorSpace(sensor, index);
        const status = String(sensor.status || "").toUpperCase();
        return {
            id: String(sensor.id || sensor.sensorId || sensor.deviceEui || `sensor-${index + 1}`),
            name: sensor.name || sensor.deviceName || `${space.label} 환경 센서`,
            eui: sensor.eui || sensor.deviceEui || sensor.devEui || "EUI 미연결",
            space: space.value,
            spaceLabel: space.label,
            location: sensor.locationName || sensor.zoneName || sensor.detailLocation || space.label,
            interval: Number(sensor.interval || sensor.collectionInterval || 60),
            metrics: sensorMetrics(sensor),
            active: sensor.active !== false && !["INACTIVE", "OFFLINE", "DISABLED"].includes(status)
        };
    }

    function normalizeAudit(item, index) {
        const target = String(item.target || "");
        const action = String(item.action || "");
        const space = target.includes("회의실")
            ? SPACE_MAP.MEETING_ROOM
            : target.includes("도서관") ? SPACE_MAP.LIBRARY : SPACE_MAP.LAB;
        const inactive = action.includes("비활성") || action.includes("삭제");
        return {
            id: String(item.id || `sensor-audit-${index + 1}`),
            time: item.occurredAt || "-",
            ageDays: 0,
            title: action || "센서 작업",
            detail: [target, item.detail].filter(Boolean).join(" · "),
            space: space.value,
            spaceLabel: space.label,
            status: inactive ? "inactive" : "active"
        };
    }

    function sensorAudits(state) {
        return (Array.isArray(state.audits) ? state.audits : [])
            .filter((item) => item.cohortId === state.selectedCohortId)
            .filter((item) => `${item.action || ""} ${item.target || ""}`.includes("센서"))
            .map(normalizeAudit);
    }

    function publishContext(state) {
        const cohort = state.currentCohort;
        const context = Object.freeze({
            cohortId: String(cohort.id || ""),
            cohortName: cohort.name || "",
            sensors: sensorSource(cohort).map(normalizeSensor),
            auditEntries: sensorAudits(state)
        });
        window.OmagotchiManagerSensorContext = context;
        if (window.OmagotchiManagerSensorIsland?.render) {
            window.OmagotchiManagerSensorIsland.render(context);
        } else {
            window.dispatchEvent(new CustomEvent(CONTEXT_EVENT, { detail: context }));
        }
    }

    function create({ root, store }) {
        if (!root) throw new Error("Sensors panel root is required.");
        if (!root.querySelector("[data-manager-sensor-react-root]")) {
            throw new Error("Sensors React island root is missing.");
        }

        function activate() {
            publishContext(store.getState());
        }

        return Object.freeze({ activate });
    }

    window.OmagotchiDashboardPanels.register({
        key: "sensors",
        route: "sensors",
        label: "공간·센서",
        order: 60,
        topics: ["sensors", "audits", "selection"],
        create
    });
})();

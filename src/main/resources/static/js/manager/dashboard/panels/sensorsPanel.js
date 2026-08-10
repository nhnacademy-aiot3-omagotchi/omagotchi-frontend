(() => {
    const SENSOR_LOCATIONS = Object.freeze(["LAB", "OFFICE", "MEETING_ROOM"]);
    const SENSOR_LOCATION_IDS = new Set(SENSOR_LOCATIONS);
    const SENSOR_OPERATOR_LABELS = Object.freeze({
        GTE: "이상",
        LT: "미만",
        GT: "초과",
        LTE: "이하"
    });
    const SENSOR_OPERATORS = new Set(Object.keys(SENSOR_OPERATOR_LABELS));
    const SENSOR_METRICS = Object.freeze(["temperature", "humidity", "co2"]);
    const SENSOR_UNITS = Object.freeze({ temperature: "℃", humidity: "%", co2: "ppm" });
    const DEFAULT_THRESHOLDS = Object.freeze({
        temperature: Object.freeze({ operator: "GT", value: 26 }),
        humidity: Object.freeze({ operator: "LT", value: 40 }),
        co2: Object.freeze({ operator: "GTE", value: 1000 })
    });

    function normalizeThresholdRule(thresholds, metric, legacyValueKey) {
        const rule = thresholds[metric] || {};
        const fallback = DEFAULT_THRESHOLDS[metric];
        return {
            operator: rule.operator || fallback.operator,
            value: Number(rule.value ?? thresholds[legacyValueKey] ?? fallback.value)
        };
    }

    function normalizeThresholds(thresholds = {}) {
        return {
            temperature: normalizeThresholdRule(thresholds, "temperature", "temperatureMax"),
            humidity: normalizeThresholdRule(thresholds, "humidity", "humidityMin"),
            co2: normalizeThresholdRule(thresholds, "co2", "co2Max")
        };
    }

    function thresholdsFor(sensor, location) {
        const thresholds = sensor?.thresholds || {};
        return normalizeThresholds(thresholds[location] || thresholds);
    }

    function sensorSource(cohort) {
        if (Array.isArray(cohort.sensor?.locations)) return cohort.sensor.locations;
        if (Array.isArray(cohort.sensors)) return cohort.sensors;
        if (Array.isArray(cohort.sensorReadings)) return cohort.sensorReadings;
        return [];
    }

    function readingsByLocation(cohort) {
        const readings = new Map();
        for (const location of SENSOR_LOCATIONS) readings.set(location, {});

        const source = sensorSource(cohort);
        for (let index = 0; index < source.length; index += 1) {
            const sensor = source[index];
            const fallbackLocation = SENSOR_LOCATIONS[index] || "";
            const location = String(
                sensor.location
                || sensor.locationType
                || sensor.place
                || sensor.roomType
                || fallbackLocation
            ).toUpperCase();
            if (readings.has(location)) readings.set(location, sensor);
        }

        if (!source.length) readings.set("LAB", cohort.sensor || {});
        return readings;
    }

    function isThresholdWarning(value, rule) {
        const numericValue = Number(value);
        const threshold = Number(rule?.value);
        if (!Number.isFinite(numericValue) || !Number.isFinite(threshold)) return false;

        return {
            GTE: numericValue >= threshold,
            LT: numericValue < threshold,
            GT: numericValue > threshold,
            LTE: numericValue <= threshold
        }[rule.operator] || false;
    }

    function formatThreshold(metric, rule) {
        return `${SENSOR_OPERATOR_LABELS[rule.operator] || rule.operator} ${rule.value}${SENSOR_UNITS[metric]}`;
    }

    function createReadingElements(root) {
        const result = new Map();
        for (const location of SENSOR_LOCATIONS) {
            result.set(location, {
                temperature: root.querySelector(`[data-sensor-temperature="${location}"]`),
                humidity: root.querySelector(`[data-sensor-humidity="${location}"]`),
                co2: root.querySelector(`[data-sensor-co2="${location}"]`),
                temperatureRule: root.querySelector(`[data-sensor-temperature-range="${location}"]`),
                humidityRule: root.querySelector(`[data-sensor-humidity-range="${location}"]`),
                co2State: root.querySelector(`[data-sensor-co2-state="${location}"]`),
                updated: root.querySelector(`[data-sensor-updated-for="${location}"]`)
            });
        }
        return result;
    }

    function setWarning(element, warning) {
        element?.closest("article")?.classList.toggle("is-warning", warning);
    }

    function fillThresholdForm(form, thresholds) {
        for (const metric of SENSOR_METRICS) {
            form.elements.namedItem(`${metric}Operator`).value = thresholds[metric].operator;
            form.elements.namedItem(`${metric}Value`).value = thresholds[metric].value;
        }
    }

    function readThresholdForm(form) {
        const thresholds = {};
        for (const metric of SENSOR_METRICS) {
            thresholds[metric] = {
                operator: form.elements.namedItem(`${metric}Operator`).value,
                value: Number(form.elements.namedItem(`${metric}Value`).value)
            };
        }
        return {
            location: form.elements.namedItem("location").value,
            thresholds
        };
    }

    function isValidThresholds(location, thresholds) {
        if (!SENSOR_LOCATION_IDS.has(location)) return false;
        for (const metric of SENSOR_METRICS) {
            const rule = thresholds[metric];
            if (!SENSOR_OPERATORS.has(rule?.operator) || !Number.isFinite(rule?.value)) return false;
        }
        return true;
    }

    function create({ root, store, setBubble }) {
        if (!root) throw new Error("Sensors panel root is required.");

        const elements = {
            updated: root.querySelector("[data-sensor-updated]"),
            open: root.querySelector("[data-open-sensor-thresholds]"),
            form: root.querySelector("[data-sensor-threshold-form]"),
            cancel: root.querySelector("[data-cancel-sensor-thresholds]"),
            readings: createReadingElements(root)
        };

        function getCohort() {
            return store.getState().currentCohort;
        }

        function renderThresholdForm() {
            const location = elements.form.elements.namedItem("location").value || "LAB";
            fillThresholdForm(elements.form, thresholdsFor(getCohort().sensor, location));
        }

        function activate() {
            const cohort = getCohort();
            const readings = readingsByLocation(cohort);
            let lastUpdated = "";

            for (const location of SENSOR_LOCATIONS) {
                const sensor = readings.get(location) || {};
                const thresholds = thresholdsFor(cohort.sensor, location);
                const view = elements.readings.get(location);
                const temperatureWarning = isThresholdWarning(sensor.temperature, thresholds.temperature);
                const humidityWarning = isThresholdWarning(sensor.humidity, thresholds.humidity);
                const co2Warning = isThresholdWarning(sensor.co2, thresholds.co2);

                view.temperature.textContent = sensor.temperature == null ? "--" : `${sensor.temperature}℃`;
                view.humidity.textContent = sensor.humidity == null ? "--" : `${sensor.humidity}%`;
                view.co2.textContent = sensor.co2 == null ? "--" : `${sensor.co2}ppm`;
                view.temperatureRule.textContent = formatThreshold("temperature", thresholds.temperature);
                view.humidityRule.textContent = formatThreshold("humidity", thresholds.humidity);
                view.co2State.textContent = co2Warning
                    ? "환기가 필요합니다"
                    : sensor.co2 == null ? "수신 대기" : "쾌적";
                view.updated.textContent = sensor.updatedAt || "수신 데이터 없음";

                setWarning(view.temperature, temperatureWarning);
                setWarning(view.humidity, humidityWarning);
                setWarning(view.co2, co2Warning);
                lastUpdated = sensor.updatedAt || lastUpdated;
            }

            elements.updated.textContent = lastUpdated ? `마지막 수신 ${lastUpdated}` : "수신 데이터 없음";
            renderThresholdForm();
        }

        function openThresholdForm() {
            renderThresholdForm();
            elements.form.hidden = false;
        }

        function cancelThresholdForm() {
            elements.form.hidden = true;
            renderThresholdForm();
        }

        function saveThresholds(event) {
            event.preventDefault();
            const { location, thresholds } = readThresholdForm(elements.form);
            if (!isValidThresholds(location, thresholds)) {
                setBubble("임계치 값을<br />확인해 주세요.");
                return;
            }

            const result = store.dispatch({
                type: "SAVE_SENSOR_THRESHOLDS",
                location,
                thresholds
            });
            if (result.ok) elements.form.hidden = true;
        }

        elements.open.addEventListener("click", openThresholdForm);
        elements.cancel.addEventListener("click", cancelThresholdForm);
        elements.form.elements.namedItem("location").addEventListener("change", renderThresholdForm);
        elements.form.addEventListener("submit", saveThresholds);

        return Object.freeze({ activate });
    }

    window.OmagotchiDashboardPanels.register({
        key: "sensors",
        route: "sensors",
        label: "공간·센서",
        order: 60,
        topics: ["sensors", "selection"],
        create
    });
})();

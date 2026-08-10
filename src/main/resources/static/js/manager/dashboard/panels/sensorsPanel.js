(() => {
    const DEFAULT_THRESHOLDS = {
        temperatureMin: 20,
        temperatureMax: 26,
        humidityMin: 40,
        humidityMax: 60,
        co2Max: 1000,
        occupancyMax: 30
    };

    function create({ root, store, setBubble }) {
        if (!root) throw new Error("Sensors panel root is required.");

        const elements = {
            temperature: root.querySelector("[data-sensor-temperature]"),
            humidity: root.querySelector("[data-sensor-humidity]"),
            co2: root.querySelector("[data-sensor-co2]"),
            occupancy: root.querySelector("[data-sensor-occupancy]"),
            updated: root.querySelector("[data-sensor-updated]"),
            temperatureRange: root.querySelector("[data-sensor-temperature-range]"),
            humidityRange: root.querySelector("[data-sensor-humidity-range]"),
            occupancyRange: root.querySelector("[data-sensor-occupancy-range]"),
            co2State: root.querySelector("[data-sensor-co2-state]"),
            open: root.querySelector("[data-open-sensor-thresholds]"),
            form: root.querySelector("[data-sensor-threshold-form]"),
            cancel: root.querySelector("[data-cancel-sensor-thresholds]")
        };

        function getSensor() {
            return store.getState().currentCohort.sensor || {};
        }

        function currentThresholds() {
            return { ...DEFAULT_THRESHOLDS, ...(getSensor().thresholds || {}) };
        }

        function activate() {
            const sensor = getSensor();
            const thresholds = currentThresholds();
            const temperatureWarning = sensor.temperature != null
                && (sensor.temperature < thresholds.temperatureMin || sensor.temperature > thresholds.temperatureMax);
            const humidityWarning = sensor.humidity != null
                && (sensor.humidity < thresholds.humidityMin || sensor.humidity > thresholds.humidityMax);
            const co2Warning = sensor.co2 != null && sensor.co2 >= thresholds.co2Max;
            const occupancyWarning = sensor.occupancy != null && sensor.occupancy > thresholds.occupancyMax;

            elements.temperature.textContent = sensor.temperature == null ? "--" : `${sensor.temperature}℃`;
            elements.humidity.textContent = sensor.humidity == null ? "--" : `${sensor.humidity}%`;
            elements.co2.textContent = sensor.co2 == null ? "--" : `${sensor.co2}ppm`;
            elements.occupancy.textContent = `${sensor.occupancy ?? 0}명`;
            elements.updated.textContent = sensor.updatedAt ? `마지막 수신 ${sensor.updatedAt}` : "수신 데이터 없음";
            elements.temperatureRange.textContent = `권장 ${thresholds.temperatureMin}~${thresholds.temperatureMax}℃`;
            elements.humidityRange.textContent = `권장 ${thresholds.humidityMin}~${thresholds.humidityMax}%`;
            elements.occupancyRange.textContent = `최대 ${thresholds.occupancyMax}명`;
            elements.co2State.textContent = co2Warning ? "환기가 필요합니다" : sensor.co2 == null ? "수신 대기" : "쾌적";
            elements.temperature.closest("article").classList.toggle("is-warning", temperatureWarning);
            elements.humidity.closest("article").classList.toggle("is-warning", humidityWarning);
            elements.co2.closest("article").classList.toggle("is-warning", co2Warning);
            elements.occupancy.closest("article").classList.toggle("is-warning", occupancyWarning);
            Object.entries(thresholds).forEach(([key, value]) => {
                const field = elements.form.elements.namedItem(key);
                if (field) field.value = value;
            });
        }

        elements.open.addEventListener("click", () => {
            elements.form.hidden = false;
        });
        elements.cancel.addEventListener("click", () => {
            elements.form.hidden = true;
            activate();
        });
        elements.form.addEventListener("submit", (event) => {
            event.preventDefault();
            const next = {
                temperatureMin: Number(elements.form.elements.namedItem("temperatureMin").value),
                temperatureMax: Number(elements.form.elements.namedItem("temperatureMax").value),
                humidityMin: Number(elements.form.elements.namedItem("humidityMin").value),
                humidityMax: Number(elements.form.elements.namedItem("humidityMax").value),
                co2Max: Number(elements.form.elements.namedItem("co2Max").value),
                occupancyMax: Number(elements.form.elements.namedItem("occupancyMax").value)
            };
            const invalid = Object.values(next).some((value) => Number.isNaN(value))
                || next.temperatureMin > next.temperatureMax
                || next.humidityMin > next.humidityMax
                || next.co2Max < 1
                || next.occupancyMax < 1;
            if (invalid) {
                setBubble("임계치 값을<br />확인해 주세요.");
                return;
            }
            elements.form.hidden = true;
            store.dispatch({ type: "SAVE_SENSOR_THRESHOLDS", thresholds: next });
        });

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

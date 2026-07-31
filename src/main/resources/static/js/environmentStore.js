const STORE_KEY = "omagotchiEnvironmentV1";

const DEFAULT_STATE = {
    selectedCohortId: 3,
    cohorts: {
        3: {
            id: 3,
            name: "AIoT 3기",
            labName: "AIoT 3기 실습실",
            readings: {temperature: 24, humidity: 42, co2: 410, dust: 18},
            thresholds: {
                temperatureLow: 18,
                temperatureHigh: 28,
                humidityHigh: 70,
                co2High: 1000,
                dustHigh: 80
            }
        }
    }
};

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function readState() {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) {
        return clone(DEFAULT_STATE);
    }

    try {
        const stored = JSON.parse(raw);
        return {
            ...clone(DEFAULT_STATE),
            ...stored,
            cohorts: {...clone(DEFAULT_STATE.cohorts), ...stored.cohorts}
        };
    } catch {
        return clone(DEFAULT_STATE);
    }
}

function writeState(state) {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("omagotchi:environment", {detail: state}));
}

export function getEnvironmentState() {
    return readState();
}

export function getSelectedCohortEnvironment() {
    const state = readState();
    return state.cohorts[state.selectedCohortId] || Object.values(state.cohorts)[0];
}

export function updateThresholds(cohortId, thresholds) {
    const state = readState();
    const cohort = state.cohorts[cohortId];
    if (!cohort) {
        return;
    }

    cohort.thresholds = {...cohort.thresholds, ...thresholds};
    writeState(state);
}

export function updateReadings(cohortId, readings) {
    const state = readState();
    const cohort = state.cohorts[cohortId];
    if (!cohort) {
        return;
    }

    cohort.readings = {...cohort.readings, ...readings};
    writeState(state);
}

export function subscribeEnvironment(listener) {
    const notify = () => listener(getEnvironmentState());
    window.addEventListener("omagotchi:environment", notify);
    window.addEventListener("storage", (event) => {
        if (event.key === STORE_KEY) {
            notify();
        }
    });
}

export function evaluateEnvironment(cohort) {
    const {readings, thresholds} = cohort;
    const alerts = [];

    if (readings.temperature >= thresholds.temperatureHigh) {
        alerts.push({type: "hot", message: "온도가 높습니다. 에어컨을 가동합니다."});
    } else if (readings.temperature <= thresholds.temperatureLow) {
        alerts.push({type: "cold", message: "온도가 낮습니다. 난방을 가동합니다."});
    }

    if (readings.humidity >= thresholds.humidityHigh) {
        alerts.push({type: "humid", message: "습도가 높습니다. 제습 운전을 시작합니다."});
    }

    if (readings.co2 >= thresholds.co2High) {
        alerts.push({type: "co2", message: "이산화탄소 수치가 높습니다. 환기를 시작합니다."});
    }

    if (readings.dust >= thresholds.dustHigh) {
        alerts.push({type: "dust", message: "미세먼지 농도가 높습니다. 공기청정기를 가동합니다."});
    }

    if (alerts.length === 0) {
        alerts.push({type: "normal", message: "실습실 환경이 적정 범위로 유지되고 있습니다."});
    }

    return alerts;
}

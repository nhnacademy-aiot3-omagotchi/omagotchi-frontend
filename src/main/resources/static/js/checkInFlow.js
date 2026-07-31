import {checkInToday} from "./attendanceState.js";

const WAKE_DELAY_MS = 2800;
const REQUIRED_SHAKES = 4;
const ATTENDANCE_SNAPSHOT_KEY = "omagotchiAttendanceSnapshot";

const character = document.querySelector("#sleeping-character");
const message = document.querySelector("#wake-message");
const wakeControls = [...document.querySelectorAll("[data-wake-action]")];

let shakeCount = 0;
let completed = false;

function removeSleepMark() {
    document.querySelectorAll(".sleep-symbol, .sleep-mark, .sleep-z, [data-sleep-symbol]")
        .forEach((element) => element.remove());

    document.querySelectorAll("span, div, p").forEach((element) => {
        if (element.children.length === 0 && element.textContent.trim().toLowerCase() === "z") {
            element.remove();
        }
    });
}

function removeLegacyCheckInButton() {
    document.querySelectorAll("button, a").forEach((element) => {
        if (element.textContent.trim() === "입실하기") {
            element.remove();
        }
    });
}

function getCharacterImage() {
    if (character?.matches("img")) {
        return character;
    }
    return character?.querySelector("img");
}

function saveAttendanceSnapshot() {
    const now = new Date();
    localStorage.setItem(ATTENDANCE_SNAPSHOT_KEY, JSON.stringify({
        date: now.toLocaleDateString("sv-SE"),
        checkedInAt: now.toISOString(),
        cohortName: "AIoT 3기",
        labName: "실습실",
        status: "재실",
        sensors: {
            temperature: 24,
            humidity: 42,
            co2: 410,
            fineDust: 12
        }
    }));
}

function createWaterParticles() {
    const stage = character?.closest(".check-in-stage, .wake-stage, main") || document.body;
    const effect = document.createElement("div");
    effect.className = "wake-water-effect";
    effect.setAttribute("aria-hidden", "true");

    for (let index = 0; index < 18; index += 1) {
        const drop = document.createElement("i");
        drop.style.setProperty("--drop-x", `${15 + Math.random() * 70}%`);
        drop.style.setProperty("--drop-delay", `${Math.random() * 0.35}s`);
        drop.style.setProperty("--drop-duration", `${0.65 + Math.random() * 0.45}s`);
        effect.append(drop);
    }

    stage.append(effect);
    window.setTimeout(() => effect.remove(), 1500);
}

function finishCheckIn(method) {
    if (completed) {
        return;
    }
    completed = true;

    checkInToday();
    saveAttendanceSnapshot();
    removeSleepMark();

    const image = getCharacterImage();
    if (image) {
        image.src = "/images/characters/status/wake/wake.gif";
        image.alt = "잠에서 깨어난 오마고치";
    }

    character?.classList.remove("is-shaking");
    character?.classList.add("is-awake");
    document.body.classList.add("is-check-in-complete");
    wakeControls.forEach((control) => {
        control.disabled = true;
        control.setAttribute("aria-disabled", "true");
    });

    if (message) {
        message.textContent = method === "water"
            ? "시원해요! 오늘도 같이 공부해요."
            : "일어났어요! 오늘도 같이 공부해요.";
    }

    window.setTimeout(() => window.location.replace("/home"), WAKE_DELAY_MS);
}

function shakeCharacter() {
    if (completed) {
        return;
    }

    shakeCount += 1;
    character?.classList.remove("is-shaking");
    void character?.offsetWidth;
    character?.classList.add("is-shaking");

    if (shakeCount >= REQUIRED_SHAKES) {
        finishCheckIn("shake");
        return;
    }

    if (message) {
        message.textContent = `${REQUIRED_SHAKES - shakeCount}번만 더 흔들어 깨워주세요.`;
    }
}

function handleWakeAction(event) {
    const control = event.target.closest("[data-wake-action], #sleeping-character");
    if (!control || completed) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const action = control.dataset.wakeAction || "character";
    if (action === "water") {
        createWaterParticles();
        finishCheckIn("water");
        return;
    }

    shakeCharacter();
}

removeSleepMark();
removeLegacyCheckInButton();
document.addEventListener("click", handleWakeAction, true);

const WAKE_IMAGE = "/images/characters/status/wake/wake.gif";
const REQUIRED_SHAKES = 4;
const WAKE_DELAY_MS = 2800;

let shakeCount = 0;
let waking = false;

function todayKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function saveAttendanceSnapshot() {
    const now = new Date();
    const snapshot = {
        date: todayKey(),
        checkInAt: now.toISOString(),
        status: "PRESENT",
        cohortName: sessionStorage.getItem("omagotchiCohortName") || "AIoT 3기",
        labName: sessionStorage.getItem("omagotchiLabName") || "실습실"
    };

    localStorage.setItem("omagotchiAttendanceSnapshot", JSON.stringify(snapshot));
}

function getCharacterImage() {
    const character = document.querySelector("#sleeping-character");
    if (!character) {
        return null;
    }
    return character.matches("img") ? character : character.querySelector("img");
}

function setMessage(text) {
    const message = document.querySelector("#wake-message");
    if (message) {
        message.textContent = text;
    }
}

function makeWaterParticles() {
    const character = document.querySelector("#sleeping-character");
    const stage = character?.closest(".check-in-character-stage, .character-stage, .wake-stage")
        || character?.parentElement;

    if (!stage) {
        return;
    }

    const layer = document.createElement("div");
    layer.className = "water-particle-layer";
    layer.setAttribute("aria-hidden", "true");

    for (let index = 0; index < 22; index += 1) {
        const drop = document.createElement("i");
        drop.className = "water-drop";
        drop.style.setProperty("--drop-x", `${8 + Math.random() * 84}%`);
        drop.style.setProperty("--drop-delay", `${Math.random() * 0.45}s`);
        drop.style.setProperty("--drop-duration", `${0.65 + Math.random() * 0.45}s`);
        layer.append(drop);
    }

    stage.append(layer);
    window.setTimeout(() => layer.remove(), 1600);
}

function showShakeFeedback() {
    const character = document.querySelector("#sleeping-character");
    character?.classList.remove("is-being-shaken");
    requestAnimationFrame(() => character?.classList.add("is-being-shaken"));
    window.setTimeout(() => character?.classList.remove("is-being-shaken"), 420);
}

function finishWakeUp() {
    if (waking) {
        return;
    }
    waking = true;

    checkInToday();
    saveAttendanceSnapshot();

    const character = document.querySelector("#sleeping-character");
    const image = getCharacterImage();
    if (image) {
        image.src = WAKE_IMAGE;
        image.alt = "잠에서 깬 오마고치";
    }

    character?.classList.add("is-awake");
    document.body.classList.add("check-in-complete");
    document.querySelectorAll("[data-wake-action]").forEach((button) => {
        button.disabled = true;
    });
    setMessage("일어났어요! 오늘도 같이 공부해요.");

    window.setTimeout(() => {
        window.location.replace("/home");
    }, WAKE_DELAY_MS);
}

function handleWakeAction(action) {
    if (waking) {
        return;
    }

    if (action === "water") {
        makeWaterParticles();
        setMessage("차가워요! 잠이 확 깼어요.");
        window.setTimeout(finishWakeUp, 900);
        return;
    }

    shakeCount += 1;
    showShakeFeedback();

    if (shakeCount >= REQUIRED_SHAKES) {
        setMessage("으음... 일어날게요!");
        window.setTimeout(finishWakeUp, 450);
        return;
    }

    setMessage(`조금만 더 흔들어 주세요. ${shakeCount}/${REQUIRED_SHAKES}`);
}

document.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-wake-action]");
    const character = event.target.closest("#sleeping-character");

    if (!actionButton && !character) {
        return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const action = actionButton?.dataset.wakeAction || "shake";
    handleWakeAction(action);
}, true);

import { checkInToday, isCheckedInToday } from "./attendanceState.js";

const SHAKE_COUNT_TO_WAKE = 4;
const WAKE_DURATION_MS = 2800;
const ATTENDANCE_SNAPSHOT_KEY = "omagotchiAttendanceSnapshot";
const ATTENDANCE_HISTORY_KEY = "omagotchiAttendanceHistory";

const localDateKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const formatTime = (date) => new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
}).format(date);

function prepareWakeMarkup() {
    document.querySelectorAll("button, a").forEach((element) => {
        if (element.textContent.trim() === "입실하기") {
            element.remove();
        }
    });

    document.querySelectorAll(
        ".sleep-mark, .sleep-symbol, [data-sleep-symbol], [aria-label='sleep']"
    ).forEach((element) => element.remove());

    document.querySelectorAll(
        "#sleeping-character span, .check-in-stage span, .wake-stage span"
    ).forEach((element) => {
        if (/^z+$/i.test(element.textContent.trim())) {
            element.remove();
        }
    });

    document.querySelectorAll("button").forEach((button) => {
        const label = button.textContent.trim();
        if (label === "흔들기") {
            button.dataset.wakeAction = "shake";
        }
        if (label === "물 뿌리기") {
            button.dataset.wakeAction = "water";
        }
    });
}

function saveAttendanceSnapshot() {
    const now = new Date();
    const snapshot = {
        date: localDateKey(now),
        checkedInAt: now.toISOString(),
        checkedInTime: formatTime(now),
        cohortName: sessionStorage.getItem("omagotchiCohortName")
            || localStorage.getItem("omagotchiCohortName")
            || "AIoT 3기",
        labName: sessionStorage.getItem("omagotchiLabName")
            || localStorage.getItem("omagotchiLabName")
            || "실습실",
        status: "재실",
        sensors: {
            temperature: 24,
            humidity: 42,
            co2: 410,
            dust: 18
        }
    };

    localStorage.setItem(ATTENDANCE_SNAPSHOT_KEY, JSON.stringify(snapshot));

    const history = JSON.parse(localStorage.getItem(ATTENDANCE_HISTORY_KEY) || "[]");
    const withoutToday = history.filter((entry) => entry.date !== snapshot.date);
    localStorage.setItem(
        ATTENDANCE_HISTORY_KEY,
        JSON.stringify([...withoutToday, snapshot].sort((a, b) => a.date.localeCompare(b.date)))
    );
}

function getCharacterImage(character) {
    if (character.tagName === "IMG") {
        return character;
    }
    return character.querySelector("img");
}

function createWaterParticles(character) {
    const stage = character.closest(".check-in-stage, .wake-stage, main, section")
        || character.parentElement;
    if (!stage) {
        return;
    }

    const rect = character.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();

    for (let index = 0; index < 18; index += 1) {
        const drop = document.createElement("span");
        drop.className = "wake-water-drop";
        drop.style.left = `${rect.left - stageRect.left + Math.random() * rect.width}px`;
        drop.style.top = `${Math.max(0, rect.top - stageRect.top - 90 - Math.random() * 70)}px`;
        drop.style.animationDelay = `${Math.random() * 180}ms`;
        drop.style.animationDuration = `${620 + Math.random() * 360}ms`;
        stage.appendChild(drop);
        drop.addEventListener("animationend", () => drop.remove(), { once: true });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    prepareWakeMarkup();

    const character = document.querySelector(
        "#sleeping-character, .check-in-character, .wake-character, [data-sleeping-character]"
    );
    const message = document.querySelector("#wake-message, [data-wake-message]");
    const wakeButtons = [...document.querySelectorAll("[data-wake-action]")];

    if (!character || wakeButtons.length === 0) {
        return;
    }

    let shakeCount = 0;
    let waking = false;

    const setMessage = (text) => {
        if (message) {
            message.textContent = text;
        }
    };

    const finishWake = () => {
        if (waking) {
            return;
        }
        waking = true;

        checkInToday();
        saveAttendanceSnapshot();

        const image = getCharacterImage(character);
        if (image) {
            image.src = "/images/characters/status/wake/wake.gif";
            image.alt = "잠에서 깬 오마고치";
        }

        character.classList.remove("is-shaking");
        character.classList.add("is-awake");
        wakeButtons.forEach((button) => {
            button.disabled = true;
            button.setAttribute("aria-disabled", "true");
        });
        setMessage("일어났어요! 오늘도 같이 공부해요.");

        window.setTimeout(() => {
            window.location.assign("/home");
        }, WAKE_DURATION_MS);
    };

    wakeButtons.forEach((button) => {
        button.addEventListener("click", () => {
            if (waking) {
                return;
            }

            if (button.dataset.wakeAction === "water") {
                createWaterParticles(character);
                setMessage("차가워! 이제 일어날게요.");
                window.setTimeout(finishWake, 850);
                return;
            }

            shakeCount += 1;
            character.classList.remove("is-shaking");
            void character.offsetWidth;
            character.classList.add("is-shaking");

            const remaining = SHAKE_COUNT_TO_WAKE - shakeCount;
            setMessage(
                remaining > 0 ? `${remaining}번만 더 흔들어 주세요.` : "으음... 일어날게요!"
            );

            if (remaining <= 0) {
                window.setTimeout(finishWake, 420);
            }
        });
    });

    if (isCheckedInToday()) {
        window.location.replace("/home");
    }
});

(() => {
    const attendanceKey = "omagotchiAttendance";
    const wakeAsset = "/images/characters/status/wake.gif";
    const requiredShakes = 4;
    let shakeCount = 0;
    let waking = false;

    const todayKey = () => {
        const now = new Date();
        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0")
        ].join("-");
    };

    const readAttendance = () => {
        try {
            return JSON.parse(localStorage.getItem(attendanceKey)) || {};
        } catch {
            return {};
        }
    };

    const isTodayCheckedIn = () => readAttendance().date === todayKey();

    const findButton = (label) => [...document.querySelectorAll("button, a, input[type='button'], input[type='submit']")]
        .find((element) => (element.textContent || element.value || "").trim() === label);

    const findCharacter = () => document.querySelector(
        "[data-wake-character], .wake-character img, .sleep-character img, .checkin-character img, " +
        "img[src*='/characters/status/'], img[src*='sleep']"
    );

    const removeLegacyControls = () => {
        document.querySelectorAll(
            "[data-sleep-indicator], .sleep-indicator, .sleep-z, .sleeping-z, .wake-z"
        ).forEach((element) => element.remove());

        document.querySelectorAll("body *").forEach((element) => {
            if (element.children.length === 0 && element.textContent.trim().toLowerCase() === "z") {
                element.remove();
            }
        });

        document.querySelectorAll("button, a, input[type='button'], input[type='submit']").forEach((element) => {
            const label = (element.textContent || element.value || "").trim();
            if (label === "입실하기") {
                element.remove();
            }
        });
    };

    const saveCheckIn = () => {
        const now = new Date();
        const previous = readAttendance();
        const history = previous.history && typeof previous.history === "object"
            ? previous.history
            : {};

        history[todayKey()] = {
            checkedInAt: now.toISOString(),
            status: "PRESENT"
        };

        const attendance = {
            date: todayKey(),
            checkedInAt: now.toISOString(),
            status: "PRESENT",
            cohortName: sessionStorage.getItem("omagotchiCohortName") || "AIoT 3기",
            labName: sessionStorage.getItem("omagotchiLabName") || "실습실",
            history
        };

        localStorage.setItem(attendanceKey, JSON.stringify(attendance));
        sessionStorage.setItem("omagotchiAttendanceStatus", "PRESENT");
        sessionStorage.setItem("omagotchiCheckInAt", attendance.checkedInAt);
        sessionStorage.setItem("omagotchiCohortName", attendance.cohortName);
        sessionStorage.setItem("omagotchiLabName", attendance.labName);
        window.dispatchEvent(new CustomEvent("omagotchi:checked-in", { detail: attendance }));
    };

    const emitWaterParticles = (source, character) => {
        const layer = document.createElement("div");
        const characterRect = character.getBoundingClientRect();
        const sourceRect = source.getBoundingClientRect();
        layer.className = "wake-water-particles";
        layer.style.setProperty("--water-x", `${characterRect.left + characterRect.width / 2}px`);
        layer.style.setProperty("--water-y", `${Math.min(sourceRect.top, characterRect.top) - 24}px`);

        for (let index = 0; index < 18; index += 1) {
            const drop = document.createElement("i");
            drop.style.setProperty("--drop-x", `${(Math.random() - 0.5) * 150}px`);
            drop.style.setProperty("--drop-delay", `${Math.random() * 0.35}s`);
            drop.style.setProperty("--drop-duration", `${0.55 + Math.random() * 0.35}s`);
            layer.append(drop);
        }

        document.body.append(layer);
        window.setTimeout(() => layer.remove(), 1500);
    };

    const completeWakeUp = () => {
        if (waking) {
            return;
        }
        waking = true;

        const character = findCharacter();
        if (!character) {
            return;
        }

        saveCheckIn();
        character.src = wakeAsset;
        character.classList.remove("is-shaking");
        character.classList.add("is-awake");
        character.alt = "잠에서 깨어난 오마고치";

        document.body.classList.add("wake-complete");
        document.querySelectorAll(".wake-actions button, [data-wake-action], button").forEach((button) => {
            button.disabled = true;
        });

        const guide = document.querySelector(
            "[data-wake-guide], .wake-guide, .checkin-guide, .wake-instruction"
        );
        if (guide) {
            guide.textContent = "출석했습니다. 실습실로 이동합니다.";
        }

        window.setTimeout(() => {
            window.location.replace("/home");
        }, 2800);
    };

    const initialize = () => {
        removeLegacyControls();

        if (isTodayCheckedIn()) {
            window.location.replace("/home");
            return;
        }

        const character = findCharacter();
        const shakeButton = findButton("흔들기");
        const waterButton = findButton("물 뿌리기");

        if (!character || !shakeButton || !waterButton) {
            return;
        }

        shakeButton.addEventListener("click", () => {
            if (waking) {
                return;
            }

            shakeCount += 1;
            character.classList.remove("is-shaking");
            void character.offsetWidth;
            character.classList.add("is-shaking");

            if (shakeCount >= requiredShakes) {
                window.setTimeout(completeWakeUp, 350);
            }
        });

        waterButton.addEventListener("click", () => {
            if (waking) {
                return;
            }

            emitWaterParticles(waterButton, character);
            character.classList.add("is-watered");
            window.setTimeout(completeWakeUp, 900);
        });
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();

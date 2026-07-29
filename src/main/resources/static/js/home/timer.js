import { formatDuration } from "./utils.js";
// 타이머 생성
export function createTimer({ display, toggle, onStart, onPause }) {
    let status = "idle";
    let startedAt = 0;
    let elapsedBeforeStart = 0;
    let tickId = null;

    function getElapsedSeconds() {
        if (status !== "running") {
            return elapsedBeforeStart;
        }

        return elapsedBeforeStart + Math.floor((Date.now() - startedAt) / 1000);
    }

    function render() {
        const elapsed = getElapsedSeconds();
        const formattedTime = formatDuration(elapsed);

        if (display) {
            display.textContent = formattedTime;
            display.setAttribute("datetime", `PT${elapsed}S`);
        }

        // 탭을 바꿔도 남은 시간을 확인할 수 있게 제목에도 같이 표시한다.
        document.title = `${formattedTime} - Omagotchi`;
    }
    // 시작
    function start() {
        status = "running";
        startedAt = Date.now();
        toggle.textContent = "일시정지";
        onStart?.();
        tickId = window.setInterval(render, 1000);
        render();
    }
    // 일시정지
    function pause() {
        elapsedBeforeStart = getElapsedSeconds();
        status = "idle";
        toggle.textContent = "시작";
        onPause?.();
        window.clearInterval(tickId);
        render();
    }

    function init() {
        toggle?.addEventListener("click", () => {
            if (status === "running") {
                pause();
            } else {
                start();
            }
        });
        render();
    }

    return {
        init,
        getElapsedSeconds,
        isRunning: () => status === "running"
    };
}

/**
 * 서버에서 발견한 실행 중 타이머를 복구하거나 파기할지 묻습니다.
 * native dialog의 top layer를 사용해 설정 오버레이 등 배경 UI가
 * 실수로 클릭되지 않도록 격리합니다.
 */
export function promptResumeTimer(
    { elapsedSeconds = 0 } = {},
    { documentRef = document } = {}
) {
    return new Promise((resolve) => {
        const dialog = documentRef.createElement("dialog");
        dialog.className = "home-confirm-dialog home-timer-resume-dialog";
        dialog.dataset.timerResumeDialog = "";
        dialog.setAttribute("aria-labelledby", "home-timer-confirm-title");
        dialog.innerHTML = `
            <h2 id="home-timer-confirm-title">진행 중인 타이머가 있어요</h2>
            <p>이전에 시작된 학습 타이머가 실행 중입니다.<br />이어서 계속 진행할까요, 아니면 기존 기록을 파기할까요?</p>
            <div class="home-confirm-actions">
                <button type="button" data-timer-discard>파기하기</button>
                <button type="button" data-timer-resume>계속 진행</button>
            </div>
        `;

        let settled = false;

        function close(action) {
            if (settled) {
                return;
            }
            settled = true;
            if (dialog.open && typeof dialog.close === "function") {
                dialog.close();
            }
            dialog.remove();
            resolve(action);
        }

        dialog.addEventListener("cancel", (event) => {
            event.preventDefault();
            close("resume");
        });

        dialog.addEventListener("click", (event) => {
            const target = event.target;
            if (!target || typeof target.closest !== "function") {
                return;
            }

            if (target.closest("[data-timer-discard]")) {
                event.preventDefault();
                event.stopPropagation();
                close("discard");
                return;
            }

            if (target.closest("[data-timer-resume]")) {
                event.preventDefault();
                event.stopPropagation();
                close("resume");
            }
        });

        documentRef.body.append(dialog);
        if (typeof dialog.showModal === "function") {
            dialog.showModal();
        } else {
            dialog.setAttribute("open", "");
        }
        dialog.querySelector("[data-timer-resume]")?.focus();
    });
}

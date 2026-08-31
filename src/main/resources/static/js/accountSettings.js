const ISO_CONTROL_CHARACTER = /[\u0000-\u001f\u007f-\u009f]/u;

export function validateAccountName(rawName) {
    const name = String(rawName ?? "").trim();
    if (name.length < 1 || name.length > 30) {
        return {valid: false, message: "이름은 앞뒤 공백을 제외하고 1~30자로 입력해 주세요."};
    }
    return {valid: true, value: name};
}

export function validateNewPassword(currentPassword, newPassword, confirmation) {
    if (!currentPassword || !newPassword || !confirmation) {
        return {valid: false, message: "비밀번호 입력란을 모두 채워 주세요."};
    }
    if (newPassword !== confirmation) {
        return {valid: false, message: "새 비밀번호 확인이 일치하지 않습니다."};
    }
    if (newPassword === currentPassword) {
        return {valid: false, message: "새 비밀번호는 현재 비밀번호와 달라야 합니다."};
    }
    const utf8Bytes = new TextEncoder().encode(newPassword).length;
    if (newPassword.length < 15
        || newPassword.length > 64
        || newPassword.trim().length === 0
        || ISO_CONTROL_CHARACTER.test(newPassword)
        || utf8Bytes > 72) {
        return {
            valid: false,
            message: "새 비밀번호는 15~64자이고, 제어 문자를 포함하거나 UTF-8 기준 72바이트를 넘을 수 없습니다."
        };
    }
    return {valid: true};
}

export function validateAccountWithdrawal(currentPassword, confirmed) {
    if (!currentPassword) {
        return {valid: false, message: "현재 비밀번호를 입력해 주세요."};
    }
    if (!confirmed) {
        return {valid: false, message: "탈퇴 안내를 확인해 주세요."};
    }
    return {valid: true};
}

function setFeedback(element, message, type = "") {
    element.textContent = message;
    element.dataset.feedbackType = type;
}

function setSubmitting(fieldset, button, submitting, idleLabel) {
    fieldset.disabled = submitting;
    button.textContent = submitting ? "처리 중…" : idleLabel;
}

function handleAuthenticationFailure(error) {
    if (error?.status !== 401) return false;
    window.location.assign("/login?notice=session-expired");
    return true;
}

function formatLinkedAt(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 연결`;
}

export function initializeTelegramSettings(root = document.querySelector("[data-telegram-section]")) {
    if (!root || !window.OmagotchiApi?.telegram) return;

    const api = window.OmagotchiApi.telegram;
    const status = root.querySelector("[data-telegram-status]");
    const toggle = root.querySelector("[data-telegram-toggle]");
    const toggleLabel = root.querySelector("[data-telegram-toggle-label]");
    const help = root.querySelector("[data-telegram-help]");
    const connectButton = root.querySelector("[data-telegram-connect]");
    const disconnectButton = root.querySelector("[data-telegram-disconnect]");
    const retryButton = root.querySelector("[data-telegram-retry]");
    const feedback = root.querySelector("[data-telegram-feedback]");

    // 마지막으로 확인된 연동 정보. 실패 복구 시 화면을 이 값으로 되돌린다.
    let currentLink = null;
    // 진행 중인 작업의 순번. 늦게 끝난 이전 요청이 현재 화면을 되돌리지 못하게 한다.
    let operationSeq = 0;

    // 하나가 진행 중이면 전부 잠근다. 알림 변경과 연동 해제가 겹치면
    // 먼저 끝난 쪽의 화면을 나중에 끝난 쪽이 덮어써 상태가 어긋난다.
    function beginOperation() {
        toggle.disabled = true;
        connectButton.disabled = true;
        disconnectButton.disabled = true;
        retryButton.disabled = true;
        operationSeq += 1;
        return operationSeq;
    }

    function isStale(seq) {
        return seq !== operationSeq;
    }

    // 숨기지 않고 상태로 보여준다. hidden은 CSS가 display를 지정하면 무력해지므로
    // 실행 가능 여부는 disabled로만 표현한다.
    function renderLinked(link) {
        currentLink = link;
        status.textContent = formatLinkedAt(link.linkedAt) || "연동됨";
        toggle.disabled = false;
        toggle.checked = link.notificationEnabled !== false;
        toggleLabel.textContent = toggle.checked ? "받는 중" : "받지 않음";
        help.hidden = true;
        connectButton.hidden = true;
        disconnectButton.hidden = false;
        disconnectButton.disabled = false;
        disconnectButton.textContent = "연동 해제";
        retryButton.hidden = true;
    }

    function renderUnlinked() {
        currentLink = null;
        status.textContent = "연동되지 않음";
        toggle.disabled = true;
        toggle.checked = false;
        toggleLabel.textContent = "연동 후 사용할 수 있습니다";
        help.hidden = false;
        connectButton.hidden = false;
        connectButton.disabled = false;
        connectButton.textContent = "텔레그램 연동하기";
        disconnectButton.hidden = true;
        retryButton.hidden = true;
    }

    // 조회 실패는 미연동이 아니다. 연동 여부를 모르는 상태이므로 단정하지 않고,
    // 연동·해제 같은 상태 의존 동작을 막은 뒤 재시도만 남긴다.
    function renderUnknown() {
        currentLink = null;
        status.textContent = "상태를 확인하지 못했습니다";
        toggle.disabled = true;
        toggle.checked = false;
        toggleLabel.textContent = "상태를 확인한 뒤 사용할 수 있습니다";
        help.hidden = true;
        connectButton.hidden = true;
        disconnectButton.hidden = true;
        retryButton.hidden = false;
        retryButton.disabled = false;
        retryButton.textContent = "다시 확인";
    }

    async function loadLink() {
        const seq = beginOperation();
        setFeedback(feedback, "");
        try {
            // 미연동은 204라 본문이 비어 온다. 오류가 아니므로 catch로 다루지 않는다.
            const link = await api.getMyLink();
            if (isStale(seq)) return;
            if (link) renderLinked(link);
            else renderUnlinked();
        } catch (error) {
            if (isStale(seq)) return;
            if (handleAuthenticationFailure(error)) return;
            renderUnknown();
            setFeedback(feedback, error?.message || "연동 상태를 불러오지 못했습니다.", "error");
        }
    }

    retryButton.addEventListener("click", () => {
        loadLink();
    });

    connectButton.addEventListener("click", async () => {
        // 새 창은 클릭이 만든 transient activation 안에서만 열 수 있다. 발급 응답을 기다린 뒤
        // 열면 그 사이 활성화가 만료돼 차단될 수 있으므로, 빈 창을 먼저 열고 주소는 나중에 넣는다.
        //
        // noopener를 주면 반환값이 규격상 항상 null이라 창을 제어할 수 없다. 대신 opener를
        // 직접 끊어 새 탭이 이 페이지를 조작하지 못하게 한다.
        const popup = window.open("", "_blank");
        if (!popup) {
            // 차단됐으면 토큰을 발급하지 않는다. 열지도 못할 1회용 토큰을 소모할 이유가 없다.
            setFeedback(
                feedback,
                "팝업이 차단되어 텔레그램을 열지 못했습니다. 이 사이트의 팝업을 허용한 뒤 다시 시도해 주세요.",
                "error"
            );
            return;
        }
        popup.opener = null;

        const seq = beginOperation();
        connectButton.textContent = "처리 중…";
        setFeedback(feedback, "");
        try {
            const issued = await api.issueLinkToken();
            popup.location = issued.linkUrl;
            if (isStale(seq)) return;
            renderUnlinked();
            setFeedback(
                feedback,
                "텔레그램에서 [시작]을 누른 뒤 이 페이지를 새로고침하세요.",
                "success"
            );
        } catch (error) {
            popup.close();
            if (isStale(seq)) return;
            if (handleAuthenticationFailure(error)) return;
            renderUnlinked();
            setFeedback(feedback, error?.message || "연동 링크를 발급하지 못했습니다.", "error");
        }
    });

    toggle.addEventListener("change", async () => {
        const next = toggle.checked;
        const previous = currentLink;
        const seq = beginOperation();
        setFeedback(feedback, "");
        try {
            const updated = await api.updateNotification(next);
            if (isStale(seq)) return;
            renderLinked(updated || {...previous, notificationEnabled: next});
            setFeedback(feedback, next ? "알림을 켰습니다." : "알림을 껐습니다.", "success");
        } catch (error) {
            if (isStale(seq)) return;
            if (handleAuthenticationFailure(error)) return;
            // 서버가 거부했으므로 마지막으로 확인된 상태로 되돌린다.
            if (previous) renderLinked(previous);
            else renderUnknown();
            setFeedback(feedback, error?.message || "알림 설정을 변경하지 못했습니다.", "error");
        }
    });

    disconnectButton.addEventListener("click", async () => {
        const previous = currentLink;
        const seq = beginOperation();
        disconnectButton.textContent = "처리 중…";
        setFeedback(feedback, "");
        try {
            await api.disconnect();
            if (isStale(seq)) return;
            renderUnlinked();
            setFeedback(feedback, "연동을 해제했습니다.", "success");
        } catch (error) {
            if (isStale(seq)) return;
            if (handleAuthenticationFailure(error)) return;
            if (previous) renderLinked(previous);
            else renderUnknown();
            setFeedback(feedback, error?.message || "연동을 해제하지 못했습니다.", "error");
        }
    });

    loadLink();
}

export function initializeAccountSettings(root = document.querySelector("[data-account-settings]")) {
    if (!root || !window.OmagotchiApi?.account) return;

    const api = window.OmagotchiApi.account;
    const loadFeedback = root.querySelector("[data-settings-load-feedback]");
    const retryButton = root.querySelector("[data-settings-retry]");
    const emailValue = root.querySelector("[data-settings-email]");
    const nameInput = root.querySelector("[data-settings-name]");
    const nameForm = root.querySelector("[data-account-name-form]");
    const nameFieldset = root.querySelector("[data-account-name-fieldset]");
    const nameButton = root.querySelector("[data-account-name-submit]");
    const nameFeedback = root.querySelector("[data-account-name-feedback]");
    const passwordForm = root.querySelector("[data-account-password-form]");
    const passwordFieldset = root.querySelector("[data-account-password-fieldset]");
    const passwordButton = root.querySelector("[data-account-password-submit]");
    const passwordFeedback = root.querySelector("[data-account-password-feedback]");
    const currentPasswordInput = root.querySelector("[data-settings-current-password]");
    const newPasswordInput = root.querySelector("[data-settings-new-password]");
    const confirmPasswordInput = root.querySelector("[data-settings-confirm-password]");
    const withdrawalForm = root.querySelector("[data-account-withdrawal-form]");
    const withdrawalFieldset = root.querySelector("[data-account-withdrawal-fieldset]");
    const withdrawalButton = root.querySelector("[data-account-withdrawal-submit]");
    const withdrawalFeedback = root.querySelector("[data-account-withdrawal-feedback]");
    const withdrawalPasswordInput = root.querySelector("[data-settings-withdrawal-password]");
    const withdrawalConfirmationInput = root.querySelector("[data-settings-withdrawal-confirmation]");

    let loadedName = "";

    async function loadAccount() {
        nameFieldset.disabled = true;
        passwordFieldset.disabled = true;
        withdrawalFieldset.disabled = true;
        retryButton.hidden = true;
        setFeedback(loadFeedback, "계정 정보를 불러오는 중입니다.");

        try {
            const account = await api.get();
            emailValue.textContent = account.email;
            nameInput.value = account.name;
            loadedName = account.name;
            nameFieldset.disabled = false;
            passwordFieldset.disabled = false;
            withdrawalFieldset.disabled = false;
            setFeedback(loadFeedback, "계정 정보를 불러왔습니다.", "success");
        } catch (error) {
            if (handleAuthenticationFailure(error)) return;
            retryButton.hidden = false;
            setFeedback(
                loadFeedback,
                error?.message || "계정 정보를 불러오지 못했습니다.",
                "error"
            );
        }
    }

    retryButton.addEventListener("click", loadAccount);

    nameForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const validation = validateAccountName(nameInput.value);
        if (!validation.valid) {
            setFeedback(nameFeedback, validation.message, "error");
            nameInput.focus();
            return;
        }
        if (validation.value === loadedName) {
            setFeedback(nameFeedback, "변경된 이름이 없습니다.", "error");
            return;
        }

        setSubmitting(nameFieldset, nameButton, true, "이름 저장");
        setFeedback(nameFeedback, "");
        try {
            await api.changeName(validation.value);
            nameInput.value = validation.value;
            loadedName = validation.value;
            setFeedback(nameFeedback, "이름을 변경했습니다.", "success");
        } catch (error) {
            if (handleAuthenticationFailure(error)) return;
            setFeedback(nameFeedback, error?.message || "이름을 변경하지 못했습니다.", "error");
        } finally {
            setSubmitting(nameFieldset, nameButton, false, "이름 저장");
        }
    });

    passwordForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const currentPassword = currentPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const validation = validateNewPassword(
            currentPassword,
            newPassword,
            confirmPasswordInput.value
        );
        if (!validation.valid) {
            setFeedback(passwordFeedback, validation.message, "error");
            return;
        }

        setSubmitting(passwordFieldset, passwordButton, true, "비밀번호 변경");
        setFeedback(passwordFeedback, "");
        try {
            await api.changePassword(currentPassword, newPassword);
            window.location.assign("/login?notice=password-changed");
        } catch (error) {
            if (handleAuthenticationFailure(error)) return;
            setFeedback(
                passwordFeedback,
                error?.message || "비밀번호를 변경하지 못했습니다.",
                "error"
            );
        } finally {
            currentPasswordInput.value = "";
            newPasswordInput.value = "";
            confirmPasswordInput.value = "";
            setSubmitting(passwordFieldset, passwordButton, false, "비밀번호 변경");
        }
    });

    withdrawalForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const currentPassword = withdrawalPasswordInput.value;
        const validation = validateAccountWithdrawal(
            currentPassword,
            withdrawalConfirmationInput.checked
        );
        if (!validation.valid) {
            setFeedback(withdrawalFeedback, validation.message, "error");
            if (!currentPassword) withdrawalPasswordInput.focus();
            else withdrawalConfirmationInput.focus();
            return;
        }

        setSubmitting(withdrawalFieldset, withdrawalButton, true, "계정 탈퇴");
        setFeedback(withdrawalFeedback, "");
        try {
            await api.withdraw(currentPassword);
            window.location.assign("/login?notice=account-withdrawn");
        } catch (error) {
            if (handleAuthenticationFailure(error)) return;
            const message = error?.status == null || error.status >= 500
                ? "탈퇴 처리 결과를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요."
                : error?.message || "계정을 탈퇴하지 못했습니다.";
            setFeedback(withdrawalFeedback, message, "error");
        } finally {
            withdrawalPasswordInput.value = "";
            setSubmitting(withdrawalFieldset, withdrawalButton, false, "계정 탈퇴");
        }
    });

    loadAccount();
}

if (typeof document !== "undefined") {
    initializeAccountSettings();
    initializeTelegramSettings();
}

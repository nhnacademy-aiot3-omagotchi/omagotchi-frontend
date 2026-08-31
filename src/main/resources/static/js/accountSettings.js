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

    let loadedName = "";

    async function loadAccount() {
        nameFieldset.disabled = true;
        passwordFieldset.disabled = true;
        retryButton.hidden = true;
        setFeedback(loadFeedback, "계정 정보를 불러오는 중입니다.");

        try {
            const account = await api.get();
            emailValue.textContent = account.email;
            nameInput.value = account.name;
            loadedName = account.name;
            nameFieldset.disabled = false;
            passwordFieldset.disabled = false;
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

    loadAccount();
}

if (typeof document !== "undefined") {
    initializeAccountSettings();
}

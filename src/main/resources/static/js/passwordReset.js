import {AuthApiRequestError, requestAuthJson} from "./authApi.js";
import {
    EMAIL_OTP_LENGTH,
    formatCountdown,
    formatRetryAfterMessage,
    isEmailChallengeResponse,
    maskEmail,
    secondsUntil
} from "./emailVerification.js";
import {
    buildPasswordResetPayload,
    normalizePasswordResetEmail,
    validatePasswordResetPasswords
} from "./passwordResetFlow.js";

const form = document.querySelector(".password-reset-form");

if (form) {
    const feedback = form.querySelector("[data-auth-feedback]");
    const emailStep = form.querySelector("[data-password-reset-email-step]");
    const challengeStep = form.querySelector("[data-password-reset-challenge-step]");
    const emailInput = form.querySelector("#password-reset-email");
    const codeInput = form.querySelector("#password-reset-code");
    const newPasswordInput = form.querySelector("#password-reset-new-password");
    const confirmationInput = form.querySelector("#password-reset-confirm-password");
    const requestButton = form.querySelector("[data-password-reset-email-otp-request]");
    const resendButton = form.querySelector("[data-password-reset-email-otp-resend]");
    const submitButton = form.querySelector("[data-password-reset-submit]");
    const editEmailButton = form.querySelector("[data-password-reset-edit-email]");
    const otpAddress = form.querySelector("[data-password-reset-email-address]");
    const countdown = form.querySelector("[data-password-reset-countdown]");

    const state = {
        challengeId: null,
        issuedEmail: null,
        expiresAt: 0,
        resendAvailableAt: 0,
        operation: null,
        timerId: null,
        completed: false
    };

    function setFeedback(message, type = "neutral") {
        feedback.textContent = message;
        feedback.classList.toggle("auth-error", type === "error");
        feedback.classList.toggle("auth-success", type === "success");
    }

    function setChallengeInputsEnabled(enabled) {
        codeInput.disabled = !enabled;
        newPasswordInput.disabled = !enabled;
        confirmationInput.disabled = !enabled;
    }

    function showEmailStep() {
        challengeStep.hidden = true;
        emailStep.hidden = false;
    }

    function showChallengeStep(email) {
        emailStep.hidden = true;
        challengeStep.hidden = false;
        otpAddress.textContent = maskEmail(email);
    }

    function clearSensitiveInputs() {
        codeInput.value = "";
        newPasswordInput.value = "";
        confirmationInput.value = "";
    }

    function clearChallenge() {
        state.challengeId = null;
        state.issuedEmail = null;
        state.expiresAt = 0;
        setChallengeInputsEnabled(false);
        clearSensitiveInputs();
    }

    function updateControls() {
        const now = Date.now();
        const challengeSeconds = state.challengeId
            ? secondsUntil(state.expiresAt, now)
            : 0;
        const cooldownSeconds = secondsUntil(state.resendAvailableAt, now);
        const busy = state.operation !== null || state.completed;

        countdown.textContent = state.expiresAt > 0
            ? formatCountdown(secondsUntil(state.expiresAt, now))
            : "--:--";
        requestButton.disabled = busy || cooldownSeconds > 0;
        requestButton.textContent = cooldownSeconds > 0
            ? `인증번호 받기 (${cooldownSeconds}초)`
            : "인증번호 받기";
        resendButton.disabled = busy || cooldownSeconds > 0;
        resendButton.textContent = cooldownSeconds > 0
            ? `인증번호 재전송 (${cooldownSeconds}초)`
            : "인증번호 재전송";
        submitButton.disabled = busy
            || !state.challengeId
            || challengeSeconds === 0
            || codeInput.value.length !== EMAIL_OTP_LENGTH;

        if (state.challengeId && challengeSeconds === 0) {
            state.challengeId = null;
            setChallengeInputsEnabled(false);
            codeInput.value = "";
            setFeedback(
                "인증번호 유효 시간이 만료되었습니다. 인증번호를 재전송해 주세요.",
                "error"
            );
        }
    }

    function ensureTimer() {
        if (state.timerId === null) {
            state.timerId = window.setInterval(updateControls, 1000);
        }
        updateControls();
    }

    function applyCooldown(seconds) {
        state.resendAvailableAt = Date.now() + (seconds * 1000);
        ensureTimer();
    }

    function validateEmail() {
        emailInput.value = normalizePasswordResetEmail(emailInput.value);
        if (!emailInput.checkValidity()) {
            emailInput.reportValidity();
            setFeedback("가입한 이메일을 확인해 주세요.", "error");
            return false;
        }
        return true;
    }

    function handleRequestError(error) {
        if (error instanceof AuthApiRequestError && error.retryAfterSeconds !== null) {
            applyCooldown(error.retryAfterSeconds);
            setFeedback(formatRetryAfterMessage(error.retryAfterSeconds), "error");
            return;
        }
        if (error instanceof AuthApiRequestError) {
            setFeedback(error.message, "error");
            return;
        }
        setFeedback("인증번호를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.", "error");
    }

    async function requestEmailOtp({resend}) {
        if (!validateEmail()) {
            return;
        }

        state.operation = "requesting";
        updateControls();
        setFeedback(resend ? "인증번호를 다시 보내고 있어요." : "인증번호를 보내고 있어요.");

        try {
            const email = normalizePasswordResetEmail(emailInput.value);
            const challenge = await requestAuthJson(form.dataset.emailOtpPath, {
                payload: {email}
            });
            if (!isEmailChallengeResponse(challenge)) {
                throw new Error("서버의 인증 요청 응답을 확인할 수 없습니다.");
            }

            state.challengeId = challenge.challengeId;
            state.issuedEmail = email;
            state.expiresAt = Date.now() + (challenge.expiresInSeconds * 1000);
            state.resendAvailableAt = 0;
            codeInput.value = "";
            setChallengeInputsEnabled(true);
            showChallengeStep(email);
            setFeedback(
                resend
                    ? "새 인증번호를 보냈습니다. 새로 받은 번호를 입력해 주세요."
                    : "인증번호를 보냈습니다. 메일에서 6자리 번호를 확인해 주세요.",
                "success"
            );
            ensureTimer();
            codeInput.focus();
        } catch (error) {
            handleRequestError(error);
        } finally {
            state.operation = null;
            updateControls();
        }
    }

    requestButton.addEventListener("click", () => requestEmailOtp({resend: false}));
    resendButton.addEventListener("click", () => requestEmailOtp({resend: true}));

    codeInput.addEventListener("input", () => {
        codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, EMAIL_OTP_LENGTH);
        updateControls();
    });

    editEmailButton.addEventListener("click", () => {
        clearChallenge();
        state.resendAvailableAt = 0;
        showEmailStep();
        setFeedback("이메일을 수정한 뒤 인증번호를 다시 요청해 주세요.");
        updateControls();
        emailInput.focus();
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!emailStep.hidden) {
            await requestEmailOtp({resend: false});
            return;
        }

        if (!state.challengeId || secondsUntil(state.expiresAt) === 0) {
            setFeedback("인증번호를 다시 요청해 주세요.", "error");
            return;
        }
        if (!codeInput.checkValidity()) {
            codeInput.reportValidity();
            setFeedback("6자리 인증번호를 입력해 주세요.", "error");
            return;
        }

        const passwordValidation = validatePasswordResetPasswords(
            newPasswordInput.value,
            confirmationInput.value
        );
        if (!passwordValidation.valid) {
            setFeedback(passwordValidation.message, "error");
            newPasswordInput.focus();
            return;
        }

        state.operation = "resetting";
        updateControls();
        setFeedback("인증번호를 확인하고 비밀번호를 재설정하고 있어요.");

        try {
            await requestAuthJson(form.dataset.passwordResetPath, {
                method: "PATCH",
                payload: buildPasswordResetPayload({
                    email: state.issuedEmail,
                    newPassword: newPasswordInput.value,
                    challengeId: state.challengeId,
                    code: codeInput.value
                })
            });
            state.completed = true;
            clearChallenge();
            setFeedback("비밀번호를 재설정했습니다. 로그인 화면으로 이동합니다.", "success");
            window.setTimeout(() => window.location.assign(form.dataset.loginPath), 600);
        } catch (error) {
            if (error instanceof AuthApiRequestError
                && error.code === "ACCOUNT_INVALID_PASSWORD") {
                setFeedback(error.message, "error");
                newPasswordInput.focus();
            } else if (error instanceof AuthApiRequestError
                && error.code === "AUTH_PASSWORD_RESET_INVALID") {
                codeInput.value = "";
                setFeedback(error.message, "error");
                codeInput.focus();
            } else {
                setFeedback(
                    error instanceof AuthApiRequestError
                        ? error.message
                        : "비밀번호를 재설정하지 못했습니다. 잠시 후 다시 시도해 주세요.",
                    "error"
                );
            }
        } finally {
            state.operation = null;
            updateControls();
        }
    });

    window.addEventListener("pagehide", () => {
        if (state.timerId !== null) {
            window.clearInterval(state.timerId);
            state.timerId = null;
        }
        clearChallenge();
        state.resendAvailableAt = 0;
        state.operation = null;
    });

    window.addEventListener("pageshow", (event) => {
        if (event.persisted) {
            clearChallenge();
            state.resendAvailableAt = 0;
            state.operation = null;
            state.completed = false;
            showEmailStep();
            setFeedback("가입한 이메일을 입력해 주세요.");
            updateControls();
        }
    });

    setChallengeInputsEnabled(false);
    updateControls();
}

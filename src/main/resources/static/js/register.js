import {
    EMAIL_OTP_LENGTH,
    buildVerifiedSignupPayload,
    formatCountdown,
    formatRetryAfterMessage,
    isEmailChallengeResponse,
    maskEmail,
    normalizeSignupDetails,
    secondsUntil
} from "./registerEmailVerification.js";
import {AuthApiRequestError, requestAuthJson} from "./authApi.js";

const form = document.querySelector(".register-form");

if (form) {
    const feedback = form.querySelector("[data-auth-feedback]");
    const detailsStep = form.querySelector("[data-signup-details-step]");
    const otpStep = form.querySelector("[data-signup-otp-step]");
    const emailInput = form.querySelector("#email");
    const nameInput = form.querySelector("#name");
    const passwordInput = form.querySelector("#register-password");
    const codeInput = form.querySelector("#email-otp-code");
    const requestButton = form.querySelector("[data-email-otp-request]");
    const resendButton = form.querySelector("[data-email-otp-resend]");
    const signupButton = form.querySelector("[data-verified-signup]");
    const editDetailsButton = form.querySelector("[data-signup-edit-details]");
    const otpAddress = form.querySelector("[data-email-otp-address]");
    const countdown = form.querySelector("[data-email-otp-countdown]");

    const state = {
        challengeId: null,
        issuedEmail: null,
        expiresAt: 0,
        resendAvailableAt: 0,
        operation: null,
        timerId: null
    };

    function setFeedback(message, type = "neutral") {
        feedback.textContent = message;
        feedback.classList.toggle("auth-error", type === "error");
        feedback.classList.toggle("auth-success", type === "success");
    }

    function currentDetails() {
        return normalizeSignupDetails({
            email: emailInput.value,
            name: nameInput.value,
            password: passwordInput.value
        });
    }

    function validateDetails() {
        const invalidInput = [emailInput, nameInput, passwordInput]
            .find((input) => !input.checkValidity());
        if (invalidInput) {
            invalidInput.reportValidity();
            return false;
        }
        return true;
    }

    function showOtpStep(email) {
        detailsStep.hidden = true;
        otpStep.hidden = false;
        codeInput.disabled = false;
        otpAddress.textContent = maskEmail(email);
    }

    function updateControls() {
        const now = Date.now();
        const challengeSeconds = state.challengeId
            ? secondsUntil(state.expiresAt, now)
            : 0;
        const cooldownSeconds = secondsUntil(state.resendAvailableAt, now);
        const busy = state.operation !== null;

        countdown.textContent = state.challengeId
            ? formatCountdown(challengeSeconds)
            : "--:--";
        requestButton.disabled = busy || cooldownSeconds > 0;
        requestButton.textContent = cooldownSeconds > 0 && otpStep.hidden
            ? `인증번호 받기 (${cooldownSeconds}초)`
            : "인증번호 받기";
        resendButton.disabled = busy || cooldownSeconds > 0;
        resendButton.textContent = cooldownSeconds > 0
            ? `인증번호 재전송 (${cooldownSeconds}초)`
            : "인증번호 재전송";
        signupButton.disabled = busy || !state.challengeId || challengeSeconds === 0
            || codeInput.value.length !== EMAIL_OTP_LENGTH;

        if (state.challengeId && challengeSeconds === 0) {
            state.challengeId = null;
            setFeedback("인증번호 유효 시간이 만료되었습니다. 인증번호를 재전송해 주세요.", "error");
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

    async function requestEmailOtp({ resend }) {
        if (!validateDetails()) {
            setFeedback("이메일, 이름과 비밀번호를 확인해 주세요.", "error");
            return;
        }

        state.operation = "requesting";
        updateControls();
        setFeedback(resend ? "인증번호를 다시 보내고 있어요." : "인증번호를 보내고 있어요.");

        try {
            const details = currentDetails();
            const challenge = await requestAuthJson(form.dataset.emailOtpPath, {payload: details});
            if (!isEmailChallengeResponse(challenge)) {
                throw new Error("서버의 인증 요청 응답을 확인할 수 없습니다.");
            }

            state.challengeId = challenge.challengeId;
            state.issuedEmail = details.email;
            state.expiresAt = Date.now() + (challenge.expiresInSeconds * 1000);
            state.resendAvailableAt = 0;
            codeInput.value = "";
            showOtpStep(details.email);
            setFeedback(
                resend
                    ? "새 인증번호를 보냈습니다. 새로 받은 번호를 입력해 주세요."
                    : "인증번호를 보냈습니다. 메일에서 6자리 번호를 확인해 주세요.",
                "success"
            );
            ensureTimer();
            codeInput.focus();
        } catch (error) {
            if (error instanceof AuthApiRequestError && error.retryAfterSeconds !== null) {
                applyCooldown(error.retryAfterSeconds);
                setFeedback(
                    formatRetryAfterMessage(error.retryAfterSeconds),
                    "error"
                );
            } else {
                setFeedback(
                    error instanceof AuthApiRequestError
                        ? error.message
                        : "인증번호를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.",
                    "error"
                );
            }
        } finally {
            state.operation = null;
            updateControls();
        }
    }

    requestButton.addEventListener("click", () => requestEmailOtp({ resend: false }));
    resendButton.addEventListener("click", () => requestEmailOtp({ resend: true }));

    codeInput.addEventListener("input", () => {
        codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, EMAIL_OTP_LENGTH);
        updateControls();
    });

    editDetailsButton.addEventListener("click", () => {
        state.challengeId = null;
        state.issuedEmail = null;
        state.expiresAt = 0;
        state.resendAvailableAt = 0;
        codeInput.value = "";
        codeInput.disabled = true;
        otpStep.hidden = true;
        detailsStep.hidden = false;
        setFeedback("입력한 정보를 수정한 뒤 인증번호를 다시 요청해 주세요.");
        updateControls();
        emailInput.focus();
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!state.challengeId || secondsUntil(state.expiresAt) === 0) {
            setFeedback("인증번호를 다시 요청해 주세요.", "error");
            return;
        }
        if (!codeInput.checkValidity()) {
            codeInput.reportValidity();
            setFeedback("6자리 인증번호를 입력해 주세요.", "error");
            return;
        }

        const details = currentDetails();
        if (details.email !== state.issuedEmail) {
            state.challengeId = null;
            setFeedback("이메일이 변경되었습니다. 인증번호를 다시 요청해 주세요.", "error");
            updateControls();
            return;
        }

        state.operation = "signing-up";
        updateControls();
        setFeedback("인증번호를 확인하고 계정을 생성하고 있어요.");

        try {
            const signupResult = await requestAuthJson(form.dataset.signupPath, {
                payload: buildVerifiedSignupPayload(
                    details,
                    state.challengeId,
                    codeInput.value
                )
            });
            state.challengeId = null;
            state.issuedEmail = null;
            passwordInput.value = "";
            codeInput.value = "";
            setFeedback(
                signupResult?.outcome === "RECOVERED"
                    ? "기존 계정과 공부 기록을 복구했습니다. 새 비밀번호로 로그인해 주세요."
                    : "계정이 생성됐습니다. 로그인 화면으로 이동합니다.",
                "success"
            );
            window.setTimeout(() => window.location.assign(form.dataset.loginPath), 600);
        } catch (error) {
            setFeedback(
                error instanceof AuthApiRequestError
                    ? error.message
                    : "계정을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
                "error"
            );
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
        state.challengeId = null;
        state.issuedEmail = null;
        state.expiresAt = 0;
        state.resendAvailableAt = 0;
        state.operation = null;
        passwordInput.value = "";
        codeInput.value = "";
    });

    window.addEventListener("pageshow", (event) => {
        if (event.persisted) {
            otpStep.hidden = true;
            detailsStep.hidden = false;
            codeInput.disabled = true;
            updateControls();
        }
    });

    updateControls();
}

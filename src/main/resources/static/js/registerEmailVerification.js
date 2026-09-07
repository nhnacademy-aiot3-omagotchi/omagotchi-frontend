export function normalizeSignupDetails({ email, name, password }) {
    return {
        email: email.trim(),
        name: name.trim(),
        password
    };
}

export function buildVerifiedSignupPayload(details, challengeId, code) {
    return {
        ...details,
        challengeId,
        code
    };
}

export {
    EMAIL_OTP_LENGTH,
    formatCountdown,
    formatRetryAfterMessage,
    isEmailChallengeResponse,
    maskEmail,
    parseRetryAfter,
    secondsUntil
} from "./emailVerification.js";

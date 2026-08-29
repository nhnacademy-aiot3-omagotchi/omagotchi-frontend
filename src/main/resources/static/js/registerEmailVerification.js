export const EMAIL_OTP_LENGTH = 6;

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

export function isEmailChallengeResponse(value) {
    return Boolean(
        value
        && typeof value.challengeId === "string"
        && value.challengeId.trim()
        && Number.isFinite(value.expiresInSeconds)
        && value.expiresInSeconds > 0
    );
}

export function secondsUntil(deadline, now = Date.now()) {
    return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function formatCountdown(totalSeconds) {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const minutesPart = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secondsPart = String(seconds % 60).padStart(2, "0");
    return `${minutesPart}:${secondsPart}`;
}

export function parseRetryAfter(value) {
    if (typeof value !== "string" || !/^\d+$/.test(value.trim())) {
        return null;
    }
    const seconds = Number(value);
    return Number.isSafeInteger(seconds) && seconds >= 0 ? seconds : null;
}

export function maskEmail(email) {
    const separatorIndex = email.indexOf("@");
    if (separatorIndex <= 0) {
        return email;
    }

    const localPart = email.slice(0, separatorIndex);
    const domain = email.slice(separatorIndex);
    const visibleLength = Math.min(2, localPart.length);
    const maskedLength = Math.max(1, localPart.length - visibleLength);
    return `${localPart.slice(0, visibleLength)}${"*".repeat(maskedLength)}${domain}`;
}

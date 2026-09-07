import {validatePasswordPolicy} from "./passwordPolicy.js";

export function normalizePasswordResetEmail(email) {
    return email.trim();
}

export function validatePasswordResetPasswords(newPassword, confirmation) {
    if (!newPassword || !confirmation) {
        return {valid: false, message: "새 비밀번호 입력란을 모두 채워 주세요."};
    }
    if (newPassword !== confirmation) {
        return {valid: false, message: "새 비밀번호 확인이 일치하지 않습니다."};
    }
    return validatePasswordPolicy(newPassword);
}

export function buildPasswordResetPayload({email, newPassword, challengeId, code}) {
    return {
        email: normalizePasswordResetEmail(email),
        newPassword,
        challengeId,
        code
    };
}

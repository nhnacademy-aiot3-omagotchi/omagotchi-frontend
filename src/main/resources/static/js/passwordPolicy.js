const ISO_CONTROL_CHARACTER = /[\u0000-\u001f\u007f-\u009f]/u;
const PASSWORD_POLICY_MESSAGE =
    "비밀번호는 15~64자이고, 제어 문자를 포함하거나 UTF-8 기준 72바이트를 넘을 수 없습니다.";

export function validatePasswordPolicy(password) {
    const utf8Bytes = new TextEncoder().encode(password).length;
    if (password.length < 15
        || password.length > 64
        || password.trim().length === 0
        || ISO_CONTROL_CHARACTER.test(password)
        || utf8Bytes > 72) {
        return {valid: false, message: PASSWORD_POLICY_MESSAGE};
    }
    return {valid: true};
}

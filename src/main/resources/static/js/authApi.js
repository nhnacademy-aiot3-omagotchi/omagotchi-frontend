import {parseRetryAfter} from "./emailVerification.js";

export class AuthApiRequestError extends Error {
    constructor(response, body) {
        super(body?.message || "요청을 처리하지 못했습니다.");
        this.name = "AuthApiRequestError";
        this.status = response.status;
        this.code = body?.code;
        this.retryAfterSeconds = parseRetryAfter(response.headers.get("Retry-After"));
    }
}

export async function requestAuthJson(
    path,
    {
        method = "POST",
        payload,
        documentRef = globalThis.document,
        fetchImpl = globalThis.fetch
    } = {}
) {
    const headers = {"Content-Type": "application/json"};
    const csrfToken = documentRef?.querySelector("meta[name='_csrf']")?.content;
    const csrfHeader = documentRef?.querySelector("meta[name='_csrf_header']")?.content;
    if (csrfHeader && csrfToken) {
        headers[csrfHeader] = csrfToken;
    }

    const response = await fetchImpl(path, {
        method,
        credentials: "same-origin",
        headers,
        body: payload === undefined ? undefined : JSON.stringify(payload)
    });
    const responseText = await response.text();
    let body = null;
    if (responseText) {
        try {
            body = JSON.parse(responseText);
        } catch {
            if (response.ok) {
                throw new Error("서버 응답 형식을 확인할 수 없습니다.");
            }
        }
    }

    if (!response.ok) {
        throw new AuthApiRequestError(response, body);
    }
    return body;
}

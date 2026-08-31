function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export function renderServiceIntegrationPending({
    title = "서비스 연동 대기",
    description = "서버 API가 연결되면 실제 데이터를 표시합니다."
} = {}) {
    return `
        <section class="service-integration-pending" role="status">
            <span aria-hidden="true">API</span>
            <strong>${escapeHtml(title)}</strong>
            <p>${escapeHtml(description)}</p>
        </section>`;
}

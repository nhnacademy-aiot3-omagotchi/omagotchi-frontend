export function normalizeVacancyAlerts(payload) {
    return Array.isArray(payload) ? payload : [];
}

export function findVacancyAlert(alerts, spaceId) {
    return alerts.find((alert) => String(alert.spaceId) === String(spaceId));
}

export async function applyVacancyAlertAction(api, alerts, spaceId) {
    const existing = findVacancyAlert(alerts, spaceId);
    if (existing) {
        await api.cancelVacancyAlert(existing.alertId);
    } else {
        await api.requestVacancyAlert(spaceId);
    }
    return normalizeVacancyAlerts(await api.getMyVacancyAlerts());
}

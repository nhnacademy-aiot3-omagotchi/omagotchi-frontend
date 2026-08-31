import {initializeSystemAdminDashboard} from "./dashboardController.js";
import {createSystemAdminApiRepository} from "./data/systemAdminApiRepository.js";

// 헤더 표시용 이름. 실패해도 대시보드 동작에는 영향이 없으므로 조용히 넘어간다.
async function renderAccountName() {
    const target = document.querySelector("[data-system-admin-name]");
    if (!target) return;
    try {
        const account = await window.OmagotchiApi?.account?.get();
        if (account?.name) target.textContent = account.name;
    } catch {
        // 이름은 부가 정보다. 토스트를 띄우지 않는다.
    }
}

void renderAccountName();

try {
    await initializeSystemAdminDashboard(document, createSystemAdminApiRepository());
} catch (error) {
    const toast = document.querySelector("[data-system-toast]");
    if (toast) {
        toast.textContent = error.message || "System Admin 데이터를 불러오지 못했습니다.";
        toast.classList.add("is-error", "is-visible");
    }
    console.error("System Admin 초기화 실패", error);
}
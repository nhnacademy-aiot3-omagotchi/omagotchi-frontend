import {initializeSystemAdminDashboard} from "./dashboardController.js";
import {createSystemAdminApiRepository} from "./data/systemAdminApiRepository.js";

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

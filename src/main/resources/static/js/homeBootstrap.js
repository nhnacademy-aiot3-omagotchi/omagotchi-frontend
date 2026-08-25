async function bootstrapHome() {
    await import("./home-react/home-app.js?v=20260824-1");

    let profile = null;

    try {
        profile = await globalThis.OmagotchiApi.profile.get();
    } catch (error) {
        if (error?.status === 401) {
            globalThis.location.replace("/login");
            return;
        }

        const toast = document.querySelector("[data-home-toast]");
        if (toast) {
            toast.textContent = error?.message || "사용자 정보를 불러오지 못했습니다.";
            toast.classList.add("is-visible");
        }
    }

    globalThis.OmagotchiProfile = profile || {};

    if (profile) {
        if (!profile.currentCharacter) {
            globalThis.location.replace("/character-selector");
            return;
        }

        if (!profile.approvedCohort && !globalThis.OmagotchiInitialOverlay) {
            globalThis.OmagotchiInitialOverlay = "cohort";
        }
    }

    try {
        await import("./spaceRoom.js?v=20260824-1");
        await import("./home.js?v=20260825-5");
    } catch (error) {
        const toast = document.querySelector("[data-home-toast]");
        if (toast) {
            toast.textContent = error?.message || "홈 기능을 불러오지 못했습니다.";
            toast.classList.add("is-visible");
        }
    }
}

await bootstrapHome();

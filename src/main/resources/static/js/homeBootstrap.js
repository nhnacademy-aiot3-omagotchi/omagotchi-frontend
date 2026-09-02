import { resolveHomeEntry } from "./homeEntry.js";

async function bootstrapHome() {
    await import("./home-react/home-app.js?v=20260902-1");

    let profile = null;

    try {
        profile = await globalThis.OmagotchiApi.profile.get();
    } catch (error) {
        if (error?.status === 401) {
            globalThis.location.replace("/login?notice=session-expired");
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
        const initialDestination = resolveHomeEntry(profile, null);
        if (initialDestination === "/character-selector") {
            globalThis.location.replace(initialDestination);
            return;
        }

        if (profile.approvedCohort?.cohortId) {
            try {
                const todayAttendance = await globalThis.OmagotchiApi.attendance.getToday();
                const attendanceDestination = resolveHomeEntry(profile, todayAttendance);
                if (attendanceDestination === "/check-in") {
                    globalThis.location.replace(attendanceDestination);
                    return;
                }
            } catch (error) {
                if (error?.status === 401) {
                    return;
                }

                const toast = document.querySelector("[data-home-toast]");
                if (toast) {
                    toast.textContent = "오늘 출석 상태를 확인하지 못했습니다.";
                    toast.classList.add("is-visible");
                }
            }
        } else if (!globalThis.OmagotchiInitialOverlay) {
            globalThis.OmagotchiInitialOverlay = "cohort";
        }
    }

    try {
        await import("./spaceRoom.js?v=20260902-5");
        await import("./home.js?v=20260902-6");
    } catch (error) {
        const toast = document.querySelector("[data-home-toast]");
        if (toast) {
            toast.textContent = error?.message || "홈 기능을 불러오지 못했습니다.";
            toast.classList.add("is-visible");
        }
    }
}

await bootstrapHome();

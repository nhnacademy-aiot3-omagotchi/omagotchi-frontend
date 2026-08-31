const level = document.querySelector("[data-personal-level]");
const studyTime = document.querySelector("[data-personal-study-time]");
const sessions = document.querySelector("[data-personal-sessions]");
const streak = document.querySelector("[data-personal-streak]");
const cohort = document.querySelector("[data-personal-cohort]");

function formatDuration(totalSeconds) {
    const seconds = Math.max(0, Number(totalSeconds) || 0);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours ? `${hours}시간 ${minutes}분` : `${minutes}분`;
}

async function loadProfile() {
    try {
        const profile = await window.OmagotchiApi.profile.get();
        if (level) level.textContent = `Lv ${Number(profile?.currentCharacter?.level) || 1}`;
        if (studyTime) studyTime.textContent = formatDuration(profile?.totalStudySeconds);
        if (sessions) sessions.textContent = `${Math.max(0, Number(profile?.completedSessionCount) || 0)}회`;
        if (streak) streak.textContent = `${Math.max(0, Number(profile?.attendanceStreakDays) || 0)}일`;
        if (cohort) cohort.textContent = profile?.approvedCohort?.name || "참여 기수 없음";
    } catch {
        if (level) level.textContent = "조회 실패";
        [studyTime, sessions, streak, cohort].forEach((element) => {
            if (element) element.textContent = "—";
        });
    }
}

void loadProfile();

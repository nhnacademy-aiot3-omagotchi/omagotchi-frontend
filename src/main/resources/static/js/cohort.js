const status = document.querySelector("[data-cohort-status]");
const list = document.querySelector("[data-cohort-list]");

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function statusLabel(value) {
    return {
        ACTIVE: "운영 중",
        PREPARING: "준비 중",
        CLOSED: "종료",
        APPROVED: "승인"
    }[value] || value || "상태 미확인";
}

async function loadCohort() {
    try {
        const profile = await window.OmagotchiApi.profile.get();
        const cohort = profile?.approvedCohort;
        if (!cohort) {
            if (status) status.textContent = "참여 기수 없음";
            if (list) {
                list.innerHTML = `
                    <article class="cohort-card">
                        <h3>현재 승인된 기수가 없습니다.</h3>
                        <p>홈의 기수 메뉴에서 관리자에게 받은 가입 코드로 참가를 신청해 주세요.</p>
                    </article>`;
            }
            return;
        }

        if (status) status.textContent = statusLabel(cohort.cohortStatus);
        if (list) {
            list.innerHTML = `
                <article class="cohort-card">
                    <h3>${escapeHtml(cohort.name)}</h3>
                    <p>${escapeHtml(cohort.startDate)} — ${escapeHtml(cohort.endDate)}</p>
                    <div class="cohort-meta">
                        <span>${escapeHtml(cohort.role || "구성원")}</span>
                        <span>${escapeHtml(statusLabel(cohort.membershipStatus))}</span>
                    </div>
                </article>`;
        }
    } catch {
        if (status) status.textContent = "조회 실패";
        if (list) {
            list.innerHTML = `
                <article class="cohort-card">
                    <h3>기수 정보를 불러오지 못했습니다.</h3>
                    <p>잠시 후 다시 시도해 주세요.</p>
                </article>`;
        }
    }
}

void loadCohort();

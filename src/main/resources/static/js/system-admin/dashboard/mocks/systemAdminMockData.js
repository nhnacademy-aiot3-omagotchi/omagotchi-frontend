// 실제 Identity/Learning 관리 API 연결 시 이 파일만 제거할 수 있도록 목 데이터를 격리한다.
export const SYSTEM_ADMIN_MOCK_DATA = Object.freeze({
    users: [
        {id: "usr-001", name: "시스템 관리자", email: "test@test.com", status: "ACTIVE", globalRole: "SYSTEM_ADMIN", joinedAt: "2026.01.03", managerCohortIds: []},
        {id: "usr-002", name: "박서준", email: "seojun@example.com", status: "ACTIVE", globalRole: "USER", joinedAt: "2026.02.11", managerCohortIds: ["aiot-3"]},
        {id: "usr-003", name: "이하늘", email: "haneul@example.com", status: "ACTIVE", globalRole: "USER", joinedAt: "2026.04.08", managerCohortIds: ["aiot-4"]},
        {id: "usr-004", name: "정민지", email: "minji@example.com", status: "ACTIVE", globalRole: "USER", joinedAt: "2026.03.19", managerCohortIds: ["cloud-2"]},
        {id: "usr-005", name: "김지우", email: "jiwoo@example.com", status: "LOCKED", globalRole: "USER", joinedAt: "2026.05.22", managerCohortIds: ["cloud-2"]},
        {id: "usr-006", name: "윤서아", email: "seoa@example.com", status: "DISABLED", globalRole: "USER", joinedAt: "2026.07.09", managerCohortIds: []},
        {id: "usr-007", name: "강현우", email: "hyunwoo@example.com", status: "WITHDRAWN", globalRole: "USER", joinedAt: "2026.07.17", managerCohortIds: []},
        ...Array.from({length: 74}, (_, index) => {
            const number = index + 8;
            const statuses = ["ACTIVE", "ACTIVE", "ACTIVE", "LOCKED", "DISABLED", "WITHDRAWN"];
            return {
                id: `usr-${String(number).padStart(3, "0")}`,
                name: `테스트 사용자 ${String(number).padStart(2, "0")}`,
                email: `user${String(number).padStart(2, "0")}@example.com`,
                status: statuses[index % statuses.length],
                globalRole: "USER",
                joinedAt: `2026.${String((index % 8) + 1).padStart(2, "0")}.${String((index % 27) + 1).padStart(2, "0")}`,
                managerCohortIds: number % 7 === 0 ? ["aiot-3"] : []
            };
        })
    ],
    cohorts: [
        {id: "aiot-3", name: "AIoT 3기", description: "IoT 서비스 개발 과정", startDate: "2026-08-01", endDate: "2026-12-18", status: "ACTIVE", memberCount: 34, managerUserIds: ["usr-002"]},
        {id: "aiot-4", name: "AIoT 4기", description: "차기 AIoT 교육 과정", startDate: "2027-01-05", endDate: "2027-05-21", status: "PREPARING", memberCount: 0, managerUserIds: ["usr-003"]},
        {id: "cloud-2", name: "Cloud 2기", description: "클라우드 네이티브 과정", startDate: "2026-07-06", endDate: "2026-11-20", status: "ACTIVE", memberCount: 28, managerUserIds: ["usr-004", "usr-005"]},
        {id: "aiot-2", name: "AIoT 2기", description: "종료된 AIoT 교육 과정", startDate: "2026-02-02", endDate: "2026-06-19", status: "CLOSED", memberCount: 31, managerUserIds: []}
    ],
    audits: [
        {id: 1, time: "오늘 12:42", actor: "test@test.com", action: "권한 변경", detail: "박서준 사용자를 AIoT 3기 COHORT_MANAGER로 배치"},
        {id: 2, time: "오늘 10:18", actor: "test@test.com", action: "기수 생성", detail: "AIoT 4기를 PREPARING 상태로 생성"},
        {id: 3, time: "어제 16:03", actor: "admin@omagotchi.com", action: "권한 변경", detail: "정민지 사용자에게 Cloud 2기 운영 권한 부여"}
    ]
});

export function cloneSystemAdminMockData() {
    return structuredClone(SYSTEM_ADMIN_MOCK_DATA);
}

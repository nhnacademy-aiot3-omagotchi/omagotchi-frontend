package site.omagotchi.frontend.attendance.application.port;

/** 출결 요청에 필요한 인증·승인 기수 컨텍스트. */
public interface AttendanceAccessContext {

    Resolved resolve();

    record Resolved(String bearerToken, Long cohortId) {
    }
}

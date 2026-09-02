package site.omagotchi.frontend.account.infrastructure.request;

/**
 * Identity 전역 역할 변경 요청 본문.
 *
 * <p>Identity의 {@code ChangeAccountRoleRequest.TargetRole}은 USER와 SYSTEM_ADMIN만
 * 받는다. COHORT_MANAGER는 전역 역할이 아니라 Learning의 기수 배정이므로 이 경로가
 * 아니라 {@code /managed-cohorts}로 간다.</p>
 *
 * <p>{@code reason}은 필수다. Identity가 계정 행 잠금 전에 먼저 검증하고, 감사 테이블의
 * CHECK도 공백을 제외한 1~500자를 요구한다.</p>
 */
public record IdentityChangeAccountRoleRequest(
        String role,
        String reason
) {
}

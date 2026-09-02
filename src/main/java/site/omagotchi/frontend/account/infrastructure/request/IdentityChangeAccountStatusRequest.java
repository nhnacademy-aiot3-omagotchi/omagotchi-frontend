package site.omagotchi.frontend.account.infrastructure.request;

/**
 * Identity 계정 상태 변경 요청 본문.
 *
 * <p>Identity의 {@code ChangeAccountStatusRequest.TargetStatus}는 ACTIVE와 DISABLED만
 * 받는다. LOCKED와 WITHDRAWN은 관리자가 직접 지정할 수 없으므로 화면에서도 제외한다.</p>
 *
 * <p>{@code reason}은 필수다. Identity가 잠금 전에 먼저 검증하고, 감사 테이블의 CHECK도
 * 공백을 제외한 1~500자를 요구한다.</p>
 */
public record IdentityChangeAccountStatusRequest(
        String status,
        String reason
) {
}

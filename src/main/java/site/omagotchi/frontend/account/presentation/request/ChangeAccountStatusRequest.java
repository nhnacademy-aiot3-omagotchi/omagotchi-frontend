package site.omagotchi.frontend.account.presentation.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 관리자 계정 상태 변경 요청.
 *
 * <p>Identity가 받는 값만 enum으로 고정한다. 화면이 LOCKED나 WITHDRAWN을 보내도
 * Identity에 닿기 전에 400으로 끊긴다.</p>
 *
 * <p>사유의 필수 여부와 길이는 Browser 요청 경계에서 검증한다.</p>
 */
public record ChangeAccountStatusRequest(
        @NotNull(message = "목표 계정 상태는 필수입니다.")
        TargetStatus status,

        @NotBlank(message = "계정 상태 변경 사유는 필수입니다.")
        @Size(max = 500, message = "계정 상태 변경 사유는 500자 이하여야 합니다.")
        String reason
) {

    public ChangeAccountStatusRequest {
        reason = reason == null ? null : reason.strip();
    }

    public enum TargetStatus {
        ACTIVE,
        DISABLED
    }
}

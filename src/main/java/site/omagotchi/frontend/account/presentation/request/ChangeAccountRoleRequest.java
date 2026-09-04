package site.omagotchi.frontend.account.presentation.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 관리자 전역 역할 변경 요청.
 *
 * <p>Identity가 받는 값만 enum으로 고정한다. 화면이 COHORT_MANAGER를 보내도 Identity에
 * 닿기 전에 400으로 끊긴다. 기수 관리자 부여는 Learning의 기수 배정 경로가 담당한다.</p>
 *
 * <p>사유의 필수 여부와 길이는 Browser 요청 경계에서 검증한다.</p>
 */
public record ChangeAccountRoleRequest(
        @NotNull(message = "목표 전역 역할은 필수입니다.")
        TargetRole role,

        @NotBlank(message = "전역 역할 변경 사유는 필수입니다.")
        @Size(max = 500, message = "전역 역할 변경 사유는 500자 이하여야 합니다.")
        String reason
) {

    public ChangeAccountRoleRequest {
        reason = reason == null ? null : reason.strip();
    }

    public enum TargetRole {
        USER,
        SYSTEM_ADMIN
    }
}

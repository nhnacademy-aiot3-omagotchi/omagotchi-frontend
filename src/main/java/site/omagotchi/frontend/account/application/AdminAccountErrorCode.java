package site.omagotchi.frontend.account.application;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.Accessors;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.global.exception.ErrorType;

@Getter
@Accessors(fluent = true)
@RequiredArgsConstructor
public enum AdminAccountErrorCode implements ErrorCode {

    ADMIN_ACCESS_NOT_ALLOWED(
            ErrorType.AUTHORIZATION,
            "ACCOUNT_ADMIN_ACCESS_NOT_ALLOWED",
            "현재 계정 상태에서는 관리자 기능을 사용할 수 없습니다."
    ),
    SYSTEM_ADMIN_REQUIRED(
            ErrorType.AUTHORIZATION,
            "SYSTEM_ADMIN_REQUIRED",
            "시스템 관리자 권한이 필요합니다."
    ),
    INVALID_MEMBERSHIP_STATUS_TRANSITION(
            ErrorType.INVALID_INPUT,
            "MEMBERSHIP_INVALID_STATUS_TRANSITION",
            "허용되지 않은 기수 소속 상태 변경입니다."
    ),
    COHORT_NOT_FOUND(
            ErrorType.NOT_FOUND,
            "COHORT_NOT_FOUND",
            "기수를 찾을 수 없습니다."
    ),
    COHORT_MEMBERSHIP_NOT_FOUND(
            ErrorType.NOT_FOUND,
            "MEMBERSHIP_NOT_FOUND",
            "기수 소속을 찾을 수 없습니다."
    ),
    COHORT_ALREADY_CLOSED(
            ErrorType.CONFLICT,
            "COHORT_ALREADY_CLOSED",
            "이미 종료된 기수입니다."
    ),
    COHORT_ACTIVE_MANAGER_REQUIRED(
            ErrorType.CONFLICT,
            "COHORT_ACTIVE_MANAGER_REQUIRED",
            "활성 기수 관리자가 한 명 이상 필요합니다."
    ),
    COHORT_MANAGER_PERIOD_CONFLICT(
            ErrorType.CONFLICT,
            "COHORT_MANAGER_PERIOD_CONFLICT",
            "동일한 운영 기간에 여러 기수의 관리자로 지정할 수 없습니다."
    );

    private final ErrorType type;
    private final String code;
    private final String message;
}

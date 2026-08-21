package site.omagotchi.frontend.learning.application;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.Accessors;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.global.exception.ErrorType;

@Getter
@Accessors(fluent = true)
@RequiredArgsConstructor
public enum LearningBffErrorCode implements ErrorCode {

    SESSION_TOKEN_MISSING(
            ErrorType.AUTHENTICATION,
            "LEARNING_SESSION_TOKEN_MISSING",
            "로그인이 필요합니다."
    ),
    APPROVED_COHORT_REQUIRED(
            ErrorType.CONFLICT,
            "LEARNING_APPROVED_COHORT_REQUIRED",
            "승인된 기수에 가입한 뒤 이용할 수 있습니다."
    );

    private final ErrorType type;
    private final String code;
    private final String message;
}

package site.omagotchi.frontend.learningservice.common;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.Accessors;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.global.exception.ErrorType;

// Learning Service가 공개한 기능 오류 중 Browser BFF가 그대로 공개할 수 있는 계약
@Getter
@Accessors(fluent = true)
@RequiredArgsConstructor
public enum LearningServiceErrorCode implements ErrorCode {

    COHORT_ACCESS_DENIED(ErrorType.AUTHORIZATION, "COHORT_ACCESS_DENIED", "해당 기수에 접근할 권한이 없습니다."),
    COHORT_MANAGER_REQUIRED(ErrorType.AUTHORIZATION, "COHORT_MANAGER_REQUIRED", "기수 관리자 권한이 필요합니다."),
    COHORT_NOT_FOUND(ErrorType.NOT_FOUND, "COHORT_NOT_FOUND", "기수를 찾을 수 없습니다."),
    MEMBERSHIP_NOT_FOUND(ErrorType.NOT_FOUND, "MEMBERSHIP_NOT_FOUND", "기수 소속을 찾을 수 없습니다."),

    STUDY_RECORD_NOT_FOUND(ErrorType.NOT_FOUND, "STUDY_RECORD_NOT_FOUND", "공부 기록을 찾을 수 없습니다."),
    STUDY_RECORD_OVERLAP(ErrorType.CONFLICT, "STUDY_RECORD_OVERLAP", "기존 공부 기록과 시간이 겹칩니다."),
    STUDY_RECORD_AGGREGATION_BOUNDARY_CROSSED(
            ErrorType.INVALID_INPUT,
            "STUDY_RECORD_AGGREGATION_BOUNDARY_CROSSED",
            "공부 기록이 날짜 경계와 겹칩니다."
    ),
    STUDY_RECORD_ACTIVE_TIMER_CONFLICT(
            ErrorType.CONFLICT,
            "STUDY_RECORD_ACTIVE_TIMER_CONFLICT",
            "타이머 실행 중에는 공부 기록을 변경할 수 없습니다."
    ),
    STUDY_RECORD_VERSION_CONFLICT(
            ErrorType.CONFLICT,
            "STUDY_RECORD_VERSION_CONFLICT",
            "최신 공부 기록을 다시 조회해 주세요."
    ),
    STUDY_RECORD_WRITE_LOCK_TIMEOUT(
            ErrorType.CONFLICT,
            "STUDY_RECORD_WRITE_LOCK_TIMEOUT",
            "공부 기록 요청이 다른 변경과 충돌했습니다."
    ),

    TIMER_ALREADY_RUNNING(ErrorType.CONFLICT, "TIMER_ALREADY_RUNNING", "이미 실행 중인 타이머가 존재합니다."),
    TIMER_RUN_NOT_FOUND(ErrorType.NOT_FOUND, "TIMER_RUN_NOT_FOUND", "타이머 실행을 찾을 수 없습니다."),
    TIMER_ALREADY_ENDED(ErrorType.CONFLICT, "TIMER_ALREADY_ENDED", "이미 종료된 타이머 실행입니다."),

    TEAM_COHORT_ACCESS_DENIED(
            ErrorType.AUTHORIZATION,
            "TEAM_COHORT_ACCESS_DENIED",
            "해당 기수의 팀 랭킹에 접근할 권한이 없습니다."
    ),
    TEAM_NOT_FOUND(ErrorType.NOT_FOUND, "TEAM_NOT_FOUND", "팀을 찾을 수 없습니다.");

    private final ErrorType type;
    private final String code;
    private final String message;
}

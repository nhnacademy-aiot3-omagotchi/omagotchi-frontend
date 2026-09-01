package site.omagotchi.frontend.global.exception;

// 재시도 가능한 공개 오류가 Browser에 전달할 대기 시간 메타데이터
public interface RetryAfterMetadata {

    RetryAfterSeconds retryAfter();
}

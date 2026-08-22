package site.omagotchi.frontend.learningservice.common;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.global.http.RestClientCallExecutor;

import java.util.function.Supplier;

// 세 기능 모듈에 공통인 Bearer 전달, 전송 실패 처리, 성공 상태·본문 검증만 담당한다.
@Component
@RequiredArgsConstructor
public class LearningServiceClientSupport {

    private static final String BEARER_PREFIX = "Bearer ";

    private final RestClientCallExecutor callExecutor;
    private final LearningServiceErrorResolver errorResolver;

    public <T> T body(
            Supplier<ResponseEntity<T>> request,
            HttpStatus expectedStatus,
            String operation,
            ErrorCode... acceptedErrors
    ) {
        ResponseEntity<T> response = execute(request, acceptedErrors);
        requireStatus(response, expectedStatus, operation);
        if (response.getBody() == null) {
            throw invalidResponse(operation + " 성공 응답 Body 누락");
        }
        return response.getBody();
    }

    public void empty(
            Supplier<ResponseEntity<Void>> request,
            HttpStatus expectedStatus,
            String operation,
            ErrorCode... acceptedErrors
    ) {
        ResponseEntity<Void> response = execute(request, acceptedErrors);
        requireStatus(response, expectedStatus, operation);
    }

    public String authorization(String accessToken) {
        if (!StringUtils.hasText(accessToken)) {
            throw new BusinessException(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE, "Learning Access Token 누락");
        }
        return BEARER_PREFIX + accessToken;
    }

    private <T> ResponseEntity<T> execute(
            Supplier<ResponseEntity<T>> request,
            ErrorCode... acceptedErrors
    ) {
        return callExecutor.execute(
                request,
                exception -> {
                    ErrorCode resolved = errorResolver.resolve(exception, acceptedErrors);
                    throw new BusinessException(resolved, exception);
                }
        );
    }

    private static void requireStatus(
            ResponseEntity<?> response,
            HttpStatus expectedStatus,
            String operation
    ) {
        if (response.getStatusCode().value() != expectedStatus.value()) {
            throw invalidResponse(
                    operation + " 성공 응답 Status 불일치 expected="
                            + expectedStatus.value()
                            + ", actual=" + response.getStatusCode().value()
            );
        }
    }

    public static BusinessException invalidResponse(String diagnosticMessage) {
        return new BusinessException(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE, diagnosticMessage);
    }
}

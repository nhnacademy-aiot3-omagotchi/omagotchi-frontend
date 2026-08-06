package site.omagotchi.frontend.global.http;

import org.springframework.cloud.loadbalancer.blocking.client.BlockingLoadBalancerClient;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;

import java.util.function.Function;
import java.util.function.Supplier;

/**
 * 대상: 호출 대상 서비스
 * 역할: 비가용 실패 공통 변환, 호출별 4xx 정책 적용
 * 비가용 범위: Discovery·연결·5xx 등
 */
@Component
public class RestClientCallExecutor {

    private static final String NO_SERVICE_INSTANCE_MESSAGE_PREFIX =
            "No instances available for ";

    public <T> T execute(
            Supplier<T> request,
            Function<RestClientResponseException, BusinessException> responseExceptionTranslator
    ) {
        try {
            return request.get();

        } catch (ResourceAccessException exception) {
            // HTTP 응답 미수신: 연결 실패·Timeout의 503 변환
            throw new BusinessException(CommonErrorCode.SERVICE_UNAVAILABLE, exception);

        } catch (IllegalStateException exception) {
            // Discovery Instance 부재: 전용 예외 Type 부재에 따른 제한적 503 변환
            if (isMissingServiceInstance(exception)) {
                throw new BusinessException(CommonErrorCode.SERVICE_UNAVAILABLE, exception);
            }
            throw exception;

        } catch (RestClientResponseException exception) {
            // 호출 대상 5xx: 세부 내용 비공개와 503 변환
            if (exception.getStatusCode().is5xxServerError()) {
                throw new BusinessException(CommonErrorCode.SERVICE_UNAVAILABLE, exception);
            }
            // 호출 대상 4xx: Endpoint별 공개 정책 위임
            throw responseExceptionTranslator.apply(exception);

        } catch (RestClientException exception) {
            // 기타 RestClient 실패: Spring이 감싼 응답 본문 해석 실패만 502 변환
            if (exception.getCause() instanceof HttpMessageNotReadableException) {
                throw new BusinessException(
                        CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                        exception
                );
            }
            throw exception;
        }
    }

    // 일반 IllegalStateException 오분류 방지를 위한 메시지·발생 위치 동시 확인
    private static boolean isMissingServiceInstance(IllegalStateException exception) {
        String message = exception.getMessage();
        if (message == null || !message.startsWith(NO_SERVICE_INSTANCE_MESSAGE_PREFIX)) {
            return false;
        }
        for (StackTraceElement stackTraceElement : exception.getStackTrace()) {
            if (BlockingLoadBalancerClient.class.getName().equals(stackTraceElement.getClassName())) {
                return true;
            }
        }
        return false;
    }
}

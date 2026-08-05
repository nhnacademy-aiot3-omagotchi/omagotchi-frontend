package site.omagotchi.frontend.global.http;

import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;

import java.util.function.Function;
import java.util.function.Supplier;

/**
 * RestClient 호출의 공통 실패 처리.
 * Identity·Learning 등 서비스별 HTTP client의 중복 try/catch 제거.
 * 호출별 4xx 공개 정책 전달을 위한 RestClient 공통 status handler 미사용.
 */
@Component
public class RestClientCallExecutor {

    public <T> T execute(
            Supplier<T> request,
            Function<RestClientResponseException, BusinessException> errorResponseMapper
    ) {
        try {
            return request.get();
        } catch (ResourceAccessException exception) {
            // 연결 실패·timeout 등 HTTP 응답을 받지 못한 경우
            throw new BusinessException(CommonErrorCode.SERVICE_UNAVAILABLE, exception);
        } catch (RestClientResponseException exception) {
            // 호출 대상 서비스 5xx의 세부 내용 비공개와 Frontend 503 변환
            if (exception.getStatusCode().is5xxServerError()) {
                throw new BusinessException(CommonErrorCode.SERVICE_UNAVAILABLE, exception);
            }
            // HTTP 오류 응답을 받은 경우의 서비스별 오류 code 해석
            throw errorResponseMapper.apply(exception);
        } catch (RestClientException exception) {
            // 응답 변환 실패 등 정상 응답으로 사용할 수 없는 경우
            throw new BusinessException(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE, exception);
        }
    }
}

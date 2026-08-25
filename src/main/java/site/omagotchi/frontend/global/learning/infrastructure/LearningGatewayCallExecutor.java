package site.omagotchi.frontend.global.learning.infrastructure;

import lombok.RequiredArgsConstructor;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.UnknownContentTypeException;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.http.ApiErrorResponseDecoder;

import java.util.function.Supplier;

@Component
@RequiredArgsConstructor
public class LearningGatewayCallExecutor {

    private final ApiErrorResponseDecoder errorResponseDecoder;

    public <T> T execute(Supplier<T> request) {
        try {
            return request.get();
        } catch (ResourceAccessException exception) {
            throw new BusinessException(CommonErrorCode.SERVICE_UNAVAILABLE, exception);
        } catch (RestClientResponseException exception) {
            throw new LearningDownstreamException(
                    exception.getStatusCode(),
                    errorResponseDecoder.decode(exception),
                    exception
            );
        } catch (RestClientException exception) {
            if (exception instanceof UnknownContentTypeException
                    || exception.getCause() instanceof HttpMessageNotReadableException) {
                throw new BusinessException(
                        CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                        exception
                );
            }
            throw exception;
        }
    }
}

package site.omagotchi.frontend.global.web;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.ModelAndView;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.global.exception.ErrorHttpMapper;

// Page Controller BusinessException 전용 HTML 오류 변환
// 예상하지 못한 Page 500은 Boot /error 처리
@Slf4j
@ControllerAdvice
public class PageBusinessExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ModelAndView handleBusinessException(
            BusinessException exception,
            HttpServletRequest request
    ) {
        ErrorCode errorCode = exception.getErrorCode();
        HttpStatus status = ErrorHttpMapper.toHttpStatus(errorCode.type());
        if (status.is5xxServerError()) {
            log.error(
                    "Page 처리 실패 error.code={}, exception={}, method={}, path={}",
                    errorCode.code(),
                    exception.getClass().getName(),
                    request.getMethod(),
                    request.getRequestURI(),
                    exception
            );
        }

        // 오류 View와 원래 HTTP 상태의 동시 지정
        ModelAndView modelAndView = new ModelAndView(errorView(status));
        modelAndView.setStatus(status);
        modelAndView.addObject("status", status.value());
        return modelAndView;
    }

    private String errorView(HttpStatus status) {
        // 403·404 전용 View와 그 밖의 4xx·5xx 계열 View 선택
        return switch (status) {
            case FORBIDDEN -> "error/403";
            case NOT_FOUND -> "error/404";
            default -> status.is4xxClientError()
                    ? "error/4xx"
                    : "error/5xx";
        };
    }
}

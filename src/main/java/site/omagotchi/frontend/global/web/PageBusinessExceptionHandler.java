package site.omagotchi.frontend.global.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.ModelAndView;
import site.omagotchi.frontend.global.exception.ApiErrorResponse;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.global.exception.ErrorHttpMapper;
import site.omagotchi.frontend.global.learning.infrastructure.LearningDownstreamException;
import site.omagotchi.frontend.global.security.BrowserSessionInvalidator;

import java.util.Optional;

// Page Controller 예외 전용 HTML 오류 변환
// 예상하지 못한 Page 500은 Boot /error 처리
// ApiExceptionHandler가 HIGHEST_PRECEDENCE·@RestController 한정이므로
// 이 Advice는 @Controller(HTML Page) 경로만 실질적으로 담당한다.
@Slf4j
@ControllerAdvice
@RequiredArgsConstructor
public class PageBusinessExceptionHandler {

    // 재인증 유도는 Login Page가 이미 제공하는 notice 계약을 그대로 사용한다.
    private static final String LOGIN_REDIRECT = "redirect:/login?notice=session-expired";

    private final BrowserSessionInvalidator sessionInvalidator;

    @ExceptionHandler(BusinessException.class)
    public ModelAndView handleBusinessException(
            BusinessException exception,
            HttpServletRequest request,
            HttpServletResponse response
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

        // Page의 401은 오류 화면이 아니라 재인증 대상이다.
        // 오류 View만 그리면 Session이 남아 로그인·실패를 반복한다.
        if (status == HttpStatus.UNAUTHORIZED) {
            return expiredSessionRedirect(request, response);
        }

        return errorModelAndView(status);
    }

    // Learning 하류 오류는 BusinessException이 아니므로 별도 처리가 없으면
    // 어떤 Advice에도 걸리지 않고 Boot 기본 500으로 노출된다.
    @ExceptionHandler(LearningDownstreamException.class)
    public ModelAndView handleLearningDownstreamException(
            LearningDownstreamException exception,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        ApiErrorResponse downstream = exception.getErrorResponse();
        int downstreamStatus = exception.getStatusCode().value();
        log.error(
                "Page 하류 호출 실패 downstream.status={}, downstream.code={}, "
                        + "downstream.requestId={}, method={}, path={}",
                downstreamStatus,
                downstream.code(),
                downstream.requestId(),
                request.getMethod(),
                request.getRequestURI(),
                exception
        );

        if (downstreamStatus == HttpStatus.UNAUTHORIZED.value()) {
            return expiredSessionRedirect(request, response);
        }

        // 하류 상태를 그대로 노출하지 않는다. 4xx는 요청 문제로 보여 주고
        // 그 밖의 실패는 Frontend 장애로 수렴시킨다.
        HttpStatus status = Optional.ofNullable(HttpStatus.resolve(downstreamStatus))
                .filter(HttpStatus::is4xxClientError)
                .orElse(HttpStatus.INTERNAL_SERVER_ERROR);
        return errorModelAndView(status);
    }

    private ModelAndView expiredSessionRedirect(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        sessionInvalidator.invalidate(request, response);
        return new ModelAndView(LOGIN_REDIRECT);
    }

    private ModelAndView errorModelAndView(HttpStatus status) {
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

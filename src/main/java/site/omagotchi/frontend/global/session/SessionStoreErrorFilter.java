package site.omagotchi.frontend.global.session;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;
import site.omagotchi.frontend.global.exception.CommonErrorCode;

import java.io.IOException;

// Spring Session Redis 조회·저장 실패의 외부 503 변환 경계
// DispatcherServlet 바깥 예외로 인한 ControllerAdvice 적용 불가 구간 처리
@Slf4j
@RequiredArgsConstructor
public class SessionStoreErrorFilter extends OncePerRequestFilter {

    private final SessionStoreFailureResponseWriter failureResponseWriter;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        try {
            // 하위 SessionRepositoryFilter의 요청 전 조회와 응답 후 저장 범위
            filterChain.doFilter(request, response);
        } catch (RuntimeException exception) {
            // 지원 대상 Redis 장애와 재작성 가능한 미커밋 응답만 503 변환
            if (!SessionStoreFailures.isFailure(exception) || response.isCommitted()) {
                throw exception;
            }
            // TODO 로그인 성공 뒤 Session 저장 실패의 Refresh Token Family 폐기 보상
            logFailure(request, exception);
            failureResponseWriter.write(request, response);
        }
    }

    @Override
    protected void doFilterNestedErrorDispatch(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        // 같은 요청의 중첩 ERROR dispatch에도 Redis 장애 감시 재적용
        doFilterInternal(request, response, filterChain);
    }

    @Override
    protected boolean shouldNotFilterErrorDispatch() {
        // 별도 ERROR dispatch에서 발생한 Redis Session 접근 실패도 동일한 503 경계 적용
        return false;
    }

    // 장애 분류 결과와 원본 Stack Trace의 단일 기록
    private void logFailure(
            HttpServletRequest request,
            RuntimeException exception
    ) {
        CommonErrorCode errorCode = CommonErrorCode.SERVICE_UNAVAILABLE;
        log.error(
                "Redis Session Store 오류 error.code={}, exception={}, method={}, path={}",
                errorCode.code(),
                exception.getClass().getName(),
                request.getMethod(),
                request.getRequestURI(),
                exception
        );
    }
}

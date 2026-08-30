package site.omagotchi.frontend.cohort.application;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.ErrorHttpMapper;
import site.omagotchi.frontend.global.learning.infrastructure.LearningDownstreamException;

/**
 * Page 진입 시점의 기수 관리자 판정.
 *
 * <p>판정 실패를 관리자 권한 부여로 해석하지 않는다. 하류 장애로 판정이 불가능하면
 * 일반 사용자로 강등하여, Learning 장애가 로그인 자체를 막지 않으면서도 권한 상승은
 * 발생하지 않게 한다. 폴백 방향은 항상 권한 축소여야 한다.
 *
 * <p>다만 재인증이 필요한 401은 강등 대상이 아니다. Session Token이 만료된 사용자를
 * /home으로 보내면 그 화면의 모든 BFF 호출이 다시 실패하므로, 예외를 그대로 전파해
 * Page 오류 Advice가 Session을 폐기하고 Login으로 유도하게 한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CohortAccessDecision {

    private final UserAccessContextBffService accessContextService;

    public boolean isCohortManager(HttpServletRequest request) {
        try {
            return accessContextService.getContext(request).isCohortManager();
        } catch (LearningDownstreamException exception) {
            if (exception.getStatusCode().value() == HttpStatus.UNAUTHORIZED.value()) {
                throw exception;
            }
            logDegradation(request, exception);
            return false;
        } catch (BusinessException exception) {
            if (ErrorHttpMapper.toHttpStatus(exception.getErrorCode().type())
                    == HttpStatus.UNAUTHORIZED) {
                throw exception;
            }
            logDegradation(request, exception);
            return false;
        }
    }

    private void logDegradation(
            HttpServletRequest request,
            RuntimeException exception
    ) {
        log.warn(
                "기수 관리자 판정 실패의 일반 사용자 강등 method={}, path={}",
                request.getMethod(),
                request.getRequestURI(),
                exception
        );
    }
}

package site.omagotchi.frontend.global.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import site.omagotchi.frontend.global.exception.ApiErrorResponse;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.learning.application.LearningBffErrorCode;
import site.omagotchi.frontend.global.learning.infrastructure.LearningDownstreamException;
import site.omagotchi.frontend.global.security.BrowserSessionInvalidator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@ExtendWith(OutputCaptureExtension.class)
@WebMvcTest(useDefaultFilters = false)
@AutoConfigureMockMvc(addFilters = false)
@Import({
        ApiExceptionHandler.class,
        BrowserSessionInvalidator.class,
        PageBusinessExceptionHandler.class,
        PageBusinessExceptionHandlerTest.TestPageController.class
})
class PageBusinessExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Page Controller의 BusinessException은 HTML 오류 Advice로 변환")
    void handlesBusinessExceptionFromPageControllerAsHtml() throws Exception {
        // Given: API·Page Advice가 함께 적용된 일반 Page Controller
        // When: Page Controller에서 찾을 수 없는 리소스 오류 발생
        // Then: 404 HTML 오류 View와 상태 반환
        mockMvc.perform(get("/test/pages/not-found"))
                .andExpectAll(
                        status().isNotFound(),
                        view().name("error/404"),
                        model().attribute("status", 404)
                );
    }

    @Test
    @DisplayName("Page Controller의 5xx BusinessException은 계열 오류 View와 원본 예외 기록")
    void logsServerFailureAndRendersServerErrorView(CapturedOutput output) throws Exception {
        // Given: 원본 예외를 포함한 Page 연동 장애
        // When: Page Controller 요청 처리 실패
        // Then: 503 계열 오류 View와 원본 예외 기록
        mockMvc.perform(get("/test/pages/service-unavailable"))
                .andExpectAll(
                        status().isServiceUnavailable(),
                        view().name("error/5xx"),
                        model().attribute("status", 503)
                );
        assertThat(output)
                .contains("error.code=COMMON_SERVICE_UNAVAILABLE")
                .contains("test page service failure");
    }

    @Test
    @DisplayName("Page Controller의 하류 5xx는 서버 오류 View로 은닉")
    void handlesLearningDownstreamServerFailureAsHtml(CapturedOutput output) throws Exception {
        // Given: Learning 하류 500
        // When: Page Controller 요청 처리 실패
        // Then: 하류 상태를 노출하지 않는 5xx 오류 View
        mockMvc.perform(get("/test/pages/downstream-server-error"))
                .andExpectAll(
                        status().isInternalServerError(),
                        view().name("error/5xx"),
                        model().attribute("status", 500)
                );
        assertThat(output).contains("Page 하류 호출 실패 downstream.status=500");
    }

    @Test
    @DisplayName("Page Controller의 하류 404는 4xx 계열 View로 변환")
    void handlesLearningDownstreamNotFoundAsHtml() throws Exception {
        // Given: 계약 미배포 등으로 존재하지 않는 하류 경로
        // When: Page Controller 요청 처리 실패
        // Then: Boot 기본 500이 아닌 4xx 오류 View
        mockMvc.perform(get("/test/pages/downstream-not-found"))
                .andExpectAll(
                        status().isNotFound(),
                        view().name("error/404"),
                        model().attribute("status", 404)
                );
    }

    @Test
    @DisplayName("Page Controller의 하류 401은 Session 폐기와 Login Redirect")
    void redirectsToLoginOnLearningDownstreamUnauthorized() throws Exception {
        // Given: 만료된 Session Token의 하류 401
        // When: Page Controller 요청 처리 실패
        // Then: 오류 View가 아닌 재인증 유도
        mockMvc.perform(get("/test/pages/downstream-unauthorized"))
                .andExpectAll(
                        status().is3xxRedirection(),
                        redirectedUrl("/login?notice=session-expired")
                );
    }

    @Test
    @DisplayName("Page Controller의 401 BusinessException은 Login Redirect")
    void redirectsToLoginOnAuthenticationBusinessException() throws Exception {
        // Given: Session Token 부재
        // When: Page Controller 요청 처리 실패
        // Then: Session이 남지 않도록 재인증 유도
        mockMvc.perform(get("/test/pages/session-token-missing"))
                .andExpectAll(
                        status().is3xxRedirection(),
                        redirectedUrl("/login?notice=session-expired")
                );
    }

    @Controller
    public static class TestPageController {

        @GetMapping("/test/pages/not-found")
        void notFound() {
            throw new BusinessException(CommonErrorCode.NOT_FOUND);
        }

        @GetMapping("/test/pages/service-unavailable")
        void serviceUnavailable() {
            throw new BusinessException(
                    CommonErrorCode.SERVICE_UNAVAILABLE,
                    new IllegalStateException("test page service failure")
            );
        }

        @GetMapping("/test/pages/downstream-server-error")
        void downstreamServerError() {
            throw downstream(HttpStatus.INTERNAL_SERVER_ERROR);
        }

        @GetMapping("/test/pages/downstream-not-found")
        void downstreamNotFound() {
            throw downstream(HttpStatus.NOT_FOUND);
        }

        @GetMapping("/test/pages/downstream-unauthorized")
        void downstreamUnauthorized() {
            throw downstream(HttpStatus.UNAUTHORIZED);
        }

        @GetMapping("/test/pages/session-token-missing")
        void sessionTokenMissing() {
            throw new BusinessException(LearningBffErrorCode.SESSION_TOKEN_MISSING);
        }

        private static LearningDownstreamException downstream(HttpStatus status) {
            return new LearningDownstreamException(
                    status,
                    new ApiErrorResponse("DOWNSTREAM_TEST", "테스트 하류 실패", "/api/v1", null),
                    new IllegalStateException("downstream failure")
            );
        }

    }
}

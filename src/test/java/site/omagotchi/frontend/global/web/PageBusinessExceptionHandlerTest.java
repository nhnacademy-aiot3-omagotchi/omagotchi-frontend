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
import org.springframework.stereotype.Controller;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.security.BrowserSessionInvalidator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
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

    }
}

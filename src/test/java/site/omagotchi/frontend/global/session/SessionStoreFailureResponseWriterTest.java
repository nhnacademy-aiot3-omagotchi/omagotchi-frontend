package site.omagotchi.frontend.global.session;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.servlet.View;
import org.springframework.web.servlet.ViewResolver;
import site.omagotchi.frontend.global.web.ServletApiErrorResponseWriter;
import tools.jackson.databind.json.JsonMapper;

import java.util.Locale;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class SessionStoreFailureResponseWriterTest {

    private final RecordingViewResolver viewResolver = new RecordingViewResolver();
    private final ServletApiErrorResponseWriter apiErrorResponseWriter =
            new ServletApiErrorResponseWriter(JsonMapper.builder().build());
    private final SessionStoreFailureResponseWriter responseWriter =
            new SessionStoreFailureResponseWriter(viewResolver, apiErrorResponseWriter);

    @Test
    @DisplayName("Page 요청의 불완전한 응답을 초기화한 HTML 503 작성")
    void writesHtmlResponseAfterReset() throws Exception {
        // Given: 일부 응답이 작성된 Page 요청
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/home");
        MockHttpServletResponse response = new MockHttpServletResponse();
        response.setHeader("X-Feature-Result", "stale");
        response.setHeader(HttpHeaders.LOCATION, "/login");
        response.addHeader(HttpHeaders.SET_COOKIE, "OMAGOTCHI_SESSION=stale");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=home.html");
        response.setContentLength(128);
        response.getWriter().write("stale response body");

        // When: Redis Session 장애의 Page 응답 작성
        responseWriter.write(request, response);

        // Then: 이전 표현 Header·본문 없는 공통 HTML 503
        assertSoftly(softly -> {
            softly.assertThat(response.getStatus()).isEqualTo(503);
            softly.assertThat(response.getHeader(HttpHeaders.CACHE_CONTROL))
                    .isEqualTo("no-store");
            softly.assertThat(response.getContentType()).startsWith("text/html");
            softly.assertThat(response.getHeader("X-Feature-Result")).isNull();
            softly.assertThat(response.getHeader(HttpHeaders.LOCATION)).isNull();
            softly.assertThat(response.getHeaders(HttpHeaders.SET_COOKIE)).isEmpty();
            softly.assertThat(response.getHeader(HttpHeaders.CONTENT_DISPOSITION)).isNull();
            softly.assertThat(response.getHeader(HttpHeaders.CONTENT_LENGTH)).isNull();
            softly.assertThat(response.getContentAsByteArray()).isEmpty();
            softly.assertThat(viewResolver.requestedViewName).isEqualTo("error/5xx");
            softly.assertThat(viewResolver.renderedModel.get("status")).isEqualTo(503);
        });
    }

    @Test
    @DisplayName("BFF 요청의 공통 JSON 503 작성")
    void writesJsonResponseForBffRequest() throws Exception {
        // Given: BFF API 요청
        MockHttpServletRequest request =
                new MockHttpServletRequest("GET", "/bff/v1/timers");
        MockHttpServletResponse response = new MockHttpServletResponse();

        // When: Redis Session 장애의 BFF 응답 작성
        responseWriter.write(request, response);

        // Then: HTML View 없는 공통 JSON 503
        String responseBody = response.getContentAsString();
        assertSoftly(softly -> {
            softly.assertThat(response.getStatus()).isEqualTo(503);
            softly.assertThat(response.getContentType()).startsWith("application/json");
            softly.assertThat(responseBody)
                    .contains("\"code\":\"COMMON_SERVICE_UNAVAILABLE\"")
                    .contains("\"path\":\"/bff/v1/timers\"");
            softly.assertThat(viewResolver.requestedViewName).isNull();
        });
    }

    @Test
    @DisplayName("오류 View 미확인 시 재Dispatch 없는 최소 HTML 503 작성")
    void writesFallbackHtmlWhenErrorViewIsMissing() throws Exception {
        // Given: 공통 오류 View를 찾지 못하는 Resolver
        SessionStoreFailureResponseWriter missingViewWriter =
                new SessionStoreFailureResponseWriter(
                        (viewName, locale) -> null,
                        apiErrorResponseWriter
                );
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/home");
        MockHttpServletResponse response = new MockHttpServletResponse();

        // When: Redis Session 장애의 Page 응답 작성
        missingViewWriter.write(request, response);

        // Then: Session Filter 재진입 없는 최소 HTML 503
        assertThat(response.getStatus()).isEqualTo(503);
        assertThat(response.getContentAsString())
                .contains("서비스를 일시적으로 사용할 수 없습니다");
    }

    @Test
    @DisplayName("오류 View 렌더링 실패 시 재Dispatch 없는 최소 HTML 503 작성")
    void writesFallbackHtmlWhenErrorViewRenderingFails() throws Exception {
        // Given: 렌더링 중 실패하는 공통 오류 View
        ViewResolver failingViewResolver = (viewName, locale) -> new View() {
            @Override
            public String getContentType() {
                return "text/html";
            }

            @Override
            public void render(
                    Map<String, ?> model,
                    HttpServletRequest request,
                    HttpServletResponse response
            ) {
                throw new IllegalStateException("render failure");
            }
        };
        SessionStoreFailureResponseWriter failingViewWriter =
                new SessionStoreFailureResponseWriter(
                        failingViewResolver,
                        apiErrorResponseWriter
                );
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/home");
        MockHttpServletResponse response = new MockHttpServletResponse();

        // When: Redis Session 장애의 Page 응답 작성
        failingViewWriter.write(request, response);

        // Then: Session Filter 재진입 없는 최소 HTML 503
        assertThat(response.getStatus()).isEqualTo(503);
        assertThat(response.getContentAsString())
                .contains("서비스를 일시적으로 사용할 수 없습니다");
    }

    @Test
    @DisplayName("오류 View가 응답 커밋 후 실패하면 부분 응답 유지")
    void keepsCommittedPartialHtmlWhenErrorViewRenderingFailsAfterCommit() throws Exception {
        // Given: 응답을 커밋한 뒤 실패하는 공통 오류 View
        ViewResolver committedFailingViewResolver = (viewName, locale) -> new View() {
            @Override
            public String getContentType() {
                return "text/html";
            }

            @Override
            public void render(
                    Map<String, ?> model,
                    HttpServletRequest request,
                    HttpServletResponse response
            ) throws Exception {
                response.getWriter().write("partial error response");
                response.flushBuffer();
                throw new IllegalStateException("render failure after commit");
            }
        };
        SessionStoreFailureResponseWriter failingViewWriter =
                new SessionStoreFailureResponseWriter(
                        committedFailingViewResolver,
                        apiErrorResponseWriter
                );
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/home");
        MockHttpServletResponse response = new MockHttpServletResponse();

        // When: Redis Session 장애의 Page 응답 작성
        failingViewWriter.write(request, response);

        // Then: 커밋된 부분 응답 유지
        assertThat(response.getContentAsString()).isEqualTo("partial error response");
    }

    // 요청 View 이름과 전달 Model 확인용 최소 Thymeleaf Resolver 대역
    private static final class RecordingViewResolver implements ViewResolver {

        private String requestedViewName;
        private Map<String, ?> renderedModel = Map.of();

        @Override
        public View resolveViewName(String viewName, Locale locale) {
            requestedViewName = viewName;
            return new View() {
                @Override
                public String getContentType() {
                    return "text/html";
                }

                @Override
                public void render(
                        Map<String, ?> model,
                        HttpServletRequest request,
                        HttpServletResponse response
                ) {
                    renderedModel = Map.copyOf(model);
                    response.setContentType("text/html");
                }
            };
        }
    }
}

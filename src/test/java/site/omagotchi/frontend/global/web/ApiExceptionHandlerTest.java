package site.omagotchi.frontend.global.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.ServletWebRequest;
import site.omagotchi.frontend.global.exception.ApiErrorResponse;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.learning.infrastructure.LearningDownstreamException;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.SoftAssertions.assertSoftly;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(OutputCaptureExtension.class)
@WebMvcTest(useDefaultFilters = false)
@AutoConfigureMockMvc(addFilters = false)
@Import({
        ApiExceptionHandler.class,
        ApiExceptionHandlerTest.TestRestController.class
})
class ApiExceptionHandlerTest {

    @Autowired
    private ApiExceptionHandler handler;

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("REST Controller BusinessException의 공통 JSON 변환")
    void handlesBusinessExceptionFromRestControllerAsJson() throws Exception {
        // Given: 공개 ErrorCode가 확정된 REST Controller 실패
        // When: REST Controller에서 공개 ErrorCode가 확정된 오류 발생
        // Then: Frontend 공통 JSON 오류 계약 반환
        mockMvc.perform(get("/bff/v1/test/errors/invalid-request"))
                .andExpectAll(
                        status().isBadRequest(),
                        content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.code").value("COMMON_INVALID_REQUEST"),
                        jsonPath("$.path").value("/bff/v1/test/errors/invalid-request")
                );
    }

    @Test
    @DisplayName("승인된 Learning 하류 4xx 오류는 공개 계약을 유지")
    void forwardsApprovedLearningDownstreamClientError() {
        // Given: Frontend 공개가 승인된 Learning 출석 충돌 오류
        MockHttpServletRequest request =
                new MockHttpServletRequest("POST", "/bff/v1/attendance/check-in");
        ApiErrorResponse downstream = new ApiErrorResponse(
                "ATTENDANCE_ALREADY_CHECKED_IN",
                "이미 출석 처리된 날짜입니다.",
                "/api/v1/cohorts/1/attendance-records/check-in",
                "learning-request-4xx"
        );

        // When: 공개 코드와 기대 상태가 일치하는 하류 4xx 처리
        ResponseEntity<ApiErrorResponse> response =
                handler.handleLearningDownstreamException(
                        new LearningDownstreamException(
                                HttpStatus.CONFLICT,
                                downstream,
                                new IllegalStateException("approved downstream rejection")
                        ),
                        request
                );

        // Then: 공개 상태·Code·Message는 유지하고 Browser 요청 경로로 교체
        assertSoftly(softly -> {
            softly.assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
            softly.assertThat(response.getHeaders().getCacheControl()).isEqualTo("no-store");
            softly.assertThat(response.getBody()).isEqualTo(new ApiErrorResponse(
                    downstream.code(),
                    downstream.message(),
                    request.getRequestURI(),
                    downstream.requestId()
            ));
        });
    }

    @Test
    @DisplayName("Learning 하류 5xx 오류는 상세 정보를 기록하고 공통 500으로 은닉")
    void hidesLearningDownstreamServerError(CapturedOutput output) {
        // Given: 내부 저장소 정보를 포함한 Learning 5xx 오류
        MockHttpServletRequest request =
                new MockHttpServletRequest("POST", "/bff/v1/community/posts");
        ApiErrorResponse downstream = new ApiErrorResponse(
                "COMMUNITY_ATTACHMENT_STORAGE_FAILED",
                "S3 bucket internal-name write failed",
                "/api/v1/community/posts",
                "learning-request-5xx"
        );
        IllegalStateException cause = new IllegalStateException("storage connection refused");

        // When: 하류 5xx 처리
        ResponseEntity<ApiErrorResponse> response =
                handler.handleLearningDownstreamException(
                        new LearningDownstreamException(
                                HttpStatus.INTERNAL_SERVER_ERROR,
                                downstream,
                                cause
                        ),
                        request
                );

        // Then: Browser에는 공통 오류만 반환하고 원본 정보는 서버에 기록
        assertSoftly(softly -> {
            softly.assertThat(response.getStatusCode())
                    .isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
            softly.assertThat(response.getHeaders().getCacheControl()).isEqualTo("no-store");
            softly.assertThat(response.getBody()).isEqualTo(ApiErrorResponse.of(
                    CommonErrorCode.INTERNAL_SERVER_ERROR,
                    request.getRequestURI()
            ));
            softly.assertThat(response.getBody().message())
                    .doesNotContain("S3 bucket", "storage connection refused");
            softly.assertThat(response.getBody().requestId()).isNull();
            softly.assertThat(output)
                    .contains("downstream.status=500")
                    .contains("downstream.code=COMMUNITY_ATTACHMENT_STORAGE_FAILED")
                    .contains("downstream.requestId=learning-request-5xx")
                    .contains("storage connection refused");
        });
    }

    @Test
    @DisplayName("승인되지 않은 Learning 하류 4xx 오류는 계약 오류로 은닉")
    void hidesUnapprovedLearningDownstreamClientError(CapturedOutput output) {
        // Given: 공개 목록에 없는 하류 4xx 오류
        MockHttpServletRequest request =
                new MockHttpServletRequest("GET", "/bff/v1/cohorts");
        ApiErrorResponse downstream = new ApiErrorResponse(
                "LEARNING_INTERNAL_DIAGNOSTIC",
                "internal validation class name leaked",
                "/api/v1/cohorts",
                "learning-request-unapproved"
        );

        // When: 승인되지 않은 하류 4xx 처리
        ResponseEntity<ApiErrorResponse> response =
                handler.handleLearningDownstreamException(
                        new LearningDownstreamException(
                                HttpStatus.BAD_REQUEST,
                                downstream,
                                new IllegalArgumentException("unapproved downstream error")
                        ),
                        request
                );

        // Then: 공개 메시지를 전달하지 않고 안전한 하류 계약 오류 반환
        assertSoftly(softly -> {
            softly.assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
            softly.assertThat(response.getBody()).isEqualTo(ApiErrorResponse.of(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    request.getRequestURI()
            ));
            softly.assertThat(response.getBody().message())
                    .doesNotContain("internal validation class name");
            softly.assertThat(output)
                    .contains("downstream.code=LEARNING_INTERNAL_DIAGNOSTIC")
                    .contains("downstream.requestId=learning-request-unapproved");
        });
    }

    @Test
    @DisplayName("Bean Validation 필드 오류의 공통 JSON 변환")
    void handlesBeanValidationFailure() throws Exception {
        // Given: 필수 필드가 누락된 JSON 요청
        // When: Bean Validation 실패
        // Then: 첫 번째 필드 메시지를 포함한 400 오류 반환
        mockMvc.perform(post("/bff/v1/test/errors/request-body")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpectAll(
                        status().isBadRequest(),
                        jsonPath("$.code").value("COMMON_INVALID_REQUEST"),
                        jsonPath("$.message").value("name은 필수입니다.")
                );
    }

    @Test
    @DisplayName("읽을 수 없는 JSON 요청 본문의 공통 오류 변환")
    void handlesMalformedRequestBody() throws Exception {
        // Given: 문법이 깨진 JSON 요청
        // When: 요청 본문 변환 실패
        // Then: MALFORMED_REQUEST 오류 반환
        mockMvc.perform(post("/bff/v1/test/errors/request-body")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"))
                .andExpectAll(
                        status().isBadRequest(),
                        jsonPath("$.code").value("COMMON_MALFORMED_REQUEST"),
                        jsonPath("$.message")
                                .value(CommonErrorCode.MALFORMED_REQUEST.message())
                );
    }

    @Test
    @DisplayName("REST Controller의 Spring 404 ErrorResponse는 공통 JSON 오류")
    void handlesFrameworkNotFoundFromRestController() throws Exception {
        // Given: Spring ErrorResponse 기반 404 REST Endpoint
        // When: Endpoint가 404 ErrorResponseException 발생
        // Then: Page Advice가 아닌 공통 JSON 오류 본문 반환
        mockMvc.perform(get("/bff/v1/test/errors/framework-not-found"))
                .andExpectAll(
                        status().isNotFound(),
                        content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.code").value("COMMON_NOT_FOUND"),
                        jsonPath("$.path").value("/bff/v1/test/errors/framework-not-found")
                );
    }

    @Test
    @DisplayName("호출 대상 서비스 5xx 변환은 공개 오류와 원본 예외를 최종 경계에서 기록")
    void logsServerSideBusinessFailure(CapturedOutput output) {
        // Given: 원본 예외를 포함한 호출 대상 서비스 장애
        MockHttpServletRequest request =
                new MockHttpServletRequest("POST", "/timer/v1/timers");
        IllegalStateException cause =
                new IllegalStateException("test service connection failure");

        // When: 공개 ErrorCode가 확정된 5xx 오류의 공통 응답 변환
        ResponseEntity<ApiErrorResponse> response = handler.handleBusinessException(
                new BusinessException(CommonErrorCode.SERVICE_UNAVAILABLE, cause),
                request
        );

        // Then: 공개 상태와 원본 예외 기록
        assertSoftly(softly -> {
            softly.assertThat(response.getStatusCode().value()).isEqualTo(503);
            softly.assertThat(output)
                    .contains("error.code=COMMON_SERVICE_UNAVAILABLE")
                    .contains("test service connection failure");
        });
    }

    @Test
    @DisplayName("정의하지 않은 Spring MVC 상태는 원본 예외를 기록하고 500으로 은닉")
    void hidesUnsupportedFrameworkStatusWithoutReplacingOriginal(CapturedOutput output) {
        // Given: 공통 오류 계약에 정의하지 않은 Spring MVC 상태와 원본 예외
        MockHttpServletRequest request =
                new MockHttpServletRequest("GET", "/timer/v1/example");
        ErrorResponseException exception = new ErrorResponseException(
                HttpStatus.UNPROCESSABLE_CONTENT,
                new IllegalArgumentException("original framework failure")
        );

        // When: Spring MVC 예외의 공통 JSON 변환
        ResponseEntity<Object> response = handler.handleExceptionInternal(
                exception,
                null,
                new HttpHeaders(),
                HttpStatus.UNPROCESSABLE_CONTENT,
                new ServletWebRequest(request)
        );

        // Then: 500 오류 은닉과 원본 예외 기록
        assertThat(response).isNotNull();
        assertSoftly(softly -> {
            softly.assertThat(response.getStatusCode())
                    .isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
            softly.assertThat(response.getBody())
                    .isInstanceOfSatisfying(ApiErrorResponse.class, body ->
                            assertThat(body.code())
                                    .isEqualTo("COMMON_INTERNAL_SERVER_ERROR")
                    );
            softly.assertThat(output)
                    .contains("Spring MVC 오류 응답 계약 위반 status=422")
                    .contains("original framework failure");
        });
    }

    @Test
    @DisplayName("Handler에 전달된 Spring MVC 상태와 Header의 공통 JSON 변환")
    void preservesFrameworkStatusAndHeaders() {
        // Given: Handler에 전달된 405 상태와 Allow Header
        MockHttpServletRequest request =
                new MockHttpServletRequest("POST", "/timer/v1/example");
        ErrorResponseException exception =
                new ErrorResponseException(HttpStatus.METHOD_NOT_ALLOWED);
        HttpHeaders headers = new HttpHeaders();
        headers.setAllow(Set.of(HttpMethod.GET));

        // When: Spring MVC 예외의 공통 JSON 변환
        ResponseEntity<Object> response = handler.handleExceptionInternal(
                exception,
                null,
                headers,
                HttpStatus.METHOD_NOT_ALLOWED,
                new ServletWebRequest(request)
        );

        // Then: 원래 HTTP 계약과 no-store 정책 유지
        assertThat(response).isNotNull();
        assertSoftly(softly -> {
            softly.assertThat(response.getStatusCode())
                    .isEqualTo(HttpStatus.METHOD_NOT_ALLOWED);
            softly.assertThat(response.getHeaders().getAllow())
                    .containsExactly(HttpMethod.GET);
            softly.assertThat(response.getHeaders().getCacheControl())
                    .isEqualTo("no-store");
            softly.assertThat(response.getBody())
                    .isInstanceOfSatisfying(ApiErrorResponse.class, body ->
                            assertThat(body.code()).isEqualTo("COMMON_METHOD_NOT_ALLOWED")
                    );
        });
    }

    @Test
    @DisplayName("Spring MVC 503의 응답·로그 오류 Code 일치")
    void usesServiceUnavailableCodeForFrameworkFailureLog(CapturedOutput output) {
        // Given: Spring MVC가 전달한 503 상태와 원본 예외
        MockHttpServletRequest request =
                new MockHttpServletRequest("GET", "/timer/v1/example");
        ErrorResponseException exception = new ErrorResponseException(
                HttpStatus.SERVICE_UNAVAILABLE,
                new IllegalStateException("framework service unavailable")
        );

        // When: Spring MVC 예외의 공통 JSON 변환
        ResponseEntity<Object> response = handler.handleExceptionInternal(
                exception,
                null,
                new HttpHeaders(),
                HttpStatus.SERVICE_UNAVAILABLE,
                new ServletWebRequest(request)
        );

        // Then: 503 응답 본문과 로그의 동일 오류 Code
        assertThat(response).isNotNull();
        assertSoftly(softly -> {
            softly.assertThat(response.getStatusCode())
                    .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
            softly.assertThat(response.getBody())
                    .isInstanceOfSatisfying(ApiErrorResponse.class, body ->
                            assertThat(body.code())
                                    .isEqualTo("COMMON_SERVICE_UNAVAILABLE")
                    );
            softly.assertThat(output)
                    .contains("error.code=COMMON_SERVICE_UNAVAILABLE")
                    .doesNotContain("error.code=COMMON_INTERNAL_SERVER_ERROR");
        });
    }

    @Test
    @DisplayName("예상하지 못한 REST Controller 예외는 상세 내용을 숨긴 500 응답")
    void hidesUnexpectedException(CapturedOutput output) throws Exception {
        // Given: 처리 규칙이 없는 REST Controller 예외
        // When: REST Controller 요청 처리 실패
        // Then: 상세 내용을 숨긴 공통 500 응답과 원본 예외 기록
        mockMvc.perform(get("/bff/v1/test/errors/unexpected"))
                .andExpectAll(
                        status().isInternalServerError(),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.code").value("COMMON_INTERNAL_SERVER_ERROR"),
                        jsonPath("$.message")
                                .value(CommonErrorCode.INTERNAL_SERVER_ERROR.message())
                );
        assertThat(output).contains("unexpected controller failure");
    }

    @RestController
    public static class TestRestController {

        @GetMapping("/bff/v1/test/errors/invalid-request")
        void invalidRequest() {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST);
        }

        @PostMapping(
                value = "/bff/v1/test/errors/request-body",
                consumes = MediaType.APPLICATION_JSON_VALUE
        )
        void requestBody(@Valid @RequestBody TestRequest request) {
        }

        @GetMapping("/bff/v1/test/errors/framework-not-found")
        void frameworkNotFound() {
            throw new ErrorResponseException(HttpStatus.NOT_FOUND);
        }

        @GetMapping("/bff/v1/test/errors/unexpected")
        void unexpected() {
            throw new IllegalStateException("unexpected controller failure");
        }

    }

    public record TestRequest(
            @NotBlank(message = "name은 필수입니다.") String name
    ) {
    }
}

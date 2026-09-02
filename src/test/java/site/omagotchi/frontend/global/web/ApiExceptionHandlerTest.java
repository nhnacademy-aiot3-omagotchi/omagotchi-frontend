package site.omagotchi.frontend.global.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
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
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.ServletWebRequest;
import site.omagotchi.frontend.global.exception.ApiErrorResponse;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.exception.RetryAfterMetadata;
import site.omagotchi.frontend.global.exception.RetryAfterSeconds;
import site.omagotchi.frontend.global.learning.infrastructure.LearningDownstreamException;
import site.omagotchi.frontend.global.security.BrowserSessionInvalidator;
import site.omagotchi.frontend.global.security.SecurityErrorCode;

import java.util.Set;
import java.util.stream.Stream;

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
        BrowserSessionInvalidator.class,
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
    @DisplayName("공통 Retry-After 메타데이터를 Business 오류 응답 Header로 변환")
    void handlesRetryAfterMetadataFromBusinessException() throws Exception {
        mockMvc.perform(get("/bff/v1/test/errors/retry-after"))
                .andExpectAll(
                        status().isServiceUnavailable(),
                        header().string(HttpHeaders.RETRY_AFTER, "23"),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.code").value("COMMON_SERVICE_UNAVAILABLE")
                );
    }

    @Test
    @DisplayName("승인된 Learning 하류 4xx 오류는 원문 대신 안전한 공개 메시지를 반환")
    void forwardsApprovedLearningDownstreamClientError() throws Exception {
        // Given: REST Controller에서 Frontend 공개가 승인된 Learning 4xx가 발생
        // When: 실제 Spring MVC 오류 경계를 통과
        // Then: 공개 상태·Code를 유지하되 하류 원문 Message는 노출하지 않음
        mockMvc.perform(post("/bff/v1/test/errors/learning-approved-4xx"))
                .andExpectAll(
                        status().isConflict(),
                        content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.code").value("ATTENDANCE_ALREADY_CHECKED_IN"),
                        jsonPath("$.message").value("현재 상태에서는 요청을 처리할 수 없습니다."),
                        jsonPath("$.path").value(
                                "/bff/v1/test/errors/learning-approved-4xx"
                        ),
                        jsonPath("$.requestId").value("learning-request-4xx")
                );
    }

    @Test
    @DisplayName("실습실 정원 초과는 구체적인 공개 안내와 409를 반환")
    void forwardsLabCapacityExceeded() throws Exception {
        mockMvc.perform(post("/bff/v1/test/errors/lab-capacity-exceeded"))
                .andExpectAll(
                        status().isConflict(),
                        content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON),
                        jsonPath("$.code").value("LAB_CAPACITY_EXCEEDED"),
                        jsonPath("$.message").value("실습실 정원이 가득 찼습니다."),
                        jsonPath("$.path").value(
                                "/bff/v1/test/errors/lab-capacity-exceeded"
                        )
                );
    }

    @Test
    @DisplayName("이미 실행 중인 Learning 타이머 오류는 Frontend 409 계약으로 전달")
    void forwardsTimerAlreadyRunning() throws Exception {
        mockMvc.perform(post("/bff/v1/test/errors/timer-already-running"))
                .andExpectAll(
                        status().isConflict(),
                        content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.code").value("TIMER_ALREADY_RUNNING"),
                        jsonPath("$.message").value("현재 상태에서는 요청을 처리할 수 없습니다."),
                        jsonPath("$.path").value("/bff/v1/test/errors/timer-already-running"),
                        jsonPath("$.requestId").value("learning-timer-already-running")
                );
    }

    @Test
    @DisplayName("Learning Access JWT 401의 기존 인증 세션 폐기")
    void invalidatesStaleSessionForLearningAuthenticationFailure() throws Exception {
        assertAuthenticationFailureExpiresSession(
                "/bff/v1/test/errors/learning-authentication-required"
        );
    }

    @Test
    @DisplayName("승인되지 않은 Learning 401도 기존 인증 세션을 폐기")
    void invalidatesStaleSessionForUnapprovedLearningAuthenticationFailure() throws Exception {
        MockHttpSession authenticatedSession = new MockHttpSession();

        MvcResult result = mockMvc.perform(
                        get("/bff/v1/test/errors/learning-unapproved-401")
                                .session(authenticatedSession)
                )
                .andExpectAll(
                        status().isBadGateway(),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.code").value("COMMON_DOWNSTREAM_INVALID_RESPONSE")
                )
                .andReturn();

        assertThat(authenticatedSession.isInvalid()).isTrue();
        assertThat(result.getRequest().getSession(false)).isNull();
    }

    @Test
    @DisplayName("BFF Business 401의 기존 인증 세션 폐기")
    void invalidatesStaleSessionForBusinessAuthenticationFailure() throws Exception {
        assertAuthenticationFailureExpiresSession(
                "/bff/v1/test/errors/authentication-required"
        );
    }

    @Test
    @DisplayName("Telegram 미연동 하류 404는 Frontend 404 계약으로 전달")
    void forwardsTelegramUserLinkNotFound() throws Exception {
        // Given: Telegram 연동 이력이 없는 사용자를 Learning이 404로 응답
        // When: 실제 Spring MVC 오류 경계를 통과
        // Then: Browser가 정상 미연동 상태로 판정할 수 있도록 404와 Code 유지
        mockMvc.perform(get("/bff/v1/test/errors/telegram-link-not-found"))
                .andExpectAll(
                        status().isNotFound(),
                        content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.code").value("TELEGRAM_USER_LINK_NOT_FOUND"),
                        jsonPath("$.message").value("요청한 정보를 찾을 수 없습니다."),
                        jsonPath("$.path").value(
                                "/bff/v1/test/errors/telegram-link-not-found"
                        ),
                        jsonPath("$.requestId").value("learning-telegram-link-not-found")
                );
    }

    @Test
    @DisplayName("기수 관리자 기간 중복 오류는 Frontend 409 계약으로 전달")
    void forwardsCohortManagerPeriodConflict() throws Exception {
        mockMvc.perform(post("/bff/v1/test/errors/cohort-manager-period-conflict"))
                .andExpectAll(
                        status().isConflict(),
                        content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON),
                        jsonPath("$.code").value("COHORT_MANAGER_PERIOD_CONFLICT"),
                        jsonPath("$.path").value("/bff/v1/test/errors/cohort-manager-period-conflict")
                );
    }

    @Test
    @DisplayName("승인된 공간 점유 4xx 오류는 공개 계약을 유지")
    void forwardsApprovedOccupancyDownstreamClientError() throws Exception {
        mockMvc.perform(post("/bff/v1/test/errors/occupancy-approved-4xx"))
                .andExpectAll(
                        status().isConflict(),
                        content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.code").value("OCCUPANCY_ROOM_ALREADY_OCCUPIED"),
                        jsonPath("$.message").value("현재 상태에서는 요청을 처리할 수 없습니다."),
                        jsonPath("$.requestId").value("occupancy-request-4xx")
                );
    }

    @ParameterizedTest(name = "[{index}] {0}")
    @MethodSource("teamDownstreamErrors")
    @DisplayName("Learning 팀 4xx 오류의 Status와 Code를 Browser 응답까지 보존")
    void forwardsTeamDownstreamErrors(String code, HttpStatus status) {
        LearningDownstreamException exception = new LearningDownstreamException(
                status,
                new ApiErrorResponse(
                        code,
                        "공개하지 않을 Learning 내부 메시지",
                        "/api/v1/teams/10",
                        "learning-team-error"
                ),
                new IllegalStateException("team request rejected")
        );

        ResponseEntity<ApiErrorResponse> response = handler.handleLearningDownstreamException(
                exception,
                new MockHttpServletRequest("POST", "/bff/v1/teams/10"),
                new MockHttpServletResponse()
        );

        assertSoftly(softly -> {
            softly.assertThat(response.getStatusCode()).isEqualTo(status);
            softly.assertThat(response.getBody()).isNotNull().satisfies(body -> {
                softly.assertThat(body.code()).isEqualTo(code);
                softly.assertThat(body.path()).isEqualTo("/bff/v1/teams/10");
                softly.assertThat(body.requestId()).isEqualTo("learning-team-error");
            });
        });
    }

    @Test
    @DisplayName("Learning 하류 5xx 오류는 상세 정보를 기록하고 공통 500으로 은닉")
    void hidesLearningDownstreamServerError(CapturedOutput output) throws Exception {
        // Given: REST Controller에서 내부 저장소 정보를 포함한 Learning 5xx가 발생
        // When: 실제 Spring MVC 오류 경계를 통과
        // Then: Browser에는 공통 오류 JSON만 반환하고 원본 정보는 서버에 기록
        mockMvc.perform(post("/bff/v1/test/errors/learning-5xx"))
                .andExpectAll(
                        status().isInternalServerError(),
                        content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.code").value("COMMON_INTERNAL_SERVER_ERROR"),
                        jsonPath("$.message").value(
                                CommonErrorCode.INTERNAL_SERVER_ERROR.message()
                        ),
                        jsonPath("$.path").value("/bff/v1/test/errors/learning-5xx"),
                        jsonPath("$.requestId").doesNotExist()
                );
        assertThat(output)
                .contains("downstream.status=500")
                .contains("downstream.code=COMMUNITY_ATTACHMENT_STORAGE_FAILED")
                .contains("downstream.requestId=learning-request-5xx")
                .contains("storage connection refused");
    }

    private static Stream<Arguments> teamDownstreamErrors() {
        return Stream.of(
                Arguments.of("TEAM_INVALID_NAME", HttpStatus.BAD_REQUEST),
                Arguments.of("TEAM_INVALID_MEMBER_QUERY", HttpStatus.BAD_REQUEST),
                Arguments.of("TEAM_COHORT_REQUIRED", HttpStatus.BAD_REQUEST),
                Arguments.of("TEAM_TARGET_NOT_IN_COHORT", HttpStatus.BAD_REQUEST),
                Arguments.of("TEAM_MASTER_CANNOT_BE_KICKED", HttpStatus.BAD_REQUEST),
                Arguments.of("TEAM_CANNOT_DELEGATE_TO_SELF", HttpStatus.BAD_REQUEST),
                Arguments.of("TEAM_COHORT_ACCESS_DENIED", HttpStatus.FORBIDDEN),
                Arguments.of("TEAM_MASTER_REQUIRED", HttpStatus.FORBIDDEN),
                Arguments.of("TEAM_NOT_A_MEMBER", HttpStatus.FORBIDDEN),
                Arguments.of("TEAM_NOT_FOUND", HttpStatus.NOT_FOUND),
                Arguments.of("TEAM_MEMBER_NOT_FOUND", HttpStatus.NOT_FOUND),
                Arguments.of("TEAM_ACCOUNT_NOT_FOUND", HttpStatus.NOT_FOUND),
                Arguments.of("TEAM_DUPLICATE_NAME", HttpStatus.CONFLICT),
                Arguments.of("TEAM_ALREADY_IN_TEAM", HttpStatus.CONFLICT),
                Arguments.of("TEAM_CAPACITY_EXCEEDED", HttpStatus.CONFLICT),
                Arguments.of("TEAM_ACCOUNT_WITHDRAWN", HttpStatus.CONFLICT),
                Arguments.of("TEAM_DELEGATION_REQUIRED", HttpStatus.CONFLICT),
                Arguments.of("TEAM_MASTER_STATE_CONFLICT", HttpStatus.CONFLICT)
        );
    }

    @Test
    @DisplayName("승인되지 않은 Learning 하류 4xx 오류는 계약 오류로 은닉")
    void hidesUnapprovedLearningDownstreamClientError(CapturedOutput output) throws Exception {
        // Given: REST Controller에서 공개 목록에 없는 Learning 4xx가 발생
        // When: 실제 Spring MVC 오류 경계를 통과
        // Then: 공개 메시지는 숨기고 안전한 하류 계약 오류 JSON 반환
        mockMvc.perform(get("/bff/v1/test/errors/learning-unapproved-4xx"))
                .andExpectAll(
                        status().isBadGateway(),
                        content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.code").value("COMMON_DOWNSTREAM_INVALID_RESPONSE"),
                        jsonPath("$.message").value(
                                CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE.message()
                        ),
                        jsonPath("$.path").value(
                                "/bff/v1/test/errors/learning-unapproved-4xx"
                        )
                );
        assertThat(output)
                .contains("downstream.code=LEARNING_INTERNAL_DIAGNOSTIC")
                .contains("downstream.requestId=learning-request-unapproved");
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
                request,
                new MockHttpServletResponse()
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

    private void assertAuthenticationFailureExpiresSession(String path) throws Exception {
        MockHttpSession authenticatedSession = new MockHttpSession();

        MvcResult result = mockMvc.perform(get(path).session(authenticatedSession))
                .andExpectAll(
                        status().isUnauthorized(),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.code").value("AUTH_AUTHENTICATION_REQUIRED")
                )
                .andReturn();

        assertThat(authenticatedSession.isInvalid()).isTrue();
        assertThat(result.getRequest().getSession(false)).isNull();
    }

    @RestController
    public static class TestRestController {

        @GetMapping("/bff/v1/test/errors/invalid-request")
        void invalidRequest() {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST);
        }

        @GetMapping("/bff/v1/test/errors/retry-after")
        void retryAfter() {
            throw new RetryAfterBusinessException(23);
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

        @GetMapping("/bff/v1/test/errors/authentication-required")
        void authenticationRequired() {
            throw new BusinessException(SecurityErrorCode.AUTHENTICATION_REQUIRED);
        }

        @GetMapping("/bff/v1/test/errors/learning-authentication-required")
        void learningAuthenticationRequired() {
            throw new LearningDownstreamException(
                    HttpStatus.UNAUTHORIZED,
                    new ApiErrorResponse(
                            "AUTH_AUTHENTICATION_REQUIRED",
                            "expired bearer token",
                            "/api/v1/me/profile",
                            "learning-authentication-request"
                    ),
                    new IllegalStateException("expired access token")
            );
        }

        @GetMapping("/bff/v1/test/errors/learning-unapproved-401")
        void unapprovedLearningAuthenticationFailure() {
            throw new LearningDownstreamException(
                    HttpStatus.UNAUTHORIZED,
                    new ApiErrorResponse(
                            "LEARNING_INTERNAL_AUTH_DIAGNOSTIC",
                            "internal authentication detail",
                            "/api/v1/internal/example",
                            "learning-unapproved-authentication-request"
                    ),
                    new IllegalStateException("unapproved authentication failure")
            );
        }

        @PostMapping("/bff/v1/test/errors/learning-approved-4xx")
        void approvedLearningClientError() {
            throw new LearningDownstreamException(
                    HttpStatus.CONFLICT,
                    new ApiErrorResponse(
                            "ATTENDANCE_ALREADY_CHECKED_IN",
                            "internal attendance row id=8472 already exists",
                            "/api/v1/cohorts/1/attendance-records/check-in",
                            "learning-request-4xx"
                    ),
                    new IllegalStateException("approved downstream rejection")
            );
        }

        @PostMapping("/bff/v1/test/errors/lab-capacity-exceeded")
        void labCapacityExceeded() {
            throw new LearningDownstreamException(
                    HttpStatus.CONFLICT,
                    new ApiErrorResponse(
                            "LAB_CAPACITY_EXCEEDED",
                            "internal capacity details",
                            "/api/v1/cohorts/7/attendance-records/move-lab",
                            "learning-lab-capacity-request"
                    ),
                    new IllegalStateException("lab capacity exceeded")
            );
        }

        @PostMapping("/bff/v1/test/errors/timer-already-running")
        void timerAlreadyRunning() {
            throw new LearningDownstreamException(
                    HttpStatus.CONFLICT,
                    new ApiErrorResponse(
                            "TIMER_ALREADY_RUNNING",
                            "active timer run already exists",
                            "/api/v1/cohorts/1/timer/start",
                            "learning-timer-already-running"
                    ),
                    new IllegalStateException("timer already running")
            );
        }

        @GetMapping("/bff/v1/test/errors/telegram-link-not-found")
        void telegramLinkNotFound() {
            throw new LearningDownstreamException(
                    HttpStatus.NOT_FOUND,
                    new ApiErrorResponse(
                            "TELEGRAM_USER_LINK_NOT_FOUND",
                            "Telegram 연동 정보를 찾을 수 없습니다.",
                            "/api/v1/telegram/link",
                            "learning-telegram-link-not-found"
                    ),
                    new IllegalStateException("telegram link not found")
            );
        }

        @PostMapping("/bff/v1/test/errors/cohort-manager-period-conflict")
        void cohortManagerPeriodConflict() {
            throw new LearningDownstreamException(
                    HttpStatus.CONFLICT,
                    new ApiErrorResponse(
                            "COHORT_MANAGER_PERIOD_CONFLICT",
                            "internal cohort period details",
                            "/api/v1/cohorts/2/managers",
                            "learning-manager-conflict"
                    ),
                    new IllegalStateException("manager period conflict")
            );
        }

        @PostMapping("/bff/v1/test/errors/occupancy-approved-4xx")
        void approvedOccupancyClientError() {
            throw new LearningDownstreamException(
                    HttpStatus.CONFLICT,
                    new ApiErrorResponse(
                            "OCCUPANCY_ROOM_ALREADY_OCCUPIED",
                            "이미 점유 중인 회의실입니다.",
                            "/api/v1/spaces/3/occupancies",
                            "occupancy-request-4xx"
                    ),
                    new IllegalStateException("approved occupancy rejection")
            );
        }

        @PostMapping("/bff/v1/test/errors/learning-5xx")
        void learningServerError() {
            throw new LearningDownstreamException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    new ApiErrorResponse(
                            "COMMUNITY_ATTACHMENT_STORAGE_FAILED",
                            "S3 bucket internal-name write failed",
                            "/api/v1/community/posts",
                            "learning-request-5xx"
                    ),
                    new IllegalStateException("storage connection refused")
            );
        }

        @GetMapping("/bff/v1/test/errors/learning-unapproved-4xx")
        void unapprovedLearningClientError() {
            throw new LearningDownstreamException(
                    HttpStatus.BAD_REQUEST,
                    new ApiErrorResponse(
                            "LEARNING_INTERNAL_DIAGNOSTIC",
                            "internal validation class name leaked",
                            "/api/v1/cohorts",
                            "learning-request-unapproved"
                    ),
                    new IllegalArgumentException("unapproved downstream error")
            );
        }

    }

    public record TestRequest(
            @NotBlank(message = "name은 필수입니다.") String name
    ) {
    }

    private static final class RetryAfterBusinessException
            extends BusinessException
            implements RetryAfterMetadata {

        private final RetryAfterSeconds retryAfter;

        private RetryAfterBusinessException(long retryAfterSeconds) {
            super(CommonErrorCode.SERVICE_UNAVAILABLE);
            this.retryAfter = new RetryAfterSeconds(retryAfterSeconds);
        }

        @Override
        public RetryAfterSeconds retryAfter() {
            return retryAfter;
        }
    }
}

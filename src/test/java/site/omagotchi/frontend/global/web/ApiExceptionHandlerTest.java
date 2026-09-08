package site.omagotchi.frontend.global.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
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
import site.omagotchi.frontend.global.logging.HttpErrorEventLogger;
import site.omagotchi.frontend.global.requestid.RequestId;
import site.omagotchi.frontend.global.requestid.RequestIdContext;
import site.omagotchi.frontend.global.security.BrowserSessionInvalidator;
import site.omagotchi.frontend.global.security.SecurityErrorCode;

import java.util.Set;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.SoftAssertions.assertSoftly;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(useDefaultFilters = false)
@AutoConfigureMockMvc(addFilters = false)
@Import({
        ApiExceptionHandler.class,
        BrowserSessionInvalidator.class,
        ApiExceptionHandlerTest.TestRestController.class
})
class ApiExceptionHandlerTest {

    private static final String REQUEST_ID = "11111111111111111111111111111111";

    @Autowired
    private ApiExceptionHandler handler;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private HttpErrorEventLogger errorEventLogger;

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
        performWithRequestId(post("/bff/v1/test/errors/learning-approved-4xx"))
                .andExpectAll(
                        status().isConflict(),
                        content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.code").value("ATTENDANCE_ALREADY_CHECKED_IN"),
                        jsonPath("$.message").value("이미 출석 처리된 날짜입니다."),
                        jsonPath("$.path").value(
                                "/bff/v1/test/errors/learning-approved-4xx"
                        ),
                        jsonPath("$.requestId").value(REQUEST_ID)
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

    @ParameterizedTest(name = "[{index}] {0}")
    @MethodSource("spaceDownstreamErrors")
    @DisplayName("공간 상태 충돌 오류는 코드별 공개 JSON 계약을 유지")
    void forwardsSpaceDownstreamErrors(String code, String message) throws Exception {
        mockMvc.perform(post("/bff/v1/test/errors/spaces/{code}", code)
                        .param("message", message))
                .andExpectAll(
                        status().isConflict(),
                        content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.code").value(code),
                        jsonPath("$.message").value(message)
                );
    }

    @Test
    @DisplayName("이미 실행 중인 Learning 타이머 오류는 Frontend 409 계약으로 전달")
    void forwardsTimerAlreadyRunning() throws Exception {
        performWithRequestId(post("/bff/v1/test/errors/timer-already-running"))
                .andExpectAll(
                        status().isConflict(),
                        content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.code").value("TIMER_ALREADY_RUNNING"),
                        jsonPath("$.message").value("이미 실행 중인 타이머가 존재합니다."),
                        jsonPath("$.path").value("/bff/v1/test/errors/timer-already-running"),
                        jsonPath("$.requestId").value(REQUEST_ID)
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
        performWithRequestId(get("/bff/v1/test/errors/telegram-link-not-found"))
                .andExpectAll(
                        status().isNotFound(),
                        content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.code").value("TELEGRAM_USER_LINK_NOT_FOUND"),
                        jsonPath("$.message").value("Telegram 연동 정보를 찾을 수 없습니다."),
                        jsonPath("$.path").value(
                                "/bff/v1/test/errors/telegram-link-not-found"
                        ),
                        jsonPath("$.requestId").value(REQUEST_ID)
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
        performWithRequestId(post("/bff/v1/test/errors/occupancy-approved-4xx"))
                .andExpectAll(
                        status().isConflict(),
                        content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.code").value("OCCUPANCY_ROOM_ALREADY_OCCUPIED"),
                        jsonPath("$.message").value("이미 점유 중인 회의실입니다."),
                        jsonPath("$.requestId").value(REQUEST_ID)
                );
    }

    @Test
    @DisplayName("하류 4xx의 Domain 문구를 그대로 전달한다")
    void forwardsDownstreamClientErrorMessageAsIs() {
        // 팀 이름 중복이 상태·Code는 맞는데 문구만 일반 안내로 뭉개지던 회귀를 고정한다.
        LearningDownstreamException exception = new LearningDownstreamException(
                HttpStatus.CONFLICT,
                new ApiErrorResponse(
                        "TEAM_DUPLICATE_NAME",
                        "같은 기수에 이미 사용 중인 팀 이름입니다.",
                        "/api/v1/teams",
                        "learning-team-duplicate-name"
                ),
                new IllegalStateException("duplicate team name")
        );

        ResponseEntity<ApiErrorResponse> response = handler.handleLearningDownstreamException(
                exception,
                new MockHttpServletRequest("POST", "/bff/v1/teams"),
                new MockHttpServletResponse()
        );

        assertSoftly(softly -> {
            softly.assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
            softly.assertThat(response.getBody()).isNotNull().satisfies(body -> {
                softly.assertThat(body.code()).isEqualTo("TEAM_DUPLICATE_NAME");
                softly.assertThat(body.message())
                        .isEqualTo("같은 기수에 이미 사용 중인 팀 이름입니다.");
            });
        });
    }

    @Test
    @DisplayName("하류 5xx는 문구를 전달하지 않고 일반 안내로 대체한다")
    void hidesDownstreamServerErrorMessage() {
        // 5xx는 Gateway·Proxy 등 계약을 모르는 주체가 만들 수 있어 내용을 신뢰하지 않는다.
        LearningDownstreamException exception = new LearningDownstreamException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                new ApiErrorResponse(
                        "COMMON_INTERNAL_SERVER_ERROR",
                        "NullPointerException at TeamService.create line 81",
                        "/api/v1/teams",
                        "learning-team-500"
                ),
                new IllegalStateException("downstream failure")
        );

        ResponseEntity<ApiErrorResponse> response = handler.handleLearningDownstreamException(
                exception,
                new MockHttpServletRequest("POST", "/bff/v1/teams"),
                new MockHttpServletResponse()
        );

        assertThat(response.getBody()).isNotNull()
                .extracting(ApiErrorResponse::message)
                .isEqualTo("서버 내부 오류가 발생했습니다.");
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

        ResponseEntity<ApiErrorResponse> response;
        try (RequestIdContext.Scope ignored =
                     RequestIdContext.openInbound(new RequestId(REQUEST_ID))) {
            response = handler.handleLearningDownstreamException(
                    exception,
                    new MockHttpServletRequest("POST", "/bff/v1/teams/10"),
                    new MockHttpServletResponse()
            );
        }

        assertSoftly(softly -> {
            softly.assertThat(response.getStatusCode()).isEqualTo(status);
            softly.assertThat(response.getBody()).isNotNull().satisfies(body -> {
                softly.assertThat(body.code()).isEqualTo(code);
                softly.assertThat(body.path()).isEqualTo("/bff/v1/teams/10");
                softly.assertThat(body.requestId()).isEqualTo(REQUEST_ID);
            });
        });
    }

    @Test
    @DisplayName("존재하지 않는 커뮤니티 첨부파일 오류를 404로 전달")
    void forwardsCommunityAttachmentNotFound() {
        LearningDownstreamException exception = new LearningDownstreamException(
                HttpStatus.NOT_FOUND,
                new ApiErrorResponse(
                        "COMMUNITY_ATTACHMENT_NOT_FOUND",
                        "첨부파일을 찾을 수 없습니다.",
                        "/api/v1/cohorts/7/community/posts/11/attachments/29",
                        "learning-attachment-not-found"
                ),
                new IllegalStateException("attachment not found")
        );

        ResponseEntity<ApiErrorResponse> response = handler.handleLearningDownstreamException(
                exception,
                new MockHttpServletRequest("DELETE", "/bff/v1/community/posts/11/attachments/29"),
                new MockHttpServletResponse()
        );

        assertSoftly(softly -> {
            softly.assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
            softly.assertThat(response.getBody()).isNotNull().satisfies(body -> {
                softly.assertThat(body.code()).isEqualTo("COMMUNITY_ATTACHMENT_NOT_FOUND");
                softly.assertThat(body.message()).isEqualTo("첨부파일을 찾을 수 없습니다.");
                softly.assertThat(body.path()).isEqualTo("/bff/v1/community/posts/11/attachments/29");
            });
        });
    }

    @Test
    @DisplayName("Learning 하류 5xx 오류는 상세 정보를 기록하고 공통 500으로 은닉")
    void hidesLearningDownstreamServerError() throws Exception {
        // Given: REST Controller에서 내부 저장소 정보를 포함한 Learning 5xx가 발생
        // When: 실제 Spring MVC 오류 경계를 통과
        // Then: Browser에는 공통 오류 JSON만 반환하고 원본 정보는 서버에 기록
        performWithRequestId(post("/bff/v1/test/errors/learning-5xx"))
                .andExpectAll(
                        status().isInternalServerError(),
                        content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.code").value("COMMON_INTERNAL_SERVER_ERROR"),
                        jsonPath("$.message").value(
                                CommonErrorCode.INTERNAL_SERVER_ERROR.message()
                        ),
                        jsonPath("$.path").value("/bff/v1/test/errors/learning-5xx"),
                        jsonPath("$.requestId").value(REQUEST_ID)
                );
        verify(errorEventLogger).log(
                any(LearningDownstreamException.class),
                eq(CommonErrorCode.INTERNAL_SERVER_ERROR),
                eq(HttpStatus.INTERNAL_SERVER_ERROR.value()),
                any(MockHttpServletRequest.class)
        );
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

    private static Stream<Arguments> spaceDownstreamErrors() {
        return Stream.of(
                Arguments.of(
                        "SPACE_HAS_CURRENT_PRESENCE",
                        "현재 체류 중인 사용자가 있어 공간을 변경할 수 없습니다."
                ),
                Arguments.of(
                        "SPACE_HAS_RETURN_RESERVATION",
                        "회의 종료 후 복귀할 사용자가 있어 공간을 변경할 수 없습니다."
                ),
                Arguments.of(
                        "LAST_ACTIVE_LAB_REQUIRED",
                        "활성 기수에는 활성 실습실이 최소 1개 필요합니다."
                ),
                Arguments.of(
                        "SPACE_STATE_CHANGED",
                        "공간 상태가 동시에 변경되었습니다. 다시 시도해 주세요."
                )
        );
    }

    @Test
    @DisplayName("승인되지 않은 Learning 하류 4xx 오류는 계약 오류로 은닉")
    void hidesUnapprovedLearningDownstreamClientError() throws Exception {
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
        verify(errorEventLogger).log(
                any(LearningDownstreamException.class),
                eq(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE),
                eq(HttpStatus.BAD_GATEWAY.value()),
                any(MockHttpServletRequest.class)
        );
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
    void logsServerSideBusinessFailure() {
        // Given: 원본 예외를 포함한 호출 대상 서비스 장애
        MockHttpServletRequest request =
                new MockHttpServletRequest("POST", "/timer/v1/timers");
        IllegalStateException cause =
                new IllegalStateException("test service connection failure");

        // When: 공개 ErrorCode가 확정된 5xx 오류의 공통 응답 변환
        BusinessException exception =
                new BusinessException(CommonErrorCode.SERVICE_UNAVAILABLE, cause);
        ResponseEntity<ApiErrorResponse> response = handler.handleBusinessException(
                exception,
                request,
                new MockHttpServletResponse()
        );

        // Then: 공개 상태와 원본 예외 기록
        assertThat(response.getStatusCode().value()).isEqualTo(503);
        verify(errorEventLogger).log(
                exception,
                CommonErrorCode.SERVICE_UNAVAILABLE,
                HttpStatus.SERVICE_UNAVAILABLE.value(),
                request
        );
    }

    @Test
    @DisplayName("정의하지 않은 Spring MVC 상태는 원본 예외를 기록하고 500으로 은닉")
    void hidesUnsupportedFrameworkStatusWithoutReplacingOriginal() {
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
        });
        verify(errorEventLogger).log(
                exception,
                CommonErrorCode.INTERNAL_SERVER_ERROR,
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                request
        );
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
    void usesServiceUnavailableCodeForFrameworkFailureLog() {
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
        });
        verify(errorEventLogger).log(
                exception,
                CommonErrorCode.SERVICE_UNAVAILABLE,
                HttpStatus.SERVICE_UNAVAILABLE.value(),
                request
        );
    }

    @Test
    @DisplayName("예상하지 못한 REST Controller 예외는 상세 내용을 숨긴 500 응답")
    void hidesUnexpectedException() throws Exception {
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
        verify(errorEventLogger).log(
                any(IllegalStateException.class),
                eq(CommonErrorCode.INTERNAL_SERVER_ERROR),
                eq(HttpStatus.INTERNAL_SERVER_ERROR.value()),
                any(MockHttpServletRequest.class)
        );
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

    private ResultActions performWithRequestId(
            MockHttpServletRequestBuilder requestBuilder
    ) throws Exception {
        try (RequestIdContext.Scope ignored =
                     RequestIdContext.openInbound(new RequestId(REQUEST_ID))) {
            return mockMvc.perform(requestBuilder);
        }
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
                            "이미 출석 처리된 날짜입니다.",
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
                            "실습실 정원이 가득 찼습니다.",
                            "/api/v1/cohorts/7/attendance-records/move-lab",
                            "learning-lab-capacity-request"
                    ),
                    new IllegalStateException("lab capacity exceeded")
            );
        }

        @PostMapping("/bff/v1/test/errors/spaces/{code}")
        void spaceConflict(@PathVariable String code, @RequestParam String message) {
            throw new LearningDownstreamException(
                    HttpStatus.CONFLICT,
                    new ApiErrorResponse(
                            code,
                            message,
                            "/api/v1/spaces/7",
                            "learning-space-conflict"
                    ),
                    new IllegalStateException("space state conflict")
            );
        }

        @PostMapping("/bff/v1/test/errors/timer-already-running")
        void timerAlreadyRunning() {
            throw new LearningDownstreamException(
                    HttpStatus.CONFLICT,
                    new ApiErrorResponse(
                            "TIMER_ALREADY_RUNNING",
                            "이미 실행 중인 타이머가 존재합니다.",
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
                            "기수 운영 기간이 다른 담당 기수와 겹칩니다.",
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

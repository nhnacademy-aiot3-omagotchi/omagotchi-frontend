package site.omagotchi.frontend.account.infrastructure;

import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;
import site.omagotchi.frontend.account.application.AdminAccountErrorCode;
import site.omagotchi.frontend.account.application.result.IdentityAdminAccountPage;
import site.omagotchi.frontend.global.application.result.PageMetadata;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.global.http.ApiErrorContractResolver;
import site.omagotchi.frontend.global.http.ApiErrorResponseDecoder;
import site.omagotchi.frontend.global.http.RestClientCallExecutor;

import java.time.Instant;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

class IdentityRestAdminAccountClientTest {

    private static final String BASE_URL = "http://identity-service:8080";
    private static final String PATH = "/api/v1/admin/users";
    private static final String ACCOUNT_PATH = "/api/v1/admin/accounts";
    private static final String TARGET_ID = "00000000-0000-0000-0000-000000000002";
    private static final String ACCESS_TOKEN = "admin-token";

    private IdentityRestAdminAccountClient client;
    private MockRestServiceServer server;
    private ValidatorFactory validatorFactory;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        server = MockRestServiceServer.bindTo(builder).build();
        HttpServiceProxyFactory proxyFactory = HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(builder.build()))
                .build();
        validatorFactory = Validation.buildDefaultValidatorFactory();
        client = new IdentityRestAdminAccountClient(
                proxyFactory.createClient(IdentityAdminAccountHttpService.class),
                proxyFactory.createClient(IdentityAdminAccountStatusHttpService.class),
                proxyFactory.createClient(IdentityAdminAccountRoleHttpService.class),
                new RestClientCallExecutor(),
                new ApiErrorContractResolver(new ApiErrorResponseDecoder()),
                validatorFactory.getValidator()
        );
    }

    @AfterEach
    void verifyServer() {
        server.verify();
        validatorFactory.close();
    }

    @Test
    @DisplayName("Identity items·page 응답의 Application 결과 변환")
    void mapsIdentityWirePageToApplicationResult() {
        // Given: 최소 사용자 정보와 페이지 메타데이터를 포함한 Identity 응답
        server.expect(once(), requestTo(BASE_URL + PATH + "?page=0&size=20"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer " + ACCESS_TOKEN))
                .andRespond(withStatus(HttpStatus.OK)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "items": [{
                                    "accountId": "00000000-0000-0000-0000-000000000001",
                                    "email": "admin@example.com",
                                    "name": "관리자",
                                    "role": "SYSTEM_ADMIN",
                                    "status": "ACTIVE",
                                    "failedLoginAttempts": 2,
                                    "locked": true,
                                    "lockedUntil": "2026-08-31T08:00:00Z",
                                    "statusChangedAt": "2026-08-31T07:30:00Z",
                                    "recoveryDeadline": null,
                                    "createdAt": "2026-08-31T07:00:00Z"
                                  }],
                                  "page": {
                                    "number": 0,
                                    "size": 20,
                                    "totalElements": 1,
                                    "totalPages": 1
                                  }
                                }
                                """));

        // When: Identity 관리자 계정 페이지 조회
        IdentityAdminAccountPage result = client.findAccounts(
                ACCESS_TOKEN, null, null, null, null, 0, 20, null);

        // Then: Application 계정 결과와 페이지 정보로 변환
        assertThat(result.items()).singleElement().satisfies(account -> {
            assertThat(account.email()).isEqualTo("admin@example.com");
            assertThat(account.failedLoginAttempts()).isEqualTo((short) 2);
            assertThat(account.lockedUntil())
                    .isEqualTo(Instant.parse("2026-08-31T08:00:00Z"));
            assertThat(account.locked()).isTrue();
            assertThat(account.statusChangedAt())
                    .isEqualTo(Instant.parse("2026-08-31T07:30:00Z"));
        });
        assertThat(result.page()).isEqualTo(new PageMetadata(0, 20, 1, 1));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("approvedIdentityErrors")
    @DisplayName("관리자 계정 조회 API가 공개하는 Identity 오류 보존")
    void preservesApprovedIdentityError(
            String ignoredDescription,
            HttpStatus status,
            ErrorCode expectedErrorCode
    ) {
        // Given: 관리자 계정 조회 API가 공개하는 Identity 오류 응답
        expectError(status, expectedErrorCode.code());

        // When & Then: Frontend의 동일 공개 오류로 변환
        assertThatThrownBy(() -> client.findAccounts(
                ACCESS_TOKEN, null, null, null, null, 0, 20, null
        )).isInstanceOfSatisfying(BusinessException.class, exception ->
                assertThat(exception.getErrorCode())
                        .isEqualTo(expectedErrorCode));
    }

    @Test
    @DisplayName("Identity 5xx 응답의 서비스 이용 불가 변환")
    void mapsIdentityServerFailureToServiceUnavailable() {
        // Given: Identity 내부 서버 오류
        server.expect(once(), requestTo(BASE_URL + PATH + "?page=0&size=20"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        // When & Then: 하류 장애를 Frontend 503 계약으로 변환
        assertThatThrownBy(() -> client.findAccounts(
                ACCESS_TOKEN, null, null, null, null, 0, 20, null
        )).isInstanceOfSatisfying(BusinessException.class, exception ->
                assertThat(exception.getErrorCode())
                        .isEqualTo(CommonErrorCode.SERVICE_UNAVAILABLE));
    }

    @Test
    @DisplayName("Identity 필수 사용자 필드 누락의 잘못된 하류 응답 처리")
    void rejectsMissingRequiredIdentityFieldAsBadGateway() {
        // Given: 필수 이메일이 누락된 Identity 성공 응답
        server.expect(once(), requestTo(BASE_URL + PATH + "?page=0&size=20"))
                .andRespond(withStatus(HttpStatus.OK)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "items": [{
                                    "accountId": "00000000-0000-0000-0000-000000000001",
                                    "email": null,
                                    "name": "관리자",
                                    "role": "SYSTEM_ADMIN",
                                    "status": "ACTIVE",
                                    "createdAt": "2026-08-31T07:00:00Z"
                                  }],
                                  "page": {
                                    "number": 0,
                                    "size": 20,
                                    "totalElements": 1,
                                    "totalPages": 1
                                  }
                                }
                                """));

        // When & Then: 잘못된 하류 응답 오류로 거부
        assertThatThrownBy(() -> client.findAccounts(
                ACCESS_TOKEN, null, null, null, null, 0, 20, null
        )).isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode())
                                .isEqualTo(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE));
    }

    @Test
    @DisplayName("탈퇴 계정의 복구 기한 누락 응답 거부")
    void rejectsWithdrawnAccountWithoutRecoveryDeadline() {
        server.expect(once(), requestTo(BASE_URL + PATH + "?page=0&size=20"))
                .andRespond(withStatus(HttpStatus.OK)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "items": [{
                                    "accountId": "00000000-0000-0000-0000-000000000001",
                                    "email": "withdrawn@example.com",
                                    "name": "탈퇴 사용자",
                                    "role": "USER",
                                    "status": "WITHDRAWN",
                                    "failedLoginAttempts": 0,
                                    "locked": false,
                                    "lockedUntil": null,
                                    "statusChangedAt": "2026-08-31T07:30:00Z",
                                    "recoveryDeadline": null,
                                    "createdAt": "2026-08-01T07:00:00Z"
                                  }],
                                  "page": {
                                    "number": 0,
                                    "size": 20,
                                    "totalElements": 1,
                                    "totalPages": 1
                                  }
                                }
                                """));

        assertThatThrownBy(() -> client.findAccounts(
                ACCESS_TOKEN, null, null, null, null, 0, 20, null
        )).isInstanceOfSatisfying(BusinessException.class, exception ->
                assertThat(exception.getErrorCode())
                        .isEqualTo(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE));
    }

    @Test
    @DisplayName("Identity 페이지 메타데이터 누락의 잘못된 하류 응답 처리")
    void rejectsMissingPageMetadataAsBadGateway() {
        // Given: page가 누락된 Identity 성공 응답
        server.expect(once(), requestTo(BASE_URL + PATH + "?page=0&size=20"))
                .andRespond(withStatus(HttpStatus.OK)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {"items": []}
                                """));

        // When & Then: 잘못된 하류 응답 오류로 거부
        assertThatThrownBy(() -> client.findAccounts(
                ACCESS_TOKEN, null, null, null, null, 0, 20, null
        )).isInstanceOfSatisfying(BusinessException.class, exception ->
                assertThat(exception.getErrorCode())
                        .isEqualTo(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE));
    }

    @Test
    @DisplayName("계정 상태 변경 204 응답의 정상 종료")
    void changesAccountStatusOnNoContent() {
        // Given: Identity가 204로 응답하는 상태 변경
        server.expect(once(), requestTo(BASE_URL + ACCOUNT_PATH + "/" + TARGET_ID + "/status"))
                .andExpect(method(HttpMethod.PATCH))
                .andExpect(header("Authorization", "Bearer " + ACCESS_TOKEN))
                .andExpect(content().json("""
                        {"status": "DISABLED", "reason": "부정 사용 신고"}
                        """))
                .andRespond(withStatus(HttpStatus.NO_CONTENT));

        // When & Then: 예외 없이 종료
        client.changeStatus(
                ACCESS_TOKEN, UUID.fromString(TARGET_ID), "DISABLED", "부정 사용 신고");
    }

    @Test
    @DisplayName("전역 역할 변경 204 응답의 정상 종료")
    void changesAccountRoleOnNoContent() {
        // Given: Identity가 204로 응답하는 역할 변경
        server.expect(once(), requestTo(BASE_URL + ACCOUNT_PATH + "/" + TARGET_ID + "/role"))
                .andExpect(method(HttpMethod.PATCH))
                .andExpect(header("Authorization", "Bearer " + ACCESS_TOKEN))
                .andExpect(content().json("""
                        {"role": "SYSTEM_ADMIN", "reason": "운영 인수인계"}
                        """))
                .andRespond(withStatus(HttpStatus.NO_CONTENT));

        // When & Then: 예외 없이 종료
        client.changeRole(
                ACCESS_TOKEN, UUID.fromString(TARGET_ID), "SYSTEM_ADMIN", "운영 인수인계");
    }

    @Test
    @DisplayName("로그인 잠금 해제 204 응답의 정상 종료")
    void unlocksLoginOnNoContent() {
        server.expect(once(), requestTo(
                        BASE_URL + ACCOUNT_PATH + "/" + TARGET_ID + "/login-lock/unlock"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer " + ACCESS_TOKEN))
                .andExpect(content().json("""
                        {"reason": "본인 확인 완료"}
                        """))
                .andRespond(withStatus(HttpStatus.NO_CONTENT));

        client.unlockLogin(
                ACCESS_TOKEN, UUID.fromString(TARGET_ID), "본인 확인 완료");
    }

    @Test
    @DisplayName("전역 역할 변경의 마지막 관리자 충돌 보존")
    void preservesLastSystemAdminConflictOnRoleChange() {
        // Given: 마지막 이용 가능 관리자 강등을 Identity가 409로 거부
        server.expect(once(), requestTo(BASE_URL + ACCOUNT_PATH + "/" + TARGET_ID + "/role"))
                .andRespond(withStatus(HttpStatus.CONFLICT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "error": {
                                    "code": "ACCOUNT_LAST_SYSTEM_ADMIN",
                                    "message": "마지막 관리자입니다."
                                  }
                                }
                                """));

        // When & Then: 화면이 해석할 수 있도록 승인 목록 밖의 코드는 삼키지 않는다
        assertThatThrownBy(() -> client.changeRole(
                ACCESS_TOKEN, UUID.fromString(TARGET_ID), "USER", "퇴사 처리"
        )).isInstanceOf(BusinessException.class);
    }

    private static Stream<Arguments> approvedIdentityErrors() {
        return Stream.of(
                Arguments.of(
                        "관리자 접근 거부",
                        HttpStatus.FORBIDDEN,
                        AdminAccountErrorCode.ADMIN_ACCESS_NOT_ALLOWED
                ),
                Arguments.of(
                        "잘못된 조회 조건",
                        HttpStatus.BAD_REQUEST,
                        CommonErrorCode.INVALID_REQUEST
                )
        );
    }

    private void expectError(HttpStatus status, String code) {
        server.expect(once(), requestTo(BASE_URL + PATH + "?page=0&size=20"))
                .andRespond(withStatus(status)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "code": "%s",
                                  "message": "downstream message",
                                  "path": "%s",
                                  "requestId": "request-id"
                                }
                                """.formatted(code, PATH)));
    }
}

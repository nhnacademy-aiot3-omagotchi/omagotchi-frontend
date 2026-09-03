package site.omagotchi.frontend.account.infrastructure;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;
import site.omagotchi.frontend.account.application.result.IdentityAdminAuditPage;
import site.omagotchi.frontend.global.application.result.PageMetadata;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.http.ApiErrorContractResolver;
import site.omagotchi.frontend.global.http.ApiErrorResponseDecoder;
import site.omagotchi.frontend.global.http.RestClientCallExecutor;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

class IdentityRestAdminAuditClientTest {

    private static final String BASE_URL = "http://identity-service:8080";
    private static final String PATH = "/api/v1/admin/audits";
    private static final String ACCESS_TOKEN = "admin-token";

    private IdentityRestAdminAuditClient client;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        server = MockRestServiceServer.bindTo(builder).build();
        client = new IdentityRestAdminAuditClient(
                HttpServiceProxyFactory
                        .builderFor(RestClientAdapter.create(builder.build()))
                        .build()
                        .createClient(IdentityAdminAuditHttpService.class),
                new RestClientCallExecutor(),
                new ApiErrorContractResolver(new ApiErrorResponseDecoder())
        );
    }

    @AfterEach
    void verifyServer() {
        server.verify();
    }

    @Test
    @DisplayName("Identity 감사 응답의 Application 결과 변환")
    void mapsIdentityAuditPageToApplicationResult() {
        // Given: 이름이 채워진 역할 변경 감사 한 줄
        server.expect(once(), requestTo(BASE_URL + PATH + "?page=0&size=50"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer " + ACCESS_TOKEN))
                .andRespond(withStatus(HttpStatus.OK)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "items": [{
                                    "auditType": "ACCOUNT_ROLE",
                                    "action": "ROLE_GRANTED",
                                    "actorUserId": "00000000-0000-0000-0000-000000000001",
                                    "actorName": "시스템 관리자",
                                    "targetUserId": "00000000-0000-0000-0000-000000000002",
                                    "targetName": "문재민",
                                    "beforeValue": "USER",
                                    "afterValue": "SYSTEM_ADMIN",
                                    "reason": "운영 인수인계",
                                    "occurredAt": "2026-09-02T05:03:00Z"
                                  }],
                                  "page": {
                                    "number": 0,
                                    "size": 50,
                                    "totalElements": 1,
                                    "totalPages": 1
                                  }
                                }
                                """));

        // When
        IdentityAdminAuditPage result = client.findAudits(ACCESS_TOKEN, 0, 50);

        // Then
        assertThat(result.items()).singleElement().satisfies(audit -> {
            assertThat(audit.action()).isEqualTo("ROLE_GRANTED");
            assertThat(audit.actorUserId())
                    .isEqualTo(UUID.fromString("00000000-0000-0000-0000-000000000001"));
            assertThat(audit.targetName()).isEqualTo("문재민");
            assertThat(audit.occurredAt()).isEqualTo(Instant.parse("2026-09-02T05:03:00Z"));
        });
        assertThat(result.page()).isEqualTo(new PageMetadata(0, 50, 1, 1));
    }

    @Test
    @DisplayName("이름이 비어도 감사 한 줄을 유지")
    void keepsAuditRowWithoutNames() {
        // Given: 계정 조회에 실패해 이름이 null 로 온 응답
        server.expect(once(), requestTo(BASE_URL + PATH + "?page=0&size=50"))
                .andRespond(withStatus(HttpStatus.OK)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "items": [{
                                    "auditType": "ACCOUNT_STATUS",
                                    "action": "ACCOUNT_DISABLED",
                                    "actorUserId": "00000000-0000-0000-0000-000000000001",
                                    "actorName": null,
                                    "targetUserId": "00000000-0000-0000-0000-000000000002",
                                    "targetName": null,
                                    "beforeValue": "ACTIVE",
                                    "afterValue": "DISABLED",
                                    "reason": "부정 사용 신고",
                                    "occurredAt": "2026-09-02T05:03:00Z"
                                  }],
                                  "page": {
                                    "number": 0, "size": 50,
                                    "totalElements": 1, "totalPages": 1
                                  }
                                }
                                """));

        // When
        IdentityAdminAuditPage result = client.findAudits(ACCESS_TOKEN, 0, 50);

        // Then: 이름은 표시용이고 주체는 UUID 가 보장한다
        assertThat(result.items()).singleElement().satisfies(audit -> {
            assertThat(audit.actorName()).isNull();
            assertThat(audit.targetName()).isNull();
            assertThat(audit.reason()).isEqualTo("부정 사용 신고");
        });
    }

    @Test
    @DisplayName("사유와 이전 값이 없어도 감사 한 줄을 통과시킨다")
    void keepsAuditWithoutReasonAndBeforeValue() {
        // Given: 최초 권한 부여라 이전 값이 없고 사유도 남기지 않은 Identity 응답.
        // 이 셋을 필수로 두었더니 이런 행 하나에 감사 패널 전체가 막혔다.
        server.expect(once(), requestTo(BASE_URL + PATH + "?page=0&size=50"))
                .andRespond(withStatus(HttpStatus.OK)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "items": [{
                                    "auditType": "ACCOUNT_ROLE",
                                    "action": "ROLE_GRANTED",
                                    "actorUserId": "00000000-0000-0000-0000-000000000001",
                                    "targetUserId": "00000000-0000-0000-0000-000000000002",
                                    "beforeValue": null,
                                    "afterValue": "SYSTEM_ADMIN",
                                    "reason": "   ",
                                    "occurredAt": "2026-09-02T05:03:00Z"
                                  }],
                                  "page": {
                                    "number": 0, "size": 50,
                                    "totalElements": 1, "totalPages": 1
                                  }
                                }
                                """));

        // When
        IdentityAdminAuditPage page = client.findAudits(ACCESS_TOKEN, 0, 50);

        // Then: 행은 남고, 빈 값은 null 로 모아 화면이 표기하게 넘긴다
        assertThat(page.items()).hasSize(1);
        assertThat(page.items().getFirst().beforeValue()).isNull();
        assertThat(page.items().getFirst().reason()).isNull();
        assertThat(page.items().getFirst().afterValue()).isEqualTo("SYSTEM_ADMIN");
    }

    @Test
    @DisplayName("행위가 빠진 감사는 계약 위반으로 끊는다")
    void rejectsAuditWithoutAction() {
        // Given: "무엇을" 이 없는 응답. 이건 화면에 그릴 수 없는 행이다.
        server.expect(once(), requestTo(BASE_URL + PATH + "?page=0&size=50"))
                .andRespond(withStatus(HttpStatus.OK)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "items": [{
                                    "auditType": "ACCOUNT_ROLE",
                                    "action": null,
                                    "actorUserId": "00000000-0000-0000-0000-000000000001",
                                    "targetUserId": "00000000-0000-0000-0000-000000000002",
                                    "beforeValue": "USER",
                                    "afterValue": "SYSTEM_ADMIN",
                                    "reason": "운영 인수인계",
                                    "occurredAt": "2026-09-02T05:03:00Z"
                                  }],
                                  "page": {
                                    "number": 0, "size": 50,
                                    "totalElements": 1, "totalPages": 1
                                  }
                                }
                                """));

        // When & Then
        assertThatThrownBy(() -> client.findAudits(ACCESS_TOKEN, 0, 50))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode())
                                .isEqualTo(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE));
    }
}

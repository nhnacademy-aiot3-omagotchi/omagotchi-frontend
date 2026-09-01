package site.omagotchi.frontend.telegram.infrastructure;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;
import site.omagotchi.frontend.telegram.infrastructure.request.TelegramNotificationRequest;
import site.omagotchi.frontend.telegram.infrastructure.response.TelegramLinkTokenResponse;
import site.omagotchi.frontend.telegram.infrastructure.response.TelegramUserLinkResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class TelegramHttpServiceContractTest {

    private static final String BASE_URL = "http://localhost:8084";
    private static final String BEARER = "Bearer test-access-token";

    private MockRestServiceServer server;
    private TelegramHttpService service;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        server = MockRestServiceServer.bindTo(builder).build();
        service = HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(builder.build()))
                .build()
                .createClient(TelegramHttpService.class);
    }

    // 연동은 계정 단위라 기수 경로 변수를 붙이지 않는다. 승인 기수가 없는 사용자도 연동할 수 있어야 한다.
    @Test
    void issuesLinkTokenWithoutCohortScope() {
        server.expect(once(), requestTo(BASE_URL + "/api/v1/telegram/link-token"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andRespond(withSuccess("""
                        {"linkUrl": "https://t.me/some_bot?start=abc", "expiresAt": "2026-08-29T10:00:00Z"}
                        """, MediaType.APPLICATION_JSON));

        TelegramLinkTokenResponse response = service.issueLinkToken(BEARER);

        // 봇 사용자명과 토큰은 Learning이 조립한다. View는 문자열을 그대로 전달만 한다.
        assertThat(response.linkUrl()).isEqualTo("https://t.me/some_bot?start=abc");
        assertThat(response.expiresAt()).isNotNull();
        server.verify();
    }

    @Test
    void mapsLinkReadPath() {
        server.expect(once(), requestTo(BASE_URL + "/api/v1/telegram/link"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andRespond(withSuccess("""
                        {
                          "userId": "3cfc9e61-bf4c-4e70-8932-86e356a43fad",
                          "telegramUserId": 777000123,
                          "telegramChatId": 777000123,
                          "notificationEnabled": true,
                          "linkedAt": "2026-08-29T00:59:30Z",
                          "disconnectedAt": null
                        }
                        """, MediaType.APPLICATION_JSON));

        TelegramUserLinkResponse response = service.getMyLink(BEARER);

        assertThat(response.notificationEnabled()).isTrue();
        assertThat(response.linkedAt()).isNotNull();
        assertThat(response.disconnectedAt()).isNull();
        server.verify();
    }

    // PUT이 아니라 PATCH다. 메서드를 틀리면 하류가 405를 던지는데 컴파일에서는 걸리지 않는다.
    // 본문 키가 enabled인 것도 여기서 고정한다 — record 필드명이 그대로 직렬화된다.
    @Test
    void sendsNotificationUpdateAsPatchWithEnabledField() {
        server.expect(once(), requestTo(BASE_URL + "/api/v1/telegram/link/notification"))
                .andExpect(method(HttpMethod.PATCH))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andExpect(content().json("{\"enabled\": false}"))
                .andRespond(withSuccess("""
                        {
                          "userId": "3cfc9e61-bf4c-4e70-8932-86e356a43fad",
                          "telegramUserId": 777000123,
                          "telegramChatId": 777000123,
                          "notificationEnabled": false,
                          "linkedAt": "2026-08-29T00:59:30Z",
                          "disconnectedAt": null
                        }
                        """, MediaType.APPLICATION_JSON));

        TelegramUserLinkResponse response =
                service.updateNotification(BEARER, new TelegramNotificationRequest(false));

        assertThat(response.notificationEnabled()).isFalse();
        server.verify();
    }

    // 해제는 204가 아니라 해제된 연동 정보를 200으로 돌려준다.
    // 본문 없음으로 기대하면 역직렬화 오류가 하류 계약 오류로 뒤바뀐다.
    @Test
    void mapsDisconnectToDeleteWithBodyResponse() {
        server.expect(once(), requestTo(BASE_URL + "/api/v1/telegram/link"))
                .andExpect(method(HttpMethod.DELETE))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andRespond(withSuccess("""
                        {
                          "userId": "3cfc9e61-bf4c-4e70-8932-86e356a43fad",
                          "telegramUserId": 777000123,
                          "telegramChatId": 777000123,
                          "notificationEnabled": false,
                          "linkedAt": "2026-08-29T00:59:30Z",
                          "disconnectedAt": "2026-08-29T01:20:00Z"
                        }
                        """, MediaType.APPLICATION_JSON));

        TelegramUserLinkResponse response = service.disconnect(BEARER);

        assertThat(response.disconnectedAt()).isNotNull();
        server.verify();
    }
}

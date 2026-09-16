package site.omagotchi.frontend.telegram.presentation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.restdocs.cookies.CookieDocumentation.requestCookies;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static site.omagotchi.frontend.support.RestDocs.document;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockCookie;
import org.springframework.restdocs.cookies.CookieDocumentation;
import org.springframework.restdocs.cookies.RequestCookiesSnippet;
import org.springframework.restdocs.payload.FieldDescriptor;
import org.springframework.restdocs.payload.PayloadDocumentation;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.omagotchi.frontend.support.FrontendRestDocsTestSupport;
import site.omagotchi.frontend.telegram.application.TelegramBffService;
import site.omagotchi.frontend.telegram.infrastructure.response.TelegramLinkTokenResponse;
import site.omagotchi.frontend.telegram.infrastructure.response.TelegramUserLinkResponse;

@WebMvcTest(TelegramBffController.class)
class TelegramBffDocumentationTest extends FrontendRestDocsTestSupport {
    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000840001");

    @MockitoBean
    private TelegramBffService service;

    @Autowired
    private MockMvc mvc;

    private static MockCookie cookie() {
        return new MockCookie("SESSION", "[SESSION_ID]");
    }

    private static RequestCookiesSnippet cookies() {
        return requestCookies(
                CookieDocumentation.cookieWithName("SESSION")
                        .description("브라우저 세션 식별자입니다. 문서에는 `[SESSION_ID]`로 표시합니다."));
    }

    private static TelegramUserLinkResponse link() {
        return new TelegramUserLinkResponse(
                USER_ID, 777000123L, 777000123L, true, Instant.parse("2026-09-14T01:00:00Z"), null);
    }

    private static FieldDescriptor[] linkFields() {
        return new FieldDescriptor[] {
            fieldWithPath("userId").description("연동된 사용자 ID"),
            fieldWithPath("telegramUserId").description("Telegram 사용자 ID"),
            fieldWithPath("telegramChatId").description("Telegram 채팅 ID"),
            fieldWithPath("notificationEnabled").description("알림 수신 여부"),
            fieldWithPath("linkedAt").description("연동 시각"),
            fieldWithPath("disconnectedAt").description("연동 해제 시각")
        };
    }

    @Test
    @DisplayName("Telegram 연동 토큰 발급")
    void issuesLinkToken() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        when(service.issueLinkToken(any()))
                .thenReturn(
                        new TelegramLinkTokenResponse(
                                "https://t.me/omagotchi_bot?token=[LINK_TOKEN]",
                                Instant.parse("2026-09-14T02:00:00Z")));

        // When & Then
        mvc.perform(post("/bff/v1/me/telegram/link-token")
                        .cookie(cookie())
                        .session(authenticatedSession())
                        .with(csrf()))
                .andExpectAll(status().isOk(), jsonPath("$.linkUrl").exists())
                .andDo(document(
                        "telegram-bff/issue-link-token",
                        cookies(),
                        PayloadDocumentation.responseFields(
                                fieldWithPath("linkUrl")
                                        .description("Telegram 연동 딥링크입니다. 토큰은 `[LINK_TOKEN]`으로 표시합니다."),
                                fieldWithPath("expiresAt").description("딥링크 만료 시각"))));
    }

    @Test
    @DisplayName("Telegram 연동 조회")
    void getsMyLink() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        when(service.findMyLink(any())).thenReturn(Optional.of(link()));

        // When & Then
        mvc.perform(get("/bff/v1/me/telegram/link")
                        .cookie(cookie())
                        .session(authenticatedSession()))
                .andExpectAll(status().isOk(), jsonPath("$.notificationEnabled").value(true))
                .andDo(document(
                        "telegram-bff/get-my-link",
                        cookies(),
                        PayloadDocumentation.responseFields(linkFields())));
    }

    @Test
    @DisplayName("Telegram 알림 설정 변경")
    void updatesNotification() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        when(service.updateNotification(any(), eq(false))).thenReturn(link());

        // When & Then
        mvc.perform(patch("/bff/v1/me/telegram/link/notification")
                        .cookie(cookie())
                        .session(authenticatedSession())
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":false}"))
                .andExpectAll(status().isOk(), jsonPath("$.userId").value(USER_ID.toString()))
                .andDo(document(
                        "telegram-bff/update-notification",
                        cookies(),
                        PayloadDocumentation.requestFields(
                                fieldWithPath("enabled")
                                        .description("Telegram 알림 수신 여부(필수)")),
                        PayloadDocumentation.responseFields(linkFields())));
    }

    @Test
    @DisplayName("Telegram 연동 해제")
    void disconnects() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        when(service.disconnect(any()))
                .thenReturn(
                        new TelegramUserLinkResponse(
                                USER_ID,
                                777000123L,
                                777000123L,
                                false,
                                Instant.parse("2026-09-14T01:00:00Z"),
                                Instant.parse("2026-09-14T02:30:00Z")));

        // When & Then
        mvc.perform(delete("/bff/v1/me/telegram/link")
                        .cookie(cookie())
                        .session(authenticatedSession())
                        .with(csrf()))
                .andExpectAll(status().isOk(), jsonPath("$.notificationEnabled").value(false))
                .andDo(document(
                        "telegram-bff/disconnect",
                        cookies(),
                        PayloadDocumentation.responseFields(linkFields())));
    }
}

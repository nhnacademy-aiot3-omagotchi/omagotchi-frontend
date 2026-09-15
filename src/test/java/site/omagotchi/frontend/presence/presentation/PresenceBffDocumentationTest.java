package site.omagotchi.frontend.presence.presentation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessResponse;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.prettyPrint;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.restdocs.snippet.Snippet;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import site.omagotchi.frontend.auth.application.port.BrowserSessionTokenStore;
import site.omagotchi.frontend.presence.application.PresenceBffService;
import site.omagotchi.frontend.support.FrontendRestDocsTestSupport;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@WebMvcTest(PresenceBffController.class)
class PresenceBffDocumentationTest extends FrontendRestDocsTestSupport {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private PresenceBffService presenceBffService;

    @Test
    @DisplayName("세션 없는 요청 거부")
    void rejectsRequestsWithoutBrowserSession() throws Exception {
        // Given: 브라우저 세션 없는 요청
        // When & Then
        mockMvc.perform(get("/bff/v1/presence"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_AUTHENTICATION_REQUIRED"));

        verifyNoInteractions(presenceBffService, accessTokenRefreshService);
    }

    @Test
    @DisplayName("CSRF 없는 변경 요청 거부")
    void rejectsMutationsWithoutCsrf() throws Exception {
        // Given: 인증 세션과 CSRF 없는 변경 요청
        // When & Then
        mockMvc.perform(post("/bff/v1/presence/heartbeat").session(authenticatedSession()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("AUTH_CSRF_INVALID"));

        verifyNoInteractions(presenceBffService, accessTokenRefreshService);
    }

    @Test
    @DisplayName("토큰 번들 없는 세션 거부")
    void rejectsAuthenticatedSessionWithoutTokenBundle() throws Exception {
        // Given: 토큰 번들을 제거한 인증 세션
        MockHttpSession session = authenticatedSession();
        session.removeAttribute(BrowserSessionTokenStore.SESSION_TOKEN_BUNDLE_ATTRIBUTE);

        // When & Then
        mockMvc.perform(get("/bff/v1/presence").session(session))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_AUTHENTICATION_REQUIRED"));

        verifyNoInteractions(presenceBffService, accessTokenRefreshService);
    }

    @Test
    @DisplayName("현재 접속 상태 조회")
    void documentsPresenceSnapshot() throws Exception {
        // Given: 인증 세션과 Presence snapshot 응답
        MockHttpSession session = authenticatedSession();
        JsonNode snapshot = snapshot();
        doReturn(snapshot)
                .when(presenceBffService)
                .getSnapshot(ArgumentMatchers.any(HttpServletRequest.class));

        // When & Then
        mockMvc.perform(authenticated(get("/bff/v1/presence"), session))
                .andExpect(status().isOk())
                .andDo(document(
                        "presence/get-snapshot",
                        preprocessResponse(prettyPrint()),
                        snapshotFields()));

        verify(presenceBffService).getSnapshot(any(HttpServletRequest.class));
        verify(accessTokenRefreshService).refreshIfRequired(eq(session.getId()), any());
    }

    @Test
    @DisplayName("접속 상태 갱신")
    void documentsPresenceHeartbeat() throws Exception {
        // Given: 인증 세션과 heartbeat 응답
        MockHttpSession session = authenticatedSession();
        doReturn(snapshot())
                .when(presenceBffService)
                .heartbeat(ArgumentMatchers.any(HttpServletRequest.class));

        // When & Then
        mockMvc.perform(authenticated(post("/bff/v1/presence/heartbeat").with(csrf()), session))
                .andExpect(status().isOk())
                .andDo(document(
                        "presence/heartbeat",
                        preprocessResponse(prettyPrint()),
                        snapshotFields()));

        verify(presenceBffService).heartbeat(any(HttpServletRequest.class));
    }

    @Test
    @DisplayName("접속 상태 종료")
    void documentsPresenceLeave() throws Exception {
        // Given: 인증 세션
        MockHttpSession session = authenticatedSession();

        // When & Then
        mockMvc.perform(authenticated(post("/bff/v1/presence/leave").with(csrf()), session))
                .andExpect(status().isNoContent())
                .andDo(document("presence/leave"));

        verify(presenceBffService)
                .leave(ArgumentMatchers.any(HttpServletRequest.class));
    }

    private MockHttpServletRequestBuilder authenticated(
            MockHttpServletRequestBuilder request, MockHttpSession session) {
        return request.session(session);
    }

    private JsonNode snapshot() throws Exception {
        return objectMapper.readTree(
                """
                {
                  "cohortId": 1,
                  "users": [{
                    "userId": "00000000-0000-0000-0000-000000000001",
                    "nickname": "오마",
                    "currentCharacter": {
                      "type": "night",
                      "colorId": "pistachio",
                      "assetKey": "night/pistachio"
                    },
                    "status": "ONLINE"
                  }],
                  "occurredAt": "2026-08-20T15:00:00+09:00"
                }
                """);
    }

    private Snippet snapshotFields() {
        return responseFields(
                fieldWithPath("cohortId").description("현재 사용자가 속한 활성 기수 ID"),
                fieldWithPath("users").description("현재 재실 사용자 목록"),
                fieldWithPath("users[].userId").description("재실 사용자 ID"),
                fieldWithPath("users[].nickname").description("재실 사용자 닉네임"),
                fieldWithPath("users[].currentCharacter").description("현재 캐릭터 정보"),
                fieldWithPath("users[].currentCharacter.type").description("캐릭터 타입"),
                fieldWithPath("users[].currentCharacter.colorId").description("캐릭터 색상 ID"),
                fieldWithPath("users[].currentCharacter.assetKey").description("캐릭터 asset key"),
                fieldWithPath("users[].status").description("재실 상태"),
                fieldWithPath("occurredAt").description("스냅샷 생성 시각"));
    }
}

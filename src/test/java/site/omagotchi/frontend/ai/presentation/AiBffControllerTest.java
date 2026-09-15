package site.omagotchi.frontend.ai.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import reactor.core.publisher.Flux;
import site.omagotchi.frontend.ai.application.AiChatBffService;
import site.omagotchi.frontend.ai.application.port.AiChatClient;
import site.omagotchi.frontend.auth.application.port.BrowserSessionTokenStore;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.domain.GlobalRole;
import site.omagotchi.frontend.support.FrontendMvcTestSupport;

@WebMvcTest(AiBffController.class)
@Import(AiChatBffService.class)
@DisplayName("AI 채팅 BFF")
class AiBffControllerTest extends FrontendMvcTestSupport {

    @MockitoBean
    private AiChatClient aiChatClient;

    @Autowired
    private MockMvc mockMvc;

    private MockHttpSession sessionWithToken(String accessToken) {
        MockHttpSession session = new MockHttpSession();
        BrowserSessionTokenBundle bundle =
                new BrowserSessionTokenBundle(
                        UUID.randomUUID(),
                        GlobalRole.USER,
                        accessToken,
                        Instant.now().plusSeconds(3600),
                        "refresh-token",
                        Instant.now().plusSeconds(7200));
        session.setAttribute(BrowserSessionTokenStore.SESSION_TOKEN_BUNDLE_ATTRIBUTE, bundle);
        authenticate(session, bundle);
        return session;
    }

    @Test
    @DisplayName("question과 model을 그대로 Learning 채팅 클라이언트에 전달한다")
    void forwardsQuestionAndModelToLearningClient() throws Exception {
        // Given: Learning이 반환할 채팅 조각
        given(this.aiChatClient.streamChat(anyString(), anyString(), anyString()))
                .willReturn(Flux.just("안녕"));

        // When: 로그인 사용자가 질문과 모델을 지정해 채팅 요청
        MvcResult mvcResult = this.mockMvc.perform(get("/bff/v1/ai/chat")
                        .param("question", "광주 동구 날씨 알려줘")
                        .param("model", "OLLAMA")
                        .session(sessionWithToken("access-token-1")))
                .andExpect(request().asyncStarted())
                .andReturn();

        this.mockMvc.perform(asyncDispatch(mvcResult))
                .andExpect(status().isOk());

        // Then: 사용자 JWT와 요청 값의 손실 없는 전달
        verify(this.aiChatClient).streamChat("Bearer access-token-1", "광주 동구 날씨 알려줘", "OLLAMA");
    }

    @Test
    @DisplayName("model 파라미터를 생략하면 기본값 GEMINI로 호출한다")
    void defaultsModelToGeminiWhenOmitted() throws Exception {
        // Given: Learning이 반환할 채팅 조각
        given(this.aiChatClient.streamChat(anyString(), anyString(), anyString()))
                .willReturn(Flux.just("안녕"));

        // When: 모델을 지정하지 않고 채팅 요청
        MvcResult mvcResult = this.mockMvc.perform(get("/bff/v1/ai/chat")
                        .param("question", "서울 날씨 알려줘")
                        .session(sessionWithToken("access-token-2")))
                .andExpect(request().asyncStarted())
                .andReturn();

        this.mockMvc.perform(asyncDispatch(mvcResult))
                .andExpect(status().isOk());

        // Then: 기본 모델 GEMINI 전달
        verify(this.aiChatClient).streamChat(anyString(), eq("서울 날씨 알려줘"), eq("GEMINI"));
    }

    @Test
    @DisplayName("Bearer 토큰은 접두사와 accessToken을 정확히 조합한다")
    void buildsBearerTokenWithCorrectPrefix() throws Exception {
        // Given: Session에 저장된 Access Token
        given(this.aiChatClient.streamChat(anyString(), anyString(), anyString()))
                .willReturn(Flux.just("안녕"));

        // When: 인증된 Session으로 채팅 요청
        MvcResult mvcResult = this.mockMvc.perform(get("/bff/v1/ai/chat")
                        .param("question", "질문")
                        .session(sessionWithToken("raw-access-token-xyz")))
                .andExpect(request().asyncStarted())
                .andReturn();

        this.mockMvc.perform(asyncDispatch(mvcResult))
                .andExpect(status().isOk());

        // Then: Bearer 접두사를 포함한 Authorization 값 전달
        verify(this.aiChatClient).streamChat(
                eq("Bearer raw-access-token-xyz"),
                anyString(),
                anyString()
        );
    }

    @Test
    @DisplayName("question 파라미터가 없으면 400을 반환하고 Learning을 호출하지 않는다")
    void returns400WhenQuestionMissing() throws Exception {
        // When: 필수 question 없이 채팅 요청
        this.mockMvc.perform(get("/bff/v1/ai/chat")
                        .session(sessionWithToken("access-token-3")))
                .andExpect(status().isBadRequest());

        // Then: Learning 호출 없음
        verify(this.aiChatClient, never()).streamChat(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("세션 토큰 누락 시 401 응답")
    void rejectsWhenSessionTokenMissing() throws Exception {
        // Given: 세션 토큰이 없는 AI 채팅 요청
        // When & Then
        this.mockMvc.perform(get("/bff/v1/ai/chat").param("question", "질문"))
                .andExpect(status().isUnauthorized());
        verify(this.aiChatClient, never()).streamChat(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("응답 인코딩은 UTF-8이라 한글 답변이 깨지지 않는다")
    void respondsWithUtf8EncodingForKoreanContent() throws Exception {
        // Given: 한글을 포함한 Learning 채팅 응답
        // SSE 스트리밍 경로는 produces의 charset 선언만으로는 서블릿 기본 인코딩(ISO-8859-1)을
        // 안 따라간다. response.setCharacterEncoding("UTF-8")을 직접 호출해야 한다.
        // 이 테스트는 그 호출이 빠지면 바로 실패한다 (한글이 '?'로 깨짐).
        given(this.aiChatClient.streamChat(anyString(), anyString(), anyString()))
                .willReturn(Flux.just("광주 동구는 맑고 기온은 27도입니다."));

        // When: 채팅 응답 완료
        MvcResult mvcResult = this.mockMvc.perform(get("/bff/v1/ai/chat")
                        .param("question", "날씨 어때")
                        .session(sessionWithToken("access-token-5")))
                .andExpect(request().asyncStarted())
                .andReturn();

        MvcResult dispatchResult = this.mockMvc.perform(asyncDispatch(mvcResult))
                .andExpect(status().isOk())
                .andReturn();

        // Then: UTF-8 인코딩과 한글 원문 유지
        assertThat(dispatchResult.getResponse().getCharacterEncoding())
                .isEqualToIgnoringCase("UTF-8");
        assertThat(dispatchResult.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .contains("광주 동구는 맑고 기온은 27도입니다.")
                .doesNotContain("?");
    }

    @Test
    @DisplayName("Learning이 여러 청크를 순서대로 흘려보내면 응답에도 그 순서가 그대로 반영된다")
    void streamsChunksInOrder() throws Exception {
        // Given: 순서가 있는 Learning 채팅 조각
        given(this.aiChatClient.streamChat(anyString(), anyString(), anyString()))
                .willReturn(Flux.just("첫", "번째", "청크"));

        // When: SSE 응답 완료
        MvcResult mvcResult = this.mockMvc.perform(get("/bff/v1/ai/chat")
                        .param("question", "질문")
                        .session(sessionWithToken("access-token-4")))
                .andExpect(request().asyncStarted())
                .andReturn();

        MvcResult dispatchResult = this.mockMvc.perform(asyncDispatch(mvcResult))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_EVENT_STREAM))
                .andReturn();

        // Then: 응답 조각의 순서 유지
        String body = dispatchResult.getResponse().getContentAsString(StandardCharsets.UTF_8);
        // 각 청크가 도착한 순서 그대로 본문에 남아 있어야 한다 (뒤섞이면 안 됨)
        assertThat(body.indexOf("첫")).isLessThan(body.indexOf("번째"));
        assertThat(body.indexOf("번째")).isLessThan(body.indexOf("청크"));
    }
}

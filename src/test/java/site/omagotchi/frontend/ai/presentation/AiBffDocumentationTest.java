package site.omagotchi.frontend.ai.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.restdocs.cookies.CookieDocumentation.requestCookies;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.get;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseBody;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.queryParameters;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.restdocs.cookies.CookieDocumentation;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import reactor.core.publisher.Flux;
import site.omagotchi.frontend.ai.application.AiChatBffService;
import site.omagotchi.frontend.ai.application.port.AiChatClient;
import site.omagotchi.frontend.support.FrontendRestDocsTestSupport;

@WebMvcTest(AiBffController.class)
@Import(AiChatBffService.class)
class AiBffDocumentationTest extends FrontendRestDocsTestSupport {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AiChatClient aiChatClient;

    @Test
    @DisplayName("AI 채팅 SSE 스트리밍")
    void streamsAiChatAsSse() throws Exception {
        // Given: 인증 세션과 AI 응답 스트림을 준비한다.
        given(aiChatClient.streamChat(anyString(), anyString(), anyString()))
                .willReturn(Flux.just("첫 번째 답변", "두 번째 답변"));

        // When: AI 채팅 SSE 요청을 실행하고 비동기 시작을 확인한다.
        MvcResult started = mockMvc.perform(get("/bff/v1/ai/chat")
                                .queryParam("question", "학습 계획을 알려줘")
                                .queryParam("model", "GEMINI")
                                .cookie(new Cookie("SESSION", "session-placeholder"))
                                .session(authenticatedSession()))
                        .andExpect(request().asyncStarted())
                        .andDo(document(
                                "ai/chat-request",
                                requestCookies(
                                        CookieDocumentation.cookieWithName("SESSION")
                                                .description("브라우저 세션 식별자입니다. 문서에는 `[SESSION_ID]`로 표시합니다.")),
                                queryParameters(
                                        parameterWithName("question")
                                                .description("AI에게 보낼 질문"),
                                        parameterWithName("model")
                                                .optional()
                                                .description("사용할 AI 모델, 기본값 GEMINI"))))
                        .andReturn();

        // Then: 비동기 SSE 응답과 문서 스니펫을 검증한다.
        MvcResult completed = mockMvc.perform(asyncDispatch(started))
                        .andExpect(status().isOk())
                        .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_EVENT_STREAM))
                        .andDo(document("ai/chat", responseBody()))
                        .andReturn();
        assertThat(completed.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .contains("첫 번째 답변", "두 번째 답변");
    }
}

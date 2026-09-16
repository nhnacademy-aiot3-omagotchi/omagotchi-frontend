package site.omagotchi.frontend.global.security;

import static java.util.regex.Pattern.compile;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessResponse;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.replacePattern;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static site.omagotchi.frontend.support.RestDocs.document;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;
import site.omagotchi.frontend.auth.presentation.page.LoginPageController;
import site.omagotchi.frontend.auth.presentation.page.PasswordResetPageController;
import site.omagotchi.frontend.support.FrontendRestDocsTestSupport;

@WebMvcTest({CsrfBffController.class, LoginPageController.class, PasswordResetPageController.class})
class CsrfBffDocumentationTest extends FrontendRestDocsTestSupport {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("CSRF 토큰 조회")
    void documentsCsrfTokenEndpoint() throws Exception {
        // Given: 인증 세션
        // When & Then
        mockMvc.perform(get("/bff/v1/csrf").session(authenticatedSession()))
                .andExpectAll(
                        status().isOk(), content().contentTypeCompatibleWith("application/json"))
                .andDo(document(
                        "auth-security/csrf-token",
                        preprocessResponse(
                                replacePattern(
                                        compile("(?s)\"token\"\\s*:\\s*\"([^\"]+)"),
                                        "CSRF_TOKEN")),
                        responseFields(
                                fieldWithPath("headerName")
                                        .description("CSRF 토큰을 보낼 요청 헤더 이름"),
                                fieldWithPath("token")
                                        .description("현재 브라우저 세션에 발급된 CSRF 토큰"))));
    }
}

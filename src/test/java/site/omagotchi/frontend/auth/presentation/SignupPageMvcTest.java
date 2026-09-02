package site.omagotchi.frontend.auth.presentation;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.omagotchi.frontend.auth.presentation.page.SignupPageController;
import site.omagotchi.frontend.auth.presentation.security.AccessTokenRefreshInterceptor;
import site.omagotchi.frontend.global.security.BrowserSessionInvalidator;
import site.omagotchi.frontend.global.web.PageBusinessExceptionHandler;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

// Signup Page 렌더링과 Legacy v1 Form 제출 차단 정책
@WebMvcTest(SignupPageController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({
        BrowserSessionInvalidator.class,
        PageBusinessExceptionHandler.class
})
class SignupPageMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AccessTokenRefreshInterceptor accessTokenRefreshInterceptor;

    @Test
    @DisplayName("회원가입 Page의 빈 Form 제공")
    void rendersSignupForm() throws Exception {
        mockMvc.perform(get("/register"))
                .andExpectAll(
                        status().isOk(),
                        view().name("pages/auth/register"),
                        model().attributeExists("signupForm")
                );
    }

    @Test
    @DisplayName("인증 사용자의 회원가입 Page 접근 차단")
    void redirectsAuthenticatedUserFromSignupPage() throws Exception {
        mockMvc.perform(get("/register")
                        .principal(() -> "user-id"))
                .andExpectAll(
                        status().isFound(),
                        redirectedUrl("/authenticated-landing")
                );
    }

    @Test
    @DisplayName("Legacy v1 회원가입 Form 제출 차단")
    void rejectsLegacySignupFormPost() throws Exception {
        mockMvc.perform(post("/register")
                        .param("email", "user@example.com")
                        .param("name", "오마고치")
                        .param("password", "password-passphrase"))
                .andExpect(status().isMethodNotAllowed());
    }
}

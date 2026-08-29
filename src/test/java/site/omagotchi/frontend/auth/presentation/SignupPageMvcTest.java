package site.omagotchi.frontend.auth.presentation;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;
import site.omagotchi.frontend.auth.presentation.page.SignupPageController;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

// Signup Page rendering과 OTP BFF 진입 계약 검증
@WebMvcTest(SignupPageController.class)
@AutoConfigureMockMvc(addFilters = false)
class SignupPageMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("회원가입 Page가 동일 화면의 이메일 OTP 단계와 BFF 경로를 제공")
    void rendersSignupEmailVerificationFlow() throws Exception {
        mockMvc.perform(get("/register"))
                .andExpectAll(
                        status().isOk(),
                        view().name("pages/auth/register"),
                        model().attributeExists("signupForm"),
                        content().string(containsString("data-signup-details-step")),
                        content().string(containsString("data-signup-otp-step")),
                        content().string(containsString(
                                "data-email-otp-path=\"/bff/v2/auth/signup/email-otp\""
                        )),
                        content().string(containsString(
                                "data-signup-path=\"/bff/v2/auth/signup\""
                        )),
                        content().string(containsString("메일이 오지 않았나요?")),
                        content().string(containsString("인증번호 재전송")),
                        content().string(not(containsString("name=\"challengeId\"")))
                );
    }

    @Test
    @DisplayName("인증 사용자의 회원가입 Page 접근 차단")
    void redirectsAuthenticatedUserFromSignupPage() throws Exception {
        mockMvc.perform(get("/register")
                        .principal(() -> "user-id"))
                .andExpectAll(
                        status().isFound(),
                        redirectedUrl("/home")
                );
    }

    @Test
    @DisplayName("이메일 인증을 우회하는 기존 POST 회원가입 경로 차단")
    void rejectsLegacySignupPost() throws Exception {
        mockMvc.perform(post("/register")
                        .param("email", "user@example.com")
                        .param("name", "오마고치")
                        .param("password", "password-passphrase"))
                .andExpect(status().isMethodNotAllowed());
    }
}

package site.omagotchi.frontend.auth.presentation;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import site.omagotchi.frontend.auth.application.AuthErrorCode;
import site.omagotchi.frontend.auth.application.AuthenticationService;
import site.omagotchi.frontend.auth.application.result.SignupResult;
import site.omagotchi.frontend.auth.presentation.page.SignupForm;
import site.omagotchi.frontend.auth.presentation.page.SignupPageController;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.web.PageBusinessExceptionHandler;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.flash;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

// Signup Form 복구 정책과 Security Filter 정책의 Test 분리
@WebMvcTest(SignupPageController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({
        PageBusinessExceptionHandler.class
})
class SignupPageMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthenticationService authenticationService;

    @Test
    @DisplayName("회원가입 Page의 빈 Form 제공")
    void rendersSignupForm() throws Exception {
        // When: 회원가입 Page 요청
        mockMvc.perform(get("/register"))
                // Then: 빈 Signup Form과 회원가입 View
                .andExpectAll(
                        status().isOk(),
                        view().name("pages/auth/register"),
                        model().attributeExists("signupForm")
                );
    }

    @Test
    @DisplayName("인증 사용자의 회원가입 Page 접근 차단")
    void redirectsAuthenticatedUserFromSignupPage() throws Exception {
        // When: 인증 Principal의 회원가입 Page 요청
        mockMvc.perform(get("/register")
                        .principal(() -> "user-id"))
                // Then: Home Redirect
                .andExpectAll(
                        status().isFound(),
                        redirectedUrl("/home")
                );
    }

    @Test
    @DisplayName("회원가입 필수 필드와 이메일 형식 오류의 400 Form 재표시")
    void rendersSignupValidationFailure() throws Exception {
        // When: 필수 필드와 이메일 형식이 잘못된 Signup Form 제출
        mockMvc.perform(post("/register")
                        .param("email", "invalid-email")
                        .param("name", "")
                        .param("password", " ".repeat(15)))
                .andExpectAll(
                        status().isBadRequest(),
                        view().name("pages/auth/register"),
                        model().attributeHasFieldErrors(
                                "signupForm",
                                "email",
                                "name",
                                "password"
                        ),
                        model().attribute("authFeedback", "입력 내용을 확인해주세요."),
                        content().string(containsString("이메일 형식이 올바르지 않습니다.")),
                        content().string(containsString("이름은 필수입니다.")),
                        content().string(containsString("비밀번호는 필수입니다."))
                );

        // Then: Signup Use Case 미호출
        verifyNoInteractions(authenticationService);
    }

    @Test
    @DisplayName("인증 사용자의 회원가입 제출 차단")
    void redirectsAuthenticatedSignupBeforeFormValidation() throws Exception {
        // When: 인증 Principal의 잘못된 Signup Form 제출
        mockMvc.perform(post("/register")
                        .principal(() -> "user-id")
                        .param("email", "invalid-email")
                        .param("name", "")
                        .param("password", ""))
                .andExpectAll(
                        status().isFound(),
                        redirectedUrl("/home")
                );

        // Then: Signup Use Case 미호출
        verifyNoInteractions(authenticationService);
    }

    @Test
    @DisplayName("Identity 입력 정책 거절의 Signup Form 재표시")
    void rendersIdentityValidationFailureOnSignupForm() throws Exception {
        // Given: Signup Use Case의 입력 정책 거절
        given(authenticationService.signUp("user@example.com", "short", "오마고치"))
                .willReturn(new SignupResult.Rejected(AuthErrorCode.INVALID_PASSWORD));

        // When: Frontend 기본 형식 검증 통과 Form 제출
        mockMvc.perform(post("/register")
                        .param("email", "user@example.com")
                        .param("name", "오마고치")
                        .param("password", "short"))
                .andExpectAll(
                        status().isBadRequest(),
                        view().name("pages/auth/register"),
                        model().attribute(
                                "authFeedback",
                                AuthErrorCode.INVALID_PASSWORD.message()
                        ),
                        content().string(not(containsString("short")))
                );

        // Then: Signup Use Case 호출
        verify(authenticationService).signUp("user@example.com", "short", "오마고치");
    }

    @Test
    @DisplayName("회원가입 성공의 Login Page Redirect")
    void redirectsToLoginAfterSignup() throws Exception {
        // Given: Signup Use Case의 계정 생성 성공
        given(authenticationService.signUp(
                "user@example.com",
                "password-passphrase",
                "오마고치"
        )).willReturn(new SignupResult.Created());

        // When: Signup Form 제출
        mockMvc.perform(post("/register")
                        .param("email", " user@example.com ")
                        .param("name", " 오마고치 ")
                        .param("password", "password-passphrase"))
                .andExpectAll(
                        status().isFound(),
                        redirectedUrl("/login"),
                        flash().attribute(
                                "authFeedback",
                                "계정이 생성됐습니다. 로그인해주세요."
                        )
                );

        // Then: 정규화된 가입 입력과 자동 Login 미수행
        verify(authenticationService).signUp(
                "user@example.com",
                "password-passphrase",
                "오마고치"
        );
        verify(authenticationService, never()).login(anyString(), anyString());
    }

    @Test
    @DisplayName("중복 이메일의 기존 Signup Form 표시")
    void rendersDuplicateEmailOnSignupForm() throws Exception {
        // Given: Signup Use Case의 이메일 중복 거절
        given(authenticationService.signUp(
                "user@example.com",
                "password-passphrase",
                "오마고치"
        )).willReturn(new SignupResult.Rejected(AuthErrorCode.DUPLICATE_EMAIL));

        // When: Signup Form 제출
        MvcResult result = mockMvc.perform(post("/register")
                        .param("email", "user@example.com")
                        .param("name", "오마고치")
                        .param("password", "password-passphrase"))
                .andExpectAll(
                        status().isConflict(),
                        view().name("pages/auth/register"),
                        model().attribute("authFeedback", AuthErrorCode.DUPLICATE_EMAIL.message()),
                        content().string(not(containsString("password-passphrase")))
                )
                .andReturn();

        // Then: 이메일·이름 입력 보존
        SignupForm form = (SignupForm) result.getModelAndView()
                .getModel()
                .get("signupForm");
        assertThat(form.getEmail()).isEqualTo("user@example.com");
        assertThat(form.getName()).isEqualTo("오마고치");
        assertThat(form.getPassword()).isNull();
    }

    @Test
    @DisplayName("Signup 연동 장애의 공통 HTML 오류와 원래 상태 유지")
    void rendersHtmlErrorForSignupServiceFailure() throws Exception {
        // Given: Signup Use Case의 Identity 접속 장애
        willThrow(new BusinessException(CommonErrorCode.SERVICE_UNAVAILABLE))
                .given(authenticationService)
                .signUp("user@example.com", "password-passphrase", "오마고치");

        // When: Signup Form 제출
        mockMvc.perform(post("/register")
                        .param("email", "user@example.com")
                        .param("name", "오마고치")
                        .param("password", "password-passphrase"))
                // Then: 5xx HTML 503 View
                .andExpectAll(
                        status().isServiceUnavailable(),
                        view().name("error/5xx"),
                        model().attribute("status", 503),
                        content().contentTypeCompatibleWith("text/html")
                );
    }
}

package site.omagotchi.frontend.auth.infrastructure;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.auth.application.AuthErrorCode;
import site.omagotchi.frontend.auth.application.port.IdentityAuthClient;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.infrastructure.request.IdentityLoginRequest;
import site.omagotchi.frontend.auth.infrastructure.request.IdentityRefreshTokenRequest;
import site.omagotchi.frontend.auth.infrastructure.request.IdentitySignupRequest;
import site.omagotchi.frontend.auth.infrastructure.response.TokenResponse;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.http.RestClientCallExecutor;

// Identity 인증 HTTP 응답을 Frontend 인증 Port의 성공값·실패로 변환하는 Outbound Adapter
// 성공 응답 계약 검증과 호출별 공개 4xx 제한
@Component
@RequiredArgsConstructor
public class IdentityRestAuthClient implements IdentityAuthClient {

    private final IdentityAuthHttpService httpService;
    private final RestClientCallExecutor callExecutor;
    private final IdentityAuthFailureTranslator failureTranslator;

    @Override
    public void signUp(String email, String password, String name) {
        // 회원가입 4xx: 요청 형식·가입 입력·중복 Email만 공개
        callExecutor.execute(
                () -> httpService.signUp(new IdentitySignupRequest(email, password, name)),
                exception -> failureTranslator.translate(
                        exception,
                        CommonErrorCode.INVALID_REQUEST,
                        AuthErrorCode.INVALID_SIGNUP_INPUT,
                        AuthErrorCode.DUPLICATE_EMAIL
                )
        );
    }

    @Override
    public BrowserSessionTokenBundle login(String email, String password) {
        // 로그인 4xx: 사용자 Credential 실패만 공개
        ResponseEntity<TokenResponse> response = callExecutor.execute(
                () -> httpService.login(new IdentityLoginRequest(email, password)),
                exception -> failureTranslator.translate(
                        exception,
                        AuthErrorCode.INVALID_CREDENTIALS
                )
        );

        // 성공 응답 Body 누락: Identity 계약 위반의 502 변환
        if (response.getBody() == null) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    "Identity Login 성공 응답 Body 누락"
            );
        }

        // 성공 응답 필드 검증과 Browser Session 저장 값 변환
        return response.getBody().toTokenBundle();
    }

    @Override
    public void logout(String refreshToken) {
        // 현재 Browser Session의 Refresh Token Family 폐기
        // Logout 4xx: 공개 오류 없음과 미등록 응답의 502 변환
        callExecutor.execute(
                () -> httpService.logout(new IdentityRefreshTokenRequest(refreshToken)),
                failureTranslator::translate
        );
    }
}

package site.omagotchi.frontend.auth.infrastructure;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.auth.application.AuthErrorCode;
import site.omagotchi.frontend.auth.application.port.IdentityAuthClient;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.application.result.SignupResult;
import site.omagotchi.frontend.auth.infrastructure.request.IdentityLoginRequest;
import site.omagotchi.frontend.auth.infrastructure.request.IdentityRefreshTokenRequest;
import site.omagotchi.frontend.auth.infrastructure.request.IdentitySignupRequest;
import site.omagotchi.frontend.auth.infrastructure.response.TokenResponse;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.global.http.RestClientCallExecutor;

// Identity 인증 HTTP 응답을 Frontend Application 결과·실패로 변환하는 Outbound Adapter
// 성공 응답 계약 검증과 호출별 공개 4xx 제한
@Component
@RequiredArgsConstructor
public class IdentityRestAuthClient implements IdentityAuthClient {

    private final IdentityAuthHttpService httpService;
    private final RestClientCallExecutor callExecutor;
    private final IdentityAuthErrorResolver errorResolver;

    @Override
    public SignupResult signUp(String email, String password, String name) {
        // 회원가입 4xx: Form 복구에 필요한 Application 결과 변환
        return callExecutor.execute(
                () -> {
                    ResponseEntity<Void> response = httpService.signUp(
                            new IdentitySignupRequest(email, password, name)
                    );
                    requireStatus(response, HttpStatus.CREATED, "Signup");
                    return SignupResult.CREATED;
                },
                exception -> {
                    ErrorCode errorCode = errorResolver.resolve(
                            exception,
                            CommonErrorCode.INVALID_REQUEST,
                            AuthErrorCode.INVALID_SIGNUP_INPUT,
                            AuthErrorCode.DUPLICATE_EMAIL
                    );
                    if (errorCode == AuthErrorCode.DUPLICATE_EMAIL) {
                        return SignupResult.DUPLICATE_EMAIL;
                    }
                    return SignupResult.INVALID_INPUT;
                }
        );
    }

    @Override
    public BrowserSessionTokenBundle login(String email, String password) {
        // 로그인 4xx: 사용자 Credential 실패만 공개
        ResponseEntity<TokenResponse> response = callExecutor.execute(
                () -> httpService.login(new IdentityLoginRequest(email, password)),
                exception -> {
                    ErrorCode errorCode = errorResolver.resolve(
                            exception,
                            AuthErrorCode.INVALID_CREDENTIALS
                    );
                    throw new BusinessException(errorCode, exception);
                }
        );
        requireStatus(response, HttpStatus.OK, "Login");

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
        ResponseEntity<Void> response = callExecutor.execute(
                () -> httpService.logout(new IdentityRefreshTokenRequest(refreshToken)),
                exception -> {
                    ErrorCode errorCode = errorResolver.resolve(exception);
                    throw new BusinessException(errorCode, exception);
                }
        );
        requireStatus(response, HttpStatus.NO_CONTENT, "Logout");
    }

    private static void requireStatus(
            ResponseEntity<?> response,
            HttpStatus expectedStatus,
            String operation
    ) {
        if (response.getStatusCode().value() != expectedStatus.value()) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    "Identity " + operation + " 성공 응답 Status 불일치 expected="
                            + expectedStatus.value()
                            + ", actual=" + response.getStatusCode().value()
            );
        }
    }
}

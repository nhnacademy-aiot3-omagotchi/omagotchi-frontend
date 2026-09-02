package site.omagotchi.frontend.auth.infrastructure;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.account.application.AccountErrorCode;
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

// Identity 인증 API 응답을 Frontend 인증 결과와 오류로 변환
// 정상 응답 검증과 호출별 허용 오류 제한
@Component
@RequiredArgsConstructor
public class IdentityRestAuthClient implements IdentityAuthClient {

    private final IdentityAuthHttpService httpService;
    private final RestClientCallExecutor callExecutor;
    private final IdentityAuthErrorResolver errorResolver;

    /**
     * @deprecated Identity v1의 OTP 없는 가입 Adapter다. v2 종단 검증 완료 후 제거한다.
     */
    @Deprecated(forRemoval = true)
    @Override
    public SignupResult signUp(String email, String password, String name) {
        // 회원가입 화면 복구에 필요한 4xx 결과 변환
        return callExecutor.execute(
                () -> {
                    ResponseEntity<Void> response = httpService.signUp(
                            new IdentitySignupRequest(email, password, name)
                    );
                    requireStatus(response, HttpStatus.CREATED, "Signup");
                    return new SignupResult.Created();
                },
                exception -> {
                    ErrorCode errorCode = errorResolver.resolve(
                            exception,
                            CommonErrorCode.INVALID_REQUEST,
                            AccountErrorCode.INVALID_EMAIL,
                            AccountErrorCode.INVALID_PASSWORD,
                            AccountErrorCode.INVALID_NAME,
                            AccountErrorCode.DUPLICATE_EMAIL
                    );
                    return new SignupResult.Rejected(errorCode);
                }
        );
    }

    @Override
    public BrowserSessionTokenBundle login(String email, String password) {
        // 로그인 4xx 중 사용자 인증 실패만 공개
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

        // 본문 없는 로그인 성공 응답의 502 변환
        if (response.getBody() == null) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    "Identity Login 성공 응답 Body 누락"
            );
        }

        // 로그인 응답 검증과 브라우저 세션 토큰 묶음 생성
        return response.getBody().toTokenBundle();
    }

    @Override
    public BrowserSessionTokenBundle refresh(String refreshToken) {
        // 명시적인 Refresh Token 거절만 인증 오류로 공개
        ResponseEntity<TokenResponse> response = callExecutor.execute(
                () -> httpService.refresh(
                        new IdentityRefreshTokenRequest(refreshToken)
                ),
                exception -> {
                    ErrorCode errorCode = errorResolver.resolve(
                            exception,
                            AuthErrorCode.INVALID_REFRESH_TOKEN
                    );
                    throw new BusinessException(errorCode, exception);
                }
        );

        // Refresh 응답 검증과 브라우저 세션 토큰 묶음 생성
        requireStatus(response, HttpStatus.OK, "Refresh");
        if (response.getBody() == null) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    "Identity Refresh 성공 응답 Body 누락"
            );
        }
        return response.getBody().toTokenBundle();
    }

    @Override
    public void logout(String refreshToken) {
        // 현재 브라우저 세션의 Refresh Token 계열 폐기
        // 허용하지 않은 Logout 4xx의 502 변환
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

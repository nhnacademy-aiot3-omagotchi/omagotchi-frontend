package site.omagotchi.frontend.auth.application.result;

import site.omagotchi.frontend.global.exception.ErrorCode;

import java.util.Objects;

// 회원가입 성공과 Form 복구용 거절을 구분하는 Application 결과
public sealed interface SignupResult {

    record Created() implements SignupResult {
    }

    record Rejected(ErrorCode errorCode) implements SignupResult {

        public Rejected {
            Objects.requireNonNull(errorCode, "errorCode");
        }
    }
}

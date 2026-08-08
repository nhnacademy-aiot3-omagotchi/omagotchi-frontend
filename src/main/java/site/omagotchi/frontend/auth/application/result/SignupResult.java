package site.omagotchi.frontend.auth.application.result;

// 회원가입 호출자가 후속 흐름을 선택할 수 있는 Application 결과
public enum SignupResult {
    CREATED,
    INVALID_INPUT,
    DUPLICATE_EMAIL
}

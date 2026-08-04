package site.omagotchi.frontend.global.exception;

public interface ErrorCode {

    ErrorType type();

    String code();

    String message();
}

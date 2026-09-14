package site.omagotchi.frontend.global.exception;

import java.io.Serializable;

public interface ErrorCode extends Serializable {

    ErrorType type();

    String code();

    String message();
}

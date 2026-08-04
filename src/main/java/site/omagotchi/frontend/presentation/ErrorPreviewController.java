package site.omagotchi.frontend.presentation;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import java.io.IOException;

/** Local Profile의 실제 ERROR dispatch 화면 확인. */
@Controller
@Profile("local")
public class ErrorPreviewController {

    @GetMapping("/preview/error/403")
    public void preview403(HttpServletResponse response) throws IOException {
        response.sendError(HttpServletResponse.SC_FORBIDDEN);
    }

    @GetMapping("/preview/error/500")
    public void preview500(HttpServletResponse response) throws IOException {
        response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
    }
}

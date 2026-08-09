package site.omagotchi.frontend.presentation;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import java.io.IOException;

// Local Profile ERROR dispatch 화면 점검 endpoint
// 운영 Bean 미등록과 공개 장애 유도 API 비대상
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

    @GetMapping("/preview/error/503")
    public void preview503(HttpServletResponse response) throws IOException {
        response.sendError(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
    }
}

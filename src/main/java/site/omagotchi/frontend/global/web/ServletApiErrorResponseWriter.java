package site.omagotchi.frontend.global.web;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.global.exception.ApiErrorResponse;
import site.omagotchi.frontend.global.exception.ErrorCode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

// Filter·Security Handler·MVC Resolver의 HttpServletResponse JSON 직접 작성
// ResponseEntity를 반환할 수 없는 Servlet 경계 전용
@Component
@RequiredArgsConstructor
public class ServletApiErrorResponseWriter {

    private final ObjectMapper objectMapper;

    public void write(
            HttpServletResponse response,
            HttpStatusCode status,
            ErrorCode errorCode,
            String path
    ) throws IOException {
        write(response, status, errorCode, path, new HttpHeaders());
    }

    public void write(
            HttpServletResponse response,
            HttpStatusCode status,
            ErrorCode errorCode,
            String path,
            HttpHeaders headers
    ) throws IOException {
        headers.forEach((name, values) ->
                values.forEach(value -> response.addHeader(name, value))
        );
        response.setStatus(status.value());
        response.setHeader(
                HttpHeaders.CACHE_CONTROL,
                CacheControl.noStore().getHeaderValue()
        );
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        objectMapper.writeValue(
                response.getOutputStream(),
                ApiErrorResponse.of(errorCode, path)
        );
    }
}

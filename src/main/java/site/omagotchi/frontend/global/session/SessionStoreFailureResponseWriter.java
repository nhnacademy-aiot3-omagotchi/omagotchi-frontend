package site.omagotchi.frontend.global.session;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.web.header.HeaderWriter;
import org.springframework.security.web.header.writers.CompositeHeaderWriter;
import org.springframework.security.web.header.writers.HstsHeaderWriter;
import org.springframework.security.web.header.writers.XContentTypeOptionsHeaderWriter;
import org.springframework.security.web.header.writers.XXssProtectionHeaderWriter;
import org.springframework.security.web.header.writers.frameoptions.XFrameOptionsHeaderWriter;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.View;
import org.springframework.web.servlet.ViewResolver;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.exception.ErrorHttpMapper;
import site.omagotchi.frontend.global.web.BffApiPaths;
import site.omagotchi.frontend.global.web.ServletApiErrorResponseWriter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

// Redis Session 장애의 미완성 응답 폐기와 경로별 503 작성
// Spring Boot /error 재Dispatch 없는 BFF JSON·Page HTML 직접 응답
@Slf4j
@Component
public class SessionStoreFailureResponseWriter {

    // response.reset()으로 제거된 Spring Security 기본 보안 Header의 재적용
    // 조회 실패의 Security Filter 미진입과 저장 실패의 Security Filter 종료 대응
    private static final HeaderWriter SECURITY_HEADER_WRITER =
            new CompositeHeaderWriter(List.of(
                    new XContentTypeOptionsHeaderWriter(),
                    new XXssProtectionHeaderWriter(),
                    new HstsHeaderWriter(),
                    new XFrameOptionsHeaderWriter()
            ));

    // Thymeleaf View까지 실패한 경우의 Redis·MVC 비의존 최소 HTML
    private static final String FALLBACK_HTML_PATH =
            "fallback/session-store-unavailable.html";

    private final ViewResolver viewResolver;
    private final ServletApiErrorResponseWriter apiErrorResponseWriter;
    private final String fallbackHtml;

    // 복수 ViewResolver 중 실제 오류 Template을 처리할 Thymeleaf Resolver 고정
    // Runtime 장애 경로의 추가 Resource 조회 방지를 위한 fallback HTML 선적재
    public SessionStoreFailureResponseWriter(
            @Qualifier("thymeleafViewResolver") ViewResolver viewResolver,
            ServletApiErrorResponseWriter apiErrorResponseWriter
    ) {
        this.viewResolver = viewResolver;
        this.apiErrorResponseWriter = apiErrorResponseWriter;
        this.fallbackHtml = loadFallbackHtml();
    }

    public void write(
            HttpServletRequest request,
            HttpServletResponse response
    ) throws IOException {
        CommonErrorCode errorCode = CommonErrorCode.SERVICE_UNAVAILABLE;
        HttpStatus status = ErrorHttpMapper.toHttpStatus(errorCode.type());

        // Browser BFF 계약을 위한 View 해석 없는 공통 JSON 응답
        if (BffApiPaths.matches(request)) {
            prepareResponse(request, response, status, MediaType.APPLICATION_JSON);
            apiErrorResponseWriter.write(
                    response,
                    status,
                    errorCode,
                    request.getRequestURI()
            );
            return;
        }

        // 일반 Page 요청의 공통 5xx Template 직접 렌더링
        prepareResponse(request, response, status, MediaType.TEXT_HTML);

        try {
            View view = viewResolver.resolveViewName("error/5xx", request.getLocale());
            if (view == null) {
                log.error("Redis Session Store HTML 오류 View 미확인");
                // /error 재Dispatch 없이 미리 읽은 최소 HTML 작성
                response.getWriter().write(fallbackHtml);
                return;
            }

            view.render(Map.of("status", status.value()), request, response);
        } catch (Exception renderFailure) {
            log.error("Redis Session Store HTML 오류 화면 작성 실패", renderFailure);
            // 이미 전송된 응답의 초기화·fallback 재작성 불가
            if (response.isCommitted()) {
                return;
            }
            // 실패한 View가 남긴 부분 응답 제거와 최소 HTML 재작성
            prepareResponse(request, response, status, MediaType.TEXT_HTML);
            response.getWriter().write(fallbackHtml);
        }
    }

    private void prepareResponse(
            HttpServletRequest request,
            HttpServletResponse response,
            HttpStatus status,
            MediaType mediaType
    ) {
        // Redis Session 저장 실패 전까지 작성된 본문·Cookie·Redirect Header 제거
        response.reset();
        response.setStatus(status.value());
        // 장애 응답의 Browser·중간 Cache 저장 금지
        response.setHeader(
                HttpHeaders.CACHE_CONTROL,
                CacheControl.noStore().getHeaderValue()
        );
        response.setContentType(mediaType.toString());
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        // 응답 초기화 뒤 Spring Security 기본 보안 Header 복구
        SECURITY_HEADER_WRITER.writeHeaders(request, response);
    }

    // 기동 시 fallback Resource 누락의 Fail-fast와 Runtime 추가 I/O 제거
    private static String loadFallbackHtml() {
        try {
            return new ClassPathResource(FALLBACK_HTML_PATH)
                    .getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new IllegalStateException(
                    "Redis Session Store 장애용 HTML을 읽을 수 없습니다.",
                    exception
            );
        }
    }
}

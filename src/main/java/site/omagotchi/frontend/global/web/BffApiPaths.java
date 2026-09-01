package site.omagotchi.frontend.global.web;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.server.RequestPath;
import org.springframework.web.util.ServletRequestPathUtils;
import org.springframework.web.util.pattern.PathPattern;
import org.springframework.web.util.pattern.PathPatternParser;

// Browser와 Frontend 사이의 BFF Controller 경로와 전 버전 공통 Matcher 계약
public final class BffApiPaths {

    // 기존 v1 Controller가 실제 RequestMapping 조립에 사용하는 경로
    public static final String PREFIX = "/bff/v1";

    // dev의 v1 Access Token Refresh 적용 범위
    public static final String V1_PATTERN = PREFIX + "/**";

    // 보안 오류·예외·Session 응답에서 v1과 v2를 모두 식별하는 경로
    public static final String PATTERN = "/bff/**";

    private static final PathPattern PATH_PATTERN =
            PathPatternParser.defaultInstance.parse(PATTERN);

    private BffApiPaths() {
    }

    public static boolean matches(HttpServletRequest request) {
        // DispatcherServlet 실행 전 Filter 요청의 RequestPath 직접 Parsing
        RequestPath requestPath = ServletRequestPathUtils.hasParsedRequestPath(request)
                ? ServletRequestPathUtils.getParsedRequestPath(request)
                : ServletRequestPathUtils.parse(request);
        return PATH_PATTERN.matches(requestPath.pathWithinApplication());
    }
}

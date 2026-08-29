package site.omagotchi.frontend.global.web;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.server.RequestPath;
import org.springframework.web.util.ServletRequestPathUtils;
import org.springframework.web.util.pattern.PathPattern;
import org.springframework.web.util.pattern.PathPatternParser;

// Browser와 Frontend 사이의 모든 버전 BFF API 경로 계약
public final class BffApiPaths {

    public static final String PREFIX = "/bff";
    public static final String PATTERN = PREFIX + "/**";

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

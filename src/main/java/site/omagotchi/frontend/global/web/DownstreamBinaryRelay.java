package site.omagotchi.frontend.global.web;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

import java.util.List;

/**
 * 하류(Learning Service)가 준 파일 응답을 Browser 로 내보낸다.
 *
 * <p>하류 응답을 그대로 반환하면 하류가 붙인 헤더가 전부 따라 나간다. 그중
 * {@code Transfer-Encoding} 은 "이 연결에서 본문을 어떻게 쪼개 보내는가"라 구간마다 달라야 하는데,
 * 우리 Servlet Container 도 본문을 쓰면서 같은 헤더를 붙이므로 두 줄이 되고 앞단 nginx 가
 * 이를 깨진 응답으로 보고 502 로 끊는다.</p>
 *
 * <p>그래서 하류 헤더를 베끼지 않고, 파일을 설명하는 아래 네 가지만 새 응답에 옮겨 적는다.
 * 본문 길이와 연결 방식은 우리 Container 가 다시 정한다.</p>
 */
public final class DownstreamBinaryRelay {

    private DownstreamBinaryRelay() {
    }

    public static ResponseEntity<Resource> relay(ResponseEntity<Resource> downstream) {
        HttpHeaders headers = new HttpHeaders();

        copy(downstream, headers, HttpHeaders.CONTENT_TYPE);          // 무슨 파일인지
        copy(downstream, headers, HttpHeaders.CONTENT_DISPOSITION);   // 내려받을 때 쓸 파일 이름
        copy(downstream, headers, HttpHeaders.CACHE_CONTROL);         // 얼마나 캐시할지
        copy(downstream, headers, "X-Content-Type-Options");          // 브라우저의 타입 추측 금지

        return new ResponseEntity<>(downstream.getBody(), headers, downstream.getStatusCode());
    }

    /**
     * 같은 이름의 헤더가 여러 줄로 올 수 있다. 첫 줄만 옮기면 나머지가 조용히 사라진다.
     *
     * <p>예를 들어 {@code Cache-Control: max-age=300} 과 {@code Cache-Control: private} 가
     * 따로 오면 {@code private} 가 빠지고, 공용 Cache 가 남의 첨부파일을 저장할 수 있게 된다.</p>
     */
    private static void copy(ResponseEntity<Resource> downstream, HttpHeaders headers, String name) {
        List<String> values = downstream.getHeaders().get(name);
        if (values == null) {
            return;
        }
        values.forEach(value -> headers.add(name, value));
    }
}

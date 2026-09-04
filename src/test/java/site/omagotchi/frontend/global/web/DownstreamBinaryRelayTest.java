package site.omagotchi.frontend.global.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class DownstreamBinaryRelayTest {

    @Test
    @DisplayName("hop-by-hop 헤더를 걷어내고 내용 헤더만 넘긴다")
    void dropsHopByHopHeaders() {
        // given: 하류가 길이를 모르는 응답을 chunked 로 보냈다
        HttpHeaders downstreamHeaders = new HttpHeaders();
        downstreamHeaders.setContentType(MediaType.IMAGE_JPEG);
        downstreamHeaders.add(HttpHeaders.CACHE_CONTROL, "max-age=300, private");
        downstreamHeaders.add("X-Content-Type-Options", "nosniff");
        downstreamHeaders.add(HttpHeaders.TRANSFER_ENCODING, "chunked");
        downstreamHeaders.add(HttpHeaders.CONNECTION, "keep-alive");
        downstreamHeaders.setContentLength(11);
        Resource body = new ByteArrayResource("thumbnail!!".getBytes(StandardCharsets.UTF_8));

        // when
        ResponseEntity<Resource> relayed = DownstreamBinaryRelay.relay(
                new ResponseEntity<>(body, downstreamHeaders, HttpStatus.OK));

        // then: Transfer-Encoding 을 그대로 넘기면 우리 Container 가 하나 더 붙여
        // 같은 헤더가 두 줄 나가고, 앞단 Proxy 가 502 로 끊는다
        assertThat(relayed.getHeaders().headerNames())
                .doesNotContain(HttpHeaders.TRANSFER_ENCODING, HttpHeaders.CONNECTION, HttpHeaders.CONTENT_LENGTH);
        assertThat(relayed.getHeaders().getContentType()).isEqualTo(MediaType.IMAGE_JPEG);
        assertThat(relayed.getHeaders().getCacheControl()).isEqualTo("max-age=300, private");
        assertThat(relayed.getHeaders().getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(relayed.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(relayed.getBody()).isSameAs(body);
    }

    @Test
    @DisplayName("다운로드 파일 이름은 그대로 전달한다")
    void keepsContentDisposition() {
        HttpHeaders downstreamHeaders = new HttpHeaders();
        downstreamHeaders.setContentType(MediaType.APPLICATION_PDF);
        downstreamHeaders.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"보고서.pdf\"");

        ResponseEntity<Resource> relayed = DownstreamBinaryRelay.relay(new ResponseEntity<>(
                new ByteArrayResource(new byte[]{1, 2, 3}), downstreamHeaders, HttpStatus.OK));

        assertThat(relayed.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION))
                .isEqualTo("attachment; filename=\"보고서.pdf\"");
    }
}

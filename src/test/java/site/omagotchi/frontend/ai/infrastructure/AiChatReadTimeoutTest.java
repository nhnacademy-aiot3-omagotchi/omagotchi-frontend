package site.omagotchi.frontend.ai.infrastructure;

import io.netty.handler.timeout.ReadTimeoutException;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * AI 채팅은 SSE라 첫 바이트까지 십수 초가 걸린다. 전역 read-timeout(테스트 5s)이 그대로 걸리면
 * 응답이 시작되기도 전에 끊겨 사용자에게 "답변을 가져오지 못했습니다"만 남는다(운영 장애 재현).
 * 전역보다 오래 걸리는 응답을 만들어, learning-ai-service 그룹에만 건 read-timeout 재정의가 실제로 적용되는지 확인한다.
 * 그룹 재정의가 풀리면 여기서 바로 깨진다.
 */
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("AI 채팅 그룹의 읽기 타임아웃")
class AiChatReadTimeoutTest {

    // 전역 read-timeout(5s)보다 확실히 길고, 그룹 재정의(50s)보다는 짧게
    private static final Duration FIRST_BYTE_DELAY = Duration.ofSeconds(8);

    private static ServerSocket serverSocket;
    private static Thread serverThread;

    @Autowired
    private AiChatHttpService httpService;

    // 자동 구성된 공용 빌더. AI 채팅용 설정이 여기까지 번지지 않아야 한다
    @Autowired
    private WebClient.Builder webClientBuilder;

    @BeforeAll
    static void startSlowServer() throws IOException {
        // 앞 테스트가 끊고 나가도 서버는 지연 시간을 마저 기다린다. 그 사이 들어오는 연결이
        // 거절되지 않도록 backlog에 여유를 둔다
        serverSocket = new ServerSocket(0, 8, java.net.InetAddress.getLoopbackAddress());

        serverThread = new Thread(() -> {
            while (!serverSocket.isClosed()) {
                // 한 연결의 실패가 루프를 끝내면 안 된다. 타임아웃을 검증하는 테스트라
                // 클라이언트가 먼저 끊는 것이 정상 동작이고, 다음 테스트도 이 서버를 쓴다
                try (Socket socket = serverSocket.accept()) {
                    drainRequest(socket.getInputStream());

                    // 모델 1차 호출 → Tool 실행 → 모델 2차 호출 구간을 흉내 낸다.
                    // 이 동안 클라이언트가 읽는 바이트가 하나도 없다
                    Thread.sleep(FIRST_BYTE_DELAY.toMillis());

                    writeSseResponse(socket.getOutputStream());
                } catch (IOException e) {
                    // accept 실패는 서버 종료, 그 밖(끊긴 연결에 쓰기 등)은 무시하고 다음 연결로
                    if (serverSocket.isClosed()) {
                        return;
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        });
        serverThread.setDaemon(true);
        serverThread.start();
    }

    /**
     * 서버 기동이 실패했을 때(포트를 못 잡는 환경 등) 여기서 NPE가 나면 원래 실패 원인이 가려진다.
     */
    @AfterAll
    static void stopSlowServer() throws IOException {
        if (serverSocket != null) {
            serverSocket.close();
        }
        if (serverThread != null) {
            serverThread.interrupt();
        }
    }

    @DynamicPropertySource
    static void slowServerBaseUrl(DynamicPropertyRegistry registry) {
        registry.add(
                "spring.http.serviceclient.learning-ai-service.base-url",
                () -> "http://127.0.0.1:" + serverSocket.getLocalPort()
        );
    }

    @Test
    @DisplayName("첫 바이트가 전역 read-timeout보다 늦게 와도 끊기지 않는다")
    void doesNotTimeOutWhileModelIsStillThinking() {
        List<String> chunks = httpService.streamChat("Bearer test-access-token", "안녕", "GEMINI")
                .collectList()
                .block(FIRST_BYTE_DELAY.plusSeconds(10));

        assertThat(chunks).containsExactly("안녕");
    }

    /**
     * AI 채팅용으로 늘린 타임아웃이 다른 WebClient까지 번지면 안 된다.
     * 커넥터를 빈으로 노출하는 순간 Boot가 그것을 모든 WebClient에 적용하므로, 그 회귀를 여기서 막는다.
     */
    @Test
    @DisplayName("다른 WebClient는 전역 read-timeout을 그대로 쓴다")
    void doesNotAffectOtherWebClients() {
        WebClient other = webClientBuilder.build();

        assertThatThrownBy(() -> other.get()
                .uri("http://127.0.0.1:" + serverSocket.getLocalPort() + "/api/v1/chat")
                .retrieve()
                .bodyToMono(String.class)
                .block(FIRST_BYTE_DELAY.plusSeconds(10)))
                .hasRootCauseInstanceOf(ReadTimeoutException.class);
    }

    /**
     * 요청 헤더 끝(빈 줄)까지 읽어 버린다. 본문 없는 GET이라 이걸로 충분하다.
     */
    private static void drainRequest(InputStream in) throws IOException {
        int consecutiveNewlines = 0;
        int read;
        while (consecutiveNewlines < 2 && (read = in.read()) != -1) {
            if (read == '\n') {
                consecutiveNewlines++;
            } else if (read != '\r') {
                consecutiveNewlines = 0;
            }
        }
    }

    private static void writeSseResponse(OutputStream out) throws IOException {
        byte[] body = "data: 안녕\n\n".getBytes(StandardCharsets.UTF_8);
        String head = "HTTP/1.1 200 OK\r\n"
                + "Content-Type: text/event-stream\r\n"
                + "Content-Length: " + body.length + "\r\n"
                + "Connection: close\r\n\r\n";

        out.write(head.getBytes(StandardCharsets.US_ASCII));
        out.write(body);
        out.flush();
    }
}

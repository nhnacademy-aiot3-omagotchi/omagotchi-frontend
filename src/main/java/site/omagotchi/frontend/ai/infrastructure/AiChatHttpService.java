package site.omagotchi.frontend.ai.infrastructure;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;
import reactor.core.publisher.Flux;
import site.omagotchi.frontend.global.requestid.RequestId;

@HttpExchange("/api/v1/chat")
public interface AiChatHttpService {

    @GetExchange(accept = MediaType.TEXT_EVENT_STREAM_VALUE)
    Flux<String> streamChat(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(RequestId.HEADER_NAME) String requestId,
            @RequestParam String question,
            @RequestParam String model
    );
}

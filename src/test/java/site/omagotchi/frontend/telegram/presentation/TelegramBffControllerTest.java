package site.omagotchi.frontend.telegram.presentation;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import site.omagotchi.frontend.global.learning.application.LearningProxyBffService;
import site.omagotchi.frontend.global.learning.infrastructure.LearningHttpService;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.lang.reflect.Proxy;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class TelegramBffControllerTest {

    private static final String BEARER_TOKEN = "Bearer session-token";

    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    private RecordingLearningHttpService learningHttpService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        learningHttpService = new RecordingLearningHttpService();
        LearningProxyBffService proxy = new PassthroughLearningProxyBffService(
                learningHttpService.client()
        );
        mockMvc = MockMvcBuilders.standaloneSetup(new TelegramBffController(proxy)).build();
    }

    @Test
    void getsMyTelegramLink() throws Exception {
        JsonNode response = jsonMapper.createObjectNode()
                .put("telegramUserId", 812345678L)
                .put("notificationEnabled", true);
        learningHttpService.respondWith(response);

        mockMvc.perform(get("/bff/v1/me/telegram/link"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.telegramUserId").value(812345678L))
                .andExpect(jsonPath("$.notificationEnabled").value(true));

        learningHttpService.assertCalled("getMyTelegramLink", BEARER_TOKEN);
    }

    @Test
    void issuesTelegramLinkToken() throws Exception {
        JsonNode response = jsonMapper.createObjectNode()
                .put("linkUrl", "https://t.me/omagotchi_bot?start=token")
                .put("expiresAt", "2026-08-27T10:10:00+09:00");
        learningHttpService.respondWith(response);

        mockMvc.perform(post("/bff/v1/me/telegram/link-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.linkUrl")
                        .value("https://t.me/omagotchi_bot?start=token"));

        learningHttpService.assertCalled("issueTelegramLinkToken", BEARER_TOKEN);
    }

    @Test
    void updatesTelegramNotification() throws Exception {
        JsonNode response = jsonMapper.createObjectNode()
                .put("notificationEnabled", false);
        learningHttpService.respondWith(response);

        mockMvc.perform(patch("/bff/v1/me/telegram/link/notification")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notificationEnabled").value(false));

        learningHttpService.assertMethod("updateTelegramNotification");
        assertThat(learningHttpService.argument(0)).isEqualTo(BEARER_TOKEN);
        JsonNode body = (JsonNode) learningHttpService.argument(1);
        assertThat(body.get("enabled").asBoolean()).isFalse();
    }

    @Test
    void disconnectsTelegram() throws Exception {
        JsonNode response = jsonMapper.createObjectNode()
                .put("telegramUserId", 812345678L)
                .put("disconnectedAt", "2026-08-27T10:20:00+09:00");
        learningHttpService.respondWith(response);

        mockMvc.perform(delete("/bff/v1/me/telegram/link"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disconnectedAt")
                        .value("2026-08-27T10:20:00+09:00"));

        learningHttpService.assertCalled("disconnectTelegram", BEARER_TOKEN);
    }

    private static final class RecordingLearningHttpService {

        private JsonNode response;
        private String methodName;
        private Object[] arguments = new Object[0];

        private LearningHttpService client() {
            return (LearningHttpService) Proxy.newProxyInstance(
                    LearningHttpService.class.getClassLoader(),
                    new Class<?>[]{LearningHttpService.class},
                    (proxy, method, args) -> {
                        methodName = method.getName();
                        arguments = args == null ? new Object[0] : args.clone();
                        return response;
                    }
            );
        }

        private void respondWith(JsonNode response) {
            this.response = response;
        }

        private void assertCalled(String expectedMethod, Object... expectedArguments) {
            assertMethod(expectedMethod);
            assertThat(arguments).containsExactly(expectedArguments);
        }

        private void assertMethod(String expectedMethod) {
            assertThat(methodName).isEqualTo(expectedMethod);
        }

        private Object argument(int index) {
            return arguments[index];
        }
    }

    private static final class PassthroughLearningProxyBffService extends LearningProxyBffService {

        private final LearningHttpService learningHttpService;

        private PassthroughLearningProxyBffService(LearningHttpService learningHttpService) {
            super(null, null, null);
            this.learningHttpService = learningHttpService;
        }

        @Override
        public <T> T execute(
                HttpServletRequest request,
                Function<AuthorizedLearningRequest, T> operation
        ) {
            return operation.apply(new AuthorizedLearningRequest(learningHttpService, BEARER_TOKEN));
        }
    }
}

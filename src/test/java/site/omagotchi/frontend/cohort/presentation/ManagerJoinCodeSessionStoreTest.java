package site.omagotchi.frontend.cohort.presentation;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.domain.GlobalRole;
import site.omagotchi.frontend.auth.presentation.security.BrowserSessionTokens;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ManagerJoinCodeSessionStoreTest {

    private static final UUID MANAGER_ID = UUID.fromString("10000000-0000-0000-0000-000000000001");
    private static final UUID OTHER_MANAGER_ID = UUID.fromString("20000000-0000-0000-0000-000000000002");
    private static final JsonMapper JSON_MAPPER = JsonMapper.builder().build();

    private BrowserSessionTokens browserSessionTokens;
    private ManagerJoinCodeSessionStore store;
    private MockHttpServletRequest request;
    private UUID currentUserId;

    @BeforeEach
    void setUp() {
        currentUserId = MANAGER_ID;
        browserSessionTokens = new BrowserSessionTokens() {
            @Override
            public Optional<BrowserSessionTokenBundle> find(jakarta.servlet.http.HttpServletRequest request) {
                return Optional.of(tokenBundle(currentUserId));
            }
        };
        store = new ManagerJoinCodeSessionStore(browserSessionTokens);
        request = new MockHttpServletRequest();
        request.getSession(true);
    }

    @Test
    @DisplayName("같은 관리자의 서버 세션 값은 최신 활성 코드 메타데이터와 일치할 때만 복원")
    void restoresCodeForMatchingActiveMetadata() {
        JsonNode issued = JSON_MAPPER.createObjectNode()
                .put("code", "JOIN-CODE-1234")
                .put("status", "ACTIVE")
                .put("issuedAt", "2026-08-28T14:00:00.123456789+09:00")
                .put("expiresAt", "2099-09-27T23:59:59+09:00");
        JsonNode metadata = JSON_MAPPER.createObjectNode()
                .put("status", "ACTIVE")
                .put("issuedAt", "2026-08-28T05:00:00.123456Z")
                .put("expiresAt", "2099-09-27T14:59:59Z");

        store.save(request, 7L, issued);
        JsonNode restored = store.restore(request, 7L, metadata);

        assertThat(restored.path("code").stringValue()).isEqualTo("JOIN-CODE-1234");
        assertThat(metadata.has("code")).isFalse();
        Object cached = request.getSession(false).getAttribute(
                request.getSession(false).getAttributeNames().nextElement()
        );
        assertThat(cached.toString()).doesNotContain("JOIN-CODE-1234").contains("[REDACTED]");
    }

    @Test
    @DisplayName("사용자가 바뀌거나 코드가 폐기되면 서버 세션의 원문을 제거")
    void removesCodeForAnotherUserOrRevokedMetadata() {
        JsonNode issued = JSON_MAPPER.createObjectNode()
                .put("code", "SESSION-CODE")
                .put("status", "ACTIVE")
                .put("issuedAt", "2026-08-28T14:00:00+09:00")
                .put("expiresAt", "2099-09-27T23:59:59+09:00");
        JsonNode activeMetadata = JSON_MAPPER.createObjectNode()
                .put("status", "ACTIVE")
                .put("issuedAt", "2026-08-28T14:00:00+09:00")
                .put("expiresAt", "2099-09-27T23:59:59+09:00");

        store.save(request, 7L, issued);
        currentUserId = OTHER_MANAGER_ID;
        assertThat(store.restore(request, 7L, activeMetadata).has("code")).isFalse();

        currentUserId = MANAGER_ID;
        assertThat(store.restore(request, 7L, activeMetadata).has("code")).isFalse();

        store.save(request, 7L, issued);
        JsonNode revokedMetadata = JSON_MAPPER.createObjectNode()
                .put("status", "REVOKED")
                .put("issuedAt", "2026-08-28T14:00:00+09:00")
                .put("expiresAt", "2099-09-27T23:59:59+09:00");
        assertThat(store.restore(request, 7L, revokedMetadata).has("code")).isFalse();
        assertThat(store.restore(request, 7L, activeMetadata).has("code")).isFalse();
    }

    private BrowserSessionTokenBundle tokenBundle(UUID userId) {
        return new BrowserSessionTokenBundle(
                userId,
                GlobalRole.USER,
                "access-token",
                Instant.parse("2099-09-27T14:59:59Z"),
                "refresh-token",
                Instant.parse("2099-10-27T14:59:59Z")
        );
    }
}

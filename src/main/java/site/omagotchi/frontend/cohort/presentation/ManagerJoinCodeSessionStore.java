package site.omagotchi.frontend.cohort.presentation;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.auth.presentation.security.BrowserSessionTokens;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

import java.io.Serial;
import java.io.Serializable;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

/**
 * 발급 응답의 가입 코드 원문을 브라우저 저장소 대신 인증된 서버 세션에 보관한다.
 * Learning Service의 최신 메타데이터와 일치하는 활성 코드에만 원문을 다시 결합한다.
 */
@Component
@RequiredArgsConstructor
class ManagerJoinCodeSessionStore {

    private static final String SESSION_ATTRIBUTE_PREFIX =
            ManagerJoinCodeSessionStore.class.getName() + ".COHORT.";

    private final BrowserSessionTokens browserSessionTokens;

    void save(HttpServletRequest request, Long cohortId, JsonNode issued) {
        HttpSession session = request.getSession(false);
        Optional<UUID> userId = currentUserId(request);
        Optional<Snapshot> snapshot = Snapshot.from(userId.orElse(null), issued);
        if (session == null || snapshot.isEmpty()) {
            return;
        }
        session.setAttribute(attributeName(cohortId), snapshot.get());
    }

    JsonNode restore(HttpServletRequest request, Long cohortId, JsonNode metadata) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return metadata;
        }

        String attributeName = attributeName(cohortId);
        Object cached = session.getAttribute(attributeName);
        UUID currentUserId = currentUserId(request).orElse(null);
        if (!(cached instanceof Snapshot snapshot)
                || !snapshot.matches(currentUserId, metadata, Instant.now())) {
            session.removeAttribute(attributeName);
            return metadata;
        }

        if (!(metadata instanceof ObjectNode objectMetadata)) {
            session.removeAttribute(attributeName);
            return metadata;
        }
        ObjectNode restored = objectMetadata.deepCopy();
        restored.put("code", snapshot.code());
        return restored;
    }

    void remove(HttpServletRequest request, Long cohortId) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.removeAttribute(attributeName(cohortId));
        }
    }

    private Optional<UUID> currentUserId(HttpServletRequest request) {
        return browserSessionTokens.find(request).map(tokenBundle -> tokenBundle.userId());
    }

    private String attributeName(Long cohortId) {
        return SESSION_ATTRIBUTE_PREFIX + cohortId;
    }

    private record Snapshot(
            UUID userId,
            String code,
            Instant issuedAt,
            Instant expiresAt
    ) implements Serializable {

        @Serial
        private static final long serialVersionUID = 1L;

        private static Optional<Snapshot> from(UUID userId, JsonNode issued) {
            if (userId == null
                    || issued == null
                    || !"ACTIVE".equals(issued.path("status").stringValue(""))) {
                return Optional.empty();
            }
            String code = issued.path("code").stringValue("");
            if (code.isBlank()) {
                return Optional.empty();
            }
            try {
                return Optional.of(new Snapshot(
                        userId,
                        code,
                        parseInstant(issued, "issuedAt"),
                        parseInstant(issued, "expiresAt")
                ));
            } catch (DateTimeParseException exception) {
                return Optional.empty();
            }
        }

        private boolean matches(UUID currentUserId, JsonNode metadata, Instant now) {
            if (!userId.equals(currentUserId)
                    || metadata == null
                    || !"ACTIVE".equals(metadata.path("status").stringValue(""))
                    || !expiresAt.isAfter(now)) {
                return false;
            }
            try {
                return issuedAt.equals(parseInstant(metadata, "issuedAt"))
                        && expiresAt.equals(parseInstant(metadata, "expiresAt"));
            } catch (DateTimeParseException exception) {
                return false;
            }
        }

        private static Instant parseInstant(JsonNode source, String fieldName) {
            return OffsetDateTime.parse(source.path(fieldName).stringValue(""))
                    .toInstant()
                    .truncatedTo(ChronoUnit.MICROS);
        }

        @Override
        public String toString() {
            return "Snapshot[userId=" + userId
                    + ", code=[REDACTED]"
                    + ", issuedAt=" + issuedAt
                    + ", expiresAt=" + expiresAt + "]";
        }
    }
}

package site.omagotchi.frontend.cohort.application;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import site.omagotchi.frontend.cohort.infrastructure.response.UserAccessContextResponse;
import site.omagotchi.frontend.global.exception.ApiErrorResponse;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.learning.application.LearningBffErrorCode;
import site.omagotchi.frontend.global.learning.infrastructure.LearningDownstreamException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;

@ExtendWith(MockitoExtension.class)
@DisplayName("기수 관리자 판정의 실패 처리")
class CohortAccessDecisionTest {

    @Mock
    private UserAccessContextBffService accessContextService;

    @InjectMocks
    private CohortAccessDecision accessDecision;

    private final MockHttpServletRequest request = new MockHttpServletRequest(
            "GET",
            "/manager-dashboard"
    );

    @Test
    @DisplayName("기수 관리자 Context는 관리자로 판정")
    void resolvesCohortManager() {
        // Given: 관리 기수를 가진 접근 Context
        given(accessContextService.getContext(any())).willReturn(context("COHORT_MANAGER"));

        // When·Then: 관리자 판정
        assertThat(accessDecision.isCohortManager(request)).isTrue();
    }

    @Test
    @DisplayName("하류 5xx는 일반 사용자로 강등")
    void degradesToStudentOnDownstreamServerFailure() {
        // Given: Learning 서버 장애
        willThrow(downstreamException(HttpStatus.INTERNAL_SERVER_ERROR))
                .given(accessContextService).getContext(any());

        // When·Then: 예외 전파 없이 권한 축소
        assertThat(accessDecision.isCohortManager(request)).isFalse();
    }

    @Test
    @DisplayName("하류 404는 일반 사용자로 강등")
    void degradesToStudentOnDownstreamNotFound() {
        // Given: 계약 미배포 등으로 존재하지 않는 하류 경로
        willThrow(downstreamException(HttpStatus.NOT_FOUND))
                .given(accessContextService).getContext(any());

        // When·Then: 예외 전파 없이 권한 축소
        assertThat(accessDecision.isCohortManager(request)).isFalse();
    }

    @Test
    @DisplayName("Learning 연결 실패는 일반 사용자로 강등")
    void degradesToStudentOnServiceUnavailable() {
        // Given: Learning 연결 자체의 실패
        willThrow(new BusinessException(CommonErrorCode.SERVICE_UNAVAILABLE))
                .given(accessContextService).getContext(any());

        // When·Then: Login 흐름을 막지 않는 권한 축소
        assertThat(accessDecision.isCohortManager(request)).isFalse();
    }

    @Test
    @DisplayName("하류 401은 강등하지 않고 재인증 대상으로 전파")
    void propagatesUnauthorizedForReauthentication() {
        // Given: 만료된 Session Token의 하류 401
        willThrow(downstreamException(HttpStatus.UNAUTHORIZED))
                .given(accessContextService).getContext(any());

        // When·Then: 강등 대신 예외 전파
        assertThatThrownBy(() -> accessDecision.isCohortManager(request))
                .isInstanceOf(LearningDownstreamException.class);
    }

    @Test
    @DisplayName("Session Token 부재는 강등하지 않고 재인증 대상으로 전파")
    void propagatesMissingSessionToken() {
        // Given: Session에 Token이 없는 상태
        willThrow(new BusinessException(LearningBffErrorCode.SESSION_TOKEN_MISSING))
                .given(accessContextService).getContext(any());

        // When·Then: 강등 대신 예외 전파
        assertThatThrownBy(() -> accessDecision.isCohortManager(request))
                .isInstanceOf(BusinessException.class);
    }

    private static UserAccessContextResponse context(String accessType) {
        return new UserAccessContextResponse("USER", accessType, List.of(), List.of());
    }

    private static LearningDownstreamException downstreamException(HttpStatus status) {
        return new LearningDownstreamException(
                status,
                new ApiErrorResponse("DOWNSTREAM_TEST", "테스트 하류 실패", "/api/v1", null),
                new IllegalStateException("downstream failure")
        );
    }
}

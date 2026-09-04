package site.omagotchi.frontend.space.application.port;

import site.omagotchi.frontend.space.application.result.SpaceEnvironmentView;

import java.util.List;

/**
 * 공간 실내 환경 조회 경계.
 *
 * <p>Application 은 HTTP 를 모른다. 전송 실패 변환과 응답 계약 검증은 어댑터가 맡는다.</p>
 */
public interface SpaceEnvironmentClient {

    /** 기수가 쓰는 공간 전부의 현재 실내 환경. */
    List<SpaceEnvironmentView> findByCohort(String bearerToken, Long cohortId);
}

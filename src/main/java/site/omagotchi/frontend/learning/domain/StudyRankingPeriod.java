package site.omagotchi.frontend.learning.domain;

/**
 * Learning Service의 study-ranking 집계 기간 계약.
 *
 * <p>Learning은 이 값을 Enum으로 받으므로 View가 String으로 통과시키면
 * 잘못된 값이 Gateway를 거쳐 하류 400으로 돌아온다. View에서 먼저 거부해
 * 불필요한 하류 호출과 사용자에게 의미 없는 오류 표시를 막는다.
 *
 * <p>Learning의 StudyRankingPeriod와 값이 일치해야 하며,
 * StudyRankingPeriodContractTest가 이 계약을 고정한다.
 */
public enum StudyRankingPeriod {
    DAILY,
    WEEKLY,
    MONTHLY
}

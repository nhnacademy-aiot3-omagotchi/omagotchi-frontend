package site.omagotchi.frontend.learningservice.ranking;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.learningservice.common.LearningServiceClientSupport;
import site.omagotchi.frontend.learningservice.common.LearningServiceErrorCode;
import site.omagotchi.frontend.learningservice.ranking.RankingModels.MemberEntry;
import site.omagotchi.frontend.learningservice.ranking.RankingModels.MemberRankingResponse;
import site.omagotchi.frontend.learningservice.ranking.RankingModels.MyTeamRanking;
import site.omagotchi.frontend.learningservice.ranking.RankingModels.PersonalRanking;
import site.omagotchi.frontend.learningservice.ranking.RankingModels.TeamEntry;
import site.omagotchi.frontend.learningservice.ranking.RankingModels.TeamRankingResponse;
import site.omagotchi.frontend.learningservice.ranking.RankingModels.TodayMemberEntry;
import site.omagotchi.frontend.learningservice.ranking.RankingModels.TodayMemberRankingResponse;
import site.omagotchi.frontend.learningservice.ranking.RankingModels.TodayPersonalRanking;
import site.omagotchi.frontend.learningservice.ranking.RankingModels.TodayTeamRankingResponse;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import static site.omagotchi.frontend.learningservice.common.LearningServiceClientSupport.invalidResponse;

@Service
@RequiredArgsConstructor
public class RankingBffService {

    private final RankingHttpService httpService;
    private final LearningServiceClientSupport support;

    public TodayMemberRankingResponse getTodayMembers(
            String accessToken, Long cohortId, Integer maxRank
    ) {
        TodayMemberRankingResponse response = support.body(
                () -> httpService.getTodayMembers(
                        support.authorization(accessToken), cohortId, maxRank
                ),
                HttpStatus.OK,
                "Ranking today members",
                rankingErrors()
        );
        validateTodayMembers(response);
        return response;
    }

    public MemberRankingResponse getDailyMembers(
            String accessToken, Long cohortId, LocalDate date, Integer maxRank
    ) {
        return historicalMembers(
                () -> httpService.getDailyMembers(
                        support.authorization(accessToken), cohortId, date.toString(), maxRank
                ),
                "Ranking daily members"
        );
    }

    public MemberRankingResponse getWeeklyMembers(
            String accessToken, Long cohortId, LocalDate weekStartDate, Integer maxRank
    ) {
        return historicalMembers(
                () -> httpService.getWeeklyMembers(
                        support.authorization(accessToken), cohortId,
                        weekStartDate.toString(), maxRank
                ),
                "Ranking weekly members"
        );
    }

    public MemberRankingResponse getMonthlyMembers(
            String accessToken, Long cohortId, YearMonth month, Integer maxRank
    ) {
        return historicalMembers(
                () -> httpService.getMonthlyMembers(
                        support.authorization(accessToken), cohortId, month.toString(), maxRank
                ),
                "Ranking monthly members"
        );
    }

    public TodayTeamRankingResponse getTodayTeams(
            String accessToken, Long cohortId, Integer maxRank
    ) {
        TodayTeamRankingResponse response = support.body(
                () -> httpService.getTodayTeams(
                        support.authorization(accessToken), cohortId, maxRank
                ),
                HttpStatus.OK,
                "Ranking today teams",
                rankingErrors()
        );
        validateTodayTeams(response);
        return response;
    }

    public TeamRankingResponse getDailyTeams(
            String accessToken, Long cohortId, LocalDate date, Integer maxRank
    ) {
        return historicalTeams(
                () -> httpService.getDailyTeams(
                        support.authorization(accessToken), cohortId, date.toString(), maxRank
                ),
                "Ranking daily teams"
        );
    }

    public TeamRankingResponse getWeeklyTeams(
            String accessToken, Long cohortId, LocalDate weekStartDate, Integer maxRank
    ) {
        return historicalTeams(
                () -> httpService.getWeeklyTeams(
                        support.authorization(accessToken), cohortId,
                        weekStartDate.toString(), maxRank
                ),
                "Ranking weekly teams"
        );
    }

    public TeamRankingResponse getMonthlyTeams(
            String accessToken, Long cohortId, YearMonth month, Integer maxRank
    ) {
        return historicalTeams(
                () -> httpService.getMonthlyTeams(
                        support.authorization(accessToken), cohortId, month.toString(), maxRank
                ),
                "Ranking monthly teams"
        );
    }

    public TodayMemberRankingResponse getTodayTeamMembers(
            String accessToken, Long cohortId, Long teamId, Integer maxRank
    ) {
        TodayMemberRankingResponse response = support.body(
                () -> httpService.getTodayTeamMembers(
                        support.authorization(accessToken), cohortId, teamId, maxRank
                ),
                HttpStatus.OK,
                "Ranking today team members",
                rankingErrors()
        );
        validateTodayMembers(response);
        return response;
    }

    public MemberRankingResponse getDailyTeamMembers(
            String accessToken,
            Long cohortId,
            Long teamId,
            LocalDate date,
            Integer maxRank
    ) {
        return historicalMembers(
                () -> httpService.getDailyTeamMembers(
                        support.authorization(accessToken), cohortId, teamId,
                        date.toString(), maxRank
                ),
                "Ranking daily team members"
        );
    }

    public MemberRankingResponse getWeeklyTeamMembers(
            String accessToken,
            Long cohortId,
            Long teamId,
            LocalDate weekStartDate,
            Integer maxRank
    ) {
        return historicalMembers(
                () -> httpService.getWeeklyTeamMembers(
                        support.authorization(accessToken), cohortId, teamId,
                        weekStartDate.toString(), maxRank
                ),
                "Ranking weekly team members"
        );
    }

    public MemberRankingResponse getMonthlyTeamMembers(
            String accessToken,
            Long cohortId,
            Long teamId,
            YearMonth month,
            Integer maxRank
    ) {
        return historicalMembers(
                () -> httpService.getMonthlyTeamMembers(
                        support.authorization(accessToken), cohortId, teamId,
                        month.toString(), maxRank
                ),
                "Ranking monthly team members"
        );
    }

    private MemberRankingResponse historicalMembers(
            java.util.function.Supplier<org.springframework.http.ResponseEntity<MemberRankingResponse>> request,
            String operation
    ) {
        MemberRankingResponse response = support.body(
                request, HttpStatus.OK, operation, rankingErrors()
        );
        validateHistoricalMembers(response);
        return response;
    }

    private TeamRankingResponse historicalTeams(
            java.util.function.Supplier<org.springframework.http.ResponseEntity<TeamRankingResponse>> request,
            String operation
    ) {
        TeamRankingResponse response = support.body(
                request, HttpStatus.OK, operation, rankingErrors()
        );
        validateHistoricalTeams(response);
        return response;
    }

    private static void validateTodayMembers(TodayMemberRankingResponse response) {
        if (response.aggregationDate() == null || response.calculatedAt() == null
                || negative(response.rankedMemberCount())
                || response.returnedEntryCount() == null || response.returnedEntryCount() < 0
                || response.entries() == null || response.myRanking() == null) {
            throw invalidResponse("Ranking today members 기본 계약 불일치");
        }
        validateEntryCount(response.rankedMemberCount(), response.returnedEntryCount(), response.entries());
        for (TodayMemberEntry entry : response.entries()) validateTodayMemberEntry(entry);
        validateTodayPersonalRanking(response.myRanking());
    }

    private static void validateHistoricalMembers(MemberRankingResponse response) {
        validateHistoricalPeriod(response.startDate(), response.includedThroughDate());
        if (negative(response.rankedMemberCount())
                || response.returnedEntryCount() == null || response.returnedEntryCount() < 0
                || response.entries() == null || response.myRanking() == null) {
            throw invalidResponse("Ranking members 기본 계약 불일치");
        }
        validateEntryCount(response.rankedMemberCount(), response.returnedEntryCount(), response.entries());
        for (MemberEntry entry : response.entries()) validateMemberEntry(entry);
        validatePersonalRanking(response.myRanking());
    }

    private static void validateTodayTeams(TodayTeamRankingResponse response) {
        if (response.aggregationDate() == null || response.calculatedAt() == null
                || negative(response.rankedTeamCount())
                || response.returnedEntryCount() == null || response.returnedEntryCount() < 0
                || response.entries() == null || response.myTeamRanking() == null) {
            throw invalidResponse("Ranking today teams 기본 계약 불일치");
        }
        validateEntryCount(response.rankedTeamCount(), response.returnedEntryCount(), response.entries());
        for (TeamEntry entry : response.entries()) validateTeamEntry(entry);
        validateMyTeamRanking(response.myTeamRanking());
    }

    private static void validateHistoricalTeams(TeamRankingResponse response) {
        validateHistoricalPeriod(response.startDate(), response.includedThroughDate());
        if (negative(response.rankedTeamCount())
                || response.returnedEntryCount() == null || response.returnedEntryCount() < 0
                || response.entries() == null || response.myTeamRanking() == null) {
            throw invalidResponse("Ranking teams 기본 계약 불일치");
        }
        validateEntryCount(response.rankedTeamCount(), response.returnedEntryCount(), response.entries());
        for (TeamEntry entry : response.entries()) validateTeamEntry(entry);
        validateMyTeamRanking(response.myTeamRanking());
    }

    private static void validateHistoricalPeriod(LocalDate start, LocalDate includedThrough) {
        if (start == null || includedThrough != null && includedThrough.isBefore(start)) {
            throw invalidResponse("Ranking 조회 기간 계약 불일치");
        }
    }

    private static void validateMemberEntry(MemberEntry entry) {
        if (entry == null || entry.rank() == null || entry.rank() < 1
                || !StringUtils.hasText(entry.displayName()) || negative(entry.studySeconds())) {
            throw invalidResponse("Ranking member entry 계약 불일치");
        }
    }

    private static void validateTodayMemberEntry(TodayMemberEntry entry) {
        if (entry == null || entry.rank() == null || entry.rank() < 1
                || !StringUtils.hasText(entry.displayName())
                || negative(entry.studySeconds()) || entry.timerRunning() == null) {
            throw invalidResponse("Ranking today member entry 계약 불일치");
        }
    }

    private static void validateTeamEntry(TeamEntry entry) {
        if (entry == null || entry.rank() == null || entry.rank() < 1
                || entry.teamId() == null || entry.teamId() <= 0
                || !StringUtils.hasText(entry.teamName()) || negative(entry.studySeconds())) {
            throw invalidResponse("Ranking team entry 계약 불일치");
        }
    }

    private static void validatePersonalRanking(PersonalRanking ranking) {
        if (ranking.ranked() == null || ranking.ranked() != (ranking.ranking() != null)) {
            throw invalidResponse("Ranking personal result 계약 불일치");
        }
        if (ranking.ranking() != null) validateMemberEntry(ranking.ranking());
    }

    private static void validateTodayPersonalRanking(TodayPersonalRanking ranking) {
        if (ranking.ranked() == null || ranking.ranked() != (ranking.ranking() != null)) {
            throw invalidResponse("Ranking today personal result 계약 불일치");
        }
        if (ranking.ranking() != null) validateTodayMemberEntry(ranking.ranking());
    }

    private static void validateMyTeamRanking(MyTeamRanking ranking) {
        if (ranking.ranked() == null || ranking.ranked() != (ranking.ranking() != null)) {
            throw invalidResponse("Ranking my team result 계약 불일치");
        }
        if (ranking.ranking() != null) validateTeamEntry(ranking.ranking());
    }

    private static void validateEntryCount(long rankedCount, int returnedCount, List<?> entries) {
        if (returnedCount != entries.size() || rankedCount < returnedCount) {
            throw invalidResponse("Ranking entry count 계약 불일치");
        }
    }

    private static boolean negative(Long value) {
        return value == null || value < 0;
    }

    private static ErrorCode[] rankingErrors() {
        return new ErrorCode[]{
                CommonErrorCode.INVALID_REQUEST,
                LearningServiceErrorCode.COHORT_ACCESS_DENIED,
                LearningServiceErrorCode.COHORT_NOT_FOUND,
                LearningServiceErrorCode.MEMBERSHIP_NOT_FOUND,
                LearningServiceErrorCode.TEAM_COHORT_ACCESS_DENIED,
                LearningServiceErrorCode.TEAM_NOT_FOUND
        };
    }
}

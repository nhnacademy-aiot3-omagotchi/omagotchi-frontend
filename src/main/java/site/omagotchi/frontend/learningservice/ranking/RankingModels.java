package site.omagotchi.frontend.learningservice.ranking;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class RankingModels {

    private RankingModels() {
    }

    public record MemberEntry(
            Long rank,
            String displayName,
            Long studySeconds
    ) {
    }

    public record TodayMemberEntry(
            Long rank,
            String displayName,
            Long studySeconds,
            Boolean timerRunning
    ) {
    }

    public record PersonalRanking(
            Boolean ranked,
            MemberEntry ranking
    ) {
    }

    public record TodayPersonalRanking(
            Boolean ranked,
            TodayMemberEntry ranking
    ) {
    }

    public record MemberRankingResponse(
            LocalDate startDate,
            LocalDate includedThroughDate,
            Long rankedMemberCount,
            Integer returnedEntryCount,
            List<MemberEntry> entries,
            PersonalRanking myRanking
    ) {
    }

    public record TodayMemberRankingResponse(
            LocalDate aggregationDate,
            Instant calculatedAt,
            Long rankedMemberCount,
            Integer returnedEntryCount,
            List<TodayMemberEntry> entries,
            TodayPersonalRanking myRanking
    ) {
    }

    public record TeamEntry(
            Long rank,
            Long teamId,
            String teamName,
            Long studySeconds
    ) {
    }

    public record MyTeamRanking(
            Boolean ranked,
            TeamEntry ranking
    ) {
    }

    public record TeamRankingResponse(
            LocalDate startDate,
            LocalDate includedThroughDate,
            Long rankedTeamCount,
            Integer returnedEntryCount,
            List<TeamEntry> entries,
            MyTeamRanking myTeamRanking
    ) {
    }

    public record TodayTeamRankingResponse(
            LocalDate aggregationDate,
            Instant calculatedAt,
            Long rankedTeamCount,
            Integer returnedEntryCount,
            List<TeamEntry> entries,
            MyTeamRanking myTeamRanking
    ) {
    }
}

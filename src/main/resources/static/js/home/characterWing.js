// 출석 스트릭 단계별 날개. 홈 캐릭터와 랭킹이 같은 규칙을 쓰도록 한 곳에 모은다.
//
// 이 배열을 두 곳에 복제하면 한쪽만 고쳐졌을 때 같은 사용자가 화면마다 다른 날개를 달게 된다.
// index 0은 "날개 없음"이라 null이며, 그래서 호출부는 반환값이 없을 수 있다고 봐야 한다.
export const STREAK_WINGS = [
    null,
    "/images/wing/dia/셀렌.gif",
    "/images/wing/mas/이트.gif",
    "/images/wing/grand/세슘.gif"
];

/** 스트릭 일수를 0~3 단계로 자른다. 음수, NaN, 문자열, 3 초과가 모두 들어올 수 있다. */
export function streakWingTier(streakDays) {
    return Math.min(Math.max(Number(streakDays) || 0, 0), 3);
}

/** 날개 이미지 경로. 날개가 없는 단계면 null을 준다. */
export function streakWingSrc(streakDays) {
    return STREAK_WINGS[streakWingTier(streakDays)];
}

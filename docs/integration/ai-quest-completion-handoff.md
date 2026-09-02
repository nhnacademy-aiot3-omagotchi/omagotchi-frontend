# AI 추천 퀘스트 완료 연동 인계서

- 대상 담당: AI / BFF 연동 담당
- 대상 저장소: `omagotchi-learning-service` (호출부 추가), 필요 시 AI 응답을 처리하는 저장소
- 관련 기능: Home 진행 패널의 "AI 추천 퀘스트"
- 판정: **버그가 아니라 호출부 미연결. 백엔드는 완성돼 있고 부르는 곳만 없다.**

이 문서는 Frontend에서 AI 추천 퀘스트를 상단 강조 카드로 올리는 작업 중 확인한
연동 공백을 담당자에게 전달하기 위한 기록이다.

## 1. 현재 상태

| 항목 | 상태 |
| --- | --- |
| 퀘스트 템플릿 | ✅ `QuestType.LLM`, code `LLM_QUEST`, "AI 추천 퀘스트", 목표 1회, 보상 40 XP |
| 사용자 발급 | ✅ 매일 기본 퀘스트에 포함되어 발급된다 |
| 화면 표시 | ✅ 진행 패널 최상단 "AI 추천" 카드로 표시된다 |
| 완료 처리 메서드 | ✅ `DailyQuestService.handleLlmQuestCompleted(UUID userId)` 존재 |
| **완료 메서드 호출부** | ❌ **저장소 전체에 없음** |
| 보상 수령 | ✅ 완료되기만 하면 기존 claim 경로가 그대로 동작한다 |

결과적으로 **AI 추천 퀘스트는 화면에 뜨지만 영원히 `0 / 1`에 머문다.**
사용자는 보상을 받을 수 없다.

## 2. 확인 근거

`handleLlmQuestCompleted` 를 호출하는 코드가 `src/main` 전체에 존재하지 않는다.
컨트롤러, 이벤트 핸들러, BFF 경로 모두 없다.

```java
// omagotchi-learning-service
// src/main/java/site/omagotchi/learningservice/gamification/application/DailyQuestService.java:78
public DailyQuestResult handleLlmQuestCompleted(UUID userId) {
    return completeToday(userId, LLM_QUEST_CODE);
}
```

## 3. 필요한 조치

AI 응답 처리가 성공적으로 끝나는 지점에서 아래를 호출하면 된다.

```java
dailyQuestService.handleLlmQuestCompleted(userId);
```

메서드가 이미 다음을 모두 처리하므로 호출부에서 추가로 할 일은 없다.

- 오늘 자 퀘스트 슬롯이 없으면 생성 (`createDailyQuestsIfAbsent`)
- 오늘 자 `LLM_QUEST` 조회, 없으면 `DAILY_QUEST_NOT_FOUND`
- 상태를 `COMPLETED`로 변경

보상 지급은 완료 시점이 아니라 사용자가 "보상 받기"를 누를 때
`POST /api/v1/gamification/quests/{user-daily-quest-id}/claim` 에서 이뤄진다.
이 경로는 이미 동작하므로 손댈 필요가 없다.

## 4. 호출 시점 결정이 필요하다

"AI 퀘스트를 완료했다"의 기준을 정해야 한다. 후보는 다음과 같다.

| 후보 | 설명 | 유의점 |
| --- | --- | --- |
| AI 도우미 대화 1회 성립 | 사용자가 질문하고 응답을 받으면 완료 | 가장 단순하다. 다만 한 마디만 해도 완료된다 |
| AI가 추천한 행동을 수행 | 추천 내용을 실제로 이행했을 때 완료 | 의미는 정확하지만 이행 판정 설계가 필요하다 |
| AI 세션 종료 | 대화를 마치는 시점 | 종료 이벤트 정의가 필요하다 |

**멱등성은 신경 쓰지 않아도 된다.** 이미 `COMPLETED`인 퀘스트에 다시 호출해도
상태가 바뀔 뿐이고, 보상 중복은 claim 단계의 원장(`XpTransaction`)이 막는다.

다만 **하루 1회 기준**이라는 점은 유의한다. 목표 횟수가 1이므로
같은 날 여러 번 호출해도 추가 보상은 없다.

## 5. 검증 방법

1. 홈 → 진행 → 퀘스트 탭에서 "AI 추천" 카드가 `0 / 1`인 것을 확인한다.
2. 정한 완료 조건을 충족시킨다(예: AI 도우미와 대화 1회).
3. 진행 패널을 다시 열어 카드가 `1 / 1`이 되고 "보상 받기" 버튼이 나타나는지 확인한다.
4. 버튼을 눌러 XP 바가 40 증가하는지 확인한다.
5. 홈 메뉴 "진행" 아이콘의 알림 배지가 3번에서 켜지고 4번 후 꺼지는지 확인한다.

## 6. 참고 — Frontend 쪽 준비 상태

Frontend는 이미 다음이 반영돼 있어 추가 작업이 필요 없다.

- 퀘스트 응답의 `type` 필드를 보존해 `LLM` 타입을 식별한다.
- AI 퀘스트를 일일 목록과 분리해 최상단 강조 카드로 그린다.
- 수령 대기 보상(`COMPLETED`)이 있으면 홈 메뉴에 알림 배지를 켠다.
- 보상 수령 후 XP 바가 즉시 갱신된다.

즉 **Learning 쪽 호출부만 연결되면 사용자 흐름이 끝까지 이어진다.**

# Gamification Requirements

## Scope

게이미피케이션은 로그인 이후 사용자 경험을 담당한다. 주요 범위는 캐릭터, 홈, 실습실, 출석, EXP, 레벨, 포인트, 퀘스트, 랭킹, 뱃지다.

## Requirements

| ID | 요구사항 | 구현 방향 |
| --- | --- | --- |
| GM-01 | 사용자는 출석 또는 공부 시간 기록을 통해 퀘스트를 수행할 수 있어야 한다. | `quest.condition` 판정 |
| GM-02 | 시스템은 출석, 공부 시간, 퀘스트 완료 기록을 기반으로 EXP를 지급할 수 있어야 한다. | `exp_log` 저장 |
| GM-03 | 사용자는 자신의 EXP와 레벨을 확인할 수 있어야 한다. | `user_growth` 조회 |
| GM-04 | 사용자가 3일 연속 퀘스트를 완료하면 화면에서 강조 효과를 제공할 수 있어야 한다. | `streak_count` 계산 |
| GM-05 | 연속 달성 상태는 사용자 화면에서 시각적으로 표시할 수 있어야 한다. | streak UI |
| GM-06 | 시스템은 조건 달성 여부에 따라 뱃지를 지급할 수 있어야 한다. | badge condition 판정 |
| GM-07 | 사용자는 획득한 뱃지와 미획득 뱃지 조건을 확인할 수 있어야 한다. | `user_badge` + `badge` 조회 |
| GM-08 | 학습 타이머 종료 또는 퀘스트 완료 시 보상 결과를 제공할 수 있어야 한다. | summary response 제공 |
| GM-09 | 사용자 상태에 따라 캐릭터 또는 이펙트를 변경할 수 있어야 한다. | status class 변경 |
| GM-10 | 개인화 퀘스트는 후순위로 최근 학습 기록 기반 생성이 가능해야 한다. | LLM 또는 Rule 기반 |
| GM-11 | 캐릭터 장비, 펫, 상점은 후순위로 분류한다. | MVP 제외 |

## Current Frontend State

- 캐릭터 선택값은 현재 `sessionStorage`로 홈에 전달한다.
- 추후 서버 저장으로 전환한다.
- 홈은 현재 목업 기반 정적 UI이며, 사용자 이름, EXP, 레벨, 퀘스트는 임시값이다.
- 햄버거 오버레이와 실습실 이동 CTA는 현재 위치를 유지한다.

## Character Customization

- 사용자는 캐릭터와 색상을 선택할 수 있어야 한다.
- 선택값은 최종적으로 사용자 계정에 저장한다.
- 최초 커스터마이징 완료 전에는 캐릭터 선택 화면을 거친다.
- 커스터마이징 완료 사용자는 다음 로그인부터 바로 홈으로 진입한다.

저장 후보:

| 필드 | 설명 |
| --- | --- |
| `characterId` | 캐릭터 ID |
| `colorId` | 색상 ID |
| `imagePath` | 선택 결과 이미지 경로 |
| `baseImagePath` | 원본 이미지 경로 |
| `customizedAt` | 커스터마이징 완료 시각 |

## EXP And Level

- 최대 레벨은 30이다.
- 30레벨 이후에도 EXP는 계속 획득하고 누적할 수 있다.
- 단, 레벨은 30 이상으로 올라가지 않는다.
- EXP와 레벨 계산은 서버에서 처리하고, 프론트는 결과를 표시한다.

### Formula

```text
requiredExp(level) = 1000 + ((level - 1) * 250)
```

### Level Table

| Level | Required EXP | Total EXP To Reach |
| --- | ---: | ---: |
| 1 -> 2 | 1000 | 1000 |
| 2 -> 3 | 1250 | 2250 |
| 3 -> 4 | 1500 | 3750 |
| 4 -> 5 | 1750 | 5500 |
| 5 -> 6 | 2000 | 7500 |
| 6 -> 7 | 2250 | 9750 |
| 7 -> 8 | 2500 | 12250 |
| 8 -> 9 | 2750 | 15000 |
| 9 -> 10 | 3000 | 18000 |
| 10 -> 11 | 3250 | 21250 |
| 11 -> 12 | 3500 | 24750 |
| 12 -> 13 | 3750 | 28500 |
| 13 -> 14 | 4000 | 32500 |
| 14 -> 15 | 4250 | 36750 |
| 15 -> 16 | 4500 | 41250 |
| 16 -> 17 | 4750 | 46000 |
| 17 -> 18 | 5000 | 51000 |
| 18 -> 19 | 5250 | 56250 |
| 19 -> 20 | 5500 | 61750 |
| 20 -> 21 | 5750 | 67500 |
| 21 -> 22 | 6000 | 73500 |
| 22 -> 23 | 6250 | 79750 |
| 23 -> 24 | 6500 | 86250 |
| 24 -> 25 | 6750 | 93000 |
| 25 -> 26 | 7000 | 100000 |
| 26 -> 27 | 7250 | 107250 |
| 27 -> 28 | 7500 | 114750 |
| 28 -> 29 | 7750 | 122500 |
| 29 -> 30 | 8000 | 130500 |

### Level Up Handling

```text
while level < 30 and currentExp >= requiredExp(level):
    currentExp -= requiredExp(level)
    level += 1
```

30레벨 이후:

```text
level = 30
expPercent = 100
totalExp += gainedExp
```

## Reward Policy

퀘스트 보상은 EXP와 포인트 중심으로 설계한다. 뱃지는 퀘스트 보상에 직접 포함하지 않고 별도 조건 시스템에서 처리한다.

| Action | EXP | Point | Note |
| --- | ---: | ---: | --- |
| 실습실 출석 | 100 | 10 | 연속 출석 카운트 갱신 |
| 일반 퀘스트 완료 | 150 | 20 | 기본 보상 |
| 중요 퀘스트 완료 | 300 | 50 | 높은 우선순위 보상 |
| 연속 출석 보너스 | 50 | 10 | 출석 정책에 따라 지급 |
| 최초 실습실 입장 | 100 | 30 | 최초 진입 보상 |

보상 필드:

| 필드 | 설명 |
| --- | --- |
| `rewardExp` | 레벨 진행에 반영되는 경험치 |
| `rewardPoint` | 재화 또는 포인트 |
| `rewardItemId` | 후순위 아이템 시스템 연동 대상 |

## Quest Status

| 상태 | 설명 |
| --- | --- |
| `IN_PROGRESS` | 진행 중 |
| `COMPLETED` | 조건 달성, 보상 수령 가능 |
| `CLAIMED` | 보상 수령 완료 |

MVP에서는 `CLAIMED` 퀘스트를 오늘의 퀘스트 목록에서 숨기는 방향을 기본값으로 둔다.

## Badge Policy

- 뱃지는 퀘스트 보상 필드에 넣지 않는다.
- 뱃지는 별도 조건 시스템으로 지급한다.
- 조건 예시는 출석 횟수, 누적 EXP, 레벨, 퀘스트 완료 수, 연속 달성 일수다.
- 뱃지 화면에서는 획득한 뱃지와 미획득 뱃지 조건을 확인할 수 있어야 한다.

## Home Summary Response Draft

```json
{
  "userName": "유저 이름",
  "representativeBadgeName": "첫 출석",
  "character": {
    "characterId": "night",
    "colorId": "pistachio",
    "imagePath": "/images/characters/night/pistachio.png",
    "baseImagePath": "/images/characters/night/night.png"
  },
  "level": {
    "level": 1,
    "currentExp": 0,
    "requiredExp": 1000,
    "totalExp": 0,
    "expPercent": 0,
    "maxLevel": 30,
    "isMaxLevel": false
  },
  "point": 0,
  "todayQuests": [
    {
      "questId": "daily-attendance",
      "title": "실습실 출석",
      "rewardName": "100 EXP",
      "rewardExp": 100,
      "rewardPoint": 10,
      "status": "IN_PROGRESS"
    }
  ]
}
```

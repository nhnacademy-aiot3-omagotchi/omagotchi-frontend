/*
 * AI 도우미가 실제로 쓸 수 있는 Tool 과 그 사용 규칙을 사용자 언어로 옮겨둔 곳.
 *
 * 원본은 learning-service 의 아래 파일들이다. 서버에서 Tool 이 추가/삭제되거나
 * @Tool description 의 지원 범위(기간, 기본값 등)가 바뀌면 여기도 반드시 함께 고칠 것.
 *   - chat/application/ChatSystemPrompt.java                 (할 수 있는 일 / 아직 못 하는 일)
 *   - weather/presentation/tool/WeatherTools.java            (날씨)
 *   - study/presentation/tool/StudyTimeSummaryTools.java     (학습 시간 요약)
 *   - study/presentation/tool/StudyPatternTools.java         (내 학습 패턴)
 *   - study/presentation/tool/TopLearnerPatternTools.java    (상위권 비교)
 *   - study/presentation/tool/StudySpaceConditionTools.java  (지금 공부할 공간)
 *   - study/presentation/tool/LearningReportTools.java       (기간 학습 리포트)
 *
 * 계약 문서는 docs 저장소 10-specifications/11-ai-assistant 아래에 있다
 * (README.md 의 "등록된 Tool", 03-학습-코칭-Tool-계약.md).
 */

/** 물어보면 실제로 답해주는 것들. 순서는 패널에 보이는 순서다. */
export const AI_ASSISTANT_TOOLS = [
    {
        id: "study-time-summary",
        icon: "⏱️",
        title: "공부한 시간",
        summary: "정해진 기간 동안 몇 시간 공부했는지, 며칠 공부했는지 딱 숫자로 알려줘요. "
            + "공부한 날 기준으로 하루 평균이 얼마인지도 같이 봐요.",
        hint: "따로 말 안 하면 최근 7일치를 봐요. 지금 돌아가는 타이머는 아직 안 세요",
        examples: ["오늘 몇 시간 공부했어?", "최근 일주일 동안 얼마나 했어?"]
    },
    {
        id: "study-pattern",
        icon: "📈",
        title: "내 학습 패턴",
        summary: "요즘 얼마나, 몇 시쯤, 한 번에 얼마나 오래 공부하는지 정리해줘요. "
            + "앉아 있던 시간 중 실제로 공부한 시간이 얼마나 되는지도 같이 봐요.",
        hint: "따로 말 안 하면 최근 30일치를 봐요",
        examples: ["내 공부 습관 어때?", "언제 공부하는 게 좋아?"]
    },
    {
        id: "top-learner",
        icon: "🏆",
        title: "상위권과 비교",
        summary: "같은 기수에서 공부를 많이 한 사람들은 몇 시에 시작해서 얼마나 앉아 있는지, "
            + "나와 뭐가 다른지 짚어줘요.",
        hint: "누구인지는 알 수 없어요. 여러 명을 묶은 평균만 나와요",
        examples: ["상위권이랑 나랑 뭐가 달라?", "잘하는 사람들은 어떻게 공부해?"]
    },
    {
        id: "study-space",
        icon: "🪟",
        title: "지금 공부할 공간",
        summary: "지금 어느 공간이 공기가 제일 나은지 알려줘요. 답답하지 않은지(이산화탄소), "
            + "덥거나 춥지 않은지, 지금 사람이 있는지까지 같이 봐요.",
        hint: "센서가 잰 최근 한 시간 평균이라, 지금 상태만 볼 수 있어요",
        examples: ["지금 어디서 공부할까?", "지금 여기 공기 어때?"]
    },
    {
        id: "learning-report",
        icon: "📋",
        title: "학습 리포트",
        summary: "한 주 공부를 한 장으로 정리해줘요. 지난주보다 나아졌는지, 상위권과 뭐가 다른지, "
            + "어느 공간에서 잘 됐는지까지 묶어서 알려줘요.",
        hint: "따로 말 안 하면 최근 7일치를 봐요",
        examples: ["이번 주 리포트 만들어줘", "지난주랑 비교해서 어때?"]
    },
    {
        id: "weather",
        icon: "🌤️",
        title: "날씨 예보",
        summary: "어디 날씨인지 지역을 같이 말해주면 찾아줘요.",
        hint: "오늘부터 5일 뒤까지만 볼 수 있어요",
        examples: ["광주 동구 오늘 날씨 어때?", "내일 서울 비 와?"]
    }
];

/** 아직 도구가 없어서, 물어봐도 모른다고 답하는 것들. */
export const AI_ASSISTANT_UPCOMING = [
    "출결 현황 (내가 출석인지 지각인지)",
    "랭킹 (내가 몇 등인지)",
    "팀 활동",
    "퀘스트 진행 상황"
];

/** 대화가 잘 굴러가게 하는 규칙들. */
export const AI_ASSISTANT_TIPS = [
    "\"이번 주\", \"한 달\"처럼 기간을 말하면 그 기간으로 찾아봐요. 하루부터 90일까지 됩니다.",
    "질문은 한 번에 1,000자까지 보낼 수 있어요.",
    "바로 앞 대화 10개까지 기억해요. 한 시간 동안 말을 걸지 않으면 잊어버립니다.",
    "Gemini ↔ Ollama 로 모델을 바꿔도 하던 이야기는 그대로 이어져요.",
    "실제 기록에 있는 값으로만 답해요. 모르는 건 지어내지 않고 모른다고 말합니다."
];

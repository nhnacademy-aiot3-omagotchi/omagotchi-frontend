import React from "react";
import { expect, within } from "storybook/test";
import { renderRankingBoard } from "../../../resources/static/js/home/rankingBoard.js";

/*
 * 랭킹판은 home.js 가 문자열 HTML 로 그린다. React 컴포넌트가 아니라서
 * 스토리도 같은 렌더 함수를 그대로 불러 실제 마크업을 검증한다.
 *
 * CSS 가 .home-overlay--progress 아래로 스코프돼 있으므로 래퍼를 그대로 맞춘다.
 * 래퍼가 어긋나면 스토리만 멀쩡해 보이고 운영 화면은 깨진다.
 */
function RankingBoardStory({ entries }) {
  return (
    <div className="home-overlay home-overlay--progress" style={{ padding: 16, maxWidth: 520 }}>
      <div className="home-overlay-body">
        <section className="overlay-tab-panel" data-overlay-panel="leaders">
          <div className="overlay-section-label">
            <strong>명예의 전당</strong><span></span><em>전체 학습 시간</em>
          </div>
          <div
            className="rank-board"
            aria-label="학습 시간 랭킹"
            data-progress-ranking
            dangerouslySetInnerHTML={{ __html: renderRankingBoard(entries) }}
          />
        </section>
      </div>
    </div>
  );
}

function entry(rank, displayName, studySeconds, overrides = {}) {
  return {
    rank,
    displayName,
    studySeconds,
    characterType: "study",
    colorId: "original",
    attendanceStreakDays: 0,
    ...overrides
  };
}

export default {
  title: "Home/RankingBoard",
  component: RankingBoardStory
};

/** 기본 형태. 시상대 3명 + 4위 이하 목록. */
export const Podium = {
  args: {
    entries: [
      entry(1, "조국과민족을위하여", 37747, { characterType: "night", colorId: "pistachio", attendanceStreakDays: 3 }),
      entry(2, "강강강강", 29629, { characterType: "commit", colorId: "cyan", attendanceStreakDays: 2 }),
      entry(3, "m00n", 13658, { characterType: "sprout", colorId: "light_coral", attendanceStreakDays: 1 }),
      entry(4, "test2", 10135, { characterType: "debug", colorId: "white" }),
      entry(5, "느티나무", 7412, { characterType: "server", colorId: "dark_gray" }),
      entry(6, "지우", 68, { characterType: "kid", colorId: "cream_can" })
    ]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 1위가 가운데에 오도록 2·1·3 순서로 세운다.
    const names = [...canvasElement.querySelectorAll(".rank-podium-name")].map((node) => node.textContent);
    expect(names).toEqual(["강강강강", "조국과민족을위하여", "m00n"]);

    expect(canvasElement.querySelectorAll(".rank-podium-card").length).toBe(3);
    expect(canvasElement.querySelectorAll(".rank-row").length).toBe(3);
    expect(canvas.getByText("10:29:07")).toBeInTheDocument();

    // 메달 색은 등수에 고정된다.
    expect(canvasElement.querySelector(".is-gold .rank-podium-name").textContent).toBe("조국과민족을위하여");
    expect(canvasElement.querySelector(".is-silver .rank-podium-name").textContent).toBe("강강강강");
    expect(canvasElement.querySelector(".is-bronze .rank-podium-name").textContent).toBe("m00n");
  }
};

/** 스트릭 단계별 날개. 0단계는 날개가 없어야 한다. */
export const StreakWings = {
  args: {
    entries: [
      entry(1, "세슘 (3일)", 21600, { characterType: "night", colorId: "pistachio", attendanceStreakDays: 3 }),
      entry(2, "이트 (2일)", 18000, { characterType: "commit", colorId: "cyan", attendanceStreakDays: 2 }),
      entry(3, "셀렌 (1일)", 14400, { characterType: "sprout", colorId: "white", attendanceStreakDays: 1 }),
      entry(4, "날개 없음 (0일)", 3600, { attendanceStreakDays: 0 })
    ]
  },
  play: async ({ canvasElement }) => {
    const wings = [...canvasElement.querySelectorAll(".rank-avatar-wing")].map((node) => node.getAttribute("src"));
    expect(wings.length).toBe(3);
    expect(wings.some((src) => src.includes("grand"))).toBe(true);
    expect(wings.some((src) => src.includes("mas"))).toBe(true);
    expect(wings.some((src) => src.includes("dia"))).toBe(true);

    // 0단계는 캐릭터만 있고 날개 이미지가 붙지 않는다.
    const lastAvatar = canvasElement.querySelector(".rank-row .rank-avatar");
    expect(lastAvatar.querySelector(".rank-avatar-wing")).toBeNull();
    expect(lastAvatar.querySelector(".rank-avatar-character")).not.toBeNull();
  }
};

/** 1명뿐이어도 1위 자리가 가운데에 남아야 한다. */
export const SinglePlayer = {
  args: { entries: [entry(1, "혼자공부", 5400, { characterType: "caffeine", colorId: "cream_can" })] },
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelectorAll(".rank-podium-slot").length).toBe(2);
    const cards = [...canvasElement.querySelector(".rank-podium").children];
    // 왼쪽(2위) 자리가 비고 가운데가 1위여야 한다.
    expect(cards[1].classList.contains("is-gold")).toBe(true);
    expect(canvasElement.querySelector(".rank-rest")).toBeNull();
  }
};

/** 2명. 3위 자리만 빈다. */
export const TwoPlayers = {
  args: {
    entries: [
      entry(1, "일등", 9000, { characterType: "night", colorId: "cyan", attendanceStreakDays: 2 }),
      entry(2, "이등", 7200, { characterType: "debug", colorId: "light_purple" })
    ]
  }
};

/** 대표 캐릭터가 없는 사용자도 순위에서 빠지지 않는다. 기본 캐릭터로 대체한다. */
export const MissingCharacter = {
  args: {
    entries: [
      entry(1, "정상 캐릭터", 9000, { characterType: "night", colorId: "pistachio" }),
      entry(2, "대표 캐릭터 없음", 7200, { characterType: null, colorId: null }),
      entry(3, "이름도 없음", 3600, { displayName: "", characterType: null, colorId: null })
    ]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvasElement.querySelectorAll(".rank-podium-card").length).toBe(3);
    // 이름이 비면 등수로 대체한다.
    expect(canvas.getByText("수강생 (3위)")).toBeInTheDocument();
    const images = [...canvasElement.querySelectorAll(".rank-avatar-character")].map((node) => node.getAttribute("src"));
    expect(images.filter((src) => src.includes("study/study.png")).length).toBe(2);
  }
};

/** 빈 랭킹. 시상대를 그리지 않고 안내 문구만 남긴다. */
export const Empty = {
  args: { entries: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("랭킹 데이터가 없습니다.")).toBeInTheDocument();
    expect(canvasElement.querySelector(".rank-podium")).toBeNull();
  }
};

/** 긴 닉네임이 시상대 폭을 밀어내지 않아야 한다. */
export const LongNames = {
  args: {
    entries: [
      entry(1, "아주아주아주긴닉네임을가진사람입니다", 36000, { characterType: "night", colorId: "pistachio", attendanceStreakDays: 3 }),
      entry(2, "두번째로긴닉네임을가진사람", 28000, { characterType: "commit", colorId: "cyan" }),
      entry(3, "짧음", 14000, { characterType: "kid", colorId: "white" }),
      entry(4, "네번째로아주긴닉네임을가진사람입니다요", 9000, { characterType: "server", colorId: "dark_gray" })
    ]
  }
};

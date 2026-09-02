import assert from "node:assert/strict";
import test from "node:test";
import {
    normalizeRankingEntry,
    rankingCharacterImage,
    renderRankingBoard
} from "../../main/resources/static/js/home/rankingBoard.js";

function entry(overrides = {}) {
    return {
        rank: 1,
        displayName: "조국과민족을위하여",
        studySeconds: 37747,
        characterType: "night",
        colorId: "pistachio",
        attendanceStreakDays: 0,
        ...overrides
    };
}

test("시상대는 2위·1위·3위 순서로 세워 1위를 가운데 둔다", () => {
    const html = renderRankingBoard([
        entry({rank: 1, displayName: "일등"}),
        entry({rank: 2, displayName: "이등"}),
        entry({rank: 3, displayName: "삼등"})
    ]);

    const order = [...html.matchAll(/rank-podium-name">([^<]+)</g)].map((match) => match[1]);
    assert.deepEqual(order, ["이등", "일등", "삼등"]);
    assert.match(html, /is-gold[\s\S]*?일등/);
    assert.match(html, /is-silver[\s\S]*?이등/);
    assert.match(html, /is-bronze[\s\S]*?삼등/);
});

test("4위부터는 목록으로 내려간다", () => {
    const html = renderRankingBoard(
        Array.from({length: 6}, (_, index) => entry({rank: index + 1, displayName: `참가자${index + 1}`}))
    );

    assert.equal((html.match(/rank-podium-card/g) || []).length, 3);
    assert.equal((html.match(/rank-row"/g) || []).length, 3);
    assert.match(html, /rank-rest/);
    // 4위 이하가 시상대로 새어 나오면 안 된다. 시상대 구간만 떼어 확인한다.
    const podiumOnly = html.slice(0, html.indexOf("rank-rest"));
    for (const name of ["참가자4", "참가자5", "참가자6"]) {
        assert.equal(podiumOnly.includes(name), false, `${name}가 시상대에 있습니다.`);
    }
    assert.match(html.slice(html.indexOf("rank-rest")), /참가자4[\s\S]*참가자5[\s\S]*참가자6/);
});

test("인원이 1~2명이어도 1위 자리가 가운데에 남는다", () => {
    const one = renderRankingBoard([entry({rank: 1, displayName: "혼자"})]);
    // 빈 칸 2개 + 1위 카드. 왼쪽(2위) 자리가 먼저 비어야 가운데가 유지된다.
    assert.equal((one.match(/rank-podium-slot/g) || []).length, 2);
    assert.match(one, /rank-podium-slot[\s\S]*?is-gold/);

    const two = renderRankingBoard([entry({rank: 1, displayName: "일등"}), entry({rank: 2, displayName: "이등"})]);
    assert.equal((two.match(/rank-podium-slot/g) || []).length, 1);
    assert.match(two, /is-silver[\s\S]*?is-gold/);
    assert.equal(two.includes("rank-rest"), false);
});

test("빈 랭킹은 안내 문구만 남긴다", () => {
    for (const empty of [[], null, undefined, "이상한값"]) {
        const html = renderRankingBoard(empty);
        assert.match(html, /data-empty-ranking/);
        assert.equal(html.includes("rank-podium-card"), false);
    }
});

test("스트릭 단계별로 날개가 바뀌고 0단계는 날개가 없다", () => {
    const wingOf = (streak) => {
        const html = renderRankingBoard([entry({attendanceStreakDays: streak})]);
        return html.match(/rank-avatar-wing" src="([^"]+)"/)?.[1] ?? null;
    };

    assert.equal(wingOf(0), null);
    assert.match(wingOf(1), /dia/);
    assert.match(wingOf(2), /mas/);
    assert.match(wingOf(3), /grand/);
    // 3일을 넘겨도, 음수나 쓰레기 값이 와도 단계를 벗어나지 않는다.
    assert.match(wingOf(99), /grand/);
    assert.equal(wingOf(-5), null);
    assert.equal(wingOf("이상한값"), null);
});

test("대표 캐릭터가 없으면 기본 캐릭터로 대체하고 순위에서 빼지 않는다", () => {
    assert.equal(rankingCharacterImage({characterType: null, colorId: null}), "/images/characters/study/study.png");
    assert.equal(rankingCharacterImage({characterType: "   "}), "/images/characters/study/study.png");

    const html = renderRankingBoard([entry({characterType: null, colorId: null, displayName: "캐릭없음"})]);
    assert.match(html, /캐릭없음/);
    assert.match(html, /images\/characters\/study\/study\.png/);
});

test("계약을 어긴 값은 버리지 않고 대체한다", () => {
    const normalized = normalizeRankingEntry({rank: "이상한값", displayName: "   ", studySeconds: -10}, 3);

    assert.equal(normalized.rank, 4, "rank가 깨지면 목록 위치로 대체한다");
    assert.equal(normalized.name, "수강생 (4위)");
    assert.equal(normalized.studyTime, "00:00:00", "음수 시간이 그대로 표시되면 안 된다");

    // 항목 자체가 객체가 아니면 그 줄만 빠진다.
    for (const broken of [null, undefined, "문자열", 42, []]) {
        assert.equal(normalizeRankingEntry(broken, 0), null);
    }
    const html = renderRankingBoard([null, entry({displayName: "정상"})]);
    assert.match(html, /정상/);
    assert.equal((html.match(/rank-podium-card/g) || []).length, 1);
});

test("서버 값을 그대로 마크업에 넣지 않는다", () => {
    const html = renderRankingBoard([entry({
        displayName: '<img src=x onerror=alert(1)>',
        characterType: '"><script>alert(1)</script>'
    })]);

    // escapeHtml 은 = 나 ( 를 바꾸지 않으므로 문자열 포함 여부가 아니라
    // 실행 가능한 태그가 만들어졌는지로 판정한다.
    assert.equal(html.includes("<script"), false, "스크립트 태그가 그대로 들어갔습니다.");
    assert.equal(html.includes("<img src=x"), false, "주입된 img 태그가 실행 가능한 형태입니다.");
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/, "따옴표·꺾쇠가 이스케이프돼야 합니다.");
    // 속성값을 깨고 나오는 따옴표도 막혀야 한다.
    assert.equal(/src="[^"]*"[^>]*>/.test(html), true);
    assert.equal(html.includes('"><script'), false);
});

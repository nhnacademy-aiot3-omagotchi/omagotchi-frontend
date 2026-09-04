import assert from "node:assert/strict";
import test from "node:test";

import {
    LAB_PAGE_SIZE,
    clampLabPage,
    formatMeasuredAt,
    getLabPageCount,
    renderLabPanel
} from "../../main/resources/static/js/space/labPanel.js";

function makeLabs(count) {
    return Array.from({ length: count }, (unused, index) => ({
        spaceId: index + 1,
        name: `${index + 1}번 실습실`,
        capacity: 30,
        reservedCount: index,
        operationalStatus: "ACTIVE",
        sensor: { co2: 600, temperature: 23, humidity: 45 }
    }));
}

function cardCount(html) {
    return [...html.matchAll(/<article class="space-room-lab-stage/g)].length;
}

test("한 판은 실습실 네 곳까지만 보여 준다", () => {
    const html = renderLabPanel({ labs: makeLabs(8), page: 0, checkedIn: true });

    assert.equal(LAB_PAGE_SIZE, 4);
    assert.equal(cardCount(html), 4);
    assert.match(html, /1번 실습실/);
    assert.doesNotMatch(html, /5번 실습실/);
    assert.match(html, /1 \/ 2/);
});

test("다음 페이지는 남은 실습실만 채운다", () => {
    const html = renderLabPanel({ labs: makeLabs(6), page: 1, checkedIn: true });

    assert.equal(cardCount(html), 2);
    assert.match(html, /5번 실습실/);
    assert.match(html, /2 \/ 2/);
});

test("한 페이지뿐이면 넘기기 버튼과 페이지 표시를 만들지 않는다", () => {
    const html = renderLabPanel({ labs: makeLabs(4), page: 0, checkedIn: true });

    assert.equal(getLabPageCount(4), 1);
    assert.doesNotMatch(html, /data-space-lab-page/);
    assert.doesNotMatch(html, /space-room-lab-pager/);
});

test("목록이 줄어 페이지가 범위를 벗어나도 마지막 페이지를 보여 준다", () => {
    // 실습실이 8곳에서 3곳으로 줄면 저장된 page=1 은 빈 화면이 된다.
    assert.equal(clampLabPage(1, getLabPageCount(3)), 0);
    assert.equal(clampLabPage(-2, getLabPageCount(8)), 0);
    assert.equal(clampLabPage(9, getLabPageCount(8)), 1);

    const html = renderLabPanel({ labs: makeLabs(3), page: 5, checkedIn: true });
    assert.equal(cardCount(html), 3);
});

test("끝 페이지에서는 그 방향의 넘기기 버튼이 잠긴다", () => {
    const first = renderLabPanel({ labs: makeLabs(8), page: 0, checkedIn: true });
    const last = renderLabPanel({ labs: makeLabs(8), page: 1, checkedIn: true });

    assert.match(first, /data-space-lab-page="prev"[^>]*\n\s*disabled/);
    assert.doesNotMatch(first, /data-space-lab-page="next"[^>]*\n\s*disabled/);
    assert.match(last, /data-space-lab-page="next"[^>]*\n\s*disabled/);
});

test("측정값에 좋다·나쁘다를 붙이지 않는다", () => {
    // 판정 근거는 기수별 임계값 룰인데 그 값을 학생 화면에 내려주는 계약이 없다.
    // 화면이 스스로 등급을 지어내면 알림이 뜨는 조건과 어긋난다.
    const html = renderLabPanel({
        labs: [{
            spaceId: 1,
            name: "AIoT 실습실",
            capacity: 30,
            reservedCount: 4,
            operationalStatus: "ACTIVE",
            sensor: { co2: 1180, temperature: 27.6, humidity: 63, measuredAt: "2026-09-03T10:00:00Z" }
        }],
        checkedIn: true
    });

    assert.doesNotMatch(html, /쾌적|보통|주의/);
    assert.match(html, /1180/);
    assert.match(html, /\d{2}:\d{2} 기준/);
});

test("측정 시각은 시:분까지만 붙인다", () => {
    assert.match(formatMeasuredAt("2026-09-03T10:00:00Z"), /^\d{2}:\d{2} 기준$/);
    assert.equal(formatMeasuredAt(null), "");
    assert.equal(formatMeasuredAt("어제"), "");
});

test("측정값이 없으면 자리를 비워 두고 측정 대기로 알린다", () => {
    const html = renderLabPanel({
        labs: [{ spaceId: 1, name: "AIoT 실습실", capacity: 30, reservedCount: 4, operationalStatus: "ACTIVE" }],
        checkedIn: true
    });

    // 값이 하나도 없을 때만 그 사실을 알린다. 항목마다 반복하지 않는다.
    assert.equal([...html.matchAll(/측정 대기/g)].length, 1);
    assert.equal([...html.matchAll(/—/g)].length, 3);
});

test("센서가 없는 공간은 측정 대기가 아니라 센서 없음이다", () => {
    // 설치 전인 공간에 "측정 대기"라고 하면 곧 값이 올 것처럼 읽힌다.
    const html = renderLabPanel({
        labs: [{
            spaceId: 1,
            name: "AIoT 실습실",
            capacity: 30,
            reservedCount: 4,
            operationalStatus: "ACTIVE",
            sensor: { co2: null, temperature: null, humidity: null, measuredAt: null, deviceCount: 0 }
        }],
        checkedIn: true
    });

    assert.match(html, /센서 없음/);
    assert.doesNotMatch(html, /측정 대기/);
});

test("센서는 있는데 값이 없으면 측정 대기로 둔다", () => {
    const html = renderLabPanel({
        labs: [{
            spaceId: 1,
            name: "AIoT 실습실",
            capacity: 30,
            reservedCount: 4,
            operationalStatus: "ACTIVE",
            sensor: { co2: null, temperature: null, humidity: null, measuredAt: null, deviceCount: 2 }
        }],
        checkedIn: true
    });

    assert.match(html, /측정 대기/);
    assert.doesNotMatch(html, /센서 없음/);
});

test("null로 내려온 측정값을 0으로 읽지 않는다", () => {
    // 서버는 값이 없는 항목을 null로 내려준다. Number(null)은 0이라 그대로 쓰면 0ppm이 된다.
    const html = renderLabPanel({
        labs: [{
            spaceId: 1,
            name: "AIoT 실습실",
            capacity: 30,
            reservedCount: 4,
            operationalStatus: "ACTIVE",
            sensor: { co2: null, temperature: 23.4, humidity: null }
        }],
        checkedIn: true
    });

    assert.doesNotMatch(html, /0\s*<small>ppm/);
    assert.match(html, /23\.4\s*<small>℃/);
    assert.equal([...html.matchAll(/—/g)].length, 2);
    // 한 항목이라도 값이 있으면 측정 대기가 아니다
    assert.doesNotMatch(html, /측정 대기/);
});

test("체크인 전에는 어떤 실습실도 선택할 수 없다", () => {
    const html = renderLabPanel({ labs: makeLabs(2), checkedIn: false });

    assert.equal([...html.matchAll(/체크인 후 선택 가능/g)].length, 2);
    assert.equal([...html.matchAll(/data-space-lab-move="\d+" disabled/g)].length, 2);
});

test("정원이 찬 실습실은 이동 버튼 대신 정원 마감을 보여 준다", () => {
    const html = renderLabPanel({
        labs: [{ spaceId: 7, name: "보안 실습실", capacity: 20, reservedCount: 20, operationalStatus: "ACTIVE" }],
        checkedIn: true
    });

    assert.match(html, /data-space-lab-move="7" disabled/);
    assert.equal([...html.matchAll(/정원 마감/g)].length, 2);
});

test("현재 이용 중인 실습실은 다시 이동할 수 없다", () => {
    const html = renderLabPanel({ labs: makeLabs(2), checkedIn: true, currentSpaceId: "2" });

    assert.match(html, /is-current/);
    assert.equal([...html.matchAll(/현재 이용 중/g)].length, 2);
});

test("회의 중에는 회의 종료 후 선택하도록 안내한다", () => {
    const html = renderLabPanel({ labs: makeLabs(1), checkedIn: true, inMeeting: true });

    assert.match(html, /회의 종료 후 선택 가능/);
    assert.match(html, /data-space-lab-move="1" disabled/);
});

test("불러오는 중과 실패 상태는 목록 대신 안내만 보여 준다", () => {
    const loading = renderLabPanel({ labs: makeLabs(4), loading: true });
    const failed = renderLabPanel({ labs: makeLabs(4), error: "공간 정보를 불러오지 못했습니다." });

    assert.match(loading, /실습실 정보를 불러오는 중입니다/);
    assert.equal(cardCount(loading), 0);
    assert.match(failed, /data-space-retry/);
    assert.equal(cardCount(failed), 0);
});

test("기수 유무에 따라 빈 화면 문구가 달라진다", () => {
    const noLab = renderLabPanel({ labs: [], hasCohort: true });
    const noCohort = renderLabPanel({ labs: [], hasCohort: false });

    assert.match(noLab, /배정된 실습실이 없습니다/);
    assert.match(noCohort, /참여 중인 기수가 없습니다/);
});

test("실습실 이름은 그대로 출력하지 않고 이스케이프한다", () => {
    const html = renderLabPanel({
        labs: [{ spaceId: 1, name: "<img src=x onerror=alert(1)>", capacity: 10, operationalStatus: "ACTIVE" }],
        checkedIn: true
    });

    assert.doesNotMatch(html, /<img src=x/);
    assert.match(html, /&lt;img src=x/);
});

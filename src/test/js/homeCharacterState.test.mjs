import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const levelSource = await readFile(
    new URL("../../main/resources/static/js/home/level.js", import.meta.url), "utf8");
const homeStageSource = await readFile(
    new URL("../../main/frontend/home-react/components/HomeStage.jsx", import.meta.url), "utf8");
const statusHudSource = await readFile(
    new URL("../../main/frontend/home-react/components/StatusHud.jsx", import.meta.url), "utf8");
const homeSource = await readFile(
    new URL("../../main/resources/static/js/home.js", import.meta.url), "utf8");

/*
 * XP 바와 레벨 숫자는 React(StatusHud)가 소유한다.
 *
 * 예전에는 home.js 가 [data-xp-fill] 을 querySelector 로 잡아 style.width 를 직접
 * 고쳤다. 그 노드는 React 가 그리므로 리렌더에 값이 되돌아가고, 노드가 교체되면
 * 문서에서 떨어진 노드를 고치게 된다. 보상을 받아도 바가 안 움직인 원인이다.
 * 아래 테스트는 그 구조가 되살아나는 것을 막는다.
 */
test("level.js 는 성장 상태를 DOM 이 아니라 이벤트로 넘긴다", () => {
    // 축포(.level-up-celebration)는 level.js 가 직접 만들어 document.body 에 붙이는
    // 자기 소유 노드라 조회해도 된다. 금지 대상은 React 가 그리는 노드다.
    for (const selector of ["data-xp-fill", "data-current-xp", "data-next-level", "data-character-level",
                            "data-home-character", "data-character-stage"]) {
        assert.equal(levelSource.includes(selector), false,
            `level.js 가 React 소유 노드(${selector})를 잡고 있습니다.`);
    }
    assert.equal(/xpFill|currentXpLabel|nextLevelLabel|levelElement/.test(levelSource), false,
        "level.js 에 React 소유 노드 참조가 남아 있습니다.");
    assert.equal(/\.style\.width/.test(levelSource), false,
        "level.js 가 style 을 직접 쓰고 있습니다.");
    assert.match(levelSource, /omagotchi:home-character-update/);
    assert.match(levelSource, /globalThis\.OmagotchiHomeCharacter/);
});

test("home.js 는 XP 바 노드를 캐시하지 않는다", () => {
    for (const selector of ["data-xp-fill", "data-current-xp", "data-next-level", "data-character-level"]) {
        assert.equal(homeSource.includes(selector), false,
            `home.js 가 ${selector} 를 직접 잡고 있습니다.`);
    }
});

test("HomeStage 는 성장 상태 이벤트를 받아 React state 로 관리한다", () => {
    assert.match(homeStageSource, /omagotchi:home-character-update/);
    // 마운트가 이벤트보다 늦어도 초기값을 놓치지 않아야 한다.
    assert.match(homeStageSource, /globalThis\.OmagotchiHomeCharacter/);
    assert.match(homeStageSource, /removeEventListener\("omagotchi:home-character-update"/);
});

test("레벨업 연출 클래스는 React 가 붙인다", () => {
    // 명령형으로 붙이면 다음 리렌더에 지워진다.
    assert.equal(/classList\.(add|remove)\(["']is-level-up/.test(levelSource), false,
        "level.js 가 is-level-up 을 직접 토글하고 있습니다.");
    assert.match(statusHudSource, /levelUp \? "is-level-up"/);
    assert.match(homeStageSource, /levelUp=\{levelUp\}/);
});

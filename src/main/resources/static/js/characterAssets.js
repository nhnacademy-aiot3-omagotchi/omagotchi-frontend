// 캐릭터 PNG와 눈 깜빡임 GIF의 파일명 차이를 한 곳에서 관리합니다.
window.OmagotchiCharacterAssets = (() => {
    /*
     * 캐릭터 이미지 캐시 버전.
     *
     * 이미지 URL에는 JS처럼 빌드 해시가 붙지 않는데, 운영 응답은
     * Cache-Control: max-age=14400 (4시간)이다. 그래서 파일명을 그대로 두고
     * 내용만 바꾸면 최대 4시간 동안 옛 그림이 그대로 보인다.
     *
     * 예전에는 새 파일명(_eye3.gif)을 만들어 이 문제를 피했지만,
     * 캐릭터마다 예외 표가 늘어나 규칙이 무너졌다. 대신 여기 한 줄을 올린다.
     *
     * 캐릭터 이미지를 교체하면 이 값을 반드시 갱신할 것. 안 올리면 화면이 안 바뀐다.
     */
    const ASSET_VERSION = "20260903-1";

    /** 정적 이미지 경로에 캐시 버전을 붙인다. */
    function versioned(path) {
        return `${path}?v=${ASSET_VERSION}`;
    }

    const defaultGifNames = {
        pistachio: "Pistachio_eye.gif",
        cyan: "Cyan_eye.gif",
        cream_can: "Cream_Can_eye.gif",
        light_coral: "Light_Coral_eye.gif",
        light_purple: "Light_Purple_eye.gif",
        white: "White_eye.gif",
        dark_gray: "Dark_Gray_eye.gif"
    };
// 이미지 파일명 통일화
    const gifNameOverrides = {
        caffeine: {
            cream_can: "cream_Can_eye.gif"
        },
        debug: {
            cream_can: "cream_Can_eye.gif",
            light_coral: "Coral_eyel.gif"
        },
        server: {
            cream_can: "cream_Can_eye.gif"
        },
        sprout: {
            light_coral: "Light_Cora_eyel.gif"
        },
        study: {
            cream_can: "cream_Can_eye.gif",
            light_coral: "Cora_eyel.gif"
        }
        // night 는 2026-08-06 캐릭터 변경분(_eye3.gif)을 정식 파일명으로 승격해
        // 예외가 사라졌다. 기본 규칙만으로 해석된다.
    };

    function getPng(characterId, colorId = "original") {
        const fileName = colorId === "original"
            ? `${characterId}.png`
            : `${colorId}.png`;

        return versioned(`/images/characters/${characterId}/${fileName}`);
    }

    function getEyeGif(characterId, colorId = "original") {
        const fileName = colorId === "original"
            ? `${characterId}_eye.gif`
            : gifNameOverrides[characterId]?.[colorId] || defaultGifNames[colorId];

        return fileName
            ? versioned(`/images/characters/${characterId}/${fileName}`)
            : getPng(characterId, colorId);
    }

    return {
        ASSET_VERSION,
        versioned,
        getPng,
        getEyeGif
    };
})();

// 캐릭터 PNG와 눈 깜빡임 GIF의 파일명 차이를 한 곳에서 관리합니다.
window.OmagotchiCharacterAssets = (() => {
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
    };

    function getPng(characterId, colorId = "original") {
        const fileName = colorId === "original"
            ? `${characterId}.png`
            : `${colorId}.png`;

        return `/images/characters/${characterId}/${fileName}`;
    }

    function getEyeGif(characterId, colorId = "original") {
        const fileName = colorId === "original"
            ? `${characterId}_eye.gif`
            : gifNameOverrides[characterId]?.[colorId] || defaultGifNames[colorId];

        return fileName
            ? `/images/characters/${characterId}/${fileName}`
            : getPng(characterId, colorId);
    }

    return {
        getPng,
        getEyeGif
    };
})();

(() => {
    const isImage = (target) => target instanceof HTMLImageElement;

    document.querySelectorAll("img").forEach((image) => {
        image.draggable = false;
    });

    // 동적으로 추가되는 캐릭터 이미지도 드래그하거나 우클릭으로 저장하지 못하게 한다.
    document.addEventListener("dragstart", (event) => {
        if (isImage(event.target)) {
            event.preventDefault();
        }
    });

    document.addEventListener("contextmenu", (event) => {
        if (isImage(event.target)) {
            event.preventDefault();
        }
    });
})();

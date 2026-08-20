(function () {
    const root = document.documentElement;
    let ticking = false;

    function getMaxScroll() {
        return Math.max(
            0,
            root.scrollHeight,
            document.body?.scrollHeight || 0
        ) - window.innerHeight;
    }

    function updateScrollCue() {
        const maxScroll = getMaxScroll();
        const canScroll = maxScroll > 24;
        const isNearBottom = window.scrollY >= maxScroll - 16;

        document.body.classList.toggle("has-scroll-cue", canScroll);
        document.body.classList.toggle("is-scroll-cue-hidden", !canScroll || isNearBottom);
        ticking = false;
    }

    function requestUpdate() {
        if (ticking) {
            return;
        }

        ticking = true;
        window.requestAnimationFrame(updateScrollCue);
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    window.addEventListener("load", requestUpdate);
    document.addEventListener("DOMContentLoaded", requestUpdate);

    if ("ResizeObserver" in window) {
        new ResizeObserver(requestUpdate).observe(document.body);
    }
})();

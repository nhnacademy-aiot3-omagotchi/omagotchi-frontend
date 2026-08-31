(() => {
    const CONTEXT_EVENT = "omagotchi:manager-telegram:context";

    /**
     * 이 패널은 Learning Service 응답을 변환하지 않는다.
     *
     * React 섬(TelegramLink)이 서버 필드명을 그대로 읽도록 만들어져 있으므로,
     * 여기에서 이름을 바꾸면 화면과 어긋난다.
     */
    function telegramApi() {
        return window.OmagotchiApi?.telegram || null;
    }

    /** 미연동은 404다. 오류가 아니라 정상 상태이므로 빈 값으로 바꿔 받는다. */
    function isNotLinked(cause) {
        return cause?.status === 404;
    }

    function create({ root, setBubble }) {
        if (!root) throw new Error("Telegram panel root is required.");
        if (!root.querySelector("[data-manager-telegram-react-root]")) {
            throw new Error("Telegram React island root is missing.");
        }

        let loadSequence = 0;
        let loaded = false;
        let link = null;
        let token = null;
        let loading = false;
        let issuing = false;
        let error = null;

        function publish() {
            const context = Object.freeze({
                link,
                token,
                loading,
                issuing,
                error,
                onIssue: issueToken,
                onRetry: loadLink
            });
            window.OmagotchiManagerTelegramContext = context;
            if (window.OmagotchiManagerTelegramIsland?.render) {
                window.OmagotchiManagerTelegramIsland.render(context);
            } else {
                window.dispatchEvent(new CustomEvent(CONTEXT_EVENT, { detail: context }));
            }
        }

        function warn(message, cause) {
            console.error(message, cause);
            setBubble?.(message);
        }

        async function loadLink() {
            const api = telegramApi();
            if (!api) {
                warn("텔레그램 API를 사용할 수 없습니다.\napi.js 로드를 확인해 주세요.");
                return;
            }

            const sequence = ++loadSequence;
            loading = true;
            error = null;
            publish();

            try {
                const response = await api.getMyLink();
                if (sequence !== loadSequence) return;
                link = response || null;
                // 연동이 끝났으면 들고 있던 링크는 쓸모가 없다.
                if (link) token = null;
            } catch (cause) {
                if (sequence !== loadSequence) return;
                link = null;
                if (!isNotLinked(cause)) {
                    error = cause?.message || "연동 상태를 불러오지 못했습니다.";
                    warn("텔레그램 연동 상태를\n불러오지 못했습니다.", cause);
                }
            } finally {
                if (sequence === loadSequence) {
                    loaded = true;
                    loading = false;
                    publish();
                }
            }
        }

        async function issueToken() {
            const api = telegramApi();
            if (!api || issuing) return;

            issuing = true;
            error = null;
            publish();

            try {
                token = await api.issueLinkToken();
                setBubble?.("연동 링크를\n발급했습니다.");
            } catch (cause) {
                token = null;
                error = cause?.message || "연동 링크를 발급하지 못했습니다.";
                warn("연동 링크를\n발급하지 못했습니다.", cause);
            } finally {
                issuing = false;
                publish();
            }
        }

        function activate() {
            publish();
            // 다른 창이나 봇에서 연동이 끝났을 수 있어 패널을 열 때마다 다시 확인한다.
            // 발급해 둔 링크가 있으면 그 상태를 지키기 위해 첫 진입에서만 부른다.
            if (!loaded || !token) loadLink();
        }

        return Object.freeze({ activate });
    }

    window.OmagotchiDashboardPanels.register({
        key: "telegram",
        route: "telegram",
        label: "텔레그램",
        order: 100,
        // 연동은 계정에 붙는다. 기수를 바꿔도 다시 부를 이유가 없다.
        topics: [],
        create
    });
})();

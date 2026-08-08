(() => {
    const API_BASE = window.OMAGOTCHI_API_BASE || document.documentElement.dataset.apiBase || "/bff/v1";
    const STRICT = Boolean(window.OMAGOTCHI_API_STRICT);

    function toUrl(path) {
        return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
    }

    async function request(path, options = {}) {
        const { body, headers = {}, ...rest } = options;
        const hasBody = body !== undefined;
        const response = await fetch(toUrl(path), {
            credentials: "same-origin",
            headers: {
                Accept: "application/json",
                ...(hasBody ? { "Content-Type": "application/json" } : {}),
                ...headers
            },
            body: hasBody ? JSON.stringify(body) : undefined,
            ...rest
        });

        if (response.status === 204) {
            return null;
        }

        const contentType = response.headers.get("content-type") || "";
        const payload = contentType.includes("application/json")
            ? await response.json()
            : await response.text();

        if (!response.ok) {
            const message = typeof payload === "object" && payload?.message
                ? payload.message
                : `API request failed: ${response.status}`;
            throw new Error(message);
        }

        return payload;
    }

    async function optional(path, options) {
        try {
            return await request(path, options);
        } catch (error) {
            if (STRICT) {
                throw error;
            }
            console.info("[API] Fallback active:", path, error.message);
            return null;
        }
    }

    function subscribe(path, handlers = {}) {
        if (!("EventSource" in window)) {
            return null;
        }

        const source = new EventSource(toUrl(path), { withCredentials: true });
        source.onmessage = (event) => {
            try {
                handlers.message?.(JSON.parse(event.data));
            } catch {
                handlers.message?.(event.data);
            }
        };
        source.onerror = (event) => handlers.error?.(event, source);
        return source;
    }

    window.OmagotchiApi = {
        request,
        optional,
        auth: {
            login: (payload) => optional("/auth/login", { method: "POST", body: payload }),
            register: (payload) => optional("/auth/register", { method: "POST", body: payload }),
            updateProfile: (payload) => optional("/me/profile", { method: "PUT", body: payload }),
            lookupPasswordReset: (payload) => optional("/auth/password-reset/lookup", { method: "POST", body: payload }),
            resetPassword: (payload) => optional("/auth/password-reset", { method: "POST", body: payload }),
            managerLogin: (payload) => optional("/manager/auth/login", { method: "POST", body: payload }),
            managerRegister: (payload) => optional("/manager/auth/register", { method: "POST", body: payload })
        },
        character: {
            saveSelection: (payload) => optional("/me/character", { method: "PUT", body: payload })
        },
        attendance: {
            getHistory: () => optional("/attendance/history"),
            getToday: () => optional("/attendance/today"),
            checkIn: () => optional("/attendance/check-in", { method: "POST" }),
            checkOut: () => optional("/attendance/check-out", { method: "POST" })
        },
        presence: {
            getLabPresence: () => optional("/presence/lab"),
            subscribeLabPresence: (handlers) => subscribe("/presence/lab/stream", handlers)
        },
        studyRecords: {
            list: () => optional("/study-records"),
            create: (payload) => optional("/study-records", { method: "POST", body: payload }),
            update: (id, payload) => optional(`/study-records/${encodeURIComponent(id)}`, { method: "PATCH", body: payload })
        },
        cohort: {
            applyByCode: (payload) => optional("/cohorts/applications", { method: "POST", body: payload })
        },
        community: {
            createPost: (payload) => optional("/community/posts", { method: "POST", body: payload })
        },
        manager: {
            getDashboard: () => optional("/manager/dashboard")
        }
    };
})();

const TRACKS_URL = "/audio/bgm/manifest.json";
const STORAGE_KEY = "omagotchiBgmState";

function readState() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
        return {};
    }
}

function writeState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function shuffleIndexes(length) {
    const indexes = Array.from({ length }, (_, index) => index);
    for (let index = indexes.length - 1; index > 0; index -= 1) {
        const target = Math.floor(Math.random() * (index + 1));
        [indexes[index], indexes[target]] = [indexes[target], indexes[index]];
    }
    return indexes;
}

export function createBgmPlayer({ root }) {
    if (!root) {
        return { init: () => {} };
    }

    const audio = new Audio();
    const saved = readState();
    const playButton = root.querySelector("[data-bgm-play]");
    const nextButton = root.querySelector("[data-bgm-next]");
    const listButton = root.querySelector("[data-bgm-list]");
    const shuffleButton = root.querySelector("[data-bgm-shuffle]");
    const volumeInput = root.querySelector("[data-bgm-volume]");
    const titleElement = root.querySelector("[data-bgm-title]");
    const artistElement = root.querySelector("[data-bgm-artist]");
    const panel = root.querySelector("[data-bgm-panel]");
    const trackList = root.querySelector("[data-bgm-tracks]");

    let tracks = [];
    let queue = [];
    let queuePosition = 0;
    let currentIndex = 0;
    let playing = false;
    let shuffleEnabled = Boolean(saved.shuffle);

    audio.preload = "metadata";
    const savedVolume = Number(saved.volume);
    audio.volume = Number.isFinite(savedVolume)
        ? Math.min(1, Math.max(0, savedVolume))
        : 0.22;

    if (volumeInput) {
        volumeInput.value = String(Math.round(audio.volume * 100));
    }

    function currentTrack() {
        return tracks[currentIndex];
    }

    function buildQueue(startIndex = currentIndex) {
        queue = shuffleEnabled ? shuffleIndexes(tracks.length) : tracks.map((_, index) => index);
        queuePosition = Math.max(0, queue.indexOf(startIndex));
        if (tracks.length && queuePosition < 0) {
            queuePosition = 0;
        }
    }

    function startNextQueueCycle() {
        queue = shuffleEnabled ? shuffleIndexes(tracks.length) : tracks.map((_, index) => index);
        queuePosition = 0;
    }

    function render() {
        const track = currentTrack();
        if (titleElement) titleElement.textContent = track?.title || "BGM 준비 중";
        if (artistElement) artistElement.textContent = track?.artist || "Pixabay";
        if (playButton) {
            playButton.textContent = playing ? "II" : "▶";
            playButton.setAttribute("aria-label", playing ? "BGM 정지" : "BGM 재생");
            playButton.title = playing ? "BGM 정지" : "BGM 재생";
        }
        if (nextButton) {
            nextButton.disabled = tracks.length < 2;
        }
        if (listButton) {
            listButton.setAttribute("aria-expanded", String(panel?.hidden === false));
        }
        if (shuffleButton) {
            shuffleButton.classList.toggle("is-active", shuffleEnabled);
            shuffleButton.setAttribute("aria-pressed", String(shuffleEnabled));
        }
        if (trackList) {
            trackList.innerHTML = tracks.map((item, index) => `
                <li>
                    <button
                        type="button"
                        class="${index === currentIndex ? "is-current" : ""}"
                        data-bgm-track="${index}"
                        aria-current="${index === currentIndex ? "true" : "false"}"
                    >
                        <span>${item.title}</span>
                        <small>${item.artist}</small>
                    </button>
                </li>
            `).join("");
        }
    }

    function saveCurrentState() {
        writeState({
            volume: audio.volume,
            trackId: currentTrack()?.id || null,
            shuffle: shuffleEnabled
        });
    }

    function setTrack(index) {
        currentIndex = index;
        const track = currentTrack();
        if (!track) {
            render();
            return;
        }
        audio.src = track.src;
        saveCurrentState();
        render();
    }

    function pickInitialTrack() {
        const savedTrackIndex = tracks.findIndex((track) => track.id === saved.trackId);
        currentIndex = savedTrackIndex >= 0 ? savedTrackIndex : 0;
        buildQueue(currentIndex);
        setTrack(currentIndex);
    }

    async function play() {
        if (!currentTrack()) {
            return;
        }
        try {
            await audio.play();
            playing = true;
        } catch {
            playing = false;
        }
        render();
    }

    function pause() {
        audio.pause();
        playing = false;
        render();
    }

    async function next({ autoplay = false } = {}) {
        if (!tracks.length) {
            return;
        }
        const shouldResume = autoplay || playing || !audio.paused;
        queuePosition += 1;
        if (queuePosition >= queue.length) {
            startNextQueueCycle();
        }
        setTrack(queue[queuePosition]);
        if (shouldResume) {
            await play();
        }
    }

    async function selectTrack(index) {
        if (!tracks[index]) {
            return;
        }
        const shouldResume = playing || !audio.paused;
        setTrack(index);
        buildQueue(index);
        if (shouldResume) {
            await play();
        }
    }

    function togglePanel() {
        if (!panel) {
            return;
        }
        panel.hidden = panel.hidden === false;
        render();
    }

    function toggleShuffle() {
        shuffleEnabled = !shuffleEnabled;
        buildQueue(currentIndex);
        saveCurrentState();
        render();
    }

    async function toggle() {
        if (playing) {
            pause();
            return;
        }
        await play();
    }

    async function init() {
        try {
            const response = await fetch(TRACKS_URL);
            tracks = await response.json();
            pickInitialTrack();
        } catch {
            tracks = [];
            render();
            return;
        }

        playButton?.addEventListener("click", toggle);
        nextButton?.addEventListener("click", () => next({ autoplay: playing }));
        listButton?.addEventListener("click", togglePanel);
        shuffleButton?.addEventListener("click", toggleShuffle);
        trackList?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-bgm-track]");
            if (!button) {
                return;
            }
            selectTrack(Number(button.dataset.bgmTrack));
        });
        volumeInput?.addEventListener("input", () => {
            audio.volume = Math.min(1, Math.max(0, Number(volumeInput.value) / 100));
            saveCurrentState();
        });
        document.addEventListener("click", (event) => {
            if (panel?.hidden === false && !root.contains(event.target)) {
                panel.hidden = true;
                render();
            }
        });
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && panel?.hidden === false) {
                panel.hidden = true;
                render();
            }
        });
        audio.addEventListener("ended", () => next({ autoplay: true }));
        audio.addEventListener("pause", () => {
            playing = false;
            render();
        });
        audio.addEventListener("play", () => {
            playing = true;
            render();
        });
    }

    return { init };
}

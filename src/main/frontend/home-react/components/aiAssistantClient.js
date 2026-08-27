export async function* streamAiChat(question, {signal, model = "GEMINI"} = {}) {
    const params = new URLSearchParams({question, model});
    const response = await fetch(`/bff/v1/ai/chat?${params.toString()}`, {
        method: "GET",
        credentials: "same-origin",
        headers: {Accept: "text/event-stream"},
        signal
    });

    if (!response.ok) {
        throw new Error(`AI 응답 요청 실패: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const {value, done} = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, {stream: true});

        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
            const dataLines = frame.split("\n").filter((line) => line.startsWith("data:"));
            if (dataLines.length > 0) {
                yield dataLines.map((line) => line.slice(5).replace(/^ /, "")).join("\n");
            }
        }
    }
}

export async function* streamAiChat(question, {signal, model = "GEMINI"} = {}) {
    const streamChat = globalThis.OmagotchiApi?.ai?.streamChat;
    if (typeof streamChat !== "function") throw new Error("AI API is unavailable");
    const response = await streamChat(question, {signal, model});
    if (!response.body) throw new Error("AI 응답 스트림을 열지 못했습니다.");

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

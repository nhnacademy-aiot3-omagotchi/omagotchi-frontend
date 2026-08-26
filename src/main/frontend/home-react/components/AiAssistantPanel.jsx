import React, {useEffect, useRef, useState} from "react";
import PropTypes from "prop-types";
import {streamAiChat} from "./aiAssistantClient.js";

export function AiAssistantPanel({
                                     open = false,
                                     setOpen = () => {
                                     },
                                     characterImage = "",
                                     characterName = ""
                                 }) {
    const [touchStartX, setTouchStartX] = useState(null);
    const [currentCharacter, setCurrentCharacter] = useState({
        image: characterImage,
        name: characterName
    });
    const [draft, setDraft] = useState("");
    const [messages, setMessages] = useState([]);
    const [status, setStatus] = useState("ready");
    const abortControllerRef = useRef(null);

    useEffect(() => {
        const character = document.querySelector("[data-home-character]");
        const name = document.querySelector("[data-character-name]");

        const syncCurrentCharacter = () => {
            setCurrentCharacter({
                image: characterImage || character?.getAttribute("src") || "",
                name: characterName || name?.textContent?.trim() || "오마고치"
            });
        };

        syncCurrentCharacter();

        const observer = new MutationObserver(syncCurrentCharacter);
        if (!characterImage && character) {
            observer.observe(character, {attributes: true, attributeFilter: ["src"]});
        }
        if (!characterName && name) {
            observer.observe(name, {characterData: true, childList: true, subtree: true});
        }

        return () => observer.disconnect();
    }, [characterImage, characterName]);

    useEffect(() => {
        if (!open && abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setStatus((current) => (current === "submitting" || current === "streaming" ? "ready" : current));
        }
    }, [open]);

    useEffect(() => () => abortControllerRef.current?.abort(), []);

    const handleTouchEnd = (event) => {
        if (touchStartX == null) return;
        const deltaX = event.changedTouches[0].clientX - touchStartX;
        if (open && deltaX > 46) setOpen(false);
        setTouchStartX(null);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const question = draft.trim();
        if (!question || status === "submitting" || status === "streaming") return;

        setMessages((current) => [...current, {role: "user", text: question}]);
        setDraft("");
        setStatus("submitting");

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            let assistantIndex = -1;
            for await (const chunk of streamAiChat(question, {signal: controller.signal})) {
                setStatus("streaming");
                setMessages((current) => {
                    if (assistantIndex === -1) {
                        assistantIndex = current.length;
                        return [...current, {role: "assistant", text: chunk}];
                    }
                    const next = [...current];
                    next[assistantIndex] = {...next[assistantIndex], text: next[assistantIndex].text + chunk};
                    return next;
                });
            }
            setStatus("ready");
        } catch (error) {
            if (error.name !== "AbortError") {
                setMessages((current) => [
                    ...current,
                    {role: "assistant", text: "답변을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요."}
                ]);
                setStatus("error");
            }
        } finally {
            abortControllerRef.current = null;
        }
    };

    const isBusy = status === "submitting" || status === "streaming";

    return (
        <section
            className={open ? "home-ai-drawer is-open" : "home-ai-drawer"}
            aria-label="AI 도우미"
            data-ai-assistant-open={open ? "true" : "false"}
            onTouchStart={(event) => setTouchStartX(event.touches[0].clientX)}
            onTouchEnd={handleTouchEnd}
        >
            <div
                className="home-ai-panel"
                id="home-ai-assistant-panel"
                aria-hidden={!open}
            >
                <header className="home-ai-panel-heading">
          <span className="home-ai-panel-icon" aria-hidden="true">
            <img src="/images/app/commu.png" alt=""/>
          </span>
                    <span className="home-ai-panel-title">
            <strong>AI 도우미</strong>
            <small>학습을 돕는 오마고치 AI</small>
          </span>
                    <button
                        className="home-ai-panel-close"
                        type="button"
                        aria-label="AI 도우미 닫기"
                        onClick={() => setOpen(false)}
                    >
                        ×
                    </button>
                </header>
                <div className="home-ai-conversation">
                    <div className="home-ai-character-reply">
                        <span className="home-ai-character-avatar" aria-hidden="true">
                            {currentCharacter.image ? (
                                <img src={currentCharacter.image} alt=""/>
                            ) : (
                                <span className="home-ai-character-placeholder">AI</span>
                            )}
                        </span>
                        <div
                            className="home-ai-thinking-bubble"
                            role="status"
                            aria-live="polite"
                            aria-label={`${currentCharacter.name}가 답변을 준비하고 있습니다.`}
                        >
                            <span className="home-ai-thinking-label">답변 준비 중</span>
                            <span className="home-ai-thinking-dots" aria-hidden="true">
                <span className="home-ai-thinking-dot"></span>
                <span className="home-ai-thinking-dot"></span>
                <span className="home-ai-thinking-dot"></span>
              </span>
                        </div>
                    </div>
                    {messages.length === 0 && (
                        <div className="home-ai-message is-assistant">
                            <span className="home-ai-message-author">{currentCharacter.name}</span>
                            <p>궁금한 걸 물어보세요. 예: &quot;오늘 날씨 어때?&quot;</p>
                        </div>
                    )}
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={message.role === "user" ? "home-ai-message is-user" : "home-ai-message is-assistant"}
                        >
              <span className="home-ai-message-author">
                {message.role === "user" ? "나" : currentCharacter.name}
              </span>
                            <p>{message.text}</p>
                        </div>
                    ))}
                </div>
                <form className="home-ai-composer" onSubmit={handleSubmit}>
                    <label className="home-ai-composer-label" htmlFor="home-ai-prompt">
                        AI 도우미에게 질문하기
                    </label>
                    <textarea
                        id="home-ai-prompt"
                        rows="2"
                        placeholder="메시지를 입력하세요."
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        disabled={isBusy}
                    ></textarea>
                    <div className="home-ai-composer-actions">
                        <button className="home-ai-model-select" type="button" disabled>
                            <span>모델</span>
                            <strong>연결 후 선택</strong>
                            <span aria-hidden="true">⌄</span>
                        </button>
                        <span className="home-ai-panel-status">
              {status === "error" ? "오류가 발생했습니다" : isBusy ? "답변 중..." : "준비됨"}
            </span>
                        <button
                            className="home-ai-send"
                            type="submit"
                            aria-label="메시지 전송"
                            disabled={isBusy || draft.trim().length === 0}
                        >
                            ↑
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
}

AiAssistantPanel.propTypes = {
    open: PropTypes.bool,
    setOpen: PropTypes.func,
    characterImage: PropTypes.string,
    characterName: PropTypes.string
};

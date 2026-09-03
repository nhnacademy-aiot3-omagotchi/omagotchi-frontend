import React, {useEffect, useRef, useState} from "react";
import { PanelHeader } from "../../ui/PanelHeader.jsx";
import PropTypes from "prop-types";
import {streamAiChat} from "./aiAssistantClient.js";
import {AI_ASSISTANT_TIPS, AI_ASSISTANT_TOOLS, AI_ASSISTANT_UPCOMING} from "./aiAssistantGuide.js";

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
    const [guideOpen, setGuideOpen] = useState(false);
    const abortControllerRef = useRef(null);
    const conversationRef = useRef(null);
    const guideRef = useRef(null);
    const focusPromptOnGuideCloseRef = useRef(false);
    const helpButtonRef = useRef(null);
    const promptRef = useRef(null);
    const stickToBottomRef = useRef(true);
    const [model, setModel] = useState("GEMINI");

    const handleConversationScroll = () => {
        const conversation = conversationRef.current;
        if (!conversation) return;

        const distanceFromBottom =
            conversation.scrollHeight - conversation.scrollTop - conversation.clientHeight;
        stickToBottomRef.current = distanceFromBottom < 80;
    };

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

    // Drawer가 닫히면 사용법도 접어둔다. 다시 열었을 때 대화가 먼저 보여야 한다.
    useEffect(() => {
        if (!open) setGuideOpen(false);
    }, [open]);

    // 사용법을 열면 그 안으로 포커스를 옮겨야 Esc와 스크롤이 바로 먹는다.
    // 예시를 눌러 닫힌 경우에는 이어서 고쳐 쓸 수 있게 입력창으로 넘긴다.
    useEffect(() => {
        if (guideOpen) {
            guideRef.current?.focus();
            return;
        }
        if (focusPromptOnGuideCloseRef.current) {
            focusPromptOnGuideCloseRef.current = false;
            promptRef.current?.focus();
        }
    }, [guideOpen]);

    useEffect(() => {
        const conversation = conversationRef.current;
        // 콘텐츠가 바뀌기 전(직전 scroll 이벤트) 시점에 맨 아래 근처였을 때만 따라 내려간다.
        // scrollHeight는 이 시점에 이미 새 내용을 반영한 값이라, scrollTop과 비교하면
        // "예전 위치가 새로 커진 바닥에서 얼마나 먼가"가 되어 매번 멀어진 것처럼 계산된다.
        if (conversation && stickToBottomRef.current) {
            conversation.scrollTop = conversation.scrollHeight;
        }
    }, [messages, status]);

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
            for await (const chunk of streamAiChat(question, {signal: controller.signal, model})) {
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

    // 예시를 누르면 입력창에 채워만 두고 보내지는 않는다. 고쳐 쓸 여지를 남긴다.
    const applyExample = (example) => {
        setDraft(example);
        focusPromptOnGuideCloseRef.current = !isBusy;
        setGuideOpen(false);
    };

    const handleGuideKeyDown = (event) => {
        if (event.key !== "Escape") return;
        // Drawer 자체를 닫는 Esc까지 올라가지 않게 막는다. 사용법만 접힌다.
        event.stopPropagation();
        setGuideOpen(false);
        helpButtonRef.current?.focus();
    };

    const lastAssistantIndex = messages.reduce(
        (acc, message, idx) => (message.role === "assistant" ? idx : acc),
        -1
    );

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
                {/* 사용법(?) 버튼은 홈 전체에서 여기에만 있다. 다른 패널은 닫기만 넘긴다. */}
                <PanelHeader
                    icon="/images/app/commu.png"
                    title="AI 도우미"
                    description="학습을 돕는 오마고치 AI"
                    className="home-ai-panel-heading"
                    actions={(
                        <button
                            ref={helpButtonRef}
                            className={guideOpen ? "home-ai-panel-help is-active" : "home-ai-panel-help"}
                            type="button"
                            aria-label={guideOpen ? "AI 도우미 사용법 닫기" : "AI 도우미 사용법"}
                            aria-expanded={guideOpen}
                            aria-controls="home-ai-guide"
                            onClick={() => setGuideOpen((current) => !current)}
                        >
                            ?
                        </button>
                    )}
                    closeButton={(
                        <button
                            className="home-ai-panel-close"
                            type="button"
                            aria-label="AI 도우미 닫기"
                            onClick={() => setOpen(false)}
                        >
                            ×
                        </button>
                    )}
                />
                {/* 사용법이 덮고 있는 동안에는 아래 대화가 읽히거나 탭으로 잡히지 않게 한다. */}
                <div
                    className="home-ai-conversation"
                    ref={conversationRef}
                    onScroll={handleConversationScroll}
                    inert={guideOpen}
                >
                    {messages.length === 0 && (
                        <div className="home-ai-message-row is-assistant">
                            <span className="home-ai-message-avatar is-active" aria-hidden="true">
                                {currentCharacter.image ? (
                                    <img src={currentCharacter.image} alt=""/>
                                ) : (
                                    <span className="home-ai-character-placeholder">AI</span>
                                )}
                            </span>
                            <div className="home-ai-message is-assistant">
                                <span className="home-ai-message-author">{currentCharacter.name}</span>
                                <p>궁금한 걸 물어보세요. 예: &quot;오늘 날씨 어때?&quot;</p>
                            </div>
                        </div>
                    )}
                    {messages.map((message, index) => {
                        const isAssistant = message.role === "assistant";
                        const isLatestAssistantReply = isAssistant && index === lastAssistantIndex;

                        return (
                            <div
                                key={index}
                                className={isAssistant ? "home-ai-message-row is-assistant" : "home-ai-message-row is-user"}
                            >
                                {isAssistant && (
                                    <span
                                        className={
                                            isLatestAssistantReply
                                                ? "home-ai-message-avatar is-active"
                                                : "home-ai-message-avatar"
                                        }
                                        aria-hidden="true"
                                    >
                                        {currentCharacter.image ? (
                                            <img src={currentCharacter.image} alt=""/>
                                        ) : (
                                            <span className="home-ai-character-placeholder">AI</span>
                                        )}
                                    </span>
                                )}
                                <div
                                    className={isAssistant ? "home-ai-message is-assistant" : "home-ai-message is-user"}>
                                    <span className="home-ai-message-author">
                                        {isAssistant ? currentCharacter.name : "나"}
                                    </span>
                                    <p>{message.text}</p>
                                </div>
                            </div>
                        );
                    })}
                    {status === "submitting" && (
                        <div className="home-ai-message-row is-assistant">
                            <span className="home-ai-message-avatar is-active" aria-hidden="true">
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
                    )}
                </div>
                {guideOpen && (
                    <div
                        className="home-ai-guide"
                        id="home-ai-guide"
                        ref={guideRef}
                        role="region"
                        aria-labelledby="home-ai-guide-title"
                        tabIndex={-1}
                        onKeyDown={handleGuideKeyDown}
                    >
                        <div className="home-ai-guide-heading">
                            <strong id="home-ai-guide-title">이렇게 물어보세요</strong>
                            <button
                                className="home-ai-guide-close"
                                type="button"
                                aria-label="사용법 닫기"
                                onClick={() => {
                                    setGuideOpen(false);
                                    helpButtonRef.current?.focus();
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <div className="home-ai-guide-scroll">
                            <ul className="home-ai-guide-tools">
                                {AI_ASSISTANT_TOOLS.map((tool) => (
                                    <li className="home-ai-guide-tool" key={tool.id}>
                                        <span className="home-ai-guide-tool-icon" aria-hidden="true">{tool.icon}</span>
                                        <div className="home-ai-guide-tool-body">
                                            <strong className="home-ai-guide-tool-title">{tool.title}</strong>
                                            <p className="home-ai-guide-tool-summary">{tool.summary}</p>
                                            <p className="home-ai-guide-tool-hint">{tool.hint}</p>
                                            <div className="home-ai-guide-examples">
                                                {tool.examples.map((example) => (
                                                    <button
                                                        className="home-ai-guide-example"
                                                        key={example}
                                                        type="button"
                                                        onClick={() => applyExample(example)}
                                                    >
                                                        {example}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <section className="home-ai-guide-section">
                                <strong className="home-ai-guide-section-title">구현 준비 중인 기능</strong>
                                <ul className="home-ai-guide-notes is-upcoming">
                                    {AI_ASSISTANT_UPCOMING.map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                            </section>
                            <section className="home-ai-guide-section">
                                <strong className="home-ai-guide-section-title">알아두면 좋아요</strong>
                                <ul className="home-ai-guide-notes">
                                    {AI_ASSISTANT_TIPS.map((tip) => (
                                        <li key={tip}>{tip}</li>
                                    ))}
                                </ul>
                            </section>
                        </div>
                    </div>
                )}
                <form className="home-ai-composer" onSubmit={handleSubmit}>
                    <label className="home-ai-composer-label" htmlFor="home-ai-prompt">
                        AI 도우미에게 질문하기
                    </label>
                    <textarea
                        ref={promptRef}
                        id="home-ai-prompt"
                        rows="2"
                        placeholder="메시지를 입력하세요."
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                                event.preventDefault();
                                handleSubmit(event);
                            }
                        }}
                        disabled={isBusy}
                    ></textarea>
                    <div className="home-ai-composer-actions">
                        <div className="home-ai-model-select">
                            <span>모델</span>
                            <select
                                value={model}
                                onChange={(event) => setModel(event.target.value)}
                                disabled={isBusy}
                                aria-label="AI 모델 선택"
                            >
                                <option value="GEMINI">Gemini</option>
                                <option value="OLLAMA">Ollama</option>
                            </select>
                            <span aria-hidden="true">⌄</span>
                        </div>
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

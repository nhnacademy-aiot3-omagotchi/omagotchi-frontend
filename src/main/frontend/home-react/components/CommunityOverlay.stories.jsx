import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { saveCommunityPost } from "../../../resources/static/js/home/community.js";
import { escapeHtml } from "../../../resources/static/js/home/utils.js";
import { HomeOverlay } from "./HomeOverlay.jsx";

const communityMeta = {
  icon: "/images/app/commu.png",
  title: "커뮤니티",
  description: "공지와 기수 동료들의 이야기를 확인하세요."
};

const initialPosts = [
  {
    postId: 31,
    type: "FREE",
    title: "박쥐우테스트다",
    createdLabel: "2026. 8. 31. 오후 7:10:34",
    attachmentCount: 0
  },
  {
    postId: 30,
    type: "FREE",
    title: "dsafdsafdsa",
    createdLabel: "2026. 8. 31. 오후 5:31:39",
    attachmentCount: 1
  },
  {
    postId: 29,
    type: "NOTICE",
    title: "이번 주 학습 일정 안내",
    createdLabel: "2026. 8. 31. 오후 2:15:00",
    attachmentCount: 0
  }
];

function renderCommunityList(posts) {
  return `
    <div class="overlay-community">
      <header class="overlay-community-toolbar">
        <div class="overlay-community-tabs" aria-label="게시판 구분">
          <button class="is-active" type="button" aria-pressed="true">전체</button>
          <button type="button" aria-pressed="false">공지</button>
          <button type="button" aria-pressed="false">자유</button>
        </div>
        <label class="overlay-community-search">
          <span class="sr-only">게시글 검색</span>
          <input type="search" placeholder="게시글 검색" />
        </label>
        <button class="overlay-community-write" type="button" data-community-write>글쓰기</button>
      </header>

      <section class="overlay-community-notice" aria-label="고정 공지">
        <strong>공지</strong>
        <div>
          <h3>등록된 고정 공지가 없습니다.</h3>
          <p>기수 관리자가 작성한 공지가 이 영역에 표시됩니다.</p>
        </div>
      </section>

      <ol class="overlay-community-list" aria-label="커뮤니티 게시글 목록">
        ${posts.map((post) => `
          <li>
            <button class="overlay-community-open" type="button" aria-label="${escapeHtml(post.title)} 상세 보기">
              <span class="overlay-community-type${post.type === "NOTICE" ? " is-notice" : ""}">
                ${post.type === "NOTICE" ? "공지" : "자유"}
              </span>
              <div>
                <h3>${escapeHtml(post.title)}</h3>
                <p>${escapeHtml(post.createdLabel)}</p>
              </div>
              <footer>${post.attachmentCount ? `<span>첨부 ${post.attachmentCount}</span>` : ""}</footer>
            </button>
          </li>
        `).join("")}
      </ol>

      <nav class="overlay-community-pagination" aria-label="커뮤니티 페이지 이동">
        <button type="button" aria-label="이전 페이지" disabled>‹</button>
        <strong>1 / 1</strong>
        <button type="button" aria-label="다음 페이지" disabled>›</button>
      </nav>
    </div>
  `;
}

function renderCommunityComposer() {
  return `
    <form class="overlay-community-compose" data-community-compose>
      <label>
        <span>게시판</span>
        <select name="type">
          <option value="free">자유 게시판</option>
          <option value="notice">공지 게시판</option>
        </select>
      </label>
      <label>
        <span>제목</span>
        <input type="text" name="title" maxlength="100" placeholder="게시글 제목을 입력하세요" required />
      </label>
      <label>
        <span>내용</span>
        <textarea name="content" maxlength="1000" placeholder="기수 구성원과 공유할 내용을 입력하세요" required></textarea>
      </label>
      <label>
        <span>이미지 첨부</span>
        <input type="file" name="attachments" accept="image/jpeg,image/png,image/gif" multiple />
      </label>
      <div>
        <button type="button" data-community-cancel>취소</button>
        <button type="submit">등록하기</button>
      </div>
    </form>
  `;
}

function CommunityOverlayStory() {
  const hostRef = useRef(null);
  const toastTimerRef = useRef(null);
  const [mode, setMode] = useState("list");
  const [posts, setPosts] = useState(initialPosts);
  const [toast, setToast] = useState("");

  const showToast = useCallback((message) => {
    window.clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 3200);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimerRef.current), []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const handleClick = (event) => {
      if (event.target.closest("[data-community-write]")) {
        setMode("compose");
      }
      if (event.target.closest("[data-community-cancel]")) {
        setMode("list");
      }
    };
    const handleSubmit = async (event) => {
      const form = event.target.closest("[data-community-compose]");
      if (!form) return;

      event.preventDefault();
      let createdPost;
      try {
        const result = await saveCommunityPost({
          form,
          cohortId: 11,
          api: {
            async createPost(post) {
              createdPost = post;
              await new Promise((resolve) => window.setTimeout(resolve, 300));
            }
          }
        });
        if (!result || !createdPost) return;

        setPosts((current) => [{
          postId: `storybook-${Date.now()}`,
          type: createdPost.type,
          title: createdPost.title,
          createdLabel: "방금 전",
          attachmentCount: 0
        }, ...current]);
        setMode("list");
        showToast(result.message);
      } catch (error) {
        showToast(error.message || "게시글을 저장하지 못했습니다.");
      }
    };

    host.addEventListener("click", handleClick);
    host.addEventListener("submit", handleSubmit);
    return () => {
      host.removeEventListener("click", handleClick);
      host.removeEventListener("submit", handleSubmit);
    };
  }, [mode, showToast]);

  return (
    <div ref={hostRef}>
      <HomeOverlay
        type="community"
        meta={{
          ...communityMeta,
          title: mode === "compose" ? "새 게시글" : communityMeta.title
        }}
        content={mode === "compose" ? renderCommunityComposer() : renderCommunityList(posts)}
        onClose={() => {}}
      />
      {toast && typeof document !== "undefined"
        ? createPortal(<p className="home-toast is-visible" role="status" aria-live="polite">{toast}</p>, document.body)
        : null}
    </div>
  );
}

const meta = {
  title: "Home/CommunityOverlay",
  component: CommunityOverlayStory,
  decorators: [
    (Story) => (
      <div className="home-page" style={{ minHeight: "100vh", background: "#087046" }}>
        <div className="home-overlay-root is-open" data-home-overlay-root aria-live="polite">
          <Story />
        </div>
      </div>
    )
  ],
  parameters: { layout: "fullscreen" }
};

export default meta;

export const ListLayout = {
  name: "목록 배열",
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector(".overlay-community-list li");
    const button = canvasElement.querySelector(".overlay-community-open");
    const title = canvasElement.querySelector(".overlay-community-open h3");
    const date = canvasElement.querySelector(".overlay-community-open p");
    const titleRange = document.createRange();
    const dateRange = document.createRange();
    titleRange.selectNodeContents(title);
    dateRange.selectNodeContents(date);

    expect(button.getBoundingClientRect().width).toBeGreaterThan(row.getBoundingClientRect().width * 0.98);
    expect(titleRange.getClientRects()).toHaveLength(1);
    expect(dateRange.getClientRects()).toHaveLength(1);
  }
};

export const RegistrationComplete = {
  name: "글 등록 완료",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "글쓰기" }));
    await userEvent.type(canvas.getByPlaceholderText("게시글 제목을 입력하세요"), "스토리북 등록 테스트");
    await userEvent.type(canvas.getByPlaceholderText("기수 구성원과 공유할 내용을 입력하세요"), "등록 완료 안내를 확인합니다.");
    await userEvent.click(canvas.getByRole("button", { name: "등록하기" }));

    expect(canvas.getByRole("button", { name: "등록 중…" })).toBeDisabled();
    await waitFor(() => expect(canvas.getByText("스토리북 등록 테스트")).toBeInTheDocument());

    const storyDocument = within(canvasElement.ownerDocument.body);
    const toast = storyDocument.getByRole("status");
    expect(toast).toHaveTextContent("게시글이 등록되었습니다.");
    expect(Number(getComputedStyle(toast).zIndex)).toBeGreaterThan(1000);
  }
};

export const MobileListLayout = {
  name: "모바일 목록 배열",
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector(".overlay-community-list li");
    const button = canvasElement.querySelector(".overlay-community-open");
    expect(button.getBoundingClientRect().width).toBeGreaterThan(row.getBoundingClientRect().width * 0.98);
  }
};

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
    title: "박지우 테스트 글입니다",
    content: "커뮤니티 상세 화면의 읽기 쉬운 구성을 확인하는 예시 글입니다.",
    createdLabel: "2026. 8. 31. 오후 7:10:34",
    attachments: []
  },
  {
    postId: 30,
    type: "FREE",
    title: "첨부파일이 있는 자유글",
    content: "이미지는 작성 화면의 버튼으로 선택하고, 상세 화면에서는 파일 목록으로 확인합니다.",
    createdLabel: "2026. 8. 31. 오후 5:31:39",
    attachments: [{ name: "storybook.png", sizeLabel: "24KB" }]
  },
  {
    postId: 29,
    type: "NOTICE",
    title: "이번 주 학습 일정 안내",
    content: "관리자가 작성한 공지는 공지 게시판으로 표시됩니다.",
    createdLabel: "2026. 8. 31. 오후 2:15:00",
    attachments: []
  }
];

function renderCommunityList(posts, filter, keyword) {
  const filteredPosts = posts.filter((post) => (
    (filter === "all" || post.type === filter) && post.title.includes(keyword.trim())
  ));

  return `
    <div class="overlay-community">
      <header class="overlay-community-toolbar">
        <div class="overlay-community-tabs" aria-label="게시판 구분">
          <button class="${filter === "all" ? "is-active" : ""}" type="button" data-community-filter="all" aria-pressed="${filter === "all"}">전체</button>
          <button class="${filter === "NOTICE" ? "is-active" : ""}" type="button" data-community-filter="NOTICE" aria-pressed="${filter === "NOTICE"}">공지</button>
          <button class="${filter === "FREE" ? "is-active" : ""}" type="button" data-community-filter="FREE" aria-pressed="${filter === "FREE"}">자유</button>
        </div>
        <label class="overlay-community-search">
          <span class="sr-only">게시글 검색</span>
          <input type="search" data-community-search value="${escapeHtml(keyword)}" placeholder="게시글 검색" />
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
        ${filteredPosts.length ? filteredPosts.map((post) => `
          <li>
            <button class="overlay-community-open" type="button" data-community-post="${post.postId}" aria-label="${escapeHtml(post.title)} 상세 보기">
              <span class="overlay-community-type${post.type === "NOTICE" ? " is-notice" : ""}">
                ${post.type === "NOTICE" ? "공지" : "자유"}
              </span>
              <div>
                <h3>${escapeHtml(post.title)}</h3>
                <p>${escapeHtml(post.createdLabel)}</p>
              </div>
              <footer>${post.attachments.length ? `<span>첨부 ${post.attachments.length}</span>` : ""}</footer>
            </button>
          </li>
        `).join("") : `
          <li class="overlay-community-empty">
            <strong>검색 결과가 없습니다.</strong>
            <p>검색어나 게시판 구분을 다시 확인해 주세요.</p>
          </li>
        `}
      </ol>

      <nav class="overlay-community-pagination" aria-label="커뮤니티 페이지 이동">
        <button type="button" aria-label="이전 페이지" disabled>‹</button>
        <strong>1 / 1</strong>
        <button type="button" aria-label="다음 페이지" disabled>›</button>
      </nav>
    </div>
  `;
}

function renderCommunityComposer(post = null) {
  const attachmentInputId = `storybook-community-attachments-${post?.postId || "new"}`;
  const postType = post?.type || "FREE";
  const isEditing = Boolean(post);

  return `
    <form class="overlay-community-compose" data-community-compose data-community-post-type="${postType}"${post ? ` data-community-post-id="${post.postId}"` : ""}>
      <section class="overlay-community-form-field">
        <span>게시판</span>
        <div class="overlay-community-board">${postType === "NOTICE" ? "공지 게시판" : "자유 게시판"}</div>
      </section>
      <label class="overlay-community-form-field">
        <span>제목</span>
        <input type="text" name="title" maxlength="100" value="${escapeHtml(post?.title || "")}" placeholder="게시글 제목을 입력하세요" required />
      </label>
      <label class="overlay-community-form-field">
        <span>내용</span>
        <textarea name="content" maxlength="1000" placeholder="기수 구성원과 공유할 내용을 입력하세요" required>${escapeHtml(post?.content || "")}</textarea>
      </label>
      <section class="overlay-community-form-field">
        <span>이미지 첨부</span>
        <div class="overlay-community-file-picker">
          <input id="${attachmentInputId}" class="overlay-community-file-input" type="file" name="attachments" accept="image/jpeg,image/png,image/gif" multiple />
          <label for="${attachmentInputId}" class="overlay-community-file-button">이미지 선택</label>
          <span class="overlay-community-file-summary" data-community-file-summary>첨부할 이미지를 선택하세요.</span>
        </div>
      </section>
      <footer>
        <button type="button" data-community-close>취소</button>
        <button type="submit">${isEditing ? "수정하기" : "등록하기"}</button>
      </footer>
    </form>
  `;
}

function renderCommunityDetail(post) {
  const attachments = post.attachments || [];

  return `
    <article class="overlay-community-detail" data-community-detail="${post.postId}">
      <div class="overlay-community-form-field">
        <span>게시판</span>
        <div class="overlay-community-board">${post.type === "NOTICE" ? "공지 게시판" : "자유 게시판"}</div>
      </div>
      <div class="overlay-community-form-field">
        <span>제목</span>
        <div class="overlay-community-readonly">${escapeHtml(post.title)}</div>
        <p class="overlay-community-date">${escapeHtml(post.createdLabel)}</p>
      </div>
      <div class="overlay-community-form-field">
        <span>내용</span>
        <div class="overlay-community-readonly overlay-community-detail-content">${escapeHtml(post.content).replaceAll("\n", "<br>")}</div>
      </div>
      <section class="overlay-community-form-field" aria-label="첨부파일">
        <span>첨부파일</span>
        ${attachments.length ? `<ul class="overlay-community-attachment-list">${attachments.map((attachment) => `<li><a href="#download-${post.postId}-${escapeHtml(attachment.name)}"><span aria-hidden="true">▧</span>${escapeHtml(attachment.name)}</a><em>${escapeHtml(attachment.sizeLabel)}</em></li>`).join("")}</ul>` : `<p class="overlay-community-empty-attachments">첨부파일이 없습니다.</p>`}
      </section>
      <footer>
        <button type="button" data-community-list>목록</button>
        <button type="button" data-community-edit>수정</button>
        <button type="button" data-community-delete>삭제</button>
      </footer>
    </article>
  `;
}

function CommunityOverlayStory() {
  const hostRef = useRef(null);
  const toastTimerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(true);
  const [mode, setMode] = useState("list");
  const [posts, setPosts] = useState(initialPosts);
  const [selectedPostId, setSelectedPostId] = useState(initialPosts[0].postId);
  const [editingPostId, setEditingPostId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [toast, setToast] = useState("");

  const close = useCallback(() => setIsOpen(false), []);
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
      const target = event.target;
      const closeTarget = target.closest("[data-close-home-overlay]");
      const selectedPost = posts.find((post) => String(post.postId) === String(selectedPostId));

      if (closeTarget && (target === closeTarget || closeTarget.matches("button, a"))) {
        close();
        return;
      }
      if (target.closest("[data-community-close]")) {
        close();
        return;
      }
      const filterButton = target.closest("[data-community-filter]");
      if (filterButton) {
        setFilter(filterButton.dataset.communityFilter);
        return;
      }
      if (target.closest("[data-community-write]")) {
        setEditingPostId(null);
        setMode("compose");
        return;
      }
      const postButton = target.closest("[data-community-post]");
      if (postButton) {
        setSelectedPostId(postButton.dataset.communityPost);
        setMode("detail");
        return;
      }
      if (target.closest("[data-community-list]")) {
        setMode("list");
        return;
      }
      if (target.closest("[data-community-edit]") && selectedPost) {
        setEditingPostId(selectedPost.postId);
        setMode("compose");
        return;
      }
      if (target.closest("[data-community-delete]") && selectedPost) {
        setPosts((current) => current.filter((post) => String(post.postId) !== String(selectedPost.postId)));
        setMode("list");
        showToast("게시글이 삭제되었습니다.");
      }
    };
    const handleInput = (event) => {
      const searchInput = event.target.closest("[data-community-search]");
      if (searchInput) setKeyword(searchInput.value);
    };
    const handleChange = (event) => {
      const attachmentInput = event.target.closest("input[name='attachments']");
      if (!attachmentInput) return;

      const summary = attachmentInput.closest(".overlay-community-file-picker")
        ?.querySelector("[data-community-file-summary]");
      const files = Array.from(attachmentInput.files || []);
      if (summary) {
        summary.textContent = files.length
          ? `${files.length}개 파일 선택됨 · ${files.map((file) => file.name).join(", ")}`
          : "첨부할 이미지를 선택하세요.";
      }
    };
    const handleSubmit = async (event) => {
      const form = event.target.closest("[data-community-compose]");
      if (!form) return;

      event.preventDefault();
      let savedPost;
      let attachmentCount = 0;
      try {
        const result = await saveCommunityPost({
          form,
          cohortId: 11,
          api: {
            async createPost(post) {
              savedPost = post;
              await new Promise((resolve) => window.setTimeout(resolve, 300));
            },
            async createPostWithAttachments(post, attachments) {
              savedPost = post;
              attachmentCount = attachments.length;
              await new Promise((resolve) => window.setTimeout(resolve, 300));
            },
            async updatePost(postId, post) {
              savedPost = {...post, postId};
              await new Promise((resolve) => window.setTimeout(resolve, 300));
            },
            async updatePostWithAttachments(postId, post, attachments) {
              savedPost = {...post, postId};
              attachmentCount = attachments.length;
              await new Promise((resolve) => window.setTimeout(resolve, 300));
            }
          }
        });
        if (!result || !savedPost) return;

        const existingStoryPost = posts.find((post) => String(post.postId) === String(savedPost.postId));
        const savedStoryPost = {
          postId: savedPost.postId || `storybook-${Date.now()}`,
          type: savedPost.type,
          title: savedPost.title,
          content: savedPost.content,
          createdLabel: "방금 전",
          attachments: attachmentCount
            ? [{ name: `${attachmentCount}개 이미지`, sizeLabel: "선택됨" }]
            : existingStoryPost?.attachments || []
        };
        setPosts((current) => {
          const existingPost = current.find((post) => String(post.postId) === String(savedStoryPost.postId));
          return existingPost
            ? current.map((post) => String(post.postId) === String(savedStoryPost.postId) ? savedStoryPost : post)
            : [savedStoryPost, ...current];
        });
        setSelectedPostId(savedStoryPost.postId);
        setEditingPostId(null);
        showToast(result.message);
        if (result.action === "updated") {
          setMode("detail");
          return;
        }
        close();
      } catch (error) {
        showToast(error.message || "게시글을 저장하지 못했습니다.");
      }
    };

    host.addEventListener("click", handleClick);
    host.addEventListener("input", handleInput);
    host.addEventListener("change", handleChange);
    host.addEventListener("submit", handleSubmit);
    return () => {
      host.removeEventListener("click", handleClick);
      host.removeEventListener("input", handleInput);
      host.removeEventListener("change", handleChange);
      host.removeEventListener("submit", handleSubmit);
    };
  }, [close, posts, selectedPostId, showToast]);

  const selectedPost = posts.find((post) => String(post.postId) === String(selectedPostId)) || posts[0];
  const editingPost = posts.find((post) => String(post.postId) === String(editingPostId));
  const content = mode === "compose"
    ? renderCommunityComposer(editingPost || null)
    : mode === "detail" && selectedPost
      ? renderCommunityDetail(selectedPost)
      : renderCommunityList(posts, filter, keyword);
  const title = mode === "compose" ? "새 게시글" : mode === "detail" ? "게시글" : communityMeta.title;

  return (
    <div ref={hostRef}>
      {isOpen ? (
        <HomeOverlay
          type="community"
          meta={{...communityMeta, title}}
          content={content}
          onClose={close}
        />
      ) : null}
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

export const DetailNavigation = {
  name: "상세·목록·닫기",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "박지우 테스트 글입니다 상세 보기" }));
    expect(canvas.getByText("커뮤니티 상세 화면의 읽기 쉬운 구성을 확인하는 예시 글입니다.")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "목록" }));
    expect(canvas.getByRole("button", { name: "글쓰기" })).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "닫기" }));
    expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();
  }
};

export const ComposerCancel = {
  name: "글쓰기 취소 후 닫기",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "글쓰기" }));
    expect(canvas.getByText("자유 게시판")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "취소" }));
    expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();
  }
};

export const RegistrationComplete = {
  name: "글 등록 완료 후 닫기",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "글쓰기" }));
    await userEvent.type(canvas.getByPlaceholderText("게시글 제목을 입력하세요"), "스토리북 등록 테스트");
    await userEvent.type(canvas.getByPlaceholderText("기수 구성원과 공유할 내용을 입력하세요"), "등록 완료 안내를 확인합니다.");
    await userEvent.click(canvas.getByRole("button", { name: "등록하기" }));

    expect(canvas.getByRole("button", { name: "등록 중…" })).toBeDisabled();
    await waitFor(() => expect(canvas.queryByRole("dialog")).not.toBeInTheDocument());

    const storyDocument = within(canvasElement.ownerDocument.body);
    expect(storyDocument.getByRole("status")).toHaveTextContent("게시글이 등록되었습니다.");
  }
};

export const RegistrationCompleteWithAttachment = {
  name: "첨부파일 포함 글 등록 완료",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "글쓰기" }));
    await userEvent.type(canvas.getByPlaceholderText("게시글 제목을 입력하세요"), "첨부파일 등록 테스트");
    await userEvent.type(canvas.getByPlaceholderText("기수 구성원과 공유할 내용을 입력하세요"), "첨부파일 API mock을 확인합니다.");

    const StoryFile = canvasElement.ownerDocument.defaultView.File;
    const attachment = new StoryFile(["storybook image"], "storybook.png", { type: "image/png" });
    await userEvent.upload(canvas.getByLabelText("이미지 선택"), attachment);
    expect(canvas.getByText("1개 파일 선택됨 · storybook.png")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "등록하기" }));

    await waitFor(() => expect(canvas.queryByRole("dialog")).not.toBeInTheDocument());
    expect(within(canvasElement.ownerDocument.body).getByRole("status")).toHaveTextContent("게시글이 등록되었습니다.");
  }
};

export const EditComplete = {
  name: "게시글 수정 완료",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "박지우 테스트 글입니다 상세 보기" }));
    await userEvent.click(canvas.getByRole("button", { name: "수정" }));
    const titleInput = canvas.getByPlaceholderText("게시글 제목을 입력하세요");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "수정된 스토리북 글");
    await userEvent.click(canvas.getByRole("button", { name: "수정하기" }));
    await waitFor(() => expect(canvas.getByText("수정된 스토리북 글")).toBeInTheDocument());
    expect(canvas.getByRole("button", { name: "목록" })).toBeInTheDocument();
    expect(within(canvasElement.ownerDocument.body).getByRole("status")).toHaveTextContent("게시글이 수정되었습니다.");
  }
};

export const DeleteComplete = {
  name: "게시글 삭제 완료",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "박지우 테스트 글입니다 상세 보기" }));
    await userEvent.click(canvas.getByRole("button", { name: "삭제" }));
    expect(canvas.getByRole("button", { name: "글쓰기" })).toBeInTheDocument();
    expect(canvas.queryByText("박지우 테스트 글입니다")).not.toBeInTheDocument();
    expect(within(canvasElement.ownerDocument.body).getByRole("status")).toHaveTextContent("게시글이 삭제되었습니다.");
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

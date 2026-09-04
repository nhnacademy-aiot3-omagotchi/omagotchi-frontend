import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { expect, userEvent, waitFor, within } from "storybook/test";
import {
  renderCommunityAttachmentPreviews,
  renderCommunitySelectedAttachmentPreviews,
  saveCommunityPost
} from "../../../resources/static/js/home/community.js";
import { escapeHtml } from "../../../resources/static/js/home/utils.js";
import { HomeOverlay } from "./HomeOverlay.jsx";

const communityMeta = {
  icon: "/images/app/commu.png",
  title: "커뮤니티",
  description: "공지와 기수 동료들의 이야기를 확인하세요."
};

// 기수의 고정 공지는 하나뿐이고 목록이 아니라 상단 배너에만 나온다.
const pinnedNotice = {
  postId: 40,
  type: "NOTICE",
  title: "9월 첫째 주 학습 일정 안내",
  content: "고정 공지는 목록에서 빠지고 상단 배너에만 표시됩니다. 제목을 누르면 상세로 이동합니다.",
  authorNickname: "기수장",
  createdLabel: "2026. 9. 1. 오전 9:00:00",
  attachments: [],
  canManage: false
};

// canManage는 보는 사람에 따라 달라진다. 공지는 MANAGER·MENTOR, 자유글은 작성자 본인일 때 참이다.
const initialPosts = [
  {
    postId: 31,
    type: "FREE",
    title: "박지우 테스트 글입니다",
    content: "커뮤니티 상세 화면의 읽기 쉬운 구성을 확인하는 예시 글입니다.",
    authorNickname: "박지우",
    createdLabel: "2026. 8. 31. 오후 7:10:34",
    attachments: [],
    canManage: true
  },
  {
    postId: 30,
    type: "FREE",
    title: "첨부파일이 있는 자유글",
    content: "이미지는 작성 화면에서 선택 즉시 확인하고, 상세 화면에서도 미리볼 수 있습니다.",
    authorNickname: "옆자리",
    createdLabel: "2026. 8. 31. 오후 5:31:39",
    attachments: [
      {
        attachmentId: 301,
        originalFileName: "학습실-인증.png",
        contentType: "image/png",
        sizeBytes: 24576,
        previewUrl: "/images/characters/study/study.png"
      },
      {
        attachmentId: 302,
        originalFileName: "오늘의-오마고치.gif",
        contentType: "image/gif",
        sizeBytes: 86240,
        previewUrl: "/images/characters/study/study_eye.gif"
      }
    ],
    canManage: false
  },
  {
    postId: 29,
    type: "NOTICE",
    title: "이번 주 학습 일정 안내",
    content: "고정되지 않은 공지는 목록의 공지 탭에서 확인합니다.",
    authorNickname: "기수장",
    createdLabel: "2026. 8. 31. 오후 2:15:00",
    attachments: [],
    canManage: false
  }
];

function authorLabel(post) {
  return escapeHtml(post?.authorNickname || "알 수 없음");
}

async function storyImageFile(canvasElement, name, path) {
  const storyWindow = canvasElement.ownerDocument.defaultView;
  const response = await storyWindow.fetch(path);
  const blob = await response.blob();
  return new storyWindow.File([blob], name, { type: blob.type || "image/png" });
}

function renderCommunityList(posts, filter, keyword, pinned) {
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
        <div data-community-pinned>
          ${pinned ? `
            <h3>
              <button class="overlay-community-pinned-open" type="button" data-community-post="${pinned.postId}">
                ${escapeHtml(pinned.title)}
              </button>
            </h3>
            <p>${authorLabel(pinned)} · ${escapeHtml(pinned.createdLabel)}</p>
          ` : `
            <h3>등록된 고정 공지가 없습니다.</h3>
            <p>기수 관리자가 작성한 공지가 이 영역에 표시됩니다.</p>
          `}
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
                <p>${authorLabel(post)} · ${escapeHtml(post.createdLabel)}</p>
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
        <textarea name="content" maxlength="10000" placeholder="기수 구성원과 공유할 내용을 입력하세요" required>${escapeHtml(post?.content || "")}</textarea>
      </label>
      <section class="overlay-community-form-field">
        <span>이미지 첨부</span>
        <div class="overlay-community-file-picker">
          <input id="${attachmentInputId}" class="overlay-community-file-input" type="file" name="attachments" accept="image/jpeg,image/png,image/gif" multiple />
          <label for="${attachmentInputId}" class="overlay-community-file-button">이미지 선택</label>
          <span class="overlay-community-file-summary" data-community-file-summary>첨부할 이미지를 선택하세요.</span>
        </div>
        <ul class="overlay-community-selected-preview-list" data-community-selected-previews aria-label="선택한 이미지 미리보기" hidden></ul>
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
        <p class="overlay-community-date">${authorLabel(post)} · ${escapeHtml(post.createdLabel)}</p>
      </div>
      <div class="overlay-community-form-field">
        <span>내용</span>
        <div class="overlay-community-readonly overlay-community-detail-content">${escapeHtml(post.content).replaceAll("\n", "<br>")}</div>
      </div>
      <section class="overlay-community-form-field" aria-label="첨부파일">
        <span>첨부파일</span>
        ${renderCommunityAttachmentPreviews(attachments, {
          downloadUrlFor: (attachment) => `#download-${post.postId}-${attachment.attachmentId}`,
          previewUrlFor: (attachment) => attachment.previewUrl
        })}
      </section>
      <footer>
        <button type="button" data-community-list>목록</button>
        ${post.canManage ? `
        <button type="button" data-community-edit>수정</button>
        <button type="button" data-community-delete>삭제</button>
        ` : ""}
      </footer>
    </article>
  `;
}

function CommunityOverlayStory() {
  const hostRef = useRef(null);
  const toastTimerRef = useRef(null);
  const attachmentPreviewUrlsRef = useRef(new Set());
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

  useEffect(() => () => {
    window.clearTimeout(toastTimerRef.current);
    attachmentPreviewUrlsRef.current.forEach((url) => window.URL.revokeObjectURL(url));
    attachmentPreviewUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const handleClick = (event) => {
      const target = event.target;
      const closeTarget = target.closest("[data-close-home-overlay]");
      const selectedPost = [pinnedNotice, ...posts]
        .find((post) => String(post.postId) === String(selectedPostId));

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
        // 배너의 고정 공지도 같은 훅을 쓴다.
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

      const field = attachmentInput.closest(".overlay-community-form-field");
      const summary = field?.querySelector("[data-community-file-summary]");
      const previewList = field?.querySelector("[data-community-selected-previews]");
      const files = Array.from(attachmentInput.files || []);
      if (summary) {
        summary.textContent = files.length
          ? `${files.length}개 파일 선택됨 · ${files.map((file) => file.name).join(", ")}`
          : "첨부할 이미지를 선택하세요.";
      }
      attachmentPreviewUrlsRef.current.forEach((url) => window.URL.revokeObjectURL(url));
      attachmentPreviewUrlsRef.current.clear();
      if (!previewList) return;
      if (!files.length) {
        previewList.replaceChildren();
        previewList.hidden = true;
        return;
      }

      const previewUrls = files.map((file) => {
        const url = window.URL.createObjectURL(file);
        attachmentPreviewUrlsRef.current.add(url);
        return url;
      });
      previewList.innerHTML = renderCommunitySelectedAttachmentPreviews(files, previewUrls);
      previewList.hidden = false;
    };
    const handleSubmit = async (event) => {
      const form = event.target.closest("[data-community-compose]");
      if (!form) return;

      event.preventDefault();
      let savedPost;
      let attachmentCount = 0;
      const selectedFiles = Array.from(form.querySelector("input[name='attachments']")?.files || []);
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
        // 실제 화면은 저장 뒤 상세를 다시 조회해 서버가 채운 작성자·권한을 받는다.
        // 목업도 그 결과를 흉내 낸다. 내가 쓰거나 고친 글이므로 관리 권한이 있다.
        const savedStoryPost = {
          postId: savedPost.postId || `storybook-${Date.now()}`,
          type: savedPost.type,
          title: savedPost.title,
          content: savedPost.content,
          authorNickname: existingStoryPost?.authorNickname || "박지우",
          createdLabel: "방금 전",
          attachments: attachmentCount
            ? selectedFiles.map((file, index) => ({
              attachmentId: `storybook-${index}`,
              originalFileName: file.name,
              contentType: file.type,
              sizeBytes: file.size,
              previewUrl: index % 2 === 0
                ? "/images/characters/study/study.png"
                : "/images/characters/study/study_eye.gif"
            }))
            : existingStoryPost?.attachments || [],
          canManage: true
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
        // 등록 뒤에는 목록으로 돌아가 방금 쓴 글을 보여준다.
        setMode("list");
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

  // 화면을 바꾸면 본문 스크롤을 맨 위로 되돌린다. 실제 화면도 같게 동작한다.
  useEffect(() => {
    attachmentPreviewUrlsRef.current.forEach((url) => window.URL.revokeObjectURL(url));
    attachmentPreviewUrlsRef.current.clear();
    const body = hostRef.current?.querySelector(".home-overlay-body");
    if (body) body.scrollTop = 0;
  }, [mode, selectedPostId, editingPostId]);

  const selectedPost = [pinnedNotice, ...posts]
    .find((post) => String(post.postId) === String(selectedPostId)) || posts[0];
  const editingPost = posts.find((post) => String(post.postId) === String(editingPostId));
  const content = mode === "compose"
    ? renderCommunityComposer(editingPost || null)
    : mode === "detail" && selectedPost
      ? renderCommunityDetail(selectedPost)
      : renderCommunityList(posts, filter, keyword, pinnedNotice);
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

export const AttachmentDetailPreview = {
  name: "첨부 이미지 상세 미리보기",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "첨부파일이 있는 자유글 상세 보기" }));

    const firstPreview = canvas.getByRole("img", { name: "학습실-인증.png 미리보기" });
    const animatedPreview = canvas.getByRole("img", { name: "오늘의-오마고치.gif 미리보기" });
    expect(firstPreview).toHaveAttribute("src", "/images/characters/study/study.png");
    expect(animatedPreview).toHaveAttribute("src", "/images/characters/study/study_eye.gif");
    expect(canvas.getAllByRole("link", { name: "다운로드" })).toHaveLength(2);
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
  name: "글 등록 완료 후 목록",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "글쓰기" }));
    await userEvent.type(canvas.getByPlaceholderText("게시글 제목을 입력하세요"), "스토리북 등록 테스트");
    await userEvent.type(canvas.getByPlaceholderText("기수 구성원과 공유할 내용을 입력하세요"), "등록 완료 안내를 확인합니다.");
    await userEvent.click(canvas.getByRole("button", { name: "등록하기" }));

    // 제출 중 버튼 잠금은 타이밍에 걸려 여기서 검증하지 않는다.
    // communityUi.test.mjs의 "게시글 등록 중에는 중복 제출을 막고..."가 맡는다.

    // 오버레이를 닫지 않고 목록으로 돌아가 방금 쓴 글을 보여준다.
    // mock이 300ms를 지연시키고 계측 오버헤드가 더해져 기본 1초로는 빠듯하다.
    await waitFor(
      () => expect(canvas.getByRole("button", { name: "글쓰기" })).toBeInTheDocument(),
      { timeout: 3000 }
    );
    expect(canvas.getByText("스토리북 등록 테스트")).toBeInTheDocument();

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

    const attachment = await storyImageFile(
      canvasElement,
      "storybook.png",
      "/images/characters/study/study.png"
    );
    await userEvent.upload(canvas.getByLabelText("이미지 선택"), attachment);
    expect(canvas.getByText("1개 파일 선택됨 · storybook.png")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "등록하기" }));

    await waitFor(
      () => expect(canvas.getByRole("button", { name: "글쓰기" })).toBeInTheDocument(),
      { timeout: 3000 }
    );
    expect(canvas.getByText("첨부파일 등록 테스트")).toBeInTheDocument();
    expect(within(canvasElement.ownerDocument.body).getByRole("status")).toHaveTextContent("게시글이 등록되었습니다.");
  }
};

export const SelectedAttachmentPreview = {
  name: "선택한 이미지 즉시 미리보기",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "글쓰기" }));
    const attachment = await storyImageFile(
      canvasElement,
      "내-학습실.png",
      "/images/characters/study/study.png"
    );

    await userEvent.upload(canvas.getByLabelText("이미지 선택"), attachment);
    const preview = canvas.getByRole("img", { name: "내-학습실.png 선택 미리보기" });
    expect(preview.getAttribute("src")).toMatch(/^blob:/);
    expect(canvas.getByText("1개 파일 선택됨 · 내-학습실.png")).toBeInTheDocument();
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

export const PinnedNoticeBanner = {
  name: "고정 공지 배너",
  play: async ({ canvasElement }) => {
    const banner = canvasElement.querySelector("[data-community-pinned]");
    const pinnedOpen = banner.querySelector(".overlay-community-pinned-open");
    const listTitles = Array.from(
      canvasElement.querySelectorAll(".overlay-community-list h3")
    ).map((heading) => heading.textContent.trim());

    // 고정 공지는 배너에만 있고 목록에는 없다.
    await expect(pinnedOpen).toHaveTextContent("9월 첫째 주 학습 일정 안내");
    await expect(listTitles).not.toContain("9월 첫째 주 학습 일정 안내");

    // 배너에서 상세로 들어갈 수 있어야 한다. 목록에 없으니 여기가 유일한 진입점이다.
    await userEvent.click(pinnedOpen);
    await waitFor(() => {
      expect(canvasElement.querySelector(".overlay-community-detail")).toBeTruthy();
    });
  }
};

export const ManagePermission = {
  name: "권한 없는 글의 수정·삭제 숨김",
  play: async ({ canvasElement }) => {
    const openMine = canvasElement.querySelector("[data-community-post='31']");
    await userEvent.click(openMine);
    await waitFor(() => {
      expect(canvasElement.querySelector("[data-community-edit]")).toBeTruthy();
    });

    // 내 글이 아니면 수정·삭제가 아예 렌더되지 않는다.
    await userEvent.click(canvasElement.querySelector("[data-community-list]"));
    const openOthers = await waitFor(() => {
      const button = canvasElement.querySelector("[data-community-post='30']");
      expect(button).toBeTruthy();
      return button;
    });
    await userEvent.click(openOthers);
    await waitFor(() => {
      expect(canvasElement.querySelector(".overlay-community-detail")).toBeTruthy();
    });
    await expect(canvasElement.querySelector("[data-community-edit]")).toBeNull();
    await expect(canvasElement.querySelector("[data-community-delete]")).toBeNull();
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

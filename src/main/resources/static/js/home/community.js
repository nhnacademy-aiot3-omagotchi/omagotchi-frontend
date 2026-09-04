import { escapeHtml } from "./utils.js";

export function formatCommunityAttachmentSize(sizeBytes) {
    const bytes = Number(sizeBytes);
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return "0KB";
    }
    if (bytes < 1024 * 1024) {
        return `${Math.max(1, Math.ceil(bytes / 1024))}KB`;
    }
    const megabytes = bytes / (1024 * 1024);
    return `${megabytes >= 10 ? Math.round(megabytes) : megabytes.toFixed(1)}MB`;
}

function attachmentName(attachment) {
    return attachment?.originalFileName || attachment?.name || "첨부 이미지";
}

/**
 * 서버 첨부 이미지와 사용자가 방금 선택한 로컬 이미지를 같은 카드 모양으로 그린다.
 * 실제 상세 화면은 previewUrl을 비워 둔 뒤 인증된 Blob을 받아 img src를 채운다.
 */
export function renderCommunityAttachmentPreviews(
    attachments,
    { downloadUrlFor = () => "#", previewUrlFor = () => "", canDelete = false } = {}
) {
    const items = Array.from(attachments || []);
    if (!items.length) {
        return '<p class="overlay-community-empty-attachments">첨부파일이 없습니다.</p>';
    }

    return `
        <ul class="overlay-community-attachment-list">
            ${items.map((attachment, index) => {
                const name = attachmentName(attachment);
                const previewUrl = previewUrlFor(attachment, index) || "";
                const downloadUrl = downloadUrlFor(attachment, index) || "#";
                const attachmentId = attachment?.attachmentId ?? index;
                return `
                    <li class="overlay-community-attachment-card${previewUrl ? " is-ready" : ""}" data-community-attachment-card data-community-attachment-id="${escapeHtml(attachmentId)}">
                        <div class="overlay-community-attachment-media">
                            <img${previewUrl ? ` src="${escapeHtml(previewUrl)}"` : ""} alt="${escapeHtml(name)} 미리보기" loading="lazy"${previewUrl ? "" : " hidden"} />
                            <span class="overlay-community-attachment-status"${previewUrl ? " hidden" : ""}>이미지 불러오는 중…</span>
                        </div>
                        <div class="overlay-community-attachment-info">
                            <span class="overlay-community-attachment-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
                            <em>${formatCommunityAttachmentSize(attachment?.sizeBytes)}</em>
                            <div class="overlay-community-attachment-actions">
                                <a class="overlay-community-attachment-download" href="${escapeHtml(downloadUrl)}" download="${escapeHtml(name)}">다운로드</a>
                                ${canDelete ? `<button class="overlay-community-attachment-delete" type="button" data-community-attachment-delete="${escapeHtml(attachmentId)}" aria-label="${escapeHtml(name)} 삭제">삭제</button>` : ""}
                            </div>
                        </div>
                    </li>
                `;
            }).join("")}
        </ul>
    `;
}

export function renderCommunitySelectedAttachmentPreviews(files, previewUrls) {
    const items = Array.from(files || []);
    const urls = Array.from(previewUrls || []);
    if (!items.length) {
        return "";
    }

    return items.map((file, index) => `
        <li class="overlay-community-selected-preview">
            <div class="overlay-community-attachment-media">
                <img src="${escapeHtml(urls[index] || "")}" alt="${escapeHtml(attachmentName(file))} 선택 미리보기" />
            </div>
            <div class="overlay-community-attachment-info">
                <span class="overlay-community-attachment-name" title="${escapeHtml(attachmentName(file))}">${escapeHtml(attachmentName(file))}</span>
                <em>${formatCommunityAttachmentSize(file?.size)}</em>
            </div>
        </li>
    `).join("");
}

function setCommunitySubmitPending(form, submitButton, pending, idleLabel, pendingLabel) {
    if (pending) {
        form.dataset.communitySubmitting = "true";
        form.setAttribute("aria-busy", "true");
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = pendingLabel;
        }
        return;
    }

    delete form.dataset.communitySubmitting;
    form.removeAttribute("aria-busy");
    if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = idleLabel;
    }
}

export async function saveCommunityPost({form, api, cohortId}) {
    if (form.dataset.communitySubmitting === "true") {
        return null;
    }

    const postId = form.dataset.communityPostId;
    const isEditing = Boolean(postId);
    const submitButton = form.querySelector("button[type='submit']");
    const idleLabel = submitButton?.textContent || (isEditing ? "수정하기" : "등록하기");
    const pendingLabel = isEditing ? "수정 중…" : "등록 중…";
    setCommunitySubmitPending(form, submitButton, true, idleLabel, pendingLabel);

    try {
        const formData = new FormData(form);
        const rawTitle = formData.get("title");
        const title = (typeof rawTitle === "string" ? rawTitle : "").trim();
        const rawContent = formData.get("content");
        const content = (typeof rawContent === "string" ? rawContent : "").trim();

        if (!title || !content) {
            throw new Error("제목과 내용을 입력해 주세요.");
        }
        if (!cohortId) {
            throw new Error("승인된 기수가 없어 게시글을 작성할 수 없습니다.");
        }

        const post = {
            // 새 글은 사용자 홈의 자유 게시판에만 작성한다. 기존 공지 수정 시에는 유형을 보존한다.
            // 소속 기수는 BFF가 Session 승인 기수에서 정하므로 본문에 담지 않는다.
            type: form.dataset.communityPostType === "NOTICE" ? "NOTICE" : "FREE",
            title,
            content
        };
        const attachments = form.querySelector("input[name='attachments']")?.files || [];

        if (isEditing) {
            if (attachments.length) {
                await api.updatePostWithAttachments(postId, post, attachments);
            } else {
                await api.updatePost(postId, post);
            }
        } else if (attachments.length) {
            await api.createPostWithAttachments(post, attachments);
        } else {
            await api.createPost(post);
        }

        return {
            action: isEditing ? "updated" : "created",
            message: isEditing ? "게시글이 수정되었습니다." : "게시글이 등록되었습니다."
        };
    } finally {
        setCommunitySubmitPending(form, submitButton, false, idleLabel, pendingLabel);
    }
}

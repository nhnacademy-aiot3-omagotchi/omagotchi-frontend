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

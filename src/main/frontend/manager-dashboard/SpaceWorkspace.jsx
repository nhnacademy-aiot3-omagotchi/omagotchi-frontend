import React, { useEffect, useState } from "react";
import { Tabs } from "radix-ui";

const SPACE_TYPE_LABELS = Object.freeze({
  MEETING: "회의실",
  LAB: "실습실",
  STUDY: "도서관",
  OFFICE: "사무실"
});

const SPACE_USAGE_LABELS = Object.freeze({
  AVAILABLE: "사용 가능",
  OCCUPIED: "사용 중",
  UNAVAILABLE: "이용 불가",
  NOT_APPLICABLE: "해당 없음"
});

function formatStartedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatRemainingTime(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), Math.floor(total % 60)]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function SpaceDialog({ space, selectedCohortId, onClose, onSave }) {
  const [form, setForm] = useState({
    name: space?.name || "",
    type: space?.type || "MEETING",
    capacity: space?.capacity || 1
  });
  const [saving, setSaving] = useState(false);
  const [policyValidationAttempted, setPolicyValidationAttempted] = useState(false);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const isActiveEdit = Boolean(space && space.operationalStatus === "ACTIVE");
  const isActiveCapacityReduction = isActiveEdit && Number(form.capacity) < Number(space.capacity);
  const isActiveTypeChange = isActiveEdit && form.type !== space.type;
  const hasPolicyError = isActiveCapacityReduction || isActiveTypeChange;
  const capacity = Number(form.capacity);
  const hasRequiredInputError = !form.name.trim()
    || form.capacity === ""
    || !Number.isInteger(capacity)
    || capacity < 1;
  const selectedCohortNumber = Number(selectedCohortId);
  const hasCohortSelectionError = !space
    && (!Number.isInteger(selectedCohortNumber) || selectedCohortNumber <= 0);
  const policyErrorMessage = isActiveCapacityReduction && isActiveTypeChange
    ? "활성 공간에서는 유형 변경 및 정원 축소를 할 수 없습니다. 비활성화 후 수정해 주세요."
    : isActiveCapacityReduction
      ? "활성 공간의 정원은 축소할 수 없습니다. 비활성화 후 수정해 주세요."
      : "활성 공간의 유형은 변경할 수 없습니다. 비활성화 후 수정해 주세요.";

  async function submit(event) {
    event.preventDefault();
    if (saving || hasRequiredInputError || hasCohortSelectionError) return;
    setPolicyValidationAttempted(true);
    if (hasPolicyError) return;
    setSaving(true);
    try {
      const payload = { ...form, capacity: Number(form.capacity) };
      if (!space) payload.cohortId = selectedCohortNumber;
      if (await onSave(payload, space ? "update" : "create", space?.spaceId)) onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sensor-dialog-backdrop">
      <div className="sensor-dialog" role="dialog" aria-modal="true" aria-labelledby="space-dialog-title">
        <form onSubmit={submit}>
          <header><div><span>SPACE MANAGEMENT</span><h2 id="space-dialog-title">{space ? "공간 수정" : "공간 추가"}</h2><p>신규 공간은 비활성 상태로 생성됩니다.</p></div><button type="button" className="sensor-dialog-close" onClick={onClose} aria-label="닫기">×</button></header>
          <fieldset>
            <label className="sensor-field"><span>공간명</span><input required maxLength={50} value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
            <div className="sensor-field-row">
              <label className="sensor-field"><span>유형</span><select value={form.type} onChange={(event) => update("type", event.target.value)}>{Object.entries(SPACE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="sensor-field"><span>정원</span><input required min="1" step="1" type="number" value={form.capacity} onChange={(event) => update("capacity", event.target.value)} /></label>
            </div>
            {policyValidationAttempted && hasPolicyError && <p className="space-form-error" role="alert">{policyErrorMessage}</p>}
            {hasCohortSelectionError && <p className="space-form-error" role="alert">공간을 생성하려면 먼저 기수를 선택해 주세요.</p>}
          </fieldset>
          <footer><div><button type="button" className="sensor-secondary-button" onClick={onClose}>취소</button><button type="submit" className="sensor-primary-button" disabled={saving || hasRequiredInputError || hasCohortSelectionError}>{saving ? "저장 중…" : "저장"}</button></div></footer>
        </form>
      </div>
    </div>
  );
}

function DeactivateSpaceDialog({ space, onClose, onConfirm }) {
  const [inactiveReason, setInactiveReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const reason = inactiveReason.trim();
    if (!reason || saving) return;
    setSaving(true);
    try {
      if (await onConfirm(space, reason)) onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sensor-dialog-backdrop">
      <div className="sensor-dialog" role="dialog" aria-modal="true" aria-labelledby="space-deactivate-dialog-title">
        <form onSubmit={submit}>
          <header>
            <div><span>SPACE MANAGEMENT</span><h2 id="space-deactivate-dialog-title">공간 비활성화</h2><p><strong>{space.name}</strong> 공간을 비활성화합니다.</p></div>
            <button type="button" className="sensor-dialog-close" onClick={onClose} aria-label="닫기" disabled={saving}>×</button>
          </header>
          <fieldset>
            <label className="sensor-field"><span>비활성 사유</span><textarea required maxLength={200} value={inactiveReason} onChange={(event) => setInactiveReason(event.target.value)} /></label>
          </fieldset>
          <footer><div><button type="button" className="sensor-secondary-button" onClick={onClose} disabled={saving}>취소</button><button type="submit" className="sensor-primary-button is-danger" disabled={saving || !inactiveReason.trim()}>{saving ? "처리 중…" : "비활성화"}</button></div></footer>
        </form>
      </div>
    </div>
  );
}

function DeleteSpaceDialog({ space, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  const [policyError, setPolicyError] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (deleting) return;
    if (space.operationalStatus === "ACTIVE") {
      setPolicyError(true);
      return;
    }
    setDeleting(true);
    try {
      if (await onConfirm(space.spaceId)) onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="sensor-dialog-backdrop">
      <div className="sensor-dialog" role="dialog" aria-modal="true" aria-labelledby="space-delete-dialog-title">
        <form onSubmit={submit}>
          <header>
            <div><span>SPACE MANAGEMENT</span><h2 id="space-delete-dialog-title">공간 삭제</h2><p>&apos;{space.name}&apos; 공간을 삭제하시겠습니까?</p></div>
            <button type="button" className="sensor-dialog-close" onClick={onClose} aria-label="닫기" disabled={deleting}>×</button>
          </header>
          {policyError && <div className="space-dialog-validation"><p className="space-form-error" role="alert">활성 공간은 삭제할 수 없습니다. 먼저 공간을 비활성화해 주세요.</p></div>}
          <footer><div><button type="button" className="sensor-secondary-button" onClick={onClose} disabled={deleting}>취소</button><button type="submit" className="sensor-primary-button is-danger" disabled={deleting}>{deleting ? "삭제 중…" : "삭제"}</button></div></footer>
        </form>
      </div>
    </div>
  );
}

function ParticipantDialog({ occupancy, onClose, onLoad }) {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.resolve(onLoad?.(occupancy.spaceId))
      .then((response) => { if (active) setParticipants(Array.isArray(response) ? response : []); })
      .catch((cause) => { if (active) setError(cause?.message || "참여자 목록을 불러오지 못했습니다."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [occupancy.spaceId, onLoad]);

  return (
    <div className="sensor-dialog-backdrop">
      <div className="sensor-dialog space-participant-dialog" role="dialog" aria-modal="true" aria-labelledby="participant-dialog-title">
        <form onSubmit={(event) => { event.preventDefault(); onClose(); }}>
          <header>
            <div><span>PARTICIPANT MANAGEMENT</span><h2 id="participant-dialog-title">{occupancy.spaceName} 참여자</h2><p>현재 점유에 참여 중인 사용자 목록입니다.</p></div>
            <button type="button" className="sensor-dialog-close" onClick={onClose} aria-label="닫기">×</button>
          </header>
          <div className="space-participant-list" aria-live="polite">
            {loading && <p className="space-loading">참여자 목록을 불러오는 중입니다.</p>}
            {!loading && error && <p className="space-form-error" role="alert">{error}</p>}
            {!loading && !error && participants.length === 0 && <p className="sensor-list-empty">현재 참여자가 없습니다.</p>}
            {!loading && !error && participants.map((participant) => (
              <article key={participant.userId} className="space-participant-item">
                <div><strong>{participant.displayName}</strong></div>
                <div className="space-participant-badges"><span className="space-role-badge">{participant.occupier ? "점유자" : "참여자"}</span><span className="space-presence-badge">참여 중</span></div>
              </article>
            ))}
          </div>
          <footer><div><button type="submit" className="sensor-primary-button">확인</button></div></footer>
        </form>
      </div>
    </div>
  );
}

function ForceEndDialog({ occupancy, onClose, onConfirm }) {
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      if (await onConfirm(occupancy.spaceId)) onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sensor-dialog-backdrop">
      <div className="sensor-dialog" role="alertdialog" aria-modal="true" aria-labelledby="force-end-dialog-title" aria-describedby="force-end-dialog-description">
        <form onSubmit={submit}>
          <header>
            <div><span>OCCUPANCY MANAGEMENT</span><h2 id="force-end-dialog-title">점유 강제 종료</h2><p id="force-end-dialog-description">정말 <strong>{occupancy.spaceName}</strong> 점유를 강제 종료하시겠습니까?</p></div>
            <button type="button" className="sensor-dialog-close" onClick={onClose} aria-label="닫기" disabled={saving}>×</button>
          </header>
          <div className="space-force-end-note">강제 종료 후 해당 회의실과 참여자는 목록에서 제거됩니다.</div>
          <footer><div><button type="button" className="sensor-secondary-button" onClick={onClose} disabled={saving}>취소</button><button type="submit" className="sensor-primary-button is-danger" disabled={saving}>{saving ? "종료 중…" : "강제 종료"}</button></div></footer>
        </form>
      </div>
    </div>
  );
}

function OccupancyManagement({ occupancies, loading, error, onRetry, onShowParticipants, onForceEnd }) {
  const participantCount = occupancies.reduce((sum, occupancy) => sum + occupancy.participantCount, 0);

  return (
    <div className="space-occupancy-panel">
      <header className="space-management-header"><div><span>PARTICIPANT MANAGEMENT</span><h2>참여자 관리</h2><p>현재 회의실 점유와 참여 현황을 확인하고 관리합니다.</p></div></header>
      <div className="space-summary-grid" aria-label="점유 현황 요약">
        <article><span>점유 중 회의실 수</span><strong>{occupancies.length}</strong><small>개 공간</small></article>
        <article><span>전체 참여자 수</span><strong>{participantCount}</strong><small>명</small></article>
        <article><span>강제 종료 가능 건수</span><strong>{occupancies.length}</strong><small>건</small></article>
      </div>
      <div className="space-table-wrap">
        <table className="sensor-table space-occupancy-table">
          <thead><tr><th>공간명</th><th>점유자</th><th>현재 참여자 수</th><th>시작 시각</th><th>남은 시간</th><th>상태</th><th>관리</th></tr></thead>
          <tbody>{occupancies.map((occupancy) => (
            <tr key={occupancy.occupancyId}>
              <th scope="row" data-label="공간명">{occupancy.spaceName}</th>
              <td data-label="점유자">{occupancy.occupierDisplayName}</td>
              <td data-label="현재 참여자 수">{occupancy.participantCount}명</td>
              <td data-label="시작 시각">{formatStartedAt(occupancy.startedAt)}</td>
              <td data-label="남은 시간"><strong className="space-remaining-time">{formatRemainingTime(occupancy.remainingTimeSeconds)}</strong></td>
              <td data-label="상태"><span className="sensor-status is-active">{occupancy.status === "ACTIVE" ? "점유 중" : occupancy.status}</span></td>
              <td data-label="관리" className="space-table-actions space-occupancy-actions"><button type="button" onClick={() => onShowParticipants(occupancy)}>참여자 보기</button><button type="button" className="is-danger" onClick={() => onForceEnd(occupancy)}>강제 종료</button></td>
            </tr>
          ))}</tbody>
        </table>
        {loading && <div className="space-occupancy-empty"><strong>활성 점유 목록을 불러오는 중입니다.</strong></div>}
        {!loading && error && <div className="space-occupancy-empty"><strong>활성 점유 목록을 불러오지 못했습니다.</strong><p>{error}</p>{onRetry && <button type="button" className="sensor-secondary-button" onClick={onRetry}>다시 시도</button>}</div>}
        {!loading && !error && occupancies.length === 0 && <div className="space-occupancy-empty"><strong>현재 점유 중인 회의실이 없습니다.</strong><p>강제 종료한 점유는 이 목록에서 제거됩니다.</p></div>}
      </div>
    </div>
  );
}

export function SpaceWorkspace({ spaces = [], occupancies = [], selectedCohortId = null, loading = false, error = null, occupancyLoading = false, occupancyError = null, onRetry, onLoadOccupancies, onLoadParticipants, onForceEndOccupancy, onSave, onChangeStatus, onDelete, onChangeCohort, embedded = false }) {
  const [dialogSpace, setDialogSpace] = useState(undefined);
  const [actionDialog, setActionDialog] = useState(null);
  const [activeTab, setActiveTab] = useState("spaces");
  const [selectedOccupancy, setSelectedOccupancy] = useState(null);
  const [forceEndOccupancy, setForceEndOccupancy] = useState(null);
  const visibleSpaces = spaces.filter((space) => space.cohortId == null
    || Number(space.cohortId) === Number(selectedCohortId));

  async function toggleStatus(space) {
    if (space.operationalStatus === "ACTIVE") {
      setActionDialog({ type: "deactivate", space });
      return;
    }
    await onChangeStatus?.(space);
  }

  return (
    <main className={`sensor-story-canvas${embedded ? " is-embedded" : ""}`}>
      <section className="sensor-workspace" aria-label="관리자 공간 워크스페이스">
        {error ? (
          <section className="sensor-status-panel sensor-status-panel--error" role="status"><strong>공간 정보를 불러오지 못했습니다.</strong><p>{error}</p>{onRetry && <button type="button" className="sensor-secondary-button" onClick={onRetry}>다시 시도</button>}</section>
        ) : loading && spaces.length === 0 ? (
          <section className="sensor-status-panel sensor-status-panel--loading" role="status"><span className="sensor-spinner" aria-hidden="true" /><strong>공간 정보를 불러오는 중입니다.</strong></section>
        ) : (
          <div className="space-workspace-tabs">
            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
              <Tabs.List className="sensor-tabs space-tabs" aria-label="공간 관리 메뉴"><Tabs.Trigger value="spaces">공간 관리</Tabs.Trigger><Tabs.Trigger value="participants">참여자 관리</Tabs.Trigger></Tabs.List>
              <div className="sensor-content-shell space-content-shell">
                <Tabs.Content value="spaces">
                  <div className="space-management-panel">
                    <header className="space-management-header"><div><span>SPACE MANAGEMENT</span><h2>공간 관리</h2><p>현재 기수의 공간을 생성하고 운영 상태와 관리 기수를 관리합니다.</p></div><button type="button" className="sensor-add-button" onClick={() => setDialogSpace(null)}>＋ 공간 추가</button></header>
                    <p className="space-lifecycle-note"><strong>모든 공간은 생성 직후 비활성 상태입니다.</strong> 활성화 후 목적에 맞게 운영할 수 있습니다.</p>
                    <div className="space-table-wrap">
                      <table className="sensor-table space-table">
                        <thead><tr><th>공간명</th><th>유형</th><th>정원</th><th>운영 상태</th><th>사용 상태</th><th>비활성 사유</th><th>기수</th><th>관리</th></tr></thead>
                        <tbody>{visibleSpaces.map((space) => <tr key={space.spaceId}>
                          <th scope="row" data-label="공간명">{space.name}</th><td data-label="유형">{SPACE_TYPE_LABELS[space.type] || space.type}</td><td data-label="정원">{space.capacity}명</td>
                          <td data-label="운영 상태"><span className={`sensor-status ${space.operationalStatus === "ACTIVE" ? "is-active" : "is-inactive"}`}>{space.operationalStatus === "ACTIVE" ? "활성" : "비활성"}</span></td><td data-label="사용 상태">{SPACE_USAGE_LABELS[space.status] || space.status}</td><td data-label="비활성 사유">{space.inactiveReason || "-"}</td>
                          <td data-label="기수" className="space-cohort-cell"><span>{space.cohortId == null ? "미배정" : Number(space.cohortId) === Number(selectedCohortId) ? "현재 기수" : space.cohortId}</span><button type="button" onClick={() => onChangeCohort?.(space, space.cohortId == null)}>{space.cohortId == null ? "배정" : "해제"}</button></td>
                          <td data-label="관리" className="space-table-actions"><button type="button" onClick={() => setDialogSpace(space)}>수정</button><button type="button" onClick={() => toggleStatus(space)}>{space.operationalStatus === "ACTIVE" ? "비활성화" : "활성화"}</button><button type="button" className="is-danger" onClick={() => setActionDialog({ type: "delete", space })}>삭제</button></td>
                        </tr>)}</tbody>
                      </table>
                      {visibleSpaces.length === 0 && <p className="sensor-list-empty">현재 기수에서 관리할 공간이 없습니다.</p>}
                    </div>
                  </div>
                </Tabs.Content>
                <Tabs.Content value="participants"><OccupancyManagement occupancies={occupancies} loading={occupancyLoading} error={occupancyError} onRetry={onLoadOccupancies} onShowParticipants={setSelectedOccupancy} onForceEnd={setForceEndOccupancy} /></Tabs.Content>
              </div>
            </Tabs.Root>
          </div>
        )}
      </section>
      {dialogSpace !== undefined && <SpaceDialog space={dialogSpace} selectedCohortId={selectedCohortId} onClose={() => setDialogSpace(undefined)} onSave={onSave} />}
      {actionDialog?.type === "deactivate" && <DeactivateSpaceDialog space={actionDialog.space} onClose={() => setActionDialog(null)} onConfirm={onChangeStatus} />}
      {actionDialog?.type === "delete" && <DeleteSpaceDialog space={actionDialog.space} onClose={() => setActionDialog(null)} onConfirm={onDelete} />}
      {selectedOccupancy && <ParticipantDialog occupancy={selectedOccupancy} onLoad={onLoadParticipants} onClose={() => setSelectedOccupancy(null)} />}
      {forceEndOccupancy && <ForceEndDialog occupancy={forceEndOccupancy} onClose={() => setForceEndOccupancy(null)} onConfirm={onForceEndOccupancy} />}
    </main>
  );
}

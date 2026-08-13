"use client";

/* R2 assets are WebP files already resized for the display and thumbnail roles. */
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";
import { CONCEPT_REGISTRY, CONCEPT_BY_ID } from "./hometown-math/domain/registry";
import type { HometownConceptId, TeacherExhibitDraft, TeacherExhibitionDraft } from "./hometown-math/domain/types";
import { buildLearningContent } from "./hometown-math/domain/registry";
import { HometownMathOverlay } from "./HometownMathOverlay";
import { prepareHometownImage } from "./hometown-math/services/client-image";

type ExhibitionListItem = { id: string; title: string; slug: string; visibility: string; manifestVersion: number; updatedAt: string };
type UploadTask = { id: string; name: string; status: "waiting" | "preparing" | "uploading" | "done" | "error"; error?: string };

export function HometownTeacherStudio({ close, preview }: { close: () => void; preview: (slug: string, manifest?: import("./hometown-math/domain/types").HometownSceneManifest) => void }) {
  const [authRequired, setAuthRequired] = useState(false);
  const [list, setList] = useState<ExhibitionListItem[]>([]);
  const [draft, setDraft] = useState<TeacherExhibitionDraft | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("正在打开教师策展台…");
  const fileInput = useRef<HTMLInputElement>(null);
  const selected = draft?.exhibits.find((item) => item.id === selectedId) ?? null;
  const approvedCount = draft?.exhibits.filter((item) => item.teacherConfirmed).length ?? 0;

  const request = useCallback(async (url: string, init?: RequestInit) => {
    const response = await fetch(url, init);
    if (response.status === 401) { setAuthRequired(true); throw new Error("AUTH_REQUIRED"); }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.details?.join("；") || payload.error || "操作失败");
    return payload;
  }, []);

  const loadList = useCallback(async () => {
    try {
      const payload = await request("/api/hometown/exhibitions");
      setList(payload.exhibitions);
      setMessage(payload.exhibitions.length ? "选择一个展览继续策展" : "创建第一场家乡数学展吧");
      if (payload.exhibitions.length) {
        const detail = await request(`/api/hometown/exhibitions/${payload.exhibitions[0].id}`);
        setDraft(detail.exhibition);
      }
    } catch (error) { if ((error as Error).message !== "AUTH_REQUIRED") setMessage((error as Error).message); }
  }, [request]);

  useEffect(() => { loadList(); }, [loadList]);

  const openDraft = async (id: string) => {
    setBusy(true);
    try { const payload = await request(`/api/hometown/exhibitions/${id}`); setDraft(payload.exhibition); setSelectedId(null); }
    catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  };

  const createExhibition = async () => {
    setBusy(true);
    try {
      const created = await request("/api/hometown/exhibitions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "我们的家乡数学展" }) });
      await loadList();
      await openDraft(created.id);
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  };

  const saveBasics = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      await request(`/api/hometown/exhibitions/${draft.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: draft.title, schoolClass: draft.schoolClass, locationLabel: draft.locationLabel, zones: draft.zones }) });
      setMessage("展览信息与分区已保存");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  };

  const updateDraft = (patch: Partial<TeacherExhibitionDraft>) => setDraft((current) => current ? { ...current, ...patch } : current);
  const updateSelectedLocal = (patch: Partial<TeacherExhibitDraft>) => setDraft((current) => current ? { ...current, exhibits: current.exhibits.map((item) => item.id === selectedId ? { ...item, ...patch } : item) } : current);

  const saveExhibit = async (patch: Partial<TeacherExhibitDraft> = {}) => {
    if (!selected || !draft) return;
    const next = { ...selected, ...patch };
    setBusy(true);
    try {
      const learning = next.conceptId && next.overlay ? buildLearningContent(next.conceptId, next.overlay, next.interpretation) : next.learning;
      await request(`/api/hometown/exhibits/${selected.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ conceptId: next.conceptId, title: next.title, interpretation: next.interpretation, evidence: next.interpretation, learning, overlay: next.overlay, zoneId: next.zoneId, order: next.order, teacherConfirmed: next.teacherConfirmed }) });
      updateSelectedLocal({ ...patch, evidence: next.interpretation, learning });
      setMessage(next.teacherConfirmed ? "已确认，这件展品可以参与发布" : "修改已保存");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  };

  const chooseConcept = (conceptId: HometownConceptId) => {
    const concept = CONCEPT_BY_ID[conceptId];
    const observation = selected?.interpretation?.trim() || concept.childExplanation;
    updateSelectedLocal({ conceptId, title: concept.shortTitle, overlay: concept.overlay, learning: buildLearningContent(conceptId, concept.overlay, observation), teacherConfirmed: false });
  };

  const uploadFiles = async (files: File[]) => {
    if (!draft || !files.length) return;
    const valid = files.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 12 * 1024 * 1024);
    const createdTasks = valid.map((file) => ({ id: crypto.randomUUID(), name: file.name, status: "waiting" as const }));
    setTasks(createdTasks);
    let cursor = 0;
    const worker = async () => {
      while (cursor < valid.length) {
        const index = cursor++;
        const file = valid[index];
        const task = createdTasks[index];
        try {
          setTasks((items) => items.map((item) => item.id === task.id ? { ...item, status: "preparing" } : item));
          const prepared = await prepareHometownImage(file);
          setTasks((items) => items.map((item) => item.id === task.id ? { ...item, status: "uploading" } : item));
          const form = new FormData();
          form.set("exhibitionId", draft.id);
          form.set("file", new File([prepared.display], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
          form.set("thumbnail", new File([prepared.thumbnail], "thumbnail.webp", { type: "image/webp" }));
          form.set("width", String(prepared.width));
          form.set("height", String(prepared.height));
          form.set("candidates", JSON.stringify(prepared.candidates));
          await request("/api/hometown/upload", { method: "POST", body: form });
          setTasks((items) => items.map((item) => item.id === task.id ? { ...item, status: "done" } : item));
        } catch (error) {
          setTasks((items) => items.map((item) => item.id === task.id ? { ...item, status: "error", error: (error as Error).message } : item));
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    const detail = await request(`/api/hometown/exhibitions/${draft.id}`);
    setDraft(detail.exhibition);
    setMessage("图片已完成压缩、移除 EXIF 并进入逐张审核");
  };

  const publishDraft = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      await saveBasics();
      const payload = await request("/api/hometown/publish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ exhibitionId: draft.id }) });
      setMessage(`第 ${payload.manifest.version} 版已发布`);
      preview(draft.slug);
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  };

  const unpublishDraft = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      await request("/api/hometown/publish", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ exhibitionId: draft.id }) });
      setDraft({ ...draft, visibility: "unpublished" });
      setMessage("展览已取消公开，历史版本仍安全保留");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  };

  const deleteDraft = async () => {
    if (!draft || !window.confirm(`确定删除“${draft.title}”吗？原图、缩略图和所有版本都会一起删除。`)) return;
    setBusy(true);
    try {
      await request(`/api/hometown/exhibitions/${draft.id}`, { method: "DELETE" });
      setDraft(null); setSelectedId(null); setMessage("展览及其图片资源已删除"); await loadList();
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  };

  const copyShareLink = async () => {
    if (!draft) return;
    await navigator.clipboard.writeText(`${window.location.origin}/?hometown=${encodeURIComponent(draft.slug)}#hometown`);
    setMessage("只读参观链接已复制，可交给常用工具生成二维码");
  };

  const previewDraft = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      await saveBasics();
      const payload = await request(`/api/hometown/preview/${draft.id}`);
      preview(draft.slug, payload.manifest);
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  };

  if (authRequired) return (
    <div className="hometown-studio" role="dialog" aria-modal="true" aria-label="教师策展台登录">
      <button className="hometown-studio-close" onClick={close}>×</button>
      <div className="studio-auth-card"><span>CURATOR ACCESS</span><h2>教师策展台</h2><p>采集、审核和发布会保存为班级展览，因此需要先确认教师身份。学生和访客参观公开展览不需要登录。</p><a href="/signin-with-chatgpt?return_to=%2F%3Fstudio%3Dhometown">使用 ChatGPT 登录</a></div>
    </div>
  );

  return (
    <div className="hometown-studio" role="dialog" aria-modal="true" aria-label="我的家乡数学馆教师策展台">
      <header><div><span>CURATOR STUDIO · 教师端</span><h2>把孩子拍到的家乡，策成一座数学馆</h2></div><p>{message}</p><button className="hometown-studio-close" onClick={close} aria-label="关闭教师策展台">×</button></header>
      <div className="studio-layout">
        <aside className="studio-exhibition-list"><div><b>班级展览</b><button onClick={createExhibition} disabled={busy}>＋ 新建</button></div>{list.map((item) => <button key={item.id} className={draft?.id === item.id ? "active" : ""} onClick={() => openDraft(item.id)}><span>{item.title}<small>{item.visibility === "link-only" ? `已发布 · v${item.manifestVersion}` : "草稿"}</small></span><i>→</i></button>)}</aside>
        {!draft ? <main className="studio-empty"><i>⌁</i><h3>{message}</h3><button onClick={createExhibition}>创建展览</button></main> : <>
          <main className="studio-workspace">
            <section className="studio-basics"><label>展览标题<input value={draft.title} maxLength={40} onChange={(event) => updateDraft({ title: event.target.value })}/></label><label>学校 / 班级<input value={draft.schoolClass} onChange={(event) => updateDraft({ schoolClass: event.target.value })} placeholder="选填"/></label><label>家乡范围<input value={draft.locationLabel} onChange={(event) => updateDraft({ locationLabel: event.target.value })} placeholder="镇、村或地区，不使用精确定位"/></label><button onClick={saveBasics} disabled={busy}>保存信息</button></section>
            <section className="studio-upload"><div><span>01 · 采集</span><h3>批量放入孩子们的照片</h3><p>JPG / PNG / WebP，单张不超过 12MB；浏览器会压缩到 1920px、生成缩略图并移除 EXIF。最多 3 张并行，失败可单独重试。</p></div><button onClick={() => fileInput.current?.click()}>选择照片</button><input ref={fileInput} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => uploadFiles(Array.from(event.target.files ?? []))}/></section>
            {tasks.length > 0 && <div className="studio-upload-queue">{tasks.map((task) => <div key={task.id} className={task.status}><span>{task.name}</span><b>{task.status === "waiting" ? "等待" : task.status === "preparing" ? "压缩中" : task.status === "uploading" ? "上传中" : task.status === "done" ? "完成" : task.error}</b></div>)}</div>}
            <section className="studio-review"><div className="studio-section-heading"><div><span>02 · 发现与审核</span><h3>{draft.exhibits.length} 张照片 · {approvedCount} 张已确认</h3></div><p>系统最多建议 3 个受控概念；没有证据时会诚实留空。</p></div><div className="studio-photo-grid">{draft.exhibits.map((item) => <button key={item.id} className={`${selectedId === item.id ? "active" : ""} ${item.teacherConfirmed ? "approved" : ""}`} onClick={() => setSelectedId(item.id)}><img src={item.thumbnailUrl} alt=""/><span>{item.title}<small>{item.teacherConfirmed ? "教师已确认 ✓" : item.candidates.length ? "等待审核" : "未发现清晰数学"}</small></span></button>)}</div></section>
            <section className="studio-zones"><div className="studio-section-heading"><div><span>03 · 策展</span><h3>四个默认分区</h3></div><p>名称可编辑；每件展品在右侧审核面板选择归属。</p></div>{draft.zones.map((zone, index) => <label key={zone.id}><i>{String(index + 1).padStart(2, "0")}</i><input value={zone.name} onChange={(event) => updateDraft({ zones: draft.zones.map((item) => item.id === zone.id ? { ...item, name: event.target.value } : item) })}/><input value={zone.subtitle} onChange={(event) => updateDraft({ zones: draft.zones.map((item) => item.id === zone.id ? { ...item, subtitle: event.target.value } : item) })}/></label>)}</section>
          </main>
          <aside className="studio-inspector">{selected ? <Inspector item={selected} draft={draft} busy={busy} update={updateSelectedLocal} chooseConcept={chooseConcept} save={saveExhibit}/> : <div className="studio-inspector-empty"><i>⌕</i><h3>选择一张照片审核</h3><p>先看原图和证据，再决定数学概念。系统建议不是答案，教师确认才会进入正式展览。</p></div>}<div className="studio-publish-tools">{draft.visibility === "link-only" && <><button onClick={copyShareLink}>复制只读链接</button><button onClick={unpublishDraft}>取消发布</button></>}<button className="danger" onClick={deleteDraft}>删除展览</button></div><footer><button onClick={previewDraft}>预览当前草稿</button><button className="publish" onClick={publishDraft} disabled={busy || !draft.exhibits.length}>发布展览</button></footer></aside>
        </>}
      </div>
    </div>
  );
}

function Inspector({ item, draft, busy, update, chooseConcept, save }: { item: TeacherExhibitDraft; draft: TeacherExhibitionDraft; busy: boolean; update: (patch: Partial<TeacherExhibitDraft>) => void; chooseConcept: (id: HometownConceptId) => void; save: (patch?: Partial<TeacherExhibitDraft>) => void }) {
  const suggestion = item.candidates.find((candidate) => candidate.confidence >= .55);
  const updateOverlay = (overlay: NonNullable<TeacherExhibitDraft["overlay"]>) => update({ overlay, teacherConfirmed: false, learning: item.conceptId ? buildLearningContent(item.conceptId, overlay, item.interpretation) : item.learning });
  const overlayType = item.overlay?.type;
  const showCount = overlayType === "radial" || overlayType === "repeat" || overlayType === "wave";
  const showRotation = overlayType === "radial" || overlayType === "spiral" || overlayType === "wave";
  const calibrationHint = overlayType === "axis"
    ? "拖动轴线两端，让白线穿过真实的镜像中轴。"
    : overlayType === "arch"
      ? "拖动左右支点和拱顶，让曲线贴合真实建筑轮廓。"
      : overlayType === "nested"
        ? "拖动结构范围的两个角点，让相似层级覆盖真实山脊、梯田或枝叶。"
        : "拖动中心与半径点，让白色结构线贴合照片中的真实对象。";
  return <div className="studio-inspector-form">
    <div className="studio-calibration-stage">
      <div className="studio-calibration-frame">
        <img src={item.imageUrl} alt={item.filename}/>
        {item.overlay && <HometownMathOverlay overlay={item.overlay} aspectRatio={(item.imageWidth || 4) / (item.imageHeight || 3)} editable onChange={updateOverlay}/>}
      </div>
    </div>
    <span>原始文件 · {item.filename}</span>
    <label>核心数学概念<select value={item.conceptId ?? ""} onChange={(event) => chooseConcept(event.target.value as HometownConceptId)}><option value="" disabled>请选择一个核心概念</option>{CONCEPT_REGISTRY.map((concept) => <option key={concept.id} value={concept.id}>{concept.labelZh} · {concept.labelEn}</option>)}</select></label>
    {!item.conceptId && (suggestion ? <button className="studio-core-suggestion" onClick={() => chooseConcept(suggestion.conceptId)}><span>AI 建议：{suggestion.labelZh}<small>{suggestion.evidence}</small></span><b>采用</b></button> : <p className="studio-no-math">没有足够清晰的自动证据。请结合照片只选择一个最有把握的核心概念。</p>)}
    {item.overlay && <div className="studio-calibration-tools"><b>照片级结构校准</b><p>{calibrationHint} 调整后需重新确认。</p>{showCount && <label>{overlayType === "wave" ? "波形密度" : "重复方向数"}<input type="range" min="2" max="16" value={Math.round(item.overlay.spacing ?? 8)} onChange={(event) => updateOverlay({ ...item.overlay!, spacing: Number(event.target.value) })}/><i>{Math.round(item.overlay.spacing ?? 8)}</i></label>}{showRotation && <label>{overlayType === "wave" ? "波形相位" : "结构旋转角"}<input type="range" min="-180" max="180" value={Math.round(item.overlay.rotation ?? 0)} onChange={(event) => updateOverlay({ ...item.overlay!, rotation: Number(event.target.value) })}/><i>{Math.round(item.overlay.rotation ?? 0)}°</i></label>}</div>}
    <label>儿童标题（最多 18 字）<input maxLength={18} value={item.title} onChange={(event) => update({ title: event.target.value })}/></label>
    <label>AI 照片分析<textarea value={item.interpretation} onChange={(event) => update({ interpretation: event.target.value, evidence: event.target.value, teacherConfirmed: false })}/><small>把照片观察与画面证据合并为一段，只描述这张照片里真正看得到的结构。</small></label>
    {item.conceptId && <div className="studio-formula-preview"><b>由当前标注计算</b><strong>{item.learning.formula}</strong><p>{item.learning.formulaMeaning}</p></div>}
    <label>所属分区<select value={item.zoneId} onChange={(event) => update({ zoneId: event.target.value })}>{draft.zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>
    <div className="studio-confirm"><button onClick={() => save()} disabled={busy}>保存修改</button><button className={item.teacherConfirmed ? "confirmed" : ""} onClick={() => save({ teacherConfirmed: !item.teacherConfirmed })} disabled={busy || !item.conceptId}>{item.teacherConfirmed ? "已由教师确认 ✓" : "确认概念、标注与解读"}</button></div>
  </div>;
}

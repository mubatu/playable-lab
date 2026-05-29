import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeft, Check, Hand, Loader2, Plus, Save, Scissors, Trash2, Upload, Video } from 'lucide-react';
import type { VideoDraft, VideoPlayable, VideoStopover } from '../../types';
import { Button } from '../../components/ui';
import { cx, formatBytes } from '../../lib/appUtils';

type EditorVideoSource = {
  name: string;
  size: number;
  type: string;
  url: string;
};

type EditPhase = 'idle' | 'input' | 'hand';
type DragKind = 'rect-move' | 'hand-move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

type VideoLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DraftStopover = VideoStopover & {
  editingId?: string;
};

const DEFAULT_INPUT_AREA = {
  x: 0.35,
  y: 0.42,
  width: 0.3,
  height: 0.16
};

export function VideoWorkspace({
  mode,
  initialPlayable,
  loading,
  onUpload,
  onCreate,
  onSave,
  onCancel
}: {
  mode: 'create' | 'edit';
  initialPlayable?: VideoPlayable | null;
  loading: boolean;
  onUpload: (file: File) => Promise<VideoDraft | null>;
  onCreate: (name: string, draft: VideoDraft, stopovers: VideoStopover[]) => Promise<void>;
  onSave: (stopovers: VideoStopover[]) => Promise<void>;
  onCancel: () => void;
}) {
  const isEditing = mode === 'edit';
  const [draft, setDraft] = useState<VideoDraft | null>(null);
  const [stopovers, setStopovers] = useState<VideoStopover[]>(initialPlayable?.stopovers || []);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [newPlayableName, setNewPlayableName] = useState('');

  useEffect(() => {
    setDraft(null);
    setStopovers(initialPlayable?.stopovers || []);
    setNameDialogOpen(false);
    setNewPlayableName('');
  }, [initialPlayable?.slug]);

  const source: EditorVideoSource | null = isEditing && initialPlayable?.video
    ? {
        name: initialPlayable.video.originalName,
        size: initialPlayable.video.size,
        type: initialPlayable.video.type,
        url: initialPlayable.video.url
      }
    : draft
      ? {
          name: draft.originalName,
          size: draft.size,
          type: draft.type,
          url: draft.url
        }
      : null;

  async function handleFileSelect(file: File | null) {
    if (!file) return;
    const uploaded = await onUpload(file);
    if (uploaded) {
      setDraft(uploaded);
      setStopovers([]);
    }
  }

  async function handleConfirmCreate(name: string) {
    if (!draft) return;
    await onCreate(name, draft, stopovers);
  }

  if (!source) {
    return (
      <VideoUploadPanel
        loading={loading}
        onCancel={onCancel}
        onFileSelect={(file) => void handleFileSelect(file)}
      />
    );
  }

  return (
    <section className="rounded-md border border-zinc-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="secondary" iconOnly ariaLabel={isEditing ? 'Back to my playables' : 'Back to upload'} onClick={isEditing ? onCancel : () => setDraft(null)}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold text-zinc-950">{isEditing ? initialPlayable?.name || 'Video playable' : 'Video editor'}</h2>
            <p className="mt-1 truncate text-sm text-zinc-500">
              {source.name} · {formatBytes(source.size)}
            </p>
          </div>
        </div>
        {isEditing ? (
          <Button variant="blue" disabled={loading} onClick={() => void onSave(stopovers)}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Changes
          </Button>
        ) : null}
      </div>

      <VideoStopoverEditor
        source={source}
        stopovers={stopovers}
        onChange={setStopovers}
      />

      {!isEditing ? (
        <div className="flex justify-end border-t border-zinc-200 bg-zinc-50 px-5 py-4">
          <Button variant="blue" disabled={loading || stopovers.length === 0} onClick={() => setNameDialogOpen(true)}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Create Playable
          </Button>
        </div>
      ) : null}

      {nameDialogOpen ? (
        <VideoNameDialog
          value={newPlayableName}
          loading={loading}
          onChange={setNewPlayableName}
          onClose={() => setNameDialogOpen(false)}
          onSubmit={(name) => void handleConfirmCreate(name)}
        />
      ) : null}
    </section>
  );
}

function VideoUploadPanel({
  loading,
  onCancel,
  onFileSelect
}: {
  loading: boolean;
  onCancel: () => void;
  onFileSelect: (file: File | null) => void;
}) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white">
      <div className="flex items-center gap-3 border-b border-zinc-200 px-5 py-4">
        <Button variant="secondary" iconOnly ariaLabel="Back to creation types" onClick={onCancel}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-semibold text-zinc-950">Upload a video</h2>
        </div>
      </div>

      <div className="grid min-h-[440px] place-items-center p-5">
        <label className="grid w-full max-w-xl cursor-pointer place-items-center rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center transition hover:border-purple-300 hover:bg-purple-50">
          <span className="grid size-16 place-items-center rounded-md bg-purple-600 text-white">
            {loading ? <Loader2 className="size-8 animate-spin" /> : <Upload className="size-8" />}
          </span>
          <span className="mt-5 block text-xl font-semibold text-zinc-950">Choose a video file</span>
          <span className="mt-2 block max-w-md text-sm leading-6 text-zinc-500">MP4, WebM, MOV, and M4V files are supported. The video stays local in this workspace.</span>
          <input
            className="sr-only"
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.webm,.mov,.m4v"
            disabled={loading}
            onChange={(event) => onFileSelect(event.currentTarget.files?.[0] || null)}
          />
        </label>
      </div>
    </section>
  );
}

function VideoStopoverEditor({
  source,
  stopovers,
  onChange
}: {
  source: EditorVideoSource;
  stopovers: VideoStopover[];
  onChange: (stopovers: VideoStopover[]) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    kind: DragKind;
    pointerId: number;
    startX: number;
    startY: number;
    startStopover: DraftStopover;
  } | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [layout, setLayout] = useState<VideoLayout>({ x: 0, y: 0, width: 1, height: 1 });
  const [phase, setPhase] = useState<EditPhase>('idle');
  const [draftStopover, setDraftStopover] = useState<DraftStopover | null>(null);

  const sortedStopovers = useMemo(() => [...stopovers].sort((a, b) => a.timeMs - b.timeMs), [stopovers]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setCurrentTime(0);
    setDuration(0);
    setPhase('idle');
    setDraftStopover(null);
  }, [source.url]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      event.preventDefault();
      const dx = (event.clientX - drag.startX) / layout.width;
      const dy = (event.clientY - drag.startY) / layout.height;
      setDraftStopover(transformStopover(drag.startStopover, drag.kind, dx, dy));
    }

    function handlePointerUp(event: PointerEvent) {
      if (dragRef.current?.pointerId === event.pointerId) {
        dragRef.current = null;
      }
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [layout.height, layout.width]);

  useEffect(() => {
    const updateLayout = () => setLayout(computeVideoLayout(frameRef.current, videoRef.current));
    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  function updateVideoLayout() {
    setLayout(computeVideoLayout(frameRef.current, videoRef.current));
  }

  function getSeekDuration() {
    const liveDuration = videoRef.current?.duration;
    if (typeof liveDuration === 'number' && Number.isFinite(liveDuration) && liveDuration > 0) {
      return liveDuration;
    }
    return duration;
  }

  function seekTo(seconds: number) {
    const seekDuration = getSeekDuration();
    if (!Number.isFinite(seconds) || !Number.isFinite(seekDuration) || seekDuration <= 0) return;
    const nextTime = Math.max(0, Math.min(seekDuration, seconds));
    const video = videoRef.current;
    if (video) {
      video.currentTime = nextTime;
    }
    setCurrentTime(nextTime);
  }

  function seekToPointer(clientX: number) {
    const timeline = timelineRef.current;
    const seekDuration = getSeekDuration();
    if (!timeline || !Number.isFinite(seekDuration) || seekDuration <= 0) return;
    const rect = timeline.getBoundingClientRect();
    if (rect.width <= 0) return;
    if (clientX === 0 && rect.left > 0) return;
    const progress = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    seekTo(progress * seekDuration);
  }

  function addStopover() {
    const video = videoRef.current;
    video?.pause();
    const timeMs = Math.round((video?.currentTime || currentTime) * 1000);
    const rect = clampRect(DEFAULT_INPUT_AREA);
    setDraftStopover({
      id: `stopover-${Date.now()}`,
      timeMs,
      inputArea: rect,
      hand: {
        centerX: rect.x + rect.width / 2,
        centerY: rect.y + rect.height / 2
      }
    });
    setPhase('input');
  }

  function editStopover(stopover: VideoStopover) {
    videoRef.current?.pause();
    seekTo(stopover.timeMs / 1000);
    setDraftStopover({ ...stopover, editingId: stopover.id });
    setPhase('input');
  }

  function setInputArea() {
    if (!draftStopover) return;
    setDraftStopover({
      ...draftStopover,
      hand: {
        centerX: draftStopover.inputArea.x + draftStopover.inputArea.width / 2,
        centerY: draftStopover.inputArea.y + draftStopover.inputArea.height / 2
      }
    });
    setPhase('hand');
  }

  function setHand() {
    if (!draftStopover) return;
    const finalStopover: VideoStopover = {
      id: draftStopover.editingId || draftStopover.id,
      timeMs: draftStopover.timeMs,
      inputArea: draftStopover.inputArea,
      hand: draftStopover.hand
    };
    const nextStopovers = stopovers
      .filter((stopover) => stopover.id !== finalStopover.id)
      .concat(finalStopover)
      .sort((a, b) => a.timeMs - b.timeMs);
    onChange(nextStopovers);
    setDraftStopover(null);
    setPhase('idle');
  }

  function deleteStopover(id: string) {
    onChange(stopovers.filter((stopover) => stopover.id !== id));
    if (draftStopover?.id === id || draftStopover?.editingId === id) {
      setDraftStopover(null);
      setPhase('idle');
    }
  }

  function startDrag(kind: DragKind, event: ReactPointerEvent) {
    if (!draftStopover) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      kind,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startStopover: draftStopover
    };
  }

  const draftRectStyle = draftStopover ? rectStyle(draftStopover.inputArea, layout) : undefined;
  const draftHandStyle = draftStopover ? pointStyle(draftStopover.hand, layout) : undefined;
  const timelineProgress = duration > 0 ? Math.max(0, Math.min(100, (currentTime / duration) * 100)) : 0;

  return (
    <div className="grid gap-5 p-5">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          <div ref={frameRef} className="relative aspect-[9/16] max-h-[min(68vh,720px)] overflow-hidden rounded-md bg-zinc-950 shadow-sm ring-1 ring-zinc-200 xl:mx-auto" onPointerDown={() => videoRef.current?.pause()}>
            <video
              ref={videoRef}
              className="absolute inset-0 size-full object-cover"
              src={source.url}
              playsInline
              controls={false}
              onLoadedMetadata={(event) => {
                setDuration(event.currentTarget.duration || 0);
                updateVideoLayout();
              }}
              onLoadedData={updateVideoLayout}
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
            />

            {draftStopover && draftRectStyle ? (
              <div
                className={cx(
                  'absolute z-10 rounded-md border-2 border-white bg-blue-500/15 shadow-[0_0_0_2px_rgba(37,99,235,0.9),0_14px_34px_rgba(0,0,0,0.3)]',
                  phase === 'input' ? 'cursor-move' : 'pointer-events-none'
                )}
                style={draftRectStyle}
                onPointerDown={(event) => phase === 'input' && startDrag('rect-move', event)}
              >
                {phase === 'input' ? (
                  <>
                    {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as DragKind[]).map((handle) => (
                      <span
                        key={handle}
                        className={cx('absolute size-3 rounded-full border border-white bg-blue-600 shadow', handleClass(handle))}
                        onPointerDown={(event) => startDrag(handle, event)}
                      />
                    ))}
                  </>
                ) : null}
              </div>
            ) : null}

            {draftStopover && draftHandStyle && phase === 'hand' ? (
              <button
                type="button"
                aria-label="Move hand"
                className="absolute z-20 grid size-20 cursor-move place-items-center border-0 bg-transparent p-0"
                style={draftHandStyle}
                onPointerDown={(event) => startDrag('hand-move', event)}
              >
                <img className="size-20 object-contain drop-shadow-xl" src="/video-template-assets/src/assets/hand.png" alt="" />
              </button>
            ) : null}
          </div>
        </div>

        <aside className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
          <h3 className="text-base font-semibold text-zinc-950">Stopovers</h3>
          <p className="mt-1 text-sm leading-6 text-zinc-500">Pause at a frame, place the click area, then place the hand guide.</p>

          <div className="mt-4 grid gap-2">
            <Button variant="blue" disabled={phase !== 'idle'} onClick={addStopover}>
              <Scissors className="size-4" />
              Add Stopover
            </Button>
            {phase === 'input' ? (
              <Button onClick={setInputArea}>
                <Check className="size-4" />
                Set Input Area
              </Button>
            ) : null}
            {phase === 'hand' ? (
              <Button onClick={setHand}>
                <Hand className="size-4" />
                Set Hand
              </Button>
            ) : null}
            {phase !== 'idle' ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setDraftStopover(null);
                  setPhase('idle');
                }}
              >
                Cancel
              </Button>
            ) : null}
          </div>

          <div className="mt-5 grid gap-2">
            {sortedStopovers.length === 0 ? (
              <div className="rounded-md border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500">No stopovers yet.</div>
            ) : (
              sortedStopovers.map((stopover, index) => (
                <div key={stopover.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-zinc-200 bg-white p-2">
                  <button type="button" className="min-w-0 text-left" onClick={() => editStopover(stopover)}>
                    <span className="block truncate text-sm font-semibold text-zinc-950">Stopover {index + 1}</span>
                    <span className="text-xs text-zinc-500">{formatTime(stopover.timeMs / 1000)}</span>
                  </button>
                  <Button variant="danger" size="sm" iconOnly ariaLabel={`Delete stopover ${index + 1}`} onClick={() => deleteStopover(stopover.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3 text-sm font-semibold text-zinc-700">
          <span>{formatTime(currentTime)}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => (videoRef.current?.paused ? void videoRef.current.play() : videoRef.current?.pause())}>
              <Video className="size-4" />
              Play/Pause
            </Button>
          </div>
          <span>{formatTime(duration)}</span>
        </div>
        <div
          ref={timelineRef}
          className="relative h-12 touch-none cursor-pointer"
          role="slider"
          tabIndex={0}
          aria-label="Video timeline"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          aria-valuetext={formatTime(currentTime)}
          onPointerDown={(event) => {
            seekToPointer(event.clientX);
          }}
          onPointerMove={(event) => {
            if (event.buttons !== 1) return;
            seekToPointer(event.clientX);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              seekTo(currentTime - 1);
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              seekTo(currentTime + 1);
            }
          }}
        >
          <div className="absolute inset-x-0 top-7 h-1 rounded-full bg-zinc-300" />
          <div className="absolute left-0 top-7 h-1 rounded-full bg-blue-600" style={{ width: `${timelineProgress}%` }} />
          <span className="absolute top-5 z-10 size-5 -translate-x-1/2 rounded-full border-2 border-white bg-blue-600 shadow" style={{ left: `${timelineProgress}%` }} />
          {sortedStopovers.map((stopover, index) => (
            <button
              key={stopover.id}
              type="button"
              className="group absolute top-0 z-20 -translate-x-1/2"
              style={{ left: `${duration ? (stopover.timeMs / 1000 / duration) * 100 : 0}%` }}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => editStopover(stopover)}
              aria-label={`Edit stopover ${index + 1}`}
            >
              <span className="block h-9 w-0.5 rounded-full bg-purple-600" />
              <span
                className="absolute -right-3 -top-2 hidden size-5 place-items-center rounded-full border border-red-200 bg-white text-red-700 shadow group-hover:grid"
                onClick={(event) => {
                  event.stopPropagation();
                  deleteStopover(stopover.id);
                }}
              >
                ×
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function VideoNameDialog({
  value,
  loading,
  onChange,
  onClose,
  onSubmit
}: {
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (value: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="video-create-name-title" onClick={onClose}>
      <form
        className="w-full max-w-md overflow-hidden rounded-md border border-zinc-300 bg-white text-zinc-950 shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          const name = value.trim();
          if (name) onSubmit(name);
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-zinc-200 px-5 py-4">
          <h3 id="video-create-name-title" className="text-lg font-semibold">Name your playable</h3>
          <p className="mt-1 text-sm leading-6 text-zinc-500">This creates a new project folder under my-playables.</p>
        </div>
        <div className="grid gap-4 p-5">
          <input className="input" autoFocus type="text" required aria-label="Playable name" value={value} onChange={(event) => onChange(event.target.value)} />
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-4">
          <Button variant="secondary" type="button" disabled={loading} onClick={onClose}>
            Cancel
          </Button>
          <Button variant="blue" type="submit" disabled={loading || !value.trim()}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Create Playable
          </Button>
        </div>
      </form>
    </div>
  );
}

function computeVideoLayout(frame: HTMLDivElement | null, video: HTMLVideoElement | null): VideoLayout {
  const frameRect = frame?.getBoundingClientRect();
  if (!frameRect) return { x: 0, y: 0, width: 1, height: 1 };
  const videoWidth = video?.videoWidth || frameRect.width || 1;
  const videoHeight = video?.videoHeight || frameRect.height || 1;
  const scale = Math.max(frameRect.width / videoWidth, frameRect.height / videoHeight);
  const width = videoWidth * scale;
  const height = videoHeight * scale;

  return {
    x: (frameRect.width - width) / 2,
    y: (frameRect.height - height) / 2,
    width,
    height
  };
}

function rectStyle(rect: VideoStopover['inputArea'], layout: VideoLayout): CSSProperties {
  return {
    left: layout.x + rect.x * layout.width,
    top: layout.y + rect.y * layout.height,
    width: rect.width * layout.width,
    height: rect.height * layout.height
  };
}

function pointStyle(point: VideoStopover['hand'], layout: VideoLayout): CSSProperties {
  return {
    left: layout.x + point.centerX * layout.width,
    top: layout.y + point.centerY * layout.height,
    transform: 'translate(-50%, -50%)'
  };
}

function clampRect(rect: VideoStopover['inputArea']): VideoStopover['inputArea'] {
  const width = Math.max(0.03, Math.min(1, rect.width));
  const height = Math.max(0.03, Math.min(1, rect.height));
  return {
    x: Math.max(0, Math.min(1 - width, rect.x)),
    y: Math.max(0, Math.min(1 - height, rect.y)),
    width,
    height
  };
}

function clampPoint(point: VideoStopover['hand']): VideoStopover['hand'] {
  return {
    centerX: Math.max(0, Math.min(1, point.centerX)),
    centerY: Math.max(0, Math.min(1, point.centerY))
  };
}

function transformStopover(stopover: DraftStopover, kind: DragKind, dx: number, dy: number): DraftStopover {
  if (kind === 'hand-move') {
    return {
      ...stopover,
      hand: clampPoint({
        centerX: stopover.hand.centerX + dx,
        centerY: stopover.hand.centerY + dy
      })
    };
  }

  const rect = stopover.inputArea;
  let next = { ...rect };
  if (kind === 'rect-move') {
    next.x += dx;
    next.y += dy;
  } else {
    if (kind.includes('w')) {
      next.x += dx;
      next.width -= dx;
    }
    if (kind.includes('e')) next.width += dx;
    if (kind.includes('n')) {
      next.y += dy;
      next.height -= dy;
    }
    if (kind.includes('s')) next.height += dy;
  }

  next = clampRect(next);
  return { ...stopover, inputArea: next };
}

function handleClass(handle: DragKind) {
  const classes: Record<string, string> = {
    nw: '-left-1.5 -top-1.5 cursor-nwse-resize',
    n: 'left-1/2 -top-1.5 -translate-x-1/2 cursor-ns-resize',
    ne: '-right-1.5 -top-1.5 cursor-nesw-resize',
    e: '-right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize',
    se: '-bottom-1.5 -right-1.5 cursor-nwse-resize',
    s: '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize',
    sw: '-bottom-1.5 -left-1.5 cursor-nesw-resize',
    w: '-left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize'
  };
  return classes[handle] || '';
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = Math.floor(safeSeconds % 60);
  const fraction = Math.floor((safeSeconds % 1) * 10);
  return `${minutes}:${String(remainder).padStart(2, '0')}.${fraction}`;
}

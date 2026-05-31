import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Hand, Loader2, Pause, Play, Plus, RotateCw, Save, Scissors, Trash2, Upload } from 'lucide-react';
import type { VideoDraft, VideoEndButtonConfig, VideoGuideId, VideoPlayable, VideoStopover } from '../../types';
import { Button } from '../../components/ui';
import { cx, formatBytes } from '../../lib/appUtils';

type EditorVideoSource = {
  name: string;
  size: number;
  type: string;
  url: string;
};

type EditPhase = 'idle' | 'input' | 'hand';
type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
type GuideResizeKind = `hand-${ResizeHandle}`;
type DragKind = 'rect-move' | 'hand-move' | 'hand-rotate' | ResizeHandle | GuideResizeKind;

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
const HAND_SIZE_PX = 80;
const DEFAULT_HAND_WIDTH = 0.2;
const DEFAULT_GUIDE_ID: VideoGuideId = 'guide-1';
const DEFAULT_END_BUTTON_CONFIG: VideoEndButtonConfig = {
  text: 'PLAY NOW!',
  width: 230,
  height: 60,
  fontSize: 32,
  centerYPercent: 73,
  backgroundColor: '#28ae03',
  textColor: '#ffffff',
  pulseScale: 1.08,
  pulseDurationMs: 900
};
const RESIZE_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const satisfies readonly ResizeHandle[];
const VIDEO_GUIDES = [
  { id: 'guide-1', label: 'Guide 1', src: '/video-template-assets/src/assets/guide-1.png' },
  { id: 'guide-2', label: 'Guide 2', src: '/video-template-assets/src/assets/guide-2.png' },
  { id: 'guide-3', label: 'Guide 3', src: '/video-template-assets/src/assets/guide-3.png' }
] as const satisfies readonly { id: VideoGuideId; label: string; src: string }[];

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
  onCreate: (name: string, draft: VideoDraft, stopovers: VideoStopover[], endButton: VideoEndButtonConfig) => Promise<void>;
  onSave: (stopovers: VideoStopover[], endButton: VideoEndButtonConfig) => Promise<void>;
  onCancel: () => void;
}) {
  const isEditing = mode === 'edit';
  const [draft, setDraft] = useState<VideoDraft | null>(null);
  const [stopovers, setStopovers] = useState<VideoStopover[]>(initialPlayable?.stopovers || []);
  const [endButton, setEndButton] = useState<VideoEndButtonConfig>(() => normalizeEndButtonConfig(initialPlayable?.endButton));
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [newPlayableName, setNewPlayableName] = useState('');

  useEffect(() => {
    setDraft(null);
    setStopovers(initialPlayable?.stopovers || []);
    setEndButton(normalizeEndButtonConfig(initialPlayable?.endButton));
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
      setEndButton(normalizeEndButtonConfig());
    }
  }

  async function handleConfirmCreate(name: string) {
    if (!draft) return;
    await onCreate(name, draft, stopovers, endButton);
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
            <h2 className="truncate text-2xl font-semibold text-zinc-950">{isEditing ? initialPlayable?.name || 'Video playable' : 'Video Editor'}</h2>
            <p className="mt-1 truncate text-sm text-zinc-500">
              {source.name} · {formatBytes(source.size)}
            </p>
          </div>
        </div>
        {isEditing ? (
          <Button variant="purple" disabled={loading} onClick={() => void onSave(stopovers, endButton)}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Changes
          </Button>
        ) : null}
      </div>

      <VideoStopoverEditor
        source={source}
        stopovers={stopovers}
        endButton={endButton}
        onChange={setStopovers}
        onEndButtonChange={setEndButton}
      />

      {!isEditing ? (
        <div className="flex justify-end border-t border-zinc-200 bg-zinc-50 px-5 py-4">
          <Button variant="purple" disabled={loading || stopovers.length === 0} onClick={() => setNameDialogOpen(true)}>
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
  endButton,
  onChange,
  onEndButtonChange
}: {
  source: EditorVideoSource;
  stopovers: VideoStopover[];
  endButton: VideoEndButtonConfig;
  onChange: (stopovers: VideoStopover[]) => void;
  onEndButtonChange: (endButton: VideoEndButtonConfig) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const frameDurationRef = useRef(1 / 30);
  const frameSampleRef = useRef<{ mediaTime: number; presentedFrames: number } | null>(null);
  const dragRef = useRef<{
    kind: DragKind;
    pointerId: number;
    startX: number;
    startY: number;
    startStopover: DraftStopover;
    centerClientX?: number;
    centerClientY?: number;
    startAngleDeg?: number;
    startRotationDeg?: number;
  } | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
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
    setIsPlaying(false);
    setDuration(0);
    frameDurationRef.current = 1 / 30;
    frameSampleRef.current = null;
    setPhase('idle');
    setDraftStopover(null);
  }, [source.url]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !('requestVideoFrameCallback' in video)) return;
    let active = true;
    let callbackId = 0;

    const handleFrame: VideoFrameRequestCallback = (_now, metadata) => {
      const previous = frameSampleRef.current;
      if (previous && metadata.presentedFrames > previous.presentedFrames && metadata.mediaTime > previous.mediaTime) {
        const frameCount = metadata.presentedFrames - previous.presentedFrames;
        frameDurationRef.current = (metadata.mediaTime - previous.mediaTime) / frameCount;
      }
      frameSampleRef.current = {
        mediaTime: metadata.mediaTime,
        presentedFrames: metadata.presentedFrames
      };
      if (active) callbackId = video.requestVideoFrameCallback(handleFrame);
    };

    callbackId = video.requestVideoFrameCallback(handleFrame);
    return () => {
      active = false;
      video.cancelVideoFrameCallback(callbackId);
    };
  }, [source.url]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      event.preventDefault();
      if (
        drag.kind === 'hand-rotate' &&
        drag.centerClientX !== undefined &&
        drag.centerClientY !== undefined &&
        drag.startAngleDeg !== undefined &&
        drag.startRotationDeg !== undefined
      ) {
        const currentAngleDeg = getAngleDeg(event.clientX, event.clientY, drag.centerClientX, drag.centerClientY);
        setDraftStopover(rotateGuide(drag.startStopover, drag.startRotationDeg + currentAngleDeg - drag.startAngleDeg));
        return;
      }
      const dx = (event.clientX - drag.startX) / layout.width;
      const dy = (event.clientY - drag.startY) / layout.height;
      setDraftStopover(transformStopover(drag.startStopover, drag.kind, dx, dy, layout));
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

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  }

  function stepFrame(direction: -1 | 1) {
    const video = videoRef.current;
    video?.pause();
    const frameDuration = Number.isFinite(frameDurationRef.current) && frameDurationRef.current > 0 ? frameDurationRef.current : 1 / 30;
    seekTo((video?.currentTime || currentTime) + direction * frameDuration);
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
        centerY: rect.y + rect.height / 2,
        width: getHandWidth(layout),
        guideId: DEFAULT_GUIDE_ID,
        rotationDeg: 0
      }
    });
    setPhase('input');
  }

  function editStopover(stopover: VideoStopover) {
    videoRef.current?.pause();
    seekTo(stopover.timeMs / 1000);
    setDraftStopover({
      ...stopover,
      hand: {
        ...stopover.hand,
        guideId: stopover.hand.guideId || DEFAULT_GUIDE_ID,
        rotationDeg: normalizeRotation(stopover.hand.rotationDeg || 0)
      },
      editingId: stopover.id
    });
    setPhase('input');
  }

  function setInputArea() {
    if (!draftStopover) return;
    setDraftStopover({
      ...draftStopover,
      hand: {
        centerX: draftStopover.inputArea.x + draftStopover.inputArea.width / 2,
        centerY: draftStopover.inputArea.y + draftStopover.inputArea.height / 2,
        width: draftStopover.hand.width || getHandWidth(layout),
        guideId: draftStopover.hand.guideId || DEFAULT_GUIDE_ID,
        rotationDeg: draftStopover.hand.rotationDeg || 0
      }
    });
    setPhase('hand');
  }

  function selectGuide(guideId: VideoGuideId) {
    setDraftStopover((stopover) => stopover
      ? {
          ...stopover,
          hand: {
            ...stopover.hand,
            guideId
          }
        }
      : stopover);
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
    const guideCenter = kind === 'hand-rotate' ? getPointClientCenter(draftStopover.hand, layout, frameRef.current) : null;
    const startAngleDeg = guideCenter ? getAngleDeg(event.clientX, event.clientY, guideCenter.x, guideCenter.y) : undefined;
    dragRef.current = {
      kind,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startStopover: draftStopover,
      centerClientX: guideCenter?.x,
      centerClientY: guideCenter?.y,
      startAngleDeg,
      startRotationDeg: draftStopover.hand.rotationDeg || 0
    };
  }

  const draftRectStyle = draftStopover ? rectStyle(draftStopover.inputArea, layout) : undefined;
  const draftHandStyle = draftStopover ? pointStyle(draftStopover.hand, layout) : undefined;
  const timelineProgress = duration > 0 ? Math.max(0, Math.min(100, (currentTime / duration) * 100)) : 0;
  const selectedGuideId = draftStopover?.hand.guideId || DEFAULT_GUIDE_ID;
  const selectedGuide = getGuideOption(selectedGuideId);

  return (
    <div className="grid gap-5 p-5">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
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
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
            />

            {draftStopover && draftRectStyle ? (
              <div
                className={cx(
                  'absolute z-10 rounded-md border-2 border-white bg-purple-500/15 shadow-[0_0_0_2px_rgba(147,51,234,0.9),0_14px_34px_rgba(0,0,0,0.3)]',
                  phase === 'input' ? 'cursor-move' : 'pointer-events-none'
                )}
                style={draftRectStyle}
                onPointerDown={(event) => phase === 'input' && startDrag('rect-move', event)}
              >
                {phase === 'input' ? (
                  <>
                    {RESIZE_HANDLES.map((handle) => (
                      <span
                        key={handle}
                        className={cx('absolute size-3 rounded-full border border-white bg-purple-600 shadow', handleClass(handle))}
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
                className="absolute z-20 grid cursor-move place-items-center rounded-md border-2 border-white bg-purple-500/10 p-0 shadow-[0_0_0_2px_rgba(147,51,234,0.9),0_14px_34px_rgba(0,0,0,0.3)]"
                style={draftHandStyle}
                onPointerDown={(event) => startDrag('hand-move', event)}
              >
                <img className="size-full object-contain drop-shadow-xl" src={selectedGuide.src} alt="" />
                <span
                  className="absolute left-1/2 top-0 grid size-7 -translate-x-1/2 -translate-y-11 cursor-grab place-items-center rounded-full border border-white bg-purple-600 text-white shadow active:cursor-grabbing"
                  onPointerDown={(event) => startDrag('hand-rotate', event)}
                >
                  <RotateCw className="size-4" />
                </span>
                <span className="pointer-events-none absolute left-1/2 top-0 h-8 w-0.5 -translate-x-1/2 -translate-y-8 bg-purple-600" />
                {RESIZE_HANDLES.map((handle) => (
                  <span
                    key={handle}
                    className={cx('absolute size-3 rounded-full border border-white bg-purple-600 shadow', handleClass(handle))}
                    onPointerDown={(event) => startDrag(`hand-${handle}`, event)}
                  />
                ))}
              </button>
            ) : null}
          </div>
        </div>

        <aside className="grid min-h-0 gap-3 xl:max-h-[min(68vh,720px)]">
          <section className="min-h-0 overflow-y-auto rounded-md border border-zinc-200 bg-zinc-50 p-4">
            <h3 className="text-base font-semibold text-zinc-950">Stopovers</h3>

            <div className="mt-4 grid gap-2">
              <Button variant="purple" disabled={phase !== 'idle'} onClick={addStopover}>
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
                <>
                  <div className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Guide</span>
                    <div className="grid grid-cols-3 gap-2">
                      {VIDEO_GUIDES.map((guide) => (
                        <button
                          key={guide.id}
                          type="button"
                          aria-label={`Use ${guide.label}`}
                          aria-pressed={selectedGuideId === guide.id}
                          className={cx(
                            'grid aspect-square place-items-center rounded-md border bg-white p-2 transition hover:border-purple-300 hover:bg-purple-50',
                            selectedGuideId === guide.id ? 'border-purple-600 ring-2 ring-purple-600/20' : 'border-zinc-300'
                          )}
                          onClick={() => selectGuide(guide.id)}
                        >
                          <img className="max-h-full max-w-full object-contain drop-shadow" src={guide.src} alt="" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button onClick={setHand}>
                    <Hand className="size-4" />
                    Set Hand
                  </Button>
                </>
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
          </section>

          <EndButtonSettings value={endButton} onChange={onEndButtonChange} />
        </aside>
      </div>

      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3 text-sm font-semibold text-zinc-700">
          <span>{formatTime(currentTime)}</span>
          <div className="flex gap-2" aria-label="Playback controls">
            <Button variant="secondary" iconOnly ariaLabel="Previous frame" onClick={() => stepFrame(-1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="secondary" iconOnly ariaLabel={isPlaying ? 'Pause video' : 'Play video'} onClick={togglePlayback}>
              {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
            </Button>
            <Button variant="secondary" iconOnly ariaLabel="Next frame" onClick={() => stepFrame(1)}>
              <ChevronRight className="size-4" />
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
          <div className="absolute left-0 top-7 h-1 rounded-full bg-purple-600" style={{ width: `${timelineProgress}%` }} />
          <span className="absolute top-5 z-10 size-5 -translate-x-1/2 rounded-full border-2 border-white bg-purple-600 shadow" style={{ left: `${timelineProgress}%` }} />
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
          <Button variant="purple" type="submit" disabled={loading || !value.trim()}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Create Playable
          </Button>
        </div>
      </form>
    </div>
  );
}

function EndButtonSettings({
  value,
  onChange
}: {
  value: VideoEndButtonConfig;
  onChange: (value: VideoEndButtonConfig) => void;
}) {
  function updateField<K extends keyof VideoEndButtonConfig>(key: K, nextValue: VideoEndButtonConfig[K]) {
    onChange(normalizeEndButtonConfig({ ...value, [key]: nextValue }));
  }

  return (
    <section className="max-h-64 overflow-y-auto rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-zinc-950">End Button</h3>
        <button
          type="button"
          className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-purple-700 hover:bg-purple-50"
          onClick={() => onChange(normalizeEndButtonConfig())}
        >
          Reset
        </button>
      </div>

      <div className="mt-3 grid gap-3">
        <label className="grid gap-1 text-xs font-semibold text-zinc-600">
          Text
          <input className="input" type="text" value={value.text} onChange={(event) => updateField('text', event.target.value)} />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <ColorField label="Background" value={value.backgroundColor} onChange={(nextValue) => updateField('backgroundColor', nextValue)} />
          <ColorField label="Text color" value={value.textColor} onChange={(nextValue) => updateField('textColor', nextValue)} />
        </div>
      </div>
    </section>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-zinc-600">
      {label}
      <input className="color-input" type="color" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function normalizeEndButtonConfig(config: Partial<VideoEndButtonConfig> = {}): VideoEndButtonConfig {
  const text = String(config.text || DEFAULT_END_BUTTON_CONFIG.text);
  return {
    text,
    width: getEndButtonWidth(text, DEFAULT_END_BUTTON_CONFIG.fontSize),
    height: DEFAULT_END_BUTTON_CONFIG.height,
    fontSize: DEFAULT_END_BUTTON_CONFIG.fontSize,
    centerYPercent: DEFAULT_END_BUTTON_CONFIG.centerYPercent,
    backgroundColor: normalizeHexColor(config.backgroundColor, DEFAULT_END_BUTTON_CONFIG.backgroundColor),
    textColor: normalizeHexColor(config.textColor, DEFAULT_END_BUTTON_CONFIG.textColor),
    pulseScale: DEFAULT_END_BUTTON_CONFIG.pulseScale,
    pulseDurationMs: DEFAULT_END_BUTTON_CONFIG.pulseDurationMs
  };
}

function getEndButtonWidth(text: string, fontSize: number) {
  return Math.max(120, Math.min(420, Math.ceil(text.length * fontSize * 0.68 + 48)));
}

function normalizeHexColor(value: unknown, fallback: string) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function getGuideOption(guideId: VideoGuideId) {
  return VIDEO_GUIDES.find((guide) => guide.id === guideId) || VIDEO_GUIDES[0];
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
  const width = (point.width || DEFAULT_HAND_WIDTH) * layout.width;
  return {
    left: layout.x + point.centerX * layout.width,
    top: layout.y + point.centerY * layout.height,
    width,
    height: width,
    transform: `translate(-50%, -50%) rotate(${point.rotationDeg || 0}deg)`
  };
}

function getHandWidth(layout: VideoLayout) {
  if (!Number.isFinite(layout.width) || layout.width <= 1) {
    return DEFAULT_HAND_WIDTH;
  }
  return Math.max(0.08, Math.min(0.5, HAND_SIZE_PX / layout.width));
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
    centerY: Math.max(0, Math.min(1, point.centerY)),
    width: Math.max(0.08, Math.min(0.5, point.width || DEFAULT_HAND_WIDTH)),
    guideId: point.guideId || DEFAULT_GUIDE_ID,
    rotationDeg: normalizeRotation(point.rotationDeg || 0)
  };
}

function rotateGuide(stopover: DraftStopover, rotationDeg: number): DraftStopover {
  return {
    ...stopover,
    hand: clampPoint({
      ...stopover.hand,
      rotationDeg: normalizeRotation(rotationDeg)
    })
  };
}

function transformStopover(stopover: DraftStopover, kind: DragKind, dx: number, dy: number, layout: VideoLayout): DraftStopover {
  if (kind === 'hand-move') {
    return {
      ...stopover,
      hand: clampPoint({
        ...stopover.hand,
        centerX: stopover.hand.centerX + dx,
        centerY: stopover.hand.centerY + dy,
        width: stopover.hand.width
      })
    };
  }

  if (kind.startsWith('hand-') && kind !== 'hand-rotate') {
    const handle = kind.replace('hand-', '') as ResizeHandle;
    const verticalScale = Number.isFinite(layout.height / layout.width) && layout.width > 0 ? layout.height / layout.width : 1;
    const horizontalDelta = handle.includes('e') ? dx : handle.includes('w') ? -dx : 0;
    const verticalDelta = (handle.includes('s') ? dy : handle.includes('n') ? -dy : 0) * verticalScale;
    const widthDelta = Math.abs(horizontalDelta) > Math.abs(verticalDelta) ? horizontalDelta : verticalDelta;
    return {
      ...stopover,
      hand: clampPoint({
        ...stopover.hand,
        width: (stopover.hand.width || DEFAULT_HAND_WIDTH) + widthDelta
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

function getPointClientCenter(point: VideoStopover['hand'], layout: VideoLayout, frame: HTMLDivElement | null) {
  const frameRect = frame?.getBoundingClientRect();
  return {
    x: (frameRect?.left || 0) + layout.x + point.centerX * layout.width,
    y: (frameRect?.top || 0) + layout.y + point.centerY * layout.height
  };
}

function getAngleDeg(pointerX: number, pointerY: number, centerX: number, centerY: number) {
  return Math.atan2(pointerY - centerY, pointerX - centerX) * 180 / Math.PI;
}

function normalizeRotation(rotationDeg: number) {
  return ((((rotationDeg + 180) % 360) + 360) % 360) - 180;
}

function handleClass(handle: ResizeHandle) {
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

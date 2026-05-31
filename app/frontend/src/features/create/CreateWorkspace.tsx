import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode, RefObject } from 'react';
import { AlertTriangle, ArrowLeft, Check, Code2, Copy, Download, ImageIcon, LayoutTemplate, Loader2, Play, Plus, RotateCcw, Save, SlidersHorizontal, Sparkles, Terminal, Video } from 'lucide-react';
import blastIcon from '../../assets/blast-icon.png';
import catcherIcon from '../../assets/catcher-icon.png';
import type { AssetOptionsById, CreateFormTab } from '../../appTypes';
import type { PlayableTemplate, VideoDraft, VideoEndButtonConfig, VideoPlayable, VideoStopover } from '../../types';
import { Button } from '../../components/ui';
import { AssetSection } from '../assets/AssetSection';
import { ParameterSection } from '../config/ConfigControls';
import { VideoWorkspace } from '../video/VideoWorkspace';
import { cx, groupConfigFields } from '../../lib/appUtils';

export function CreateWorkspace({
  formRef,
  mode,
  editingPlayableName,
  templates,
  selectedTemplate,
  configValues,
  loading,
  demoLoadingTemplateId,
  editingVideoPlayable,
  onSelectTemplate,
  onPreviewTemplate,
  onUploadVideo,
  onCreateVideo,
  onSaveVideo,
  onUpdateConfig,
  onSubmit,
  onReset,
  onCancel
}: {
  formRef: RefObject<HTMLFormElement | null>;
  mode?: 'create' | 'edit';
  editingPlayableName?: string;
  templates: PlayableTemplate[];
  selectedTemplate: PlayableTemplate | null;
  configValues: Record<string, unknown>;
  loading: boolean;
  demoLoadingTemplateId: string;
  editingVideoPlayable?: VideoPlayable | null;
  onSelectTemplate: (id: string) => void;
  onPreviewTemplate: (id: string) => void;
  onUploadVideo: (file: File) => Promise<VideoDraft | null>;
  onCreateVideo: (name: string, draft: VideoDraft, stopovers: VideoStopover[], endButton: VideoEndButtonConfig) => Promise<void>;
  onSaveVideo: (stopovers: VideoStopover[], endButton: VideoEndButtonConfig) => Promise<void>;
  onUpdateConfig: (path: string, value: unknown) => void;
  onSubmit: (playableName?: string) => void;
  onReset: () => void;
  onCancel?: () => void;
}) {
  const isEditing = mode === 'edit';
  const isEditingVideo = Boolean(editingVideoPlayable);
  const [step, setStep] = useState<'source' | 'templates' | 'form' | 'video' | 'custom'>(isEditing ? 'form' : 'source');
  const [activeFormTab, setActiveFormTab] = useState<CreateFormTab>('assets');
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [newPlayableName, setNewPlayableName] = useState('');
  const [assetOptionsById, setAssetOptionsById] = useState<AssetOptionsById>({});
  const assets = selectedTemplate?.assets || [];
  const assetDefaultsKey = assets.map((asset) => `${asset.id}:${(asset.defaultFiles || []).map((file) => file.url).join(',')}`).join('|');
  const groups = useMemo(() => groupConfigFields(selectedTemplate?.config, selectedTemplate?.configSections), [selectedTemplate]);
  const parameterCount = groups.reduce((count, group) => count + group.fields.length + group.advancedFields.length, 0);

  useEffect(() => {
    setStep(isEditing ? (isEditingVideo ? 'video' : 'form') : 'source');
  }, [isEditing, isEditingVideo]);

  useEffect(() => {
    setActiveFormTab(assets.length > 0 ? 'assets' : 'parameters');
    setNameDialogOpen(false);
    setNewPlayableName('');
    setAssetOptionsById({});
  }, [selectedTemplate?.id, assets.length, assetDefaultsKey]);

  useEffect(() => {
    if (!selectedTemplate) return;

    for (const field of selectedTemplate.config || []) {
      if (field.control !== 'asset-select' || !field.optionsFromAsset) continue;
      const options = assetOptionsById[field.optionsFromAsset] || [];
      if (options.length === 0) continue;

      const currentValue = Number(configValues[field.path] ?? field.default);
      if (!options.some((option) => option.value === currentValue)) {
        onUpdateConfig(field.path, options[0].value);
      }
    }
  }, [assetOptionsById, configValues, onUpdateConfig, selectedTemplate]);

  function updateAssetOptions(assetId: string, options: AssetOptionsById[string]) {
    setAssetOptionsById((current) => ({ ...current, [assetId]: options }));
  }

  function openTemplateForm(templateId: string) {
    onSelectTemplate(templateId);
    setStep('form');
  }

  function openNameDialog() {
    if (!selectedTemplate || loading) return;
    if (isEditing) {
      onSubmit();
      return;
    }
    setNameDialogOpen(true);
  }

  function handleOpenNameDialog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    openNameDialog();
  }

  function handleConfirmCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = newPlayableName.trim();
    if (!trimmedName) return;
    setNameDialogOpen(false);
    onSubmit(trimmedName);
  }

  function handleResetClick() {
    setNameDialogOpen(false);
    setNewPlayableName('');
    onReset();
  }

  if (!isEditing && step === 'source') {
    return (
      <section className="grid gap-4 md:grid-cols-3">
        <SourceChoiceCard
          icon={<LayoutTemplate className="size-9" />}
          title="Template"
          description="Start from a ready-made playable kit and customize assets, copy, and gameplay settings."
          advantages={['Fastest path to a build', 'Includes proven game logic', 'Best for repeatable formats']}
          tone="blue"
          onClick={() => setStep('templates')}
        />
        <SourceChoiceCard
          icon={<Video className="size-9" />}
          title="Video"
          description="Turn gameplay footage into a tap-to-continue playable ad with guided stopovers."
          advantages={['Built for motion-led ads', 'Keeps source footage central', 'Good for fast creative variants']}
          tone="purple"
          onClick={() => setStep('video')}
        />
        <SourceChoiceCard
          icon={<Code2 className="size-9" />}
          title="Custom"
          description="Download the starter pack and shape a bespoke playable with reusable modules and examples."
          advantages={['Maximum creative control', 'Flexible interaction design', 'Tailored gameplay structure']}
          tone="orange"
          onClick={() => setStep('custom')}
        />
      </section>
    );
  }

  if (!isEditing && step === 'custom') {
    return <CustomStarterPage onBack={() => setStep('source')} />;
  }

  if (isEditingVideo || (!isEditing && step === 'video')) {
    return (
      <VideoWorkspace
        mode={isEditingVideo ? 'edit' : 'create'}
        initialPlayable={editingVideoPlayable || null}
        loading={loading}
        onUpload={onUploadVideo}
        onCreate={onCreateVideo}
        onSave={onSaveVideo}
        onCancel={() => (isEditingVideo ? onCancel?.() : setStep('source'))}
      />
    );
  }

  if (!isEditing && step === 'templates') {
    return (
      <section className="rounded-md border border-zinc-200 bg-white">
        <div className="flex items-center gap-3 border-b border-zinc-200 px-5 py-4">
          <Button variant="secondary" iconOnly ariaLabel="Back to creation types" onClick={() => setStep('source')}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-semibold text-zinc-950">Choose a template</h2>
          </div>
        </div>

        <div className="template-picker-grid p-5">
          {templates.map((template) => (
            <TemplatePlayableCard
              key={template.id}
              template={template}
              demoLoading={demoLoadingTemplateId === template.id}
              onPreview={() => onPreviewTemplate(template.id)}
              onCreate={() => openTemplateForm(template.id)}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <form ref={formRef} noValidate onSubmit={handleOpenNameDialog} className="rounded-md border border-zinc-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="secondary" iconOnly ariaLabel={isEditing ? 'Back to my playables' : 'Back to templates'} onClick={() => (isEditing ? onCancel?.() : setStep('templates'))}>
              <ArrowLeft className="size-4" />
            </Button>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-semibold text-zinc-950">{isEditing ? editingPlayableName || 'Playable' : selectedTemplate?.name || 'Template'}</h2>
            </div>
          </div>
          <Button variant="secondary" type="button" onClick={handleResetClick}>
            <RotateCcw className="size-4" />
            Reset
          </Button>
        </div>

        <div className="grid gap-6 p-5">
          <section>
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-1" role="tablist" aria-label="Template setup sections">
              <div className="grid gap-1 sm:grid-cols-2">
                <CreateFormTabButton
                  active={activeFormTab === 'assets'}
                  icon={<ImageIcon className="size-4" />}
                  label="Assets"
                  count={assets.length}
                  description="Upload creative files"
                  onClick={() => setActiveFormTab('assets')}
                />
                <CreateFormTabButton
                  active={activeFormTab === 'parameters'}
                  icon={<SlidersHorizontal className="size-4" />}
                  label="Parameters"
                  count={parameterCount}
                  description="Tune gameplay settings"
                  onClick={() => setActiveFormTab('parameters')}
                />
              </div>
            </div>

            <div className="mt-5">
              <div hidden={activeFormTab !== 'assets'}>
                <AssetSection assets={assets} onAssetOptionsChange={updateAssetOptions} />
              </div>
              <div hidden={activeFormTab !== 'parameters'}>
                <div className="grid gap-5">
                  {groups.map((group) => (
                    <ParameterSection key={group.path} group={group} values={configValues} assetOptionsById={assetOptionsById} onUpdate={onUpdateConfig} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex justify-end border-t border-zinc-200 bg-zinc-50 px-5 py-4">
          <Button variant="blue" type="button" disabled={loading || !selectedTemplate} onClick={openNameDialog}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : isEditing ? <Save className="size-4" /> : <Plus className="size-4" />}
            {isEditing ? 'Save Changes' : 'Create Playable'}
          </Button>
        </div>
      </form>
      {nameDialogOpen ? (
        <CreateNameDialog
          value={newPlayableName}
          loading={loading}
          onChange={setNewPlayableName}
          onClose={() => setNameDialogOpen(false)}
          onSubmit={handleConfirmCreate}
        />
      ) : null}
    </section>
  );
}

const customStarterPrompts = [
  'Read reusables/ first, reuse its modules, and review how games/ uses them. Then create a swipe-based endless runner where the player dodges obstacles and collects boosters. Keep one-touch controls and a replay CTA.',
  'Read reusables/ first, reuse its modules, and review how games/ uses them. Then build a match-3 mini puzzle with a 30-second timer, combo scoring, and a final win panel with install button.',
  'Read reusables/ first, reuse its modules, and review how games/ uses them. Then design a merge game prototype using drag-and-drop pieces, progressive tiers, and particle feedback on successful merges.',
  'Read reusables/ first, reuse its modules, and review how games/ uses them. Then generate a tower-defense style lane game with tap-to-deploy units, simple enemy waves, and a progress bar HUD.',
  'Read reusables/ first, reuse its modules, and review how games/ uses them. Then create a physics slingshot challenge where users pull, aim, and release projectiles to hit targets in three short rounds.'
];

function CustomStarterPage({ onBack }: { onBack: () => void }) {
  const [copiedPromptIndex, setCopiedPromptIndex] = useState<number | null>(null);

  function downloadStarterPack() {
    window.location.assign('/api/custom/starter-pack/download');
  }

  async function copyPrompt(prompt: string, index: number) {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedPromptIndex(index);
      window.setTimeout(() => setCopiedPromptIndex((currentIndex) => (currentIndex === index ? null : currentIndex)), 1600);
    } catch {
      setCopiedPromptIndex(null);
    }
  }

  return (
    <section className="rounded-md border border-zinc-200 bg-white">
      <div className="flex flex-col gap-4 border-b border-zinc-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="secondary" iconOnly ariaLabel="Back to creation types" onClick={onBack}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold text-zinc-950">Custom</h2>
          </div>
        </div>
        <Button variant="accent" onClick={downloadStarterPack}>
          <Download className="size-4" />
          Download starter pack
        </Button>
      </div>

      <div className="grid gap-6 p-5">
        <div className="grid gap-4 rounded-md border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <div className="flex gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-white text-amber-700 ring-1 ring-amber-200">
              <Sparkles className="size-4" />
            </span>
            <p className="text-base leading-7">
              Use these starter prompts with your preferred generation workflow, then adapt the downloaded scaffold.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-white text-amber-700 ring-1 ring-amber-200">
              <AlertTriangle className="size-4" />
            </span>
            <p className="text-base leading-7">
              <span className="font-semibold">Important for every prompt:</span> tell the AI agent to read reusables/ first, reuse modules from there, and inspect implementations under games/ to follow existing usage patterns.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-white text-amber-700 ring-1 ring-amber-200">
              <Terminal className="size-4" />
            </span>
            <p className="text-base leading-7">
              <span className="font-semibold">Quick start for the starter pack:</span> unzip the downloaded archive, open a terminal, run <code className="rounded bg-white/75 px-1.5 py-0.5 text-xs font-semibold">cd custom-game</code>, then run <code className="rounded bg-white/75 px-1.5 py-0.5 text-xs font-semibold">npx vite</code> to launch the sample rotating-cube scene.
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          {customStarterPrompts.map((prompt, index) => (
            <article key={prompt} className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-950/5 transition hover:border-amber-300 hover:bg-amber-50/40">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="max-w-6xl text-sm leading-6 text-zinc-700">{prompt}</p>
                </div>
                <Button
                  variant={copiedPromptIndex === index ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => void copyPrompt(prompt, index)}
                >
                  {copiedPromptIndex === index ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copiedPromptIndex === index ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CreateNameDialog({
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
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="create-name-title" onClick={onClose}>
      <form className="w-full max-w-md overflow-hidden rounded-md border border-zinc-300 bg-white text-zinc-950 shadow-2xl" onSubmit={onSubmit} onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-zinc-200 px-5 py-4">
          <h3 id="create-name-title" className="text-lg font-semibold">Name your playable</h3>
          <p className="mt-1 text-sm leading-6 text-zinc-500">This creates a new project folder under my-playables.</p>
        </div>
        <div className="grid gap-4 p-5">
          <input
            ref={inputRef}
            className="input"
            id="playableName"
            name="playableName"
            type="text"
            required
            aria-label="Playable name"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
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

function CreateFormTabButton({
  active,
  icon,
  label,
  count,
  description,
  onClick
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  count: number;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cx(
        'flex min-h-16 items-center justify-center gap-4 rounded-md px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-100',
        active
          ? 'border border-blue-500 bg-blue-50/70 text-blue-700 shadow-sm shadow-blue-900/10'
          : 'text-zinc-600 hover:bg-white/70 hover:text-zinc-950'
      )}
    >
      <span className={cx('grid size-9 shrink-0 place-items-center rounded-md', active ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-100' : 'bg-white text-zinc-500 ring-1 ring-zinc-200')}>{icon}</span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold">{label}</span>
          <span className={cx('rounded-md px-1.5 py-0.5 text-xs font-bold ring-1', active ? 'bg-white text-blue-700 ring-blue-200' : 'bg-zinc-200 text-zinc-600 ring-transparent')}>{count}</span>
        </span>
        <span className={cx('mt-0.5 block truncate text-xs font-medium', active ? 'text-zinc-600' : 'text-zinc-500')}>{description}</span>
      </span>
    </button>
  );
}

function SourceChoiceCard({
  icon,
  title,
  description,
  advantages,
  tone,
  disabled,
  onClick
}: {
  icon: ReactNode;
  title: string;
  description: string;
  advantages: string[];
  tone: 'blue' | 'purple' | 'orange';
  disabled?: boolean;
  onClick?: () => void;
}) {
  const toneClasses = {
    blue: 'border-blue-200 bg-blue-50 text-blue-950 hover:border-blue-300 hover:bg-blue-100',
    purple: 'border-purple-200 bg-purple-50 text-purple-950 hover:border-purple-300 hover:bg-purple-100',
    orange: 'border-amber-200 bg-amber-50 text-amber-950 hover:border-amber-300 hover:bg-amber-100'
  };
  const iconClasses = {
    blue: 'bg-blue-600 text-white',
    purple: 'bg-purple-600 text-white',
    orange: 'bg-amber-500 text-zinc-950'
  };
  const bulletClasses = {
    blue: 'bg-blue-600',
    purple: 'bg-purple-600',
    orange: 'bg-amber-500'
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'min-h-80 rounded-md border p-6 text-left transition disabled:cursor-not-allowed disabled:opacity-65',
        toneClasses[tone]
      )}
    >
      <span className={cx('grid size-16 place-items-center rounded-md', iconClasses[tone])}>{icon}</span>
      <span className="mt-6 block text-2xl font-semibold">{title}</span>
      <span className="mt-3 block text-sm leading-6 opacity-75">{description}</span>
      <span className="mt-6 grid gap-3">
        {advantages.map((advantage) => (
          <span key={advantage} className="flex items-center gap-2 text-sm font-medium">
            <span className={cx('size-1.5 rounded-full', bulletClasses[tone])} />
            {advantage}
          </span>
        ))}
      </span>
      {disabled ? <span className="mt-6 inline-flex rounded-md bg-white/70 px-3 py-1.5 text-xs font-semibold">Coming soon</span> : null}
    </button>
  );
}

function TemplatePlayableCard({
  template,
  demoLoading,
  onPreview,
  onCreate
}: {
  template: PlayableTemplate;
  demoLoading: boolean;
  onPreview: () => void;
  onCreate: () => void;
}) {
  const iconSrc = template.id === 'catcher' ? catcherIcon : template.id === 'blast' ? blastIcon : null;

  return (
    <article
      className="template-card cursor-pointer rounded-md border border-zinc-200 bg-white transition hover:border-blue-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
      role="button"
      tabIndex={0}
      onClick={onCreate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onCreate();
        }
      }}
    >
      <div className="grid justify-items-center text-center">
        <span className="grid size-28 place-items-center rounded-md bg-white">
          {iconSrc ? (
            <img className="size-28 object-contain" src={iconSrc} alt="" />
          ) : (
            <LayoutTemplate className="size-12 text-blue-600" />
          )}
        </span>
        <h3 className="mt-1 text-lg font-semibold text-zinc-950">{template.name}</h3>
      </div>

      <div className="grid">
        <Button
          variant="secondary"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            onPreview();
          }}
          disabled={demoLoading}
        >
          {demoLoading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          Demo
        </Button>
      </div>
    </article>
  );
}

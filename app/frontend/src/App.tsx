import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  ChevronRight,
  FileArchive,
  FolderOpen,
  Hammer,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings2,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import {
  createPlayable,
  deleteBuildArtifact,
  fetchBuildArtifacts,
  fetchBuildOptions,
  fetchPlayables,
  fetchTemplates,
  previewPlayable,
  runPlayableBuild
} from './api';
import type {
  BuildArtifact,
  BuildOptions,
  BuildResponse,
  ConfigField,
  Playable,
  PlayableTemplate,
  TemplateAsset,
  UploadedFilePayload
} from './types';

type View = 'playables' | 'create';
type Notice = { type: 'info' | 'success' | 'error'; message: string } | null;

const actionLabels: Record<View, string> = {
  playables: 'My Playables',
  create: 'Create Playable'
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function cloneConfigValue(value: unknown) {
  return Array.isArray(value) ? [...value] : value;
}

function resetValuesForTemplate(template: PlayableTemplate | null) {
  const values: Record<string, unknown> = {};
  for (const field of template?.config || []) {
    values[field.path] = cloneConfigValue(field.default);
  }
  return values;
}

function formatDate(value?: string | null) {
  if (!value) return 'Unknown date';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function titleize(value: string) {
  return String(value)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sectionPathForField(field: ConfigField) {
  const parts = String(field.path || '').split('.').filter(Boolean);
  if (parts.length <= 1) return parts[0] || 'parameters';
  return parts.slice(0, -1).join('.');
}

function sectionLabel(sectionPath: string) {
  const sectionName = String(sectionPath || '').split('.').at(-1) || sectionPath;
  const acronyms: Record<string, string> = { hud: 'HUD', ui: 'UI' };
  return acronyms[sectionName] || titleize(sectionName);
}

function groupConfigFields(fields: ConfigField[] = []) {
  const groups: Array<{ path: string; label: string; fields: ConfigField[]; advancedFields: ConfigField[] }> = [];
  const groupByPath = new Map<string, (typeof groups)[number]>();

  for (const field of fields) {
    const sectionPath = sectionPathForField(field);
    let group = groupByPath.get(sectionPath);

    if (!group) {
      group = { path: sectionPath, label: sectionLabel(sectionPath), fields: [], advancedFields: [] };
      groupByPath.set(sectionPath, group);
      groups.push(group);
    }

    if (field.advanced) group.advancedFields.push(field);
    else group.fields.push(field);
  }

  return groups;
}

function networkLabel(value: string) {
  const labels: Record<string, string> = {
    applovin: 'AppLovin',
    unity: 'Unity Ads',
    google: 'Google Ads',
    ironsource: 'ironSource',
    facebook: 'Facebook',
    moloco: 'Moloco',
    adcolony: 'AdColony',
    mintegral: 'Mintegral',
    vungle: 'Vungle',
    tapjoy: 'Tapjoy',
    snapchat: 'Snapchat',
    tiktok: 'TikTok',
    appreciate: 'Appreciate',
    chartboost: 'Chartboost',
    pangle: 'Pangle',
    mytarget: 'MyTarget',
    liftoff: 'Liftoff',
    smadex: 'Smadex',
    adikteev: 'Adikteev',
    bigabid: 'Bigabid',
    inmobi: 'inMobi'
  };

  return labels[value] || titleize(value);
}

function formatBuildResults(build: BuildResponse | null) {
  if (!build) return '';
  return (build.results || [])
    .map((result) => {
      const title = `${networkLabel(result.network)}: ${result.code === 0 ? 'success' : 'failed'}`;
      return result.output ? `${title}\n${result.output}` : title;
    })
    .join('\n\n');
}

function valueAsInput(value: unknown) {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (value === undefined || value === null) return '';
  return String(value);
}

function readFileAsDataUrl(file: File): Promise<UploadedFilePayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, dataUrl: reader.result });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [view, setView] = useState<View>('playables');
  const [templates, setTemplates] = useState<PlayableTemplate[]>([]);
  const [playables, setPlayables] = useState<Playable[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedPlayableSlug, setSelectedPlayableSlug] = useState<string>('');
  const [configValues, setConfigValues] = useState<Record<string, unknown>>({});
  const [builds, setBuilds] = useState<BuildArtifact[]>([]);
  const [buildsOutputDir, setBuildsOutputDir] = useState('');
  const [buildOptions, setBuildOptions] = useState<BuildOptions | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState({ app: true, playables: false, builds: false, create: false, preview: false, build: false });
  const [resetKey, setResetKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) || null;
  const selectedPlayable = playables.find((playable) => playable.slug === selectedPlayableSlug) || null;

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      try {
        const [templateList, playableList] = await Promise.all([fetchTemplates(), fetchPlayables()]);
        if (cancelled) return;

        setTemplates(templateList);
        setPlayables(playableList);
        setSelectedTemplateId(templateList[0]?.id || '');
        setConfigValues(resetValuesForTemplate(templateList[0] || null));
        setSelectedPlayableSlug(playableList[0]?.slug || '');
      } catch (error) {
        setNotice({ type: 'error', message: error instanceof Error ? error.message : 'Could not load lab data.' });
      } finally {
        if (!cancelled) setLoading((current) => ({ ...current, app: false }));
      }
    }

    loadInitialData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedPlayableSlug) {
      setBuilds([]);
      setBuildsOutputDir('');
      return;
    }
    void refreshBuilds(selectedPlayableSlug);
  }, [selectedPlayableSlug]);

  function showNotice(type: NonNullable<Notice>['type'], message: string) {
    setNotice({ type, message });
  }

  async function refreshPlayables(preferredSlug = selectedPlayableSlug) {
    setLoading((current) => ({ ...current, playables: true }));
    try {
      const list = await fetchPlayables();
      setPlayables(list);
      const nextSlug = list.find((playable) => playable.slug === preferredSlug)?.slug || list[0]?.slug || '';
      setSelectedPlayableSlug(nextSlug);
      return list;
    } catch (error) {
      showNotice('error', error instanceof Error ? error.message : 'Could not refresh playables.');
      return [];
    } finally {
      setLoading((current) => ({ ...current, playables: false }));
    }
  }

  async function refreshBuilds(slug = selectedPlayableSlug) {
    if (!slug) return;
    setLoading((current) => ({ ...current, builds: true }));
    try {
      const body = await fetchBuildArtifacts(slug);
      setBuilds(body.builds || []);
      setBuildsOutputDir(body.outputDir || '');
    } catch (error) {
      showNotice('error', error instanceof Error ? error.message : 'Could not load build artifacts.');
    } finally {
      setLoading((current) => ({ ...current, builds: false }));
    }
  }

  function selectTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId) || null;
    setSelectedTemplateId(templateId);
    setConfigValues(resetValuesForTemplate(template));
    setResetKey((value) => value + 1);
  }

  function updateConfigValue(path: string, value: unknown) {
    setConfigValues((current) => ({ ...current, [path]: value }));
  }

  async function collectAssets(template: PlayableTemplate) {
    const assets: Record<string, UploadedFilePayload | UploadedFilePayload[]> = {};
    const form = formRef.current;
    if (!form) return assets;

    for (const asset of template.assets || []) {
      const input = form.elements.namedItem(asset.id) as HTMLInputElement | null;
      const files = Array.from(input?.files || []);

      if (asset.required && files.length === 0) {
        throw new Error(`${asset.label} is required.`);
      }
      if (asset.min && files.length < asset.min) {
        throw new Error(`${asset.label} needs at least ${asset.min} file(s).`);
      }

      if (asset.multiple) assets[asset.id] = await Promise.all(files.map(readFileAsDataUrl));
      else if (files[0]) assets[asset.id] = await readFileAsDataUrl(files[0]);
    }

    return assets;
  }

  function collectConfig(template: PlayableTemplate) {
    const config: Record<string, unknown> = {};

    for (const field of template.config || []) {
      const value = configValues[field.path] ?? field.default;
      if (field.type === 'number') config[field.path] = Number(value);
      else if (field.type === 'boolean') config[field.path] = Boolean(value);
      else if (field.type === 'array') {
        if (Array.isArray(value)) config[field.path] = value;
        else {
          try {
            const parsed = JSON.parse(String(value ?? ''));
            if (!Array.isArray(parsed)) throw new Error('Expected an array.');
            config[field.path] = parsed;
          } catch {
            throw new Error(`${field.label} must be a JSON array.`);
          }
        }
      } else {
        config[field.path] = value ?? '';
      }
    }

    return config;
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTemplate) return;

    setLoading((current) => ({ ...current, create: true }));
    showNotice('info', 'Creating playable...');

    try {
      const playable = await createPlayable(selectedTemplate.id, {
        name: (formRef.current?.elements.namedItem('playableName') as HTMLInputElement | null)?.value || '',
        assets: await collectAssets(selectedTemplate),
        config: collectConfig(selectedTemplate)
      });

      formRef.current?.reset();
      setConfigValues(resetValuesForTemplate(selectedTemplate));
      setResetKey((value) => value + 1);
      await refreshPlayables(playable.slug);
      setView('playables');
      showNotice('success', `${playable.name} was created.`);
    } catch (error) {
      showNotice('error', error instanceof Error ? error.message : 'Create failed.');
    } finally {
      setLoading((current) => ({ ...current, create: false }));
    }
  }

  async function handlePreview() {
    if (!selectedPlayable) return;

    const previewWindow = window.open('', '_blank');
    setLoading((current) => ({ ...current, preview: true }));
    showNotice('info', 'Building preview...');

    try {
      const url = await previewPlayable(selectedPlayable.slug);
      if (previewWindow) previewWindow.location.href = new URL(url, window.location.origin).href;
      else showNotice('success', `Preview ready: ${url}`);
      await refreshBuilds(selectedPlayable.slug);
      if (previewWindow) showNotice('success', 'Preview ready.');
    } catch (error) {
      if (previewWindow) previewWindow.close();
      showNotice('error', error instanceof Error ? error.message : 'Preview failed.');
    } finally {
      setLoading((current) => ({ ...current, preview: false }));
    }
  }

  async function handleOpenBuildDialog() {
    if (!selectedPlayable) return;
    setLoading((current) => ({ ...current, build: true }));
    showNotice('info', 'Loading build options...');

    try {
      setBuildOptions(await fetchBuildOptions(selectedPlayable.slug));
      setNotice(null);
    } catch (error) {
      showNotice('error', error instanceof Error ? error.message : 'Could not load build options.');
    } finally {
      setLoading((current) => ({ ...current, build: false }));
    }
  }

  async function handleDeleteBuild(path: string) {
    if (!selectedPlayable) return;
    if (!confirm(`Delete ${path}?`)) return;

    showNotice('info', 'Deleting build artifact...');
    try {
      const body = await deleteBuildArtifact(selectedPlayable.slug, path);
      setBuilds(body.builds || []);
      setBuildsOutputDir(body.outputDir || '');
      showNotice('success', 'Build artifact deleted.');
    } catch (error) {
      showNotice('error', error instanceof Error ? error.message : 'Could not delete build artifact.');
    }
  }

  function handleResetCreateForm() {
    if (!selectedTemplate) return;
    formRef.current?.reset();
    setConfigValues(resetValuesForTemplate(selectedTemplate));
    setResetKey((value) => value + 1);
    showNotice('success', 'Create form reset.');
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-white/10 bg-zinc-950/95 px-4 py-4 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="flex items-center justify-between gap-3 lg:block">
            <button
              type="button"
              onClick={() => setView('playables')}
              className="flex items-center gap-3 rounded-md text-left"
            >
              <span className="grid size-10 place-items-center rounded-md bg-emerald-400 text-zinc-950">
                <Sparkles className="size-5" />
              </span>
              <span>
                <span className="block text-base font-semibold">Playable Lab</span>
                <span className="block text-xs text-zinc-400">Local creative workspace</span>
              </span>
            </button>
          </div>

          <nav className="mt-5 grid grid-cols-2 gap-2 lg:mt-8 lg:grid-cols-1" aria-label="Primary">
            <NavButton
              active={view === 'playables'}
              icon={<FolderOpen className="size-4" />}
              label={actionLabels.playables}
              description={`${playables.length} saved`}
              onClick={() => setView('playables')}
            />
            <NavButton
              active={view === 'create'}
              icon={<Plus className="size-4" />}
              label={actionLabels.create}
              description={`${templates.length} templates`}
              onClick={() => setView('create')}
            />
          </nav>

          <div className="mt-5 hidden rounded-md border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400 lg:block">
            <p className="font-medium text-zinc-200">Workflow</p>
            <p className="mt-2 leading-6">Create a playable, preview it, then build network-specific artifacts from the selected project.</p>
          </div>
        </aside>

        <main className="min-w-0 bg-zinc-100 text-zinc-950">
          <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            <header className="mb-5 flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Workspace</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">{actionLabels[view]}</h1>
              </div>
              {view === 'playables' ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => void refreshPlayables()} disabled={loading.playables}>
                    <RefreshCw className={cx('size-4', loading.playables && 'animate-spin')} />
                    Refresh
                  </Button>
                  <Button onClick={() => setView('create')}>
                    <Plus className="size-4" />
                    New Playable
                  </Button>
                </div>
              ) : (
                <Button variant="secondary" onClick={() => setView('playables')}>
                  <FolderOpen className="size-4" />
                  My Playables
                </Button>
              )}
            </header>

            <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />

            {loading.app ? (
              <LoadingPanel />
            ) : view === 'playables' ? (
              <PlayablesWorkspace
                playables={playables}
                selectedPlayable={selectedPlayable}
                selectedPlayableSlug={selectedPlayableSlug}
                builds={builds}
                buildsOutputDir={buildsOutputDir}
                loading={loading}
                onSelectPlayable={setSelectedPlayableSlug}
                onCreate={() => setView('create')}
                onPreview={() => void handlePreview()}
                onBuild={() => void handleOpenBuildDialog()}
                onRefreshBuilds={() => void refreshBuilds()}
                onDeleteBuild={(path) => void handleDeleteBuild(path)}
              />
            ) : (
              <CreateWorkspace
                key={resetKey}
                formRef={formRef}
                templates={templates}
                selectedTemplate={selectedTemplate}
                selectedTemplateId={selectedTemplateId}
                configValues={configValues}
                loading={loading.create}
                onSelectTemplate={selectTemplate}
                onUpdateConfig={updateConfigValue}
                onSubmit={(event) => void handleCreate(event)}
                onReset={handleResetCreateForm}
              />
            )}
          </div>
        </main>
      </div>

      {buildOptions && selectedPlayable ? (
        <BuildModal
          playable={selectedPlayable}
          options={buildOptions}
          building={loading.build}
          onClose={() => setBuildOptions(null)}
          onBuilt={async (build) => {
            await refreshBuilds(selectedPlayable.slug);
            showNotice(build.ok ? 'success' : 'error', build.ok ? 'Build complete.' : 'Build failed. See the build log.');
          }}
          onBuildState={(isBuilding) => setLoading((current) => ({ ...current, build: isBuilding }))}
        />
      ) : null}
    </div>
  );
}

function NavButton({
  active,
  icon,
  label,
  description,
  onClick
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex min-h-16 items-center gap-3 rounded-md border p-3 text-left transition',
        active
          ? 'border-emerald-300/40 bg-emerald-300 text-zinc-950 shadow-lg shadow-emerald-950/20'
          : 'border-white/10 bg-white/[0.03] text-zinc-200 hover:border-white/20 hover:bg-white/[0.06]'
      )}
    >
      <span className={cx('grid size-9 place-items-center rounded-md', active ? 'bg-zinc-950/10' : 'bg-white/10')}>{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{label}</span>
        <span className={cx('block truncate text-xs', active ? 'text-zinc-800' : 'text-zinc-500')}>{description}</span>
      </span>
    </button>
  );
}

function Button({
  children,
  variant = 'primary',
  disabled,
  onClick,
  type = 'button'
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55',
        variant === 'primary' && 'border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800',
        variant === 'secondary' && 'border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50',
        variant === 'danger' && 'border-red-200 bg-white text-red-700 hover:bg-red-50'
      )}
    >
      {children}
    </button>
  );
}

function NoticeBanner({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
  if (!notice) return null;
  const Icon = notice.type === 'success' ? CheckCircle2 : notice.type === 'error' ? AlertCircle : Loader2;
  return (
    <div
      className={cx(
        'mb-5 flex items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm',
        notice.type === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
        notice.type === 'error' && 'border-red-200 bg-red-50 text-red-900',
        notice.type === 'info' && 'border-blue-200 bg-blue-50 text-blue-900'
      )}
    >
      <div className="flex gap-3">
        <Icon className={cx('mt-0.5 size-4 shrink-0', notice.type === 'info' && 'animate-spin')} />
        <p>{notice.message}</p>
      </div>
      <button type="button" onClick={onDismiss} className="rounded-md p-1 opacity-70 hover:bg-black/5 hover:opacity-100" aria-label="Dismiss">
        <X className="size-4" />
      </button>
    </div>
  );
}

function LoadingPanel() {
  return (
    <section className="grid min-h-80 place-items-center rounded-md border border-zinc-200 bg-white">
      <div className="flex items-center gap-3 text-sm font-medium text-zinc-600">
        <Loader2 className="size-5 animate-spin text-emerald-700" />
        Loading workspace
      </div>
    </section>
  );
}

function PlayablesWorkspace({
  playables,
  selectedPlayable,
  selectedPlayableSlug,
  builds,
  buildsOutputDir,
  loading,
  onSelectPlayable,
  onCreate,
  onPreview,
  onBuild,
  onRefreshBuilds,
  onDeleteBuild
}: {
  playables: Playable[];
  selectedPlayable: Playable | null;
  selectedPlayableSlug: string;
  builds: BuildArtifact[];
  buildsOutputDir: string;
  loading: { builds: boolean; preview: boolean; build: boolean };
  onSelectPlayable: (slug: string) => void;
  onCreate: () => void;
  onPreview: () => void;
  onBuild: () => void;
  onRefreshBuilds: () => void;
  onDeleteBuild: (path: string) => void;
}) {
  if (playables.length === 0) {
    return (
      <section className="grid min-h-[520px] place-items-center rounded-md border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
        <div className="max-w-md">
          <div className="mx-auto grid size-14 place-items-center rounded-md bg-emerald-100 text-emerald-800">
            <Boxes className="size-7" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-zinc-950">No playables yet</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">Create the first local playable from one of the available source kits.</p>
          <div className="mt-6">
            <Button onClick={onCreate}>
              <Plus className="size-4" />
              Create Playable
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="rounded-md border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3">
          <p className="text-sm font-semibold text-zinc-950">Saved playables</p>
          <p className="mt-1 text-xs text-zinc-500">Newest projects appear first.</p>
        </div>
        <div className="grid max-h-[calc(100vh-230px)] gap-2 overflow-auto p-3">
          {playables.map((playable) => (
            <button
              key={playable.slug}
              type="button"
              onClick={() => onSelectPlayable(playable.slug)}
              className={cx(
                'group rounded-md border p-3 text-left transition',
                selectedPlayableSlug === playable.slug
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
              )}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-zinc-950">{playable.name}</span>
                  <span className="mt-1 block truncate text-xs text-zinc-500">
                    {playable.templateName || playable.templateId} · {formatDate(playable.createdAt)}
                  </span>
                </span>
                <ChevronRight className="mt-0.5 size-4 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5" />
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-0 rounded-md border border-zinc-200 bg-white">
        {selectedPlayable ? (
          <div className="p-5">
            <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Selected playable</p>
                <h2 className="mt-2 truncate text-2xl font-semibold text-zinc-950">{selectedPlayable.name}</h2>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <MetaItem label="Folder" value={`my-playables/${selectedPlayable.slug}`} />
                  <MetaItem label="Template" value={selectedPlayable.templateName || selectedPlayable.templateId} />
                  <MetaItem label="Created" value={formatDate(selectedPlayable.createdAt)} />
                </dl>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={onPreview} disabled={loading.preview}>
                  {loading.preview ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                  Preview
                </Button>
                <Button variant="secondary" onClick={onBuild} disabled={loading.build}>
                  {loading.build ? <Loader2 className="size-4 animate-spin" /> : <Hammer className="size-4" />}
                  Build
                </Button>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-950">Build artifacts</h3>
                  <p className="mt-1 text-sm text-zinc-500">Files generated under {buildsOutputDir || 'the build output folder'}.</p>
                </div>
                <Button variant="secondary" onClick={onRefreshBuilds} disabled={loading.builds}>
                  <RefreshCw className={cx('size-4', loading.builds && 'animate-spin')} />
                  Refresh
                </Button>
              </div>
              <BuildArtifactList builds={builds} outputDir={buildsOutputDir} loading={loading.builds} onDelete={onDeleteBuild} />
            </div>
          </div>
        ) : (
          <div className="grid min-h-96 place-items-center p-8 text-center text-zinc-500">Select a playable to view actions and artifacts.</div>
        )}
      </div>
    </section>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</dt>
      <dd className="mt-1 break-words text-sm text-zinc-900">{value}</dd>
    </div>
  );
}

function BuildArtifactList({
  builds,
  outputDir,
  loading,
  onDelete
}: {
  builds: BuildArtifact[];
  outputDir: string;
  loading: boolean;
  onDelete: (path: string) => void;
}) {
  if (loading) {
    return (
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
        <Loader2 className="mr-2 inline size-4 animate-spin" />
        Loading artifacts...
      </div>
    );
  }

  if (builds.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-500">
        No builds found in {outputDir || 'the output folder'}.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {builds.map((build) => (
        <div key={build.path} className="grid gap-3 rounded-md border border-zinc-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-zinc-100 text-zinc-600">
              <FileArchive className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-zinc-950">{build.name}</p>
              <p className="mt-1 break-words text-xs leading-5 text-zinc-500">
                {build.path} · {formatBytes(build.size)} · {formatDate(build.updatedAt)}
              </p>
            </div>
          </div>
          <div className="flex gap-2 md:justify-end">
            {build.canOpen && build.url ? (
              <Button variant="secondary" onClick={() => window.open(new URL(build.url || '', window.location.origin).href, '_blank', 'noopener,noreferrer')}>
                Open
              </Button>
            ) : null}
            <Button variant="danger" onClick={() => onDelete(build.path)}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CreateWorkspace({
  formRef,
  templates,
  selectedTemplate,
  selectedTemplateId,
  configValues,
  loading,
  onSelectTemplate,
  onUpdateConfig,
  onSubmit,
  onReset
}: {
  formRef: React.RefObject<HTMLFormElement | null>;
  templates: PlayableTemplate[];
  selectedTemplate: PlayableTemplate | null;
  selectedTemplateId: string;
  configValues: Record<string, unknown>;
  loading: boolean;
  onSelectTemplate: (id: string) => void;
  onUpdateConfig: (path: string, value: unknown) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
}) {
  const requiredAssets = (selectedTemplate?.assets || []).filter((asset) => asset.required);
  const optionalAssets = (selectedTemplate?.assets || []).filter((asset) => !asset.required);
  const groups = useMemo(() => groupConfigFields(selectedTemplate?.config), [selectedTemplate]);

  return (
    <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="rounded-md border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3">
          <p className="text-sm font-semibold text-zinc-950">Templates</p>
          <p className="mt-1 text-xs text-zinc-500">Choose a source kit to configure.</p>
        </div>
        <div className="grid gap-2 p-3">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelectTemplate(template.id)}
              className={cx(
                'rounded-md border p-3 text-left transition',
                selectedTemplateId === template.id ? 'border-emerald-300 bg-emerald-50' : 'border-zinc-200 bg-white hover:bg-zinc-50'
              )}
            >
              <span className="block text-sm font-semibold text-zinc-950">{template.name}</span>
              <span className="mt-1 block text-xs leading-5 text-zinc-500">{template.description || 'Playable template'}</span>
            </button>
          ))}
        </div>
        <div className="border-t border-zinc-200 p-3">
          <div className="rounded-md bg-zinc-100 p-3 text-xs leading-5 text-zinc-600">
            Video and custom creation modes are intentionally parked until their backend flow exists.
          </div>
        </div>
      </aside>

      <form ref={formRef} onSubmit={onSubmit} className="rounded-md border border-zinc-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Template</p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-950">{selectedTemplate?.name || 'Template'}</h2>
          </div>
          <Button variant="secondary" onClick={onReset}>
            <RotateCcw className="size-4" />
            Reset
          </Button>
        </div>

        <div className="grid gap-6 p-5">
          <section>
            <SectionHeading title="Playable" description="Name the generated local project." />
            <div className="mt-3 grid gap-3">
              <FieldShell label="Playable Name" hint="Generated under my-playables with a safe folder name.">
                <input className="input" id="playableName" name="playableName" type="text" required placeholder="Summer Catcher" />
              </FieldShell>
            </div>
          </section>

          <AssetSection title="Required Assets" assets={requiredAssets} />
          <AssetSection title="Optional Assets" assets={optionalAssets} />

          <section>
            <SectionHeading title="Parameters" description="Standard settings are visible first. Advanced groups stay collapsed." />
            <div className="mt-4 grid gap-5">
              {groups.map((group) => (
                <ParameterSection key={group.path} group={group} values={configValues} onUpdate={onUpdateConfig} />
              ))}
            </div>
          </section>
        </div>

        <div className="flex justify-end border-t border-zinc-200 bg-zinc-50 px-5 py-4">
          <Button type="submit" disabled={loading || !selectedTemplate}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Create Playable
          </Button>
        </div>
      </form>
    </section>
  );
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-zinc-950">{title}</h3>
      {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
    </div>
  );
}

function AssetSection({ title, assets }: { title: string; assets: TemplateAsset[] }) {
  if (assets.length === 0) return null;
  return (
    <section>
      <SectionHeading title={title} />
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {assets.map((asset) => (
          <FieldShell
            key={asset.id}
            label={asset.label}
            hint={asset.multiple ? `Minimum ${asset.min || 1}` : asset.required ? undefined : 'Default asset is selected. Upload a file to replace it.'}
          >
            <input className="file-input" id={asset.id} name={asset.id} type="file" accept={asset.accept || ''} multiple={Boolean(asset.multiple)} required={Boolean(asset.required)} />
          </FieldShell>
        ))}
      </div>
    </section>
  );
}

function FieldShell({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <span className="block text-sm font-semibold text-zinc-900">{label}</span>
      <span className="mt-2 block">{children}</span>
      {hint ? <span className="mt-2 block text-xs leading-5 text-zinc-500">{hint}</span> : null}
    </label>
  );
}

function ParameterSection({
  group,
  values,
  onUpdate
}: {
  group: { path: string; label: string; fields: ConfigField[]; advancedFields: ConfigField[] };
  values: Record<string, unknown>;
  onUpdate: (path: string, value: unknown) => void;
}) {
  return (
    <section className="rounded-md border border-zinc-200">
      <div className="flex flex-col gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="font-semibold text-zinc-950">{group.label}</h4>
        <span className="text-xs font-medium text-zinc-500">
          {group.fields.length} standard · {group.advancedFields.length} advanced
        </span>
      </div>
      {group.fields.length > 0 ? (
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {group.fields.map((field) => (
            <ConfigInput key={field.path} field={field} value={values[field.path] ?? field.default} onUpdate={onUpdate} />
          ))}
        </div>
      ) : null}
      {group.advancedFields.length > 0 ? (
        <details className="border-t border-zinc-200">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-emerald-800">Advanced</summary>
          <div className="grid gap-3 px-4 pb-4 md:grid-cols-2">
            {group.advancedFields.map((field) => (
              <ConfigInput key={field.path} field={field} value={values[field.path] ?? field.default} onUpdate={onUpdate} />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function ConfigInput({ field, value, onUpdate }: { field: ConfigField; value: unknown; onUpdate: (path: string, value: unknown) => void }) {
  if (field.type === 'boolean') {
    return (
      <label className="flex items-start justify-between gap-3 rounded-md border border-zinc-200 bg-white p-3">
        <span>
          <span className="block text-sm font-semibold text-zinc-900">{field.label}</span>
          {field.description ? <span className="mt-1 block text-xs leading-5 text-zinc-500">{field.description}</span> : null}
        </span>
        <input className="mt-0.5 size-5 accent-emerald-700" id={field.path} name={field.path} type="checkbox" checked={Boolean(value)} onChange={(event) => onUpdate(field.path, event.target.checked)} />
      </label>
    );
  }

  const common = {
    id: field.path,
    name: field.path,
    value: valueAsInput(value),
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => onUpdate(field.path, field.type === 'number' ? Number(event.target.value) : event.target.value)
  };

  return (
    <FieldShell label={field.label} hint={field.description}>
      {field.type === 'number' && Number.isFinite(field.min) && Number.isFinite(field.max) ? (
        <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-2">
          <input
            className="range-input"
            type="range"
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            value={Number(value ?? 0)}
            onChange={(event) => onUpdate(field.path, Number(event.target.value))}
          />
          <input className="input" {...common} type="number" min={field.min} max={field.max} step={field.step ?? 1} />
        </div>
      ) : (
        <input className={field.type === 'color' ? 'color-input' : 'input'} {...common} type={field.type === 'color' ? 'color' : field.type === 'number' ? 'number' : 'text'} step={field.type === 'number' ? field.step ?? 'any' : undefined} />
      )}
    </FieldShell>
  );
}

function BuildModal({
  playable,
  options,
  building,
  onClose,
  onBuilt,
  onBuildState
}: {
  playable: Playable;
  options: BuildOptions;
  building: boolean;
  onClose: () => void;
  onBuilt: (build: BuildResponse) => Promise<void>;
  onBuildState: (isBuilding: boolean) => void;
}) {
  const [config, setConfig] = useState<Record<string, unknown>>({ ...(options.buildConfig || {}) });
  const [networks, setNetworks] = useState<string[]>([]);
  const [buildResult, setBuildResult] = useState<BuildResponse | null>(null);
  const [error, setError] = useState('');

  function buildSelectOptions(key: string) {
    if (key === 'language') return options.languages || [];
    if (key === 'orientation') return options.orientations || [];
    return null;
  }

  async function handleBuild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBuildResult(null);
    onBuildState(true);

    try {
      const build = await runPlayableBuild(playable.slug, { config, networks });
      setBuildResult(build);
      await onBuilt(build);
    } catch (buildError) {
      setError(buildError instanceof Error ? buildError.message : 'Build failed.');
    } finally {
      onBuildState(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/60 p-4">
      <form onSubmit={(event) => void handleBuild(event)} className="grid max-h-[min(860px,calc(100vh-32px))] w-full max-w-5xl overflow-hidden rounded-md border border-zinc-300 bg-white text-zinc-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Build</p>
            <h2 className="mt-1 text-2xl font-semibold">{playable.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-md border border-zinc-200 hover:bg-zinc-50" aria-label="Close build dialog">
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-6 overflow-auto p-5">
          <section>
            <SectionHeading title="Build Parameters" />
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {Object.entries(options.buildConfig || {})
                .filter(([key]) => key !== 'outDir')
                .map(([key, value]) => {
                  const selectOptions = buildSelectOptions(key);
                  const current = config[key] ?? value;
                  if (selectOptions) {
                    return (
                      <FieldShell key={key} label={titleize(key)}>
                        <select className="input" value={String(current ?? '')} onChange={(event) => setConfig((existing) => ({ ...existing, [key]: event.target.value }))}>
                          {selectOptions.map((option) => (
                            <option key={option} value={option}>
                              {option === 'auto' ? 'Auto' : titleize(option)}
                            </option>
                          ))}
                        </select>
                      </FieldShell>
                    );
                  }
                  if (typeof value === 'boolean') {
                    return (
                      <label key={key} className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                        <span className="text-sm font-semibold text-zinc-900">{titleize(key)}</span>
                        <input className="size-5 accent-emerald-700" type="checkbox" checked={Boolean(current)} onChange={(event) => setConfig((existing) => ({ ...existing, [key]: event.target.checked }))} />
                      </label>
                    );
                  }
                  return (
                    <FieldShell key={key} label={titleize(key)}>
                      <input
                        className="input"
                        type={typeof value === 'number' ? 'number' : 'text'}
                        value={valueAsInput(current)}
                        onChange={(event) => setConfig((existing) => ({ ...existing, [key]: typeof value === 'number' ? Number(event.target.value) : event.target.value }))}
                      />
                    </FieldShell>
                  );
                })}
            </div>
          </section>

          <section>
            <SectionHeading title="Networks" description="Select one or more target ad networks." />
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {options.networks.map((network) => {
                const checked = networks.includes(network);
                return (
                  <label
                    key={network}
                    className={cx(
                      'flex min-h-11 items-center gap-3 rounded-md border px-3 text-sm font-semibold transition',
                      checked ? 'border-emerald-300 bg-emerald-50 text-emerald-950' : 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50'
                    )}
                  >
                    <input
                      className="size-4 accent-emerald-700"
                      type="checkbox"
                      name="network"
                      value={network}
                      checked={checked}
                      onChange={(event) =>
                        setNetworks((current) =>
                          event.target.checked ? [...current, network] : current.filter((item) => item !== network)
                        )
                      }
                    />
                    {networkLabel(network)}
                  </label>
                );
              })}
            </div>
          </section>

          {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div> : null}
          {building ? <pre className="build-log">Building...</pre> : null}
          {buildResult ? <pre className="build-log">{formatBuildResults(buildResult)}</pre> : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-4 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={building}>
            Cancel
          </Button>
          <Button type="submit" disabled={building}>
            {building ? <Loader2 className="size-4 animate-spin" /> : <Hammer className="size-4" />}
            Build
          </Button>
        </div>
      </form>
    </div>
  );
}

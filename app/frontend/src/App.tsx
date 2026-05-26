import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { FolderOpen, Loader2, Plus, RefreshCw } from 'lucide-react';
import playableLabLogo from './assets/playable-lab.png';
import {
  createPlayable,
  deleteBuildArtifact,
  fetchBuildArtifacts,
  fetchBuildOptions,
  fetchPlayableTemplate,
  fetchPlayables,
  fetchTemplates,
  previewPlayable,
  previewTemplateDemo,
  updatePlayable
} from './api';
import type {
  BuildArtifact,
  BuildOptions,
  BuildResponse,
  Playable,
  PlayableTemplate,
  UploadedFilePayload
} from './types';
import type { Notice, View } from './appTypes';
import { Button, LoadingPanel, NoticeBanner } from './components/ui';
import { BuildModal } from './features/build/BuildModal';
import { CreateWorkspace } from './features/create/CreateWorkspace';
import { PlayablesWorkspace } from './features/playables/PlayablesWorkspace';
import { cx, readFileAsDataUrl, resetValuesForTemplate } from './lib/appUtils';

const actionLabels: Record<View, string> = {
  playables: 'My Playables',
  create: 'Create Playable'
};

export default function App() {
  const [view, setView] = useState<View>('playables');
  const [templates, setTemplates] = useState<PlayableTemplate[]>([]);
  const [playables, setPlayables] = useState<Playable[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedPlayableSlug, setSelectedPlayableSlug] = useState<string>('');
  const [editingPlayableSlug, setEditingPlayableSlug] = useState<string>('');
  const [editingTemplate, setEditingTemplate] = useState<PlayableTemplate | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, unknown>>({});
  const [builds, setBuilds] = useState<BuildArtifact[]>([]);
  const [buildsOutputDir, setBuildsOutputDir] = useState('');
  const [buildOptions, setBuildOptions] = useState<BuildOptions | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState({ app: true, playables: false, builds: false, create: false, preview: false, build: false, templateDemo: '' });
  const formRef = useRef<HTMLFormElement>(null);

  const isEditingPlayable = Boolean(editingPlayableSlug);
  const selectedTemplate = (isEditingPlayable ? editingTemplate : null) || templates.find((template) => template.id === selectedTemplateId) || null;
  const selectedPlayable = playables.find((playable) => playable.slug === selectedPlayableSlug) || null;
  const editingPlayable = playables.find((playable) => playable.slug === editingPlayableSlug) || null;

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
    setEditingPlayableSlug('');
    setEditingTemplate(null);
    setSelectedTemplateId(templateId);
    setConfigValues(resetValuesForTemplate(template));
    formRef.current?.reset();
  }

  function startCreate() {
    const template = templates.find((item) => item.id === selectedTemplateId) || templates[0] || null;
    setEditingPlayableSlug('');
    setEditingTemplate(null);
    setSelectedTemplateId(template?.id || '');
    setConfigValues(resetValuesForTemplate(template));
    formRef.current?.reset();
    setView('create');
  }

  function cancelEdit() {
    setEditingPlayableSlug('');
    setEditingTemplate(null);
    formRef.current?.reset();
    setView('playables');
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
      const defaultFileCount = asset.defaultFiles?.length || 0;
      const selectedFileCount = files.length || defaultFileCount;

      if (asset.required && selectedFileCount === 0) {
        throw new Error(`${asset.label} is required.`);
      }
      if (asset.min && selectedFileCount < asset.min) {
        throw new Error(`${asset.label} needs at least ${asset.min} file(s).`);
      }

      if (asset.multiple && files.length > 0) assets[asset.id] = await Promise.all(files.map(readFileAsDataUrl));
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

  async function handleCreate(playableName: string) {
    if (!selectedTemplate) return;

    setLoading((current) => ({ ...current, create: true }));
    showNotice('info', 'Creating playable...');

    try {
      const playable = await createPlayable(selectedTemplate.id, {
        name: playableName,
        assets: await collectAssets(selectedTemplate),
        config: collectConfig(selectedTemplate)
      });

      formRef.current?.reset();
      setConfigValues(resetValuesForTemplate(selectedTemplate));
      await refreshPlayables(playable.slug);
      setView('playables');
      showNotice('success', `${playable.name} was created.`);
    } catch (error) {
      showNotice('error', error instanceof Error ? error.message : 'Create failed.');
    } finally {
      setLoading((current) => ({ ...current, create: false }));
    }
  }

  async function handleEditPlayable(playable: Playable) {
    setLoading((current) => ({ ...current, create: true }));
    showNotice('info', 'Loading playable settings...');

    try {
      const template = await fetchPlayableTemplate(playable.slug);
      setEditingPlayableSlug(playable.slug);
      setEditingTemplate(template);
      setSelectedTemplateId(template.id);
      setConfigValues(resetValuesForTemplate(template));
      formRef.current?.reset();
      setView('create');
      setNotice(null);
    } catch (error) {
      showNotice('error', error instanceof Error ? error.message : 'Could not load playable settings.');
    } finally {
      setLoading((current) => ({ ...current, create: false }));
    }
  }

  async function handleSaveChanges() {
    if (!selectedTemplate || !editingPlayableSlug) return;

    setLoading((current) => ({ ...current, create: true }));
    showNotice('info', 'Saving playable changes...');

    try {
      const playable = await updatePlayable(editingPlayableSlug, {
        assets: await collectAssets(selectedTemplate),
        config: collectConfig(selectedTemplate)
      });

      formRef.current?.reset();
      setEditingPlayableSlug('');
      setEditingTemplate(null);
      await refreshPlayables(playable.slug);
      setView('playables');
      showNotice('success', `${playable.name} was updated.`);
    } catch (error) {
      showNotice('error', error instanceof Error ? error.message : 'Save failed.');
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

  async function handlePreviewTemplateDemo(templateId: string) {
    const demoWindow = window.open('', '_blank');
    setLoading((current) => ({ ...current, templateDemo: templateId }));

    try {
      const url = await previewTemplateDemo(templateId);
      if (demoWindow) demoWindow.location.href = new URL(url, window.location.origin).href;
      else showNotice('success', `Demo ready: ${url}`);
    } catch (error) {
      if (demoWindow) demoWindow.close();
      showNotice('error', error instanceof Error ? error.message : 'Template demo failed.');
    } finally {
      setLoading((current) => ({ ...current, templateDemo: '' }));
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
    showNotice('success', isEditingPlayable ? 'Edit form reset.' : 'Create form reset.');
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-white/10 bg-zinc-950/95 px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:self-start lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="flex items-center justify-between gap-3 lg:block">
            <button
              type="button"
              onClick={cancelEdit}
              className="flex items-center gap-3 rounded-md text-left"
            >
              <span className="grid size-10 place-items-center overflow-hidden rounded-md bg-emerald-400">
                <img src={playableLabLogo} alt="" className="size-full object-cover" />
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
              onClick={cancelEdit}
            />
            <NavButton
              active={view === 'create'}
              icon={<Plus className="size-4" />}
              label={actionLabels.create}
              onClick={startCreate}
            />
          </nav>

          <div className="mt-5 hidden rounded-md border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400 lg:block">
            <p className="font-medium text-zinc-200">Workflow</p>
            <p className="mt-2 leading-6">Create a playable, preview it, then build network-specific artifacts from the selected project.</p>
          </div>
        </aside>

        <main className="min-w-0 bg-zinc-100 text-zinc-950">
          <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            {view === 'playables' ? (
              <header className="mb-5 flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Workspace</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">{actionLabels[view]}</h1>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => void refreshPlayables()} disabled={loading.playables}>
                    <RefreshCw className={cx('size-4', loading.playables && 'animate-spin')} />
                    Refresh
                  </Button>
                </div>
              </header>
            ) : null}

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
                onCreate={startCreate}
                onEdit={(playable) => void handleEditPlayable(playable)}
                onPreview={() => void handlePreview()}
                onBuild={() => void handleOpenBuildDialog()}
                onDeleteBuild={(path) => void handleDeleteBuild(path)}
              />
            ) : (
              <CreateWorkspace
                formRef={formRef}
                mode={isEditingPlayable ? 'edit' : 'create'}
                editingPlayableName={editingPlayable?.name}
                templates={templates}
                selectedTemplate={selectedTemplate}
                configValues={configValues}
                loading={loading.create}
                demoLoadingTemplateId={loading.templateDemo}
                onSelectTemplate={selectTemplate}
                onPreviewTemplate={(templateId) => void handlePreviewTemplateDemo(templateId)}
                onUpdateConfig={updateConfigValue}
                onSubmit={(playableName) => void (isEditingPlayable ? handleSaveChanges() : handleCreate(playableName || ''))}
                onReset={handleResetCreateForm}
                onCancel={cancelEdit}
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
          onBuilt={async (build: BuildResponse) => {
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
  icon: ReactNode;
  label: string;
  description?: string;
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
        {description ? <span className={cx('block truncate text-xs', active ? 'text-zinc-800' : 'text-zinc-500')}>{description}</span> : null}
      </span>
    </button>
  );
}

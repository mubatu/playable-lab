import { Boxes, CalendarDays, ChevronRight, ExternalLink, FileArchive, FolderOpen, Hammer, LayoutTemplate, Loader2, Play, Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { BuildArtifact, Playable } from '../../types';
import { Button } from '../../components/ui';
import { cx, formatBytes, formatDate } from '../../lib/appUtils';

export function PlayablesWorkspace({
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
            <div className="border-b border-zinc-200 pb-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-semibold text-zinc-950">{selectedPlayable.name}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={onPreview} disabled={loading.preview}>
                    {loading.preview ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                    Preview
                  </Button>
                  <Button variant="accent" onClick={onBuild} disabled={loading.build}>
                    {loading.build ? <Loader2 className="size-4 animate-spin" /> : <Hammer className="size-4" />}
                    Build
                  </Button>
                </div>
              </div>

              <div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <MetaItem icon={<FolderOpen className="size-4" />} label="Folder" value={`my-playables/${selectedPlayable.slug}`} />
                  <MetaItem icon={<LayoutTemplate className="size-4" />} label="Template" value={selectedPlayable.templateName || selectedPlayable.templateId} />
                  <MetaItem icon={<CalendarDays className="size-4" />} label="Created" value={formatDate(selectedPlayable.createdAt)} />
                </dl>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-950">Build artifacts</h3>
                  <p className="mt-1 text-sm text-zinc-500">Files generated under {buildsOutputDir || 'the build output'} folder.</p>
                </div>
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

function MetaItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-white text-emerald-700 ring-1 ring-zinc-200">{icon}</span>
        {label}
      </dt>
      <dd className="mt-2 break-words text-sm text-zinc-900">{value}</dd>
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
                {formatBytes(build.size)} · {formatDate(build.updatedAt)}
              </p>
            </div>
          </div>
          <div className="flex gap-2 md:justify-end">
            {build.canOpen && build.url ? (
              <Button
                variant="secondary"
                iconOnly
                ariaLabel={`Open ${build.name}`}
                onClick={() => window.open(new URL(build.url || '', window.location.origin).href, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="size-4" />
              </Button>
            ) : null}
            <Button variant="danger" iconOnly ariaLabel={`Delete ${build.name}`} onClick={() => onDelete(build.path)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

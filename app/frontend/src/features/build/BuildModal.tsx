import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Copy, Hammer, Loader2, Play, ShoppingBag, X } from 'lucide-react';
import type { BuildOptions, BuildResponse, Playable } from '../../types';
import { runPlayableBuild } from '../../api';
import { Button, FieldShell, SectionHeading } from '../../components/ui';
import { buildConfigEntries, buildFieldLabel, cx, formatBuildResults, networkLabel, titleize, valueAsInput } from '../../lib/appUtils';

function buildFieldIcon(key: string) {
  if (key === 'googlePlayUrl') return <Play className="size-4" />;
  if (key === 'appStoreUrl') return <ShoppingBag className="size-4" />;
  return undefined;
}

export function BuildModal({
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
  const [logCopied, setLogCopied] = useState(false);
  const consoleRef = useRef<HTMLElement>(null);
  const buildLogText = building ? 'Building...' : buildResult ? formatBuildResults(buildResult) : error;
  const consoleStatus = building ? 'Building' : buildResult ? (buildResult.ok ? 'Success' : 'Failed') : error ? 'Failed' : 'Idle';
  const consoleTone = building ? 'blue' : buildResult?.ok ? 'emerald' : buildResult || error ? 'red' : 'zinc';

  useEffect(() => {
    if (!building && !buildResult && !error) return;
    consoleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [buildResult, building, error]);

  useEffect(() => {
    setLogCopied(false);
  }, [buildLogText]);

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

  async function handleCopyLog() {
    if (!buildLogText) return;
    try {
      await navigator.clipboard.writeText(buildLogText);
      setLogCopied(true);
    } catch {
      setLogCopied(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/60 p-4">
      <form onSubmit={(event) => void handleBuild(event)} className="grid max-h-[min(860px,calc(100dvh-32px))] w-full max-w-5xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-md border border-zinc-300 bg-white text-zinc-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Build</p>
            <h2 className="mt-1 text-2xl font-semibold">{playable.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-md border border-zinc-200 hover:bg-zinc-50" aria-label="Close build dialog">
            <X className="size-4" />
          </button>
        </div>

        <div className="grid min-h-0 gap-6 overflow-y-auto p-5">
          <section>
            <SectionHeading title="Build Parameters" />
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {buildConfigEntries(options.buildConfig || {}).map(([key, value]) => {
                  const selectOptions = buildSelectOptions(key);
                  const current = config[key] ?? value;
                  const label = buildFieldLabel(key);
                  const icon = buildFieldIcon(key);
                  if (selectOptions) {
                    return (
                      <FieldShell key={key} label={label} icon={icon}>
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
                        <span className="text-sm font-semibold text-zinc-900">{label}</span>
                        <input className="size-5 accent-emerald-700" type="checkbox" checked={Boolean(current)} onChange={(event) => setConfig((existing) => ({ ...existing, [key]: event.target.checked }))} />
                      </label>
                    );
                  }
                  return (
                    <FieldShell key={key} label={label} icon={icon}>
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

          <section ref={consoleRef} className="rounded-md border border-zinc-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-zinc-950">Console Output</h3>
                  <span
                    className={cx(
                      'rounded-md px-2 py-0.5 text-xs font-bold',
                      consoleTone === 'blue' && 'bg-blue-100 text-blue-700',
                      consoleTone === 'emerald' && 'bg-emerald-100 text-emerald-700',
                      consoleTone === 'red' && 'bg-red-100 text-red-700',
                      consoleTone === 'zinc' && 'bg-zinc-200 text-zinc-600'
                    )}
                  >
                    {consoleStatus}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-500">Build logs and command output appear here.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => void handleCopyLog()} disabled={!buildLogText}>
                <Copy className="size-4" />
                {logCopied ? 'Copied' : 'Copy Log'}
              </Button>
            </div>
            {error ? <div className="mx-4 mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div> : null}
            <div className="p-4">
              <pre className="build-log">{buildLogText || 'Run a build to see console output.'}</pre>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-4 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={building}>
            Cancel
          </Button>
          <Button variant="accent" type="submit" disabled={building}>
            {building ? <Loader2 className="size-4 animate-spin" /> : <Hammer className="size-4" />}
            Build
          </Button>
        </div>
      </form>
    </div>
  );
}

import type {
  BuildArtifact,
  BuildOptions,
  BuildResponse,
  Playable,
  PlayableTemplate,
  UploadedFilePayload
} from './types';

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error || 'Request failed.');
  }
  return body;
}

export async function fetchTemplates(): Promise<PlayableTemplate[]> {
  const body = await readJson<{ templates: PlayableTemplate[] }>(await fetch('/api/templates'));
  return body.templates || [];
}

export async function fetchPlayables(): Promise<Playable[]> {
  const body = await readJson<{ playables: Playable[] }>(await fetch('/api/playables'));
  return body.playables || [];
}

export async function createPlayable(
  templateId: string,
  payload: {
    name: string;
    assets: Record<string, UploadedFilePayload | UploadedFilePayload[]>;
    config: Record<string, unknown>;
  }
): Promise<Playable> {
  const body = await readJson<{ playable: Playable }>(
    await fetch(`/api/templates/${templateId}/create`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    })
  );
  return body.playable;
}

export async function fetchPlayableTemplate(slug: string): Promise<PlayableTemplate> {
  const body = await readJson<{ template: PlayableTemplate }>(await fetch(`/api/playables/${slug}/template`));
  return body.template;
}

export async function updatePlayable(
  slug: string,
  payload: {
    assets: Record<string, UploadedFilePayload | UploadedFilePayload[]>;
    config: Record<string, unknown>;
  }
): Promise<Playable> {
  const body = await readJson<{ playable: Playable }>(
    await fetch(`/api/playables/${slug}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    })
  );
  return body.playable;
}

export async function previewPlayable(slug: string): Promise<string> {
  const body = await readJson<{ preview: { url: string } }>(
    await fetch(`/api/playables/${slug}/preview`, { method: 'POST' })
  );
  return body.preview.url;
}

export async function previewTemplateDemo(templateId: string): Promise<string> {
  const body = await readJson<{ demo: { url: string } }>(
    await fetch(`/api/templates/${templateId}/demo`, { method: 'POST' })
  );
  return body.demo.url;
}

export async function fetchBuildArtifacts(slug: string): Promise<{ builds: BuildArtifact[]; outputDir: string }> {
  return readJson<{ builds: BuildArtifact[]; outputDir: string }>(await fetch(`/api/playables/${slug}/builds`));
}

export async function deleteBuildArtifact(
  slug: string,
  path: string
): Promise<{ builds: BuildArtifact[]; outputDir: string }> {
  return readJson<{ builds: BuildArtifact[]; outputDir: string }>(
    await fetch(`/api/playables/${slug}/builds`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path })
    })
  );
}

export async function fetchBuildOptions(slug: string): Promise<BuildOptions> {
  return readJson<BuildOptions>(await fetch(`/api/playables/${slug}/build-options`));
}

export async function runPlayableBuild(
  slug: string,
  payload: { config: Record<string, unknown>; networks: string[] }
): Promise<BuildResponse> {
  const response = await fetch(`/api/playables/${slug}/build`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = (await response.json()) as { build?: BuildResponse; error?: string };

  if (!response.ok && body.build) return body.build;
  if (!response.ok) throw new Error(body.error || 'Build failed.');
  if (!body.build) throw new Error('Build response was empty.');
  return body.build;
}

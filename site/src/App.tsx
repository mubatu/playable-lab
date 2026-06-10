import { Check, Copy, FolderOpen, LockKeyhole, Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import playableLabLogo from '../../app/frontend/src/assets/playable-lab.png';
import blastIcon from '../../app/frontend/src/assets/blast-icon.png';
import catcherIcon from '../../app/frontend/src/assets/catcher-icon.png';

const repositoryUrl = 'https://github.com/mubatu/playable-lab';
const setupCommands = [
  'git clone https://github.com/mubatu/playable-lab.git',
  'npm install && npm run dev'
];

export default function App() {
  const [copied, setCopied] = useState(false);

  async function copySetupCommands() {
    try {
      await navigator.clipboard.writeText(setupCommands.join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="site-shell">
      <div className="page-grid" aria-hidden="true" />

      <header className="site-header">
        <a className="brand" href="/" aria-label="Playable Lab home">
          <span className="brand-mark">
            <img src={playableLabLogo} alt="" />
          </span>
          <span>
            <strong>Playable Lab</strong>
            <small>Local creative workspace</small>
          </span>
        </a>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <h1 id="hero-title">
            Create playables
            <br />
            in your own workspace<span>.</span>
          </h1>
          <p>
            Clone the lab, run it locally, and turn templates, videos, or custom code into
            production-ready playable ads.
          </p>

          <div className="hero-actions">
            <a className="button button-primary" href={repositoryUrl} target="_blank" rel="noreferrer">
              <GitHubIcon />
              GitHub
            </a>
            <button className="button button-disabled" type="button" disabled title="Coming soon">
              <LockKeyhole aria-hidden="true" />
              Try Now
            </button>
          </div>

          <div className="terminal" aria-label="Local setup commands">
            <div className="terminal-bar">
              <span className="terminal-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <button type="button" onClick={copySetupCommands} aria-label="Copy setup commands">
                {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              </button>
            </div>
            <div className="terminal-body">
              {setupCommands.map((command) => (
                <code key={command}>
                  <span aria-hidden="true">›</span>
                  {command}
                </code>
              ))}
            </div>
          </div>
        </div>

        <WorkspacePreview />
      </section>
    </main>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .8a11.4 11.4 0 0 0-3.6 22.2c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.4-1.3-5.4-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0C15.9 4.7 17 5 17 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.4 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.4 11.4 0 0 0 12 .8Z" />
    </svg>
  );
}

function WorkspacePreview() {
  return (
    <div className="workspace-wrap" aria-label="Playable Lab workspace preview">
      <div className="workspace">
        <aside className="workspace-sidebar">
          <div className="workspace-brand">
            <span className="workspace-brand-mark">
              <img src={playableLabLogo} alt="" />
            </span>
            <span>
              <strong>Playable Lab</strong>
              <small>Local creative workspace</small>
            </span>
          </div>

          <nav aria-label="Workspace preview navigation">
            <div className="preview-nav active">
              <span><FolderOpen aria-hidden="true" /></span>
              <div>
                <strong>My Playables</strong>
                <small>2 saved</small>
              </div>
            </div>
            <div className="preview-nav">
              <span><Plus aria-hidden="true" /></span>
              <div>
                <strong>Create Playable</strong>
              </div>
            </div>
          </nav>

          <div className="workflow-note">
            <strong>Workflow</strong>
            <p>Create a playable, preview it, then build network-specific artifacts.</p>
          </div>
        </aside>

        <div className="workspace-canvas">
          <div className="canvas-heading">
            <div>
              <small>Workspace</small>
              <h2>My Playables</h2>
            </div>
            <button type="button" tabIndex={-1}>
              <RefreshCw aria-hidden="true" />
              Refresh
            </button>
          </div>

          <div className="playable-list">
            <PreviewRow image={blastIcon} name="Blast" detail="Template playable" />
            <PreviewRow image={catcherIcon} name="Catcher" detail="Custom playable" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewRow({ image, name, detail }: { image: string; name: string; detail: string }) {
  return (
    <div className="playable-row">
      <img src={image} alt="" />
      <div>
        <strong>{name}</strong>
        <small>{detail}</small>
      </div>
      <span aria-hidden="true">•••</span>
    </div>
  );
}

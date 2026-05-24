const state = {
  view: 'home',
  templates: [],
  playables: [],
  selectedTemplate: null,
  selectedPlayable: null,
  buildOptions: null,
  builds: [],
  buildsOutputDir: null,
  configValues: {}
};

const elements = {
  status: document.querySelector('#status'),
  views: {
    home: document.querySelector('#homeView'),
    playables: document.querySelector('#playablesView'),
    create: document.querySelector('#createView')
  },
  tabButtons: document.querySelectorAll('.tab-button'),
  viewButtons: document.querySelectorAll('[data-view]'),
  templateList: document.querySelector('#templateList'),
  playablesList: document.querySelector('#playablesList'),
  playableDetail: document.querySelector('#playableDetail'),
  playableName: document.querySelector('#playableName'),
  templateName: document.querySelector('#templateName'),
  assetFields: document.querySelector('#assetFields'),
  configFields: document.querySelector('#configFields'),
  advancedFields: document.querySelector('#advancedFields'),
  configForm: document.querySelector('#configForm'),
  resetButton: document.querySelector('#resetButton'),
  createButton: document.querySelector('#createButton'),
  refreshPlayablesButton: document.querySelector('#refreshPlayablesButton'),
  buildDialog: document.querySelector('#buildDialog'),
  buildForm: document.querySelector('#buildForm'),
  buildPlayableName: document.querySelector('#buildPlayableName'),
  buildConfigFields: document.querySelector('#buildConfigFields'),
  networkFields: document.querySelector('#networkFields'),
  buildLog: document.querySelector('#buildLog'),
  runBuildButton: document.querySelector('#runBuildButton'),
  cancelBuildButton: document.querySelector('#cancelBuildButton'),
  closeBuildDialogButton: document.querySelector('#closeBuildDialogButton')
};

function setStatus(message) {
  elements.status.textContent = message;
}

function setView(view) {
  state.view = view;

  for (const [name, element] of Object.entries(elements.views)) {
    element.classList.toggle('active', name === view);
  }

  for (const button of elements.tabButtons) {
    button.classList.toggle('active', button.dataset.view === view);
  }

  if (view === 'playables') {
    loadPlayables();
  }
}

function renderTemplates() {
  elements.templateList.replaceChildren();

  for (const template of state.templates) {
    const button = document.createElement('button');
    button.className = `template-button${state.selectedTemplate?.id === template.id ? ' active' : ''}`;
    button.type = 'button';
    button.innerHTML = `<span>${escapeHtml(template.name)}</span><small>${escapeHtml(template.description || '')}</small>`;
    button.addEventListener('click', () => selectTemplate(template.id));
    elements.templateList.append(button);
  }
}

function renderPlayables() {
  elements.playablesList.replaceChildren();

  if (state.playables.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<h2>No playables yet</h2><p>Create your first playable from a template.</p>';
    elements.playablesList.append(empty);
    renderPlayableDetail();
    return;
  }

  for (const playable of state.playables) {
    const button = document.createElement('button');
    button.className = `project-button${state.selectedPlayable?.slug === playable.slug ? ' active' : ''}`;
    button.type = 'button';
    button.innerHTML = `
      <span>${escapeHtml(playable.name)}</span>
      <small>${escapeHtml(playable.templateName || playable.templateId)} · ${formatDate(playable.createdAt)}</small>
    `;
    button.addEventListener('click', () => selectPlayable(playable.slug));
    elements.playablesList.append(button);
  }
}

function renderPlayableDetail() {
  const playable = state.selectedPlayable;

  if (!playable) {
    elements.playableDetail.innerHTML = `
      <p class="eyebrow">Selected Playable</p>
      <h2>No playable selected</h2>
      <p class="muted">Choose a project to reveal its actions.</p>
    `;
    return;
  }

  elements.playableDetail.innerHTML = `
    <p class="eyebrow">Selected Playable</p>
    <h2>${escapeHtml(playable.name)}</h2>
    <dl class="project-meta">
      <div><dt>Folder</dt><dd>my-playables/${escapeHtml(playable.slug)}</dd></div>
      <div><dt>Template</dt><dd>${escapeHtml(playable.templateName || playable.templateId)}</dd></div>
      <div><dt>Created</dt><dd>${formatDate(playable.createdAt)}</dd></div>
    </dl>
    <div class="project-actions">
      <button class="primary-button" type="button" id="previewPlayableButton">Preview</button>
      <button class="build-button" type="button" id="buildPlayableButton">Build</button>
    </div>
    <section class="builds-section">
      <div class="builds-header">
        <div>
          <p class="eyebrow">Builds</p>
          <h3>Build Artifacts</h3>
        </div>
        <button class="ghost-button compact-button" type="button" id="refreshBuildsButton">Refresh</button>
      </div>
      <div class="builds-list" id="buildsList">
        <p class="muted">Loading builds...</p>
      </div>
    </section>
  `;

  document.querySelector('#previewPlayableButton').addEventListener('click', previewSelectedPlayable);
  document.querySelector('#buildPlayableButton').addEventListener('click', openBuildDialog);
  document.querySelector('#refreshBuildsButton').addEventListener('click', () => loadPlayableBuilds(playable.slug));
  loadPlayableBuilds(playable.slug);
}

function selectPlayable(slug) {
  state.selectedPlayable = state.playables.find((playable) => playable.slug === slug) || null;
  renderPlayables();
  renderPlayableDetail();
}

function formatDate(value) {
  if (!value) return 'Unknown date';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function titleize(value) {
  return String(value)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function networkLabel(value) {
  const labels = {
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

function buildSelectOptions(key) {
  if (key === 'language') return state.buildOptions?.languages || [];
  if (key === 'orientation') return state.buildOptions?.orientations || [];
  return null;
}

function makeFieldWrapper(field) {
  const wrapper = document.createElement('div');
  wrapper.className = 'field';

  const label = document.createElement('label');
  label.htmlFor = field.path || field.id;
  label.textContent = field.label;
  wrapper.append(label);

  return wrapper;
}

function appendFieldDescription(wrapper, field) {
  if (!field.description) return;
  const hint = document.createElement('span');
  hint.className = 'hint';
  hint.textContent = field.description;
  wrapper.append(hint);
}

function cloneConfigValue(value) {
  if (Array.isArray(value)) return [...value];
  return value;
}

function formatConfigValue(field, value) {
  if (field.type === 'array') return JSON.stringify(value ?? []);
  return value ?? '';
}

function renderAssetField(asset) {
  const wrapper = makeFieldWrapper(asset);
  const input = document.createElement('input');
  input.type = 'file';
  input.id = asset.id;
  input.name = asset.id;
  input.accept = asset.accept || '';
  input.multiple = Boolean(asset.multiple);
  input.required = Boolean(asset.required);
  wrapper.append(input);

  if (asset.multiple) {
    const hint = document.createElement('span');
    hint.className = 'hint';
    hint.textContent = `Minimum ${asset.min || 1}`;
    wrapper.append(hint);
  } else if (!asset.required) {
    const hint = document.createElement('span');
    hint.className = 'hint';
    hint.textContent = 'Default asset is selected. Upload a file to replace it.';
    wrapper.append(hint);
  }

  return wrapper;
}

function renderConfigField(field) {
  const wrapper = makeFieldWrapper(field);
  const value = state.configValues[field.path] ?? field.default;

  if (field.type === 'boolean') {
    const input = document.createElement('input');
    input.id = field.path;
    input.name = field.path;
    input.type = 'checkbox';
    input.checked = Boolean(value);
    wrapper.classList.add('checkbox-field');
    input.addEventListener('input', () => {
      state.configValues[field.path] = input.checked;
    });
    wrapper.append(input);
    appendFieldDescription(wrapper, field);
    return wrapper;
  }

  if (field.type === 'number' && Number.isFinite(field.min) && Number.isFinite(field.max)) {
    const row = document.createElement('div');
    row.className = 'number-row';

    const range = document.createElement('input');
    range.type = 'range';
    range.min = field.min ?? 0;
    range.max = field.max ?? 100;
    range.step = field.step ?? 1;
    range.value = value;

    const number = document.createElement('input');
    number.type = 'number';
    number.id = field.path;
    number.name = field.path;
    number.min = field.min ?? '';
    number.max = field.max ?? '';
    number.step = field.step ?? 1;
    number.value = value;

    range.addEventListener('input', () => {
      number.value = range.value;
      state.configValues[field.path] = Number(range.value);
    });
    number.addEventListener('input', () => {
      range.value = number.value;
      state.configValues[field.path] = Number(number.value);
    });

    row.append(range, number);
    wrapper.append(row);
    appendFieldDescription(wrapper, field);
    return wrapper;
  }

  const input = document.createElement('input');
  input.id = field.path;
  input.name = field.path;
  input.type = field.type === 'color' ? 'color' : field.type === 'number' ? 'number' : 'text';
  if (field.type === 'number') {
    input.step = field.step ?? 'any';
  }
  input.value = formatConfigValue(field, value);
  input.addEventListener('input', () => {
    state.configValues[field.path] = field.type === 'number' ? Number(input.value) : input.value;
  });
  wrapper.append(input);
  appendFieldDescription(wrapper, field);

  return wrapper;
}

function resetConfigValues(template) {
  state.configValues = {};
  if (!template) return;
  for (const field of template.config || []) {
    state.configValues[field.path] = cloneConfigValue(field.default);
  }
}

function renderSelectedTemplate() {
  const template = state.selectedTemplate;
  elements.templateName.textContent = template?.name || 'Template';
  elements.assetFields.replaceChildren();
  elements.configFields.replaceChildren();
  elements.advancedFields.replaceChildren();

  if (!template) return;

  for (const asset of template.assets || []) {
    elements.assetFields.append(renderAssetField(asset));
  }

  for (const field of template.config || []) {
    const target = field.advanced ? elements.advancedFields : elements.configFields;
    target.append(renderConfigField(field));
  }
}

function selectTemplate(templateId) {
  state.selectedTemplate = state.templates.find((template) => template.id === templateId);
  resetConfigValues(state.selectedTemplate);
  renderTemplates();
  renderSelectedTemplate();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, dataUrl: reader.result });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function collectAssets(template) {
  const assets = {};

  for (const asset of template.assets || []) {
    const input = elements.configForm.elements[asset.id];
    const files = Array.from(input.files || []);

    if (asset.required && files.length === 0) {
      throw new Error(`${asset.label} is required.`);
    }
    if (asset.min && files.length < asset.min) {
      throw new Error(`${asset.label} needs at least ${asset.min} file(s).`);
    }

    if (asset.multiple) {
      assets[asset.id] = await Promise.all(files.map(readFileAsDataUrl));
    } else if (files[0]) {
      assets[asset.id] = await readFileAsDataUrl(files[0]);
    }
  }

  return assets;
}

function collectConfig(template) {
  const config = {};

  for (const field of template.config || []) {
    const input = elements.configForm.elements[field.path];
    if (!input) continue;
    if (field.type === 'number') config[field.path] = Number(input.value);
    else if (field.type === 'boolean') config[field.path] = input.checked;
    else if (field.type === 'array') {
      try {
        const value = JSON.parse(input.value);
        if (!Array.isArray(value)) throw new Error('Expected an array.');
        config[field.path] = value;
      } catch {
        throw new Error(`${field.label} must be a JSON array.`);
      }
    }
    else config[field.path] = input.value;
  }

  return config;
}

async function createPlayable(event) {
  event.preventDefault();
  const template = state.selectedTemplate;
  if (!template) return;

  elements.createButton.disabled = true;
  setStatus('Creating');

  try {
    const response = await fetch(`/api/templates/${template.id}/create`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: elements.playableName.value,
        assets: await collectAssets(template),
        config: collectConfig(template)
      })
    });

    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Create failed.');

    elements.configForm.reset();
    resetConfigValues(template);
    renderSelectedTemplate();
    state.selectedPlayable = body.playable;
    setStatus('Created');
    await loadPlayables();
    selectPlayable(body.playable.slug);
    setView('playables');
  } catch (error) {
    setStatus(error.message);
  } finally {
    elements.createButton.disabled = false;
  }
}

async function previewSelectedPlayable() {
  const playable = state.selectedPlayable;
  if (!playable) return;

  const previewWindow = window.open('', '_blank');
  setStatus('Building preview');

  try {
    const response = await fetch(`/api/playables/${playable.slug}/preview`, { method: 'POST' });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Preview failed.');

    setStatus('Preview ready');
    if (previewWindow) {
      previewWindow.location.href = new URL(body.preview.url, window.location.origin).href;
    } else {
      setStatus(`Preview ready: ${body.preview.url}`);
    }
    await loadPlayableBuilds(playable.slug);
  } catch (error) {
    if (previewWindow) previewWindow.close();
    setStatus(error.message);
  }
}

async function loadPlayableBuilds(slug) {
  const buildsList = document.querySelector('#buildsList');
  if (!buildsList) return;

  buildsList.innerHTML = '<p class="muted">Loading builds...</p>';

  try {
    const response = await fetch(`/api/playables/${slug}/builds`);
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Could not load builds.');

    state.builds = body.builds || [];
    state.buildsOutputDir = body.outputDir;
    renderBuildsList();
  } catch (error) {
    buildsList.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
  }
}

function renderBuildsList() {
  const buildsList = document.querySelector('#buildsList');
  if (!buildsList) return;

  if (state.builds.length === 0) {
    buildsList.innerHTML = `<p class="muted">No builds found in ${escapeHtml(state.buildsOutputDir || 'builds')}.</p>`;
    return;
  }

  buildsList.replaceChildren();

  for (const build of state.builds) {
    const row = document.createElement('div');
    row.className = 'build-row';

    const info = document.createElement('div');
    info.className = 'build-info';
    info.innerHTML = `
      <strong>${escapeHtml(build.name)}</strong>
      <span>${escapeHtml(build.path)} · ${formatBytes(build.size)} · ${formatDate(build.updatedAt)}</span>
    `;

    const actions = document.createElement('div');
    actions.className = 'build-row-actions';

    if (build.canOpen && build.url) {
      const openButton = document.createElement('button');
      openButton.className = 'ghost-button compact-button';
      openButton.type = 'button';
      openButton.textContent = 'Open';
      openButton.addEventListener('click', () => {
        window.open(new URL(build.url, window.location.origin).href, '_blank', 'noopener,noreferrer');
      });
      actions.append(openButton);
    }

    const deleteButton = document.createElement('button');
    deleteButton.className = 'danger-button compact-button';
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => deleteBuild(build.path));
    actions.append(deleteButton);

    row.append(info, actions);
    buildsList.append(row);
  }
}

async function deleteBuild(path) {
  const playable = state.selectedPlayable;
  if (!playable) return;
  if (!confirm(`Delete ${path}?`)) return;

  setStatus('Deleting build');

  try {
    const response = await fetch(`/api/playables/${playable.slug}/builds`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path })
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Could not delete build.');

    state.builds = body.builds || [];
    state.buildsOutputDir = body.outputDir;
    renderBuildsList();
    setStatus('Build deleted');
  } catch (error) {
    setStatus(error.message);
  }
}

function renderBuildConfigFields(config) {
  elements.buildConfigFields.replaceChildren();

  for (const [key, value] of Object.entries(config || {})) {
    if (key === 'outDir') continue;

    const wrapper = document.createElement('div');
    wrapper.className = 'field';

    const label = document.createElement('label');
    label.htmlFor = `build-${key}`;
    label.textContent = titleize(key);
    wrapper.append(label);

    const selectOptions = buildSelectOptions(key);
    const input = document.createElement(selectOptions ? 'select' : 'input');
    input.id = `build-${key}`;
    input.name = key;

    if (selectOptions) {
      for (const optionValue of selectOptions) {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionValue === 'auto' ? 'Auto' : titleize(optionValue);
        option.selected = optionValue === value;
        input.append(option);
      }
    } else if (typeof value === 'boolean') {
      input.type = 'checkbox';
      input.checked = value;
      wrapper.classList.add('checkbox-field');
    } else if (typeof value === 'number') {
      input.type = 'number';
      input.value = value;
    } else {
      input.type = 'text';
      input.value = value ?? '';
    }

    wrapper.append(input);
    elements.buildConfigFields.append(wrapper);
  }
}

function renderNetworkFields(networks) {
  elements.networkFields.replaceChildren();

  for (const network of networks || []) {
    const label = document.createElement('label');
    label.className = 'network-option';
    label.innerHTML = `
      <input type="checkbox" name="network" value="${network}" />
      <span>${networkLabel(network)}</span>
    `;
    elements.networkFields.append(label);
  }
}

async function openBuildDialog() {
  const playable = state.selectedPlayable;
  if (!playable) return;

  setStatus('Loading build options');
  elements.buildPlayableName.textContent = playable.name;
  elements.buildLog.hidden = true;
  elements.buildLog.textContent = '';

  try {
    const response = await fetch(`/api/playables/${playable.slug}/build-options`);
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Could not load build options.');

    state.buildOptions = body;
    renderBuildConfigFields(body.buildConfig);
    renderNetworkFields(body.networks);
    elements.buildDialog.showModal();
    setStatus('Ready');
  } catch (error) {
    setStatus(error.message);
  }
}

function collectBuildConfig() {
  const config = { ...(state.buildOptions?.buildConfig || {}) };

  for (const input of elements.buildConfigFields.querySelectorAll('input, select')) {
    if (input.type === 'checkbox') config[input.name] = input.checked;
    else if (input.type === 'number') config[input.name] = Number(input.value);
    else config[input.name] = input.value;
  }

  return config;
}

function collectSelectedNetworks() {
  return Array.from(elements.networkFields.querySelectorAll('input[name="network"]:checked')).map((input) => input.value);
}

async function runBuild(event) {
  event.preventDefault();
  const playable = state.selectedPlayable;
  if (!playable) return;

  elements.runBuildButton.disabled = true;
  elements.buildLog.hidden = false;
  elements.buildLog.textContent = 'Building...';
  setStatus('Building');

  try {
    const response = await fetch(`/api/playables/${playable.slug}/build`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        config: collectBuildConfig(),
        networks: collectSelectedNetworks()
      })
    });
    const body = await response.json();
    if (!response.ok && body.build) {
      elements.buildLog.textContent = formatBuildResults(body.build);
      setStatus('Build failed');
      await loadPlayableBuilds(playable.slug);
      return;
    }
    if (!response.ok) throw new Error(body.error || 'Build failed.');

    elements.buildLog.textContent = formatBuildResults(body.build);
    setStatus(body.build.ok ? 'Build complete' : 'Build failed');
    await loadPlayableBuilds(playable.slug);
  } catch (error) {
    elements.buildLog.textContent = error.message;
    setStatus(error.message);
  } finally {
    elements.runBuildButton.disabled = false;
  }
}

function formatBuildResults(build) {
  return (build.results || [])
    .map((result) => {
      const title = `${networkLabel(result.network)}: ${result.code === 0 ? 'success' : 'failed'}`;
      return result.output ? `${title}\n${result.output}` : title;
    })
    .join('\n\n');
}

async function loadTemplates() {
  const response = await fetch('/api/templates');
  const body = await response.json();
  state.templates = body.templates || [];
  selectTemplate(state.templates[0]?.id);
}

async function loadPlayables() {
  setStatus('Loading');
  const response = await fetch('/api/playables');
  const body = await response.json();
  state.playables = body.playables || [];
  if (state.selectedPlayable) {
    state.selectedPlayable = state.playables.find((playable) => playable.slug === state.selectedPlayable.slug) || null;
  }
  renderPlayables();
  renderPlayableDetail();
  setStatus('Ready');
}

for (const button of elements.viewButtons) {
  button.addEventListener('click', () => setView(button.dataset.view));
}

elements.configForm.addEventListener('submit', createPlayable);
elements.buildForm.addEventListener('submit', runBuild);
elements.refreshPlayablesButton.addEventListener('click', loadPlayables);
elements.cancelBuildButton.addEventListener('click', () => elements.buildDialog.close());
elements.closeBuildDialogButton.addEventListener('click', () => elements.buildDialog.close());
elements.resetButton.addEventListener('click', () => {
  if (!state.selectedTemplate) return;
  elements.configForm.reset();
  resetConfigValues(state.selectedTemplate);
  renderSelectedTemplate();
  setStatus('Reset');
});

Promise.all([loadTemplates(), loadPlayables()])
  .then(() => {
    setStatus('Ready');
    setView('home');
  })
  .catch((error) => setStatus(error.message));

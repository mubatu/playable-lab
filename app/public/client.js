const state = {
  view: 'home',
  templates: [],
  playables: [],
  selectedTemplate: null,
  selectedPlayable: null,
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
  refreshPlayablesButton: document.querySelector('#refreshPlayablesButton')
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
    button.innerHTML = `<span>${template.name}</span><small>${template.description || ''}</small>`;
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
      <span>${playable.name}</span>
      <small>${playable.templateName || playable.templateId} · ${formatDate(playable.createdAt)}</small>
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
    <h2>${playable.name}</h2>
    <dl class="project-meta">
      <div><dt>Folder</dt><dd>my-playables/${playable.slug}</dd></div>
      <div><dt>Template</dt><dd>${playable.templateName || playable.templateId}</dd></div>
      <div><dt>Created</dt><dd>${formatDate(playable.createdAt)}</dd></div>
    </dl>
    <div class="project-actions">
      <button class="primary-button" type="button" disabled>Preview</button>
      <button class="secondary-button" type="button" disabled>Build</button>
    </div>
  `;
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

function makeFieldWrapper(field) {
  const wrapper = document.createElement('div');
  wrapper.className = 'field';

  const label = document.createElement('label');
  label.htmlFor = field.path || field.id;
  label.textContent = field.label;
  wrapper.append(label);

  return wrapper;
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
  }

  return wrapper;
}

function renderConfigField(field) {
  const wrapper = makeFieldWrapper(field);
  const value = state.configValues[field.path] ?? field.default;

  if (field.type === 'number') {
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
    return wrapper;
  }

  const input = document.createElement('input');
  input.id = field.path;
  input.name = field.path;
  input.type = field.type === 'color' ? 'color' : 'text';
  input.value = value;
  input.addEventListener('input', () => {
    state.configValues[field.path] = input.value;
  });
  wrapper.append(input);

  return wrapper;
}

function resetConfigValues(template) {
  state.configValues = {};
  if (!template) return;
  for (const field of template.config || []) {
    state.configValues[field.path] = field.default;
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
    config[field.path] = field.type === 'number' ? Number(input.value) : input.value;
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
elements.refreshPlayablesButton.addEventListener('click', loadPlayables);
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

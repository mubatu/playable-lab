const state = {
  templates: [],
  selectedTemplate: null,
  configValues: {}
};

const elements = {
  status: document.querySelector('#status'),
  templateList: document.querySelector('#templateList'),
  templateName: document.querySelector('#templateName'),
  assetFields: document.querySelector('#assetFields'),
  configFields: document.querySelector('#configFields'),
  advancedFields: document.querySelector('#advancedFields'),
  configForm: document.querySelector('#configForm'),
  resetButton: document.querySelector('#resetButton'),
  previewButton: document.querySelector('#previewButton')
};

function setStatus(message) {
  elements.status.textContent = message;
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

async function createPreview(event) {
  event.preventDefault();
  const template = state.selectedTemplate;
  if (!template) return;

  const previewWindow = window.open('', '_blank');
  elements.previewButton.disabled = true;
  setStatus('Preparing preview');

  try {
    const response = await fetch(`/api/templates/${template.id}/preview`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        assets: await collectAssets(template),
        config: collectConfig(template)
      })
    });

    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Preview failed.');

    setStatus('Preview ready');
    if (previewWindow) {
      previewWindow.location.href = body.preview.url;
    } else {
      setStatus(`Preview ready: ${body.preview.url}`);
    }
  } catch (error) {
    if (previewWindow) previewWindow.close();
    setStatus(error.message);
  } finally {
    elements.previewButton.disabled = false;
  }
}

async function loadTemplates() {
  setStatus('Loading');
  const response = await fetch('/api/templates');
  const body = await response.json();
  state.templates = body.templates || [];
  selectTemplate(state.templates[0]?.id);
  setStatus('Ready');
}

elements.configForm.addEventListener('submit', createPreview);
elements.resetButton.addEventListener('click', () => {
  if (!state.selectedTemplate) return;
  resetConfigValues(state.selectedTemplate);
  renderSelectedTemplate();
  setStatus('Reset');
});

loadTemplates().catch((error) => setStatus(error.message));

// ─── DOM References ───
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadPrompt = document.getElementById('upload-prompt');
const previewContainer = document.getElementById('preview-container');
const previewImage = document.getElementById('preview-image');
const clearBtn = document.getElementById('clear-btn');
const analyzeBtn = document.getElementById('analyze-btn');
const resultsSection = document.getElementById('results-section');
const emptyState = document.getElementById('empty-state');
const errorSection = document.getElementById('error-section');
const apiKeyInput = document.getElementById('api-key-input');
const saveKeyBtn = document.getElementById('save-key-btn');
const apiKeyDrawer = document.getElementById('api-key-drawer');
const keyToggleBtn = document.getElementById('key-toggle-btn');
const keyBtnText = document.getElementById('key-btn-text');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const modelSelect = document.getElementById('model-select');

let currentFile = null;
let currentBase64 = null;
let currentMimeType = null;

// ─── API Key Management ───
function getApiKey() {
  return localStorage.getItem('vizion_gemini_key') || '';
}

function saveApiKey(key) {
  localStorage.setItem('vizion_gemini_key', key.trim());
}

function updateKeyUI() {
  const hasKey = !!getApiKey();
  statusDot.classList.toggle('connected', hasKey);
  statusText.textContent = hasKey ? 'Connected' : 'No API key';
  keyBtnText.textContent = hasKey ? 'Change' : 'Set Key';
}

// Initialize
updateKeyUI();

// Persist model choice
const savedModel = localStorage.getItem('vizion_model');
if (savedModel) modelSelect.value = savedModel;
modelSelect.addEventListener('change', () => {
  localStorage.setItem('vizion_model', modelSelect.value);
});

// Key drawer toggle
keyToggleBtn.addEventListener('click', () => {
  const isHidden = apiKeyDrawer.classList.contains('hidden');
  apiKeyDrawer.classList.toggle('hidden', !isHidden);
  if (isHidden) {
    apiKeyInput.value = getApiKey();
    apiKeyInput.focus();
  }
});

saveKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) { apiKeyInput.focus(); return; }
  saveApiKey(key);
  updateKeyUI();
  apiKeyDrawer.classList.add('hidden');
});

apiKeyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveKeyBtn.click();
});

// ─── File Handling ───
function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  if (file.size > 10 * 1024 * 1024) {
    alert('File too large. Please choose an image under 10MB.');
    return;
  }

  currentFile = file;
  currentMimeType = file.type;

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    previewImage.src = dataUrl;
    currentBase64 = dataUrl.split(',')[1];

    uploadPrompt.classList.add('hidden');
    previewContainer.classList.remove('hidden');
    dropZone.classList.add('has-image');
    clearBtn.classList.remove('hidden');
    analyzeBtn.classList.remove('hidden');
    analyzeBtn.disabled = false;

    // Reset right panel
    resultsSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    emptyState.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function clearImage() {
  currentFile = null;
  currentBase64 = null;
  currentMimeType = null;
  previewImage.src = '';
  fileInput.value = '';
  uploadPrompt.classList.remove('hidden');
  previewContainer.classList.add('hidden');
  dropZone.classList.remove('has-image');
  clearBtn.classList.add('hidden');
  analyzeBtn.classList.add('hidden');
  analyzeBtn.disabled = true;

  // Reset right panel
  resultsSection.classList.add('hidden');
  errorSection.classList.add('hidden');
  emptyState.classList.remove('hidden');
}

// ─── Drag & Drop ───
dropZone.addEventListener('click', () => {
  if (!dropZone.classList.contains('has-image')) fileInput.click();
});

fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  if (!dropZone.classList.contains('has-image')) dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  handleFile(e.dataTransfer.files[0]);
});

clearBtn.addEventListener('click', clearImage);

// ─── Gemini API Analysis ───
const FALLBACK_MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.5-flash'
];

async function analyzeWithGemini(base64Data, mimeType) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('NO_KEY');

  const selected = modelSelect.value;
  const modelsToTry = [selected, ...FALLBACK_MODELS.filter(m => m !== selected)];
  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const result = await callGemini(apiKey, model, base64Data, mimeType);
      if (model !== selected) {
        modelSelect.value = model;
        localStorage.setItem('vizion_model', model);
      }
      return result;
    } catch (err) {
      lastError = err;
      const isRetryable = err.message.includes('429') || err.message.includes('quota') || err.message.includes('RATE_LIMIT') || err.message.includes('RESOURCE_EXHAUSTED') || err.message.includes('not found') || err.message.includes('not supported');
      if (!isRetryable) throw err;
      console.warn(`Issue with ${model}, trying next…`);
    }
  }
  throw lastError;
}

async function callGemini(apiKey, model, base64Data, mimeType) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `Analyze this image and provide a detailed description. Respond in this exact JSON format only, with no markdown formatting or code fences:

{
  "identification": "The main subject of the image in 2-5 words",
  "category": "One of: Animal, Vehicle, Food, Nature, Person, Architecture, Art, Technology, Sports, Chart/Diagram, Object, Other",
  "emoji": "A single emoji that best represents the main subject",
  "description": "A detailed 2-3 sentence description of what you see in the image, including colors, composition, and notable details",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}

Be accurate and specific. If it's a chart, describe the chart type and data. If it's a vehicle, identify the specific type. Be precise.`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: base64Data } }
        ]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024
      }
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No response from Gemini');

  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return repairAndParse(cleaned);
}

// Robust JSON parser
function repairAndParse(raw) {
  try { return JSON.parse(raw); } catch (_) {}

  let str = raw;
  const quoteCount = (str.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) str += '"';
  if (str.includes('"tags"') && !str.includes(']')) str += ']';
  if (!str.trimEnd().endsWith('}')) str += '}';

  try { return JSON.parse(str); } catch (_) {}

  const get = (key) => {
    const m = raw.match(new RegExp(`"${key}"\\s*:\\s*"([^"]*)`));
    return m ? m[1] : '';
  };

  const tagsMatch = raw.match(/"tags"\s*:\s*\[(.*?)]/s);
  const tags = tagsMatch
    ? tagsMatch[1].match(/"([^"]*)"/g)?.map(t => t.replace(/"/g, '')) || []
    : [];

  return {
    identification: get('identification') || 'Unknown',
    category: get('category') || 'Other',
    emoji: get('emoji') || '🔍',
    description: get('description') || 'Analysis completed but the response was incomplete. Try again.',
    tags
  };
}

// ─── Analyze Button ───
analyzeBtn.addEventListener('click', async () => {
  if (!currentBase64) return;

  const apiKey = getApiKey();
  if (!apiKey) {
    apiKeyDrawer.classList.remove('hidden');
    apiKeyInput.focus();
    return;
  }

  analyzeBtn.disabled = true;
  analyzeBtn.classList.add('loading');
  emptyState.classList.add('hidden');
  resultsSection.classList.add('hidden');
  errorSection.classList.add('hidden');

  try {
    const result = await analyzeWithGemini(currentBase64, currentMimeType);
    showResults(result);
  } catch (err) {
    console.error('Analysis error:', err);
    showError(err);
  } finally {
    analyzeBtn.classList.remove('loading');
    analyzeBtn.disabled = false;
  }
});

// ─── Display Results ───
function showResults(result) {
  document.getElementById('result-emoji').textContent = result.emoji || '🔍';
  document.getElementById('result-identification').textContent = result.identification || 'Unknown';
  document.getElementById('result-category').textContent = result.category || 'Other';
  document.getElementById('result-description').textContent = result.description || '';

  const tagsContainer = document.getElementById('result-tags');
  tagsContainer.innerHTML = '';

  if (result.tags && result.tags.length) {
    result.tags.forEach(tag => {
      const el = document.createElement('span');
      el.className = 'result-tag';
      el.innerHTML = `<span class="result-tag-dot"></span>${escapeHtml(tag)}`;
      tagsContainer.appendChild(el);
    });
    document.getElementById('result-tags-block').classList.remove('hidden');
  } else {
    document.getElementById('result-tags-block').classList.add('hidden');
  }

  emptyState.classList.add('hidden');
  errorSection.classList.add('hidden');
  resultsSection.classList.remove('hidden');
}

function showError(err) {
  let message = '';

  if (err.message === 'NO_KEY') {
    message = 'Please set your Gemini API key to analyze images.';
  } else if (err.message.includes('API_KEY_INVALID') || err.message.includes('401')) {
    message = 'Invalid API key. Get a free key from <a href="https://aistudio.google.com/apikey" target="_blank">Google AI Studio</a>.';
  } else if (err.message.includes('RATE_LIMIT') || err.message.includes('429') || err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED')) {
    message = 'Quota exceeded on all models. Switch models or wait a minute.';
  } else {
    message = `Something went wrong: <code>${escapeHtml(err.message)}</code>`;
  }

  emptyState.classList.add('hidden');
  resultsSection.classList.add('hidden');
  errorSection.innerHTML = `
    <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" style="flex-shrink:0;margin-top:1px">
      <path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd"/>
    </svg>
    <p>${message}</p>
  `;
  errorSection.classList.remove('hidden');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

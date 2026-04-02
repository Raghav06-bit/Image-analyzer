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
const modelSelect = document.getElementById('model-select');

// Camera DOM references
const cameraBtn = document.getElementById('camera-btn');
const cameraModal = document.getElementById('camera-modal');
const cameraVideo = document.getElementById('camera-video');
const cameraCanvas = document.getElementById('camera-canvas');
const cameraFlash = document.getElementById('camera-flash');
const cameraCaptureBtn = document.getElementById('camera-capture-btn');
const cameraCancelBtn = document.getElementById('camera-cancel-btn');
const cameraSwitchBtn = document.getElementById('camera-switch-btn');

let currentFile = null;
let currentBase64 = null;
let currentMimeType = null;

// Camera state
let cameraStream = null;
let facingMode = 'user'; // 'user' = front, 'environment' = rear

// Persist model choice
const savedModel = localStorage.getItem('vizion_model');
if (savedModel) modelSelect.value = savedModel;
modelSelect.addEventListener('change', () => {
  localStorage.setItem('vizion_model', modelSelect.value);
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

// ─── Backend API Call ───
const FALLBACK_MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.5-flash'
];

async function analyzeImage(base64Data, mimeType) {
  const selected = modelSelect.value;
  const modelsToTry = [selected, ...FALLBACK_MODELS.filter(m => m !== selected)];
  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Data, mimeType, model })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      // Parse the text response
      const result = repairAndParse(
        data.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      );

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

  analyzeBtn.disabled = true;
  analyzeBtn.classList.add('loading');
  emptyState.classList.add('hidden');
  resultsSection.classList.add('hidden');
  errorSection.classList.add('hidden');

  try {
    const result = await analyzeImage(currentBase64, currentMimeType);
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

  if (err.message.includes('RATE_LIMIT') || err.message.includes('429') || err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED')) {
    message = 'Server is busy. Please try again in a moment.';
  } else if (err.message.includes('Server API key')) {
    message = 'The server is not configured yet. Please contact the admin.';
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

// ─── Camera Feature ───
async function openCamera() {
  try {
    // Stop any existing stream first
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
    }

    const constraints = {
      video: {
        facingMode: facingMode,
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };

    cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    cameraVideo.srcObject = cameraStream;
    cameraModal.classList.remove('hidden');

    // Mirror only for front camera
    cameraVideo.style.transform = facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';

  } catch (err) {
    console.error('Camera access error:', err);

    if (err.name === 'NotAllowedError') {
      alert('Camera access was denied. Please allow camera permissions in your browser settings and try again.');
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      alert('No camera found on this device.');
    } else if (err.name === 'NotReadableError') {
      alert('Camera is already in use by another application.');
    } else {
      alert('Could not access the camera. Please make sure your device has a camera and permissions are granted.');
    }
  }
}

function closeCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  cameraVideo.srcObject = null;
  cameraModal.classList.add('hidden');
}

async function switchCamera() {
  facingMode = facingMode === 'user' ? 'environment' : 'user';
  await openCamera();
}

function capturePhoto() {
  if (!cameraStream) return;

  const video = cameraVideo;
  const canvas = cameraCanvas;

  // Set canvas to match video resolution
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext('2d');

  // Mirror the canvas too if it's the front camera
  if (facingMode === 'user') {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Flash effect
  cameraFlash.classList.add('flash-active');
  setTimeout(() => cameraFlash.classList.remove('flash-active'), 400);

  // Convert canvas to file and feed into existing pipeline
  canvas.toBlob((blob) => {
    if (!blob) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = new File([blob], `camera-capture-${timestamp}.jpg`, {
      type: 'image/jpeg'
    });

    // Small delay so the user sees the flash
    setTimeout(() => {
      closeCamera();
      handleFile(file);
    }, 300);
  }, 'image/jpeg', 0.92);
}

// Camera event listeners
cameraBtn.addEventListener('click', (e) => {
  e.stopPropagation(); // Don't trigger the drop-zone file picker
  openCamera();
});

cameraCaptureBtn.addEventListener('click', capturePhoto);
cameraCancelBtn.addEventListener('click', closeCamera);
cameraSwitchBtn.addEventListener('click', switchCamera);

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !cameraModal.classList.contains('hidden')) {
    closeCamera();
  }
});

// Close on backdrop click
document.querySelector('.camera-modal-backdrop')?.addEventListener('click', closeCamera);

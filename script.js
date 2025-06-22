// Initialize variables
let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let startButton = document.getElementById('start');
let stopButton = document.getElementById('stop');
let status = document.getElementById('status');
let tracking = false;
let initialPositions = [];
let highestValueCell = null;

// Request camera access
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' } // Use rear camera
    });
    video.srcObject = stream;
    video.play();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  } catch (err) {
    status.textContent = 'Error accessing camera: ' + err;
  }
}

// Initialize OpenCV
cv['onRuntimeInitialized'] = () => {
  console.log('OpenCV.js loaded');
};

// Detect initial grid and ticket values (simplified OCR placeholder)
function detectInitialGrid() {
  let src = cv.imread('canvas');
  let gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  // Detect 4x4 grid (simplified: assume grid is aligned)
  let cells = [];
  let cellWidth = src.cols / 4;
  let cellHeight = src.rows / 4;

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let cell = {
        id: `cell-${i}-${j}`,
        x: j * cellWidth,
        y: i * cellHeight,
        width: cellWidth,
        height: cellHeight,
        value: Math.floor(Math.random() * 1000) // Placeholder for OCR
      };
      cells.push(cell);
      document.getElementById(`cell-${i}-${j}`).textContent = cell.value;
    }
  }

  // Find highest value cell
  highestValueCell = cells.reduce((max, cell) =>
    cell.value > max.value ? cell : max, cells[0]);
  
  src.delete();
  gray.delete();
  return cells;
}

// Track cells during shuffle
function trackCells() {
  if (!tracking) return;

  let src = cv.imread('canvas');
  let gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  // Simplified tracking: assume cells have distinct features
  // Use feature detection (e.g., ORB) and matching
  let orb = new cv.ORB();
  let keypoints = new cv.KeyPointVector();
  let descriptors = new cv.Mat();
  orb.detectAndCompute(gray, new cv.Mat(), keypoints, descriptors);

  // Update dynamic grid (placeholder: random shuffle for demo)
  let shuffled = [...initialPositions].sort(() => Math.random() - 0.5);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let cell = shuffled[i * 4 + j];
      let dcell = document.getElementById(`dcell-${i}-${j}`);
      dcell.textContent = cell.value;
      if (cell.id === highestValueCell.id) {
        dcell.classList.add('highlight');
      } else {
        dcell.classList.remove('highlight');
      }
    }
  }

  src.delete();
  gray.delete();
  descriptors.delete();
  keypoints.delete();

  if (tracking) {
    requestAnimationFrame(trackCells);
  }
}

// Start tracking
startButton.addEventListener('click', () => {
  if (!tracking) {
    tracking = true;
    status.textContent = 'Status: Tracking...';
    startCamera().then(() => {
      initialPositions = detectInitialGrid();
      trackCells();
    });
  }
});

// Stop tracking
stopButton.addEventListener('click', () => {
  tracking = false;
  status.textContent = 'Status: Stopped';
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
  }
});

// Draw video frame to canvas
video.addEventListener('play', () => {
  function processFrame() {
    if (!tracking) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    requestAnimationFrame(processFrame);
  }
  processFrame();
});

/**
 * tracker.js
 * 
 * This script:
 * 1. Accesses the phone's environment-camera.
 * 2. Draws the video feed.
 * 3. Overlays a 4×4 grid.
 * 4. Displays two numbers per grid cell:
 *    - A static number (the cell’s index).
 *    - A dynamic number (simulated here as a “tracked case” number).
 */

// Get references to HTML elements.
const video = document.getElementById("videoElement");
const canvas = document.getElementById("canvasOverlay");
const ctx = canvas.getContext("2d");

const GRID_ROWS = 4;
const GRID_COLS = 4;

// This array will represent the current dynamic state (which case is in each cell).
let dynamicMapping = [];

/**
 * Initialize the dynamic mapping array with cell numbers 1 to 16.
 * Then shuffle the array to simulate shuffled cases.
 */
function initDynamicMapping() {
  dynamicMapping = [];
  for (let i = 1; i <= GRID_ROWS * GRID_COLS; i++) {
    dynamicMapping.push(i);
  }
  shuffleArray(dynamicMapping);
}

/**
 * Fisher-Yates shuffle algorithm to randomize an array.
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Update the dynamic mapping periodically.
 * In a real tracking solution, this would be updated based on your object detection algorithm.
 */
function updateDynamicMapping() {
  shuffleArray(dynamicMapping);
}

// Request the environment (rear) camera. (Note: Some browsers may not recognize the 'exact' constraint on non-mobile devices)
navigator.mediaDevices
  .getUserMedia({ video: { facingMode: { exact: "environment" } } })
  .then((stream) => {
    video.srcObject = stream;
  })
  .catch((err) => {
    console.error("Error accessing the camera: ", err);
  });

// When the video metadata is loaded, set the canvas dimensions and start drawing.
video.addEventListener("loadedmetadata", () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  initDynamicMapping();
  
  // Simulate tracking updates every 2 seconds.
  setInterval(updateDynamicMapping, 2000);
  
  // Start the drawing loop.
  requestAnimationFrame(draw);
});

/**
 * The draw function clears the canvas and redraws the grid overlay on every animation frame.
 */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  requestAnimationFrame(draw);
}

/**
 * Draws a 4×4 grid and renders two numbers in each cell:
 * - Static number (cell index) at the top left.
 * - Dynamic number (the tracked case) at the bottom right.
 */
function drawGrid() {
  const cellWidth = canvas.width / GRID_COLS;
  const cellHeight = canvas.height / GRID_ROWS;

  // Set grid style.
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = 2;

  // Draw vertical lines.
  for (let i = 0; i <= GRID_COLS; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cellWidth, 0);
    ctx.lineTo(i * cellWidth, canvas.height);
    ctx.stroke();
  }
  // Draw horizontal lines.
  for (let j = 0; j <= GRID_ROWS; j++) {
    ctx.beginPath();
    ctx.moveTo(0, j * cellHeight);
    ctx.lineTo(canvas.width, j * cellHeight);
    ctx.stroke();
  }
  
  // Set text styling for the numbers.
  ctx.font = "20px Arial";
  ctx.textBaseline = "top";

  let cellIndex = 0;
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      cellIndex++; // Number cells from 1 to 16
      
      // Calculate the top-left corner of the cell.
      let x = col * cellWidth;
      let y = row * cellHeight;
      
      // Draw the static number in the top left corner (cyan).
      ctx.fillStyle = "cyan";
      ctx.fillText(`#${cellIndex}`, x + 5, y + 5);
      
      // Draw the dynamic number (tracked case) in the bottom right corner (lime).
      ctx.fillStyle = "lime";
      let dynamicText = dynamicMapping[cellIndex - 1] || 0;
      
      // Measure text width to adjust bottom-right alignment.
      const textMetrics = ctx.measureText(dynamicText.toString());
      const textX = x + cellWidth - textMetrics.width - 5;
      const textY = y + cellHeight - 25; // Adjust vertical position with a bit of padding.
      ctx.fillText(dynamicText.toString(), textX, textY);
    }
  }
}

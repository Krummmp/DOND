/**
 * tracker.js
 *
 * This script now does the following:
 * 1. Gets the camera feed (and sets the canvas size accordingly).
 * 2. Uses OpenCV.js to detect the game board (a large quadrilateral)
 *    from the feed (assuming the board is “Deal or No Deal” style).
 * 3. If detected, uses its 4 corners to draw an interpolated 4×4 grid:
 *    each cell shows a static number (its index) at the top left and a dynamic number at the bottom right.
 *
 * The dynamic number array is still simulated—it shuffles every 2 seconds.
 * And the grid detection is updated every 1 second.
 */

// ----- Global Setup -----
const video = document.getElementById("videoElement");
const canvas = document.getElementById("canvasOverlay");
const ctx = canvas.getContext("2d");

const GRID_ROWS = 4;
const GRID_COLS = 4;

let dynamicMapping = []; // holds the dynamic number for each cell
let gridCorners = null;  // will store the 4 corners of the detected board [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]
let opencvReady = false; // flag, set true when OpenCV.js is loaded

// ----- OpenCV Ready Callback -----
function onOpenCvReady() {
  opencvReady = true;
  console.log("OpenCV.js is ready.");
}

// ----- Initialize Dynamic Mapping -----
// For simulation, dynamicMapping holds numbers 1 … 16. We randomize it periodically.
function initDynamicMapping() {
  dynamicMapping = [];
  for (let i = 1; i <= GRID_ROWS * GRID_COLS; i++) {
    dynamicMapping.push(i);
  }
  shuffleArray(dynamicMapping);
}
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
// Every 2 seconds, shuffle dynamicMapping (simulate detection changes)
setInterval(() => {
  shuffleArray(dynamicMapping);
}, 2000);

// ----- Camera Setup -----
// Use a loose constraint to let the browser choose the best rear camera.
navigator.mediaDevices
  .getUserMedia({ video: { facingMode: "environment" } })
  .then((stream) => {
    video.srcObject = stream;
  })
  .catch((err) => {
    console.error("Error accessing the camera: ", err);
  });

video.addEventListener("loadedmetadata", () => {
  // Set the canvas dimensions to match the video feed.
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  initDynamicMapping();
  // Start the drawing loop.
  requestAnimationFrame(draw);
  // If OpenCV is ready, start grid detection every second.
  if (opencvReady) {
    setInterval(() => {
      let detected = detectGrid();
      if (detected) {
        gridCorners = detected;
      }
    }, 1000);
  }
});

// ----- Main Draw Loop -----
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (gridCorners) {
    drawGridUsingCorners(gridCorners);
  } else {
    drawStaticGrid();
  }
  requestAnimationFrame(draw);
}

// ----- Grid Drawing Functions -----
function drawStaticGrid() {
  const cellWidth = canvas.width / GRID_COLS;
  const cellHeight = canvas.height / GRID_ROWS;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = 2;
  // Draw vertical grid lines
  for (let i = 0; i <= GRID_COLS; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cellWidth, 0);
    ctx.lineTo(i * cellWidth, canvas.height);
    ctx.stroke();
  }
  // Draw horizontal grid lines
  for (let j = 0; j <= GRID_ROWS; j++) {
    ctx.beginPath();
    ctx.moveTo(0, j * cellHeight);
    ctx.lineTo(canvas.width, j * cellHeight);
    ctx.stroke();
  }
  // Draw cell numbers
  let cellIndex = 0;
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      cellIndex++;
      let x = col * cellWidth;
      let y = row * cellHeight;
      // Static label (top-left)
      ctx.fillStyle = "cyan";
      ctx.font = "20px Arial";
      ctx.fillText(`#${cellIndex}`, x + 5, y + 5);
      // Dynamic label (bottom-right)
      ctx.fillStyle = "lime";
      let dyn = dynamicMapping[cellIndex - 1] || 0;
      let text = dyn.toString();
      let metrics = ctx.measureText(text);
      ctx.fillText(text, x + cellWidth - metrics.width - 5, y + cellHeight - 25);
    }
  }
}

// Use detected board corners to draw an interpolated grid.
function drawGridUsingCorners(corners) {
  // corners is an array: [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]
  const tl = { x: corners[0], y: corners[1] };
  const tr = { x: corners[2], y: corners[3] };
  const br = { x: corners[4], y: corners[5] };
  const bl = { x: corners[6], y: corners[7] };

  // Draw the detected board outline.
  ctx.strokeStyle = "red";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y);
  ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y);
  ctx.lineTo(bl.x, bl.y);
  ctx.closePath();
  ctx.stroke();

  // Draw internal grid lines using bilinear interpolation.
  for (let i = 1; i < GRID_ROWS; i++) {
    let alpha = i / GRID_ROWS;
    let start = {
      x: tl.x + alpha * (bl.x - tl.x),
      y: tl.y + alpha * (bl.y - tl.y),
    };
    let end = {
      x: tr.x + alpha * (br.x - tr.x),
      y: tr.y + alpha * (br.y - tr.y),
    };
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }
  for (let j = 1; j < GRID_COLS; j++) {
    let beta = j / GRID_COLS;
    let start = {
      x: tl.x + beta * (tr.x - tl.x),
      y: tl.y + beta * (tr.y - tl.y),
    };
    let end = {
      x: bl.x + beta * (br.x - bl.x),
      y: bl.y + beta * (br.y - bl.y),
    };
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }

  // Draw cell numbers inside the detected grid.
  let cellIndex = 0;
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      cellIndex++;
      // Compute the cell corners via bilinear interpolation.
      let cellTl = innerInterpolate(tl, tr, bl, br, row / GRID_ROWS, col / GRID_COLS);
      let cellBr = innerInterpolate(tl, tr, bl, br, (row + 1) / GRID_ROWS, (col + 1) / GRID_COLS);

      // Static label (top-left)
      ctx.fillStyle = "cyan";
      ctx.font = "16px Arial";
      ctx.fillText(`#${cellIndex}`, cellTl.x + 5, cellTl.y + 5);
      // Dynamic label (bottom-right)
      ctx.fillStyle = "lime";
      let dyn = dynamicMapping[cellIndex - 1] || 0;
      let text = dyn.toString();
      let metrics = ctx.measureText(text);
      ctx.fillText(text, cellBr.x - metrics.width - 5, cellBr.y - 20);
    }
  }
}

// Bilinear interpolation function.
function innerInterpolate(tl, tr, bl, br, rowFrac, colFrac) {
  let top = {
    x: tl.x + colFrac * (tr.x - tl.x),
    y: tl.y + colFrac * (tr.y - tl.y),
  };
  let bottom = {
    x: bl.x + colFrac * (br.x - bl.x),
    y: bl.y + colFrac * (br.y - bl.y),
  };
  return {
    x: top.x + rowFrac * (bottom.x - top.x),
    y: top.y + rowFrac * (bottom.y - top.y),
  };
}

// ----- Grid Detection with OpenCV -----
function detectGrid() {
  if (video.readyState !== video.HAVE_ENOUGH_DATA) return null;

  // Create a Mat from the current video frame.
  let src = new cv.Mat(video.videoHeight, video.videoWidth, cv.CV_8UC4);
  let cap = new cv.VideoCapture(video);
  cap.read(src);

  // Convert to grayscale.
  let gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  // Apply Gaussian blur.
  let blurred = new cv.Mat();
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

  // Detect edges using Canny.
  let edges = new cv.Mat();
  cv.Canny(blurred, edges, 50, 150);

  // Find contours.
  let contours = new cv.MatVector();
  let hierarchy = new cv.Mat();
  cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  let detectedCorners = null;
  // Look through contours for a large quadrilateral.
  for (let i = 0; i < contours.size(); i++) {
    let cnt = contours.get(i);
    let approx = new cv.Mat();
    cv.approxPolyDP(cnt, approx, 0.02 * cv.arcLength(cnt, true), true);
    if (approx.rows === 4) {
      let area = cv.contourArea(approx);
      if (area > 10000) { // adjust this threshold if necessary
        detectedCorners = getSortedCorners(approx);
        approx.delete();
        cnt.delete();
        break;
      }
    }
    approx.delete();
    cnt.delete();
  }

  // Clean up.
  src.delete();
  gray.delete();
  blurred.delete();
  edges.delete();
  contours.delete();
  hierarchy.delete();

  return detectedCorners;
}

// Sort corners in order: Top-left, Top-right, Bottom-right, Bottom-left.
function getSortedCorners(quadMat) {
  let corners = [];
  for (let i = 0; i < quadMat.rows; i++) {
    let offset = i * quadMat.cols;
    corners.push({ x: quadMat.data32S[offset], y: quadMat.data32S[offset + 1] });
  }
  corners.sort((a, b) => a.y - b.y);
  let top = corners.slice(0, 2).sort((a, b) => a.x - b.x);
  let bottom = corners.slice(2, 4).sort((a, b) => a.x - b.x);
  return [top[0].x, top[0].y, top[1].x, top[1].y, bottom[1].x, bottom[1].y, bottom[0].x, bottom[0].y];
}

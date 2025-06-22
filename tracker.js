let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');

let streaming = false;
let cap, src, gray, prevGray;
let frameCount = 0;
let positions = [];

function onOpenCvReady() {
  navigator.mediaDevices.getUserMedia({
    video: { facingMode: { exact: "environment" } }
  }).then(function(stream) {
    video.srcObject = stream;
    video.play();
  }).catch(function(err) {
    console.error('Error: ' + err);
  });

  video.addEventListener('playing', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    cap = new cv.VideoCapture(video);
    src = new cv.Mat(video.videoHeight, video.videoWidth, cv.CV_8UC4);
    gray = new cv.Mat();
    prevGray = new cv.Mat();

    requestAnimationFrame(processVideo);
  });
}

function processVideo() {
  cap.read(src);
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  if (!prevGray.empty()) {
    let diff = new cv.Mat();
    cv.absdiff(gray, prevGray, diff);
    cv.threshold(diff, diff, 25, 255, cv.THRESH_BINARY);
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(diff, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    let cols = 4, rows = 4;
    let cellWidth = canvas.width / cols;
    let cellHeight = canvas.height / rows;

    ctx.strokeStyle = 'lime';
    for (let i = 1; i < cols; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellWidth, 0);
      ctx.lineTo(i * cellWidth, canvas.height);
      ctx.stroke();
    }
    for (let j = 1; j < rows; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * cellHeight);
      ctx.lineTo(canvas.width, j * cellHeight);
      ctx.stroke();
    }

    for (let i = 0; i < contours.size(); ++i) {
      let rect = cv.boundingRect(contours.get(i));
      if (rect.width * rect.height > 500) {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

        let centerX = rect.x + rect.width / 2;
        let centerY = rect.y + rect.height / 2;
        let col = Math.floor(centerX / cellWidth);
        let row = Math.floor(centerY / cellHeight);
        let cellId = `R${row + 1}C${col + 1}`;

        ctx.fillStyle = 'red';
        ctx.fillText(cellId, rect.x, rect.y - 5);

        positions.push(cellId);
      }
    }

    contours.delete(); hierarchy.delete(); diff.delete();
  }

  gray.copyTo(prevGray);
  frameCount++;

  if (frameCount < 300) {
    requestAnimationFrame(processVideo);
  } else {
    console.log('Final Positions:', [...new Set(positions)]);
    alert('Tracking complete. Open console for results.');
  }
}

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');

// Setup camera
navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
  video.srcObject = stream;
});

video.addEventListener('play', () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const tracker = new tracking.ColorTracker(['magenta']);

  tracker.on('track', (event) => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    event.data.forEach((rect) => {
      context.strokeStyle = '#ff0';
      context.lineWidth = 2;
      context.strokeRect(rect.x, rect.y, rect.width, rect.height);
    });
  });

  tracking.track('#video', tracker, { camera: true });
});

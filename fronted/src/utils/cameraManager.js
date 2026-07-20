let sharedStream = null;
let opening = null;
const consumers = new Set();

function streamUsable(stream) {
  return Boolean(stream?.getVideoTracks?.().some(track => track.readyState === 'live'));
}

export async function acquireCamera(consumerId='default', constraints={}) {
  consumers.add(consumerId);
  if (streamUsable(sharedStream)) return sharedStream;
  if (opening) return opening;
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('当前浏览器不支持摄像头 API');
  opening = navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30, max: 60 },
      ...constraints
    },
    audio: false
  }).then(stream => {
    sharedStream = stream;
    stream.getTracks().forEach(track => track.addEventListener('ended', () => {
      sharedStream = null;
      consumers.clear();
    }, { once: true }));
    return stream;
  }).finally(() => { opening = null; });
  return opening;
}

export function releaseCamera(consumerId='default') {
  consumers.delete(consumerId);
  if (!consumers.size && sharedStream) {
    sharedStream.getTracks().forEach(track => track.stop());
    sharedStream = null;
  }
}

export function getSharedCameraStream() { return streamUsable(sharedStream) ? sharedStream : null; }
export function cameraConsumerCount() { return consumers.size; }

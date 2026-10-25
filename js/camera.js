/**
 * Front-facing camera capture. M1 feeds these frames to the Face Landmarker,
 * so the stream is requested at a resolution that leaves landmarks some detail.
 */

const CONSTRAINTS = {
  audio: false,
  video: {
    facingMode: 'user',
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
  },
};

/** Human-readable reason a getUserMedia call failed. */
function describeError(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera permission was denied. Allow it in Settings, then reload.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No front-facing camera was found on this device.';
    case 'NotReadableError':
      return 'The camera is in use by another app. Close it and try again.';
    default:
      return `Camera failed to start: ${err?.name || err}`;
  }
}

/**
 * Attaches a live front-camera stream to `video`.
 * @returns {Promise<MediaStream>}
 * @throws {Error} with a user-facing message
 */
export async function startCamera(video) {
  if (!window.isSecureContext) {
    throw new Error('Camera needs HTTPS (or localhost). Open the https:// link.');
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser does not expose getUserMedia.');
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS);
  } catch (err) {
    throw new Error(describeError(err));
  }

  video.srcObject = stream;
  try {
    await video.play();
  } catch (err) {
    stopCamera(stream);
    throw new Error(`Video playback was blocked: ${err?.name || err}`);
  }

  return stream;
}

export function stopCamera(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

/** Actual negotiated settings — the ideal constraints above are only hints. */
export function describeStream(stream) {
  const track = stream?.getVideoTracks()[0];
  if (!track) return 'no video track';
  const { width, height, frameRate } = track.getSettings();
  const fps = frameRate ? `@${Math.round(frameRate)}fps` : '';
  return `${width}x${height}${fps}`;
}

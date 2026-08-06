/**
 * Fast client-side audio compressor using Web Audio API & HTML5 Audio element fallback.
 * Converts heavy video/audio files (e.g. 16.7 MB .mpeg or 400 MB MP4) into a lightweight 16kHz WAV audio blob (~1-3 MB)
 * directly inside the user's browser in seconds to bypass Vercel serverless payload limits.
 */
export async function compressAudioInBrowser(file: File, onProgress?: (msg: string) => void): Promise<File> {
  // If file is already small (< 4 MB), return directly
  if (file.size <= 4 * 1024 * 1024) {
    return file;
  }

  if (onProgress) {
    onProgress(`Mengompres file ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB) di browser...`);
  }

  // Pass 1: Try Web Audio API decodeAudioData
  try {
    const compressed = await decodeAndReencodeWav(file);
    if (compressed && compressed.size > 1000) {
      console.log(`Browser Web Audio compressed ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB) -> ${(compressed.size / (1024 * 1024)).toFixed(2)} MB`);
      return compressed;
    }
  } catch (e) {
    console.warn("Primary Web Audio decode failed, trying HTML5 Audio Element decoder...", e);
  }

  // Pass 2: Fallback via HTML5 Audio element & MediaRecorder
  try {
    const html5Compressed = await decodeViaAudioElement(file);
    if (html5Compressed && html5Compressed.size > 1000) {
      console.log(`HTML5 Audio compressed ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB) -> ${(html5Compressed.size / (1024 * 1024)).toFixed(2)} MB`);
      return html5Compressed;
    }
  } catch (e2) {
    console.warn("HTML5 Audio decode skipped:", e2);
  }

  return file;
}

function decodeAndReencodeWav(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return reject("No AudioContext");

        const audioCtx = new AudioCtx();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        
        // Downsample to 16kHz mono for Deepgram Nova-3 AI
        const targetSampleRate = 16000;
        const maxSamples = targetSampleRate * 7200; // max 2 hours
        const offlineCtx = new OfflineAudioContext(1, Math.min(audioBuffer.duration * targetSampleRate, maxSamples), targetSampleRate);
        
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineCtx.destination);
        source.start(0);
        
        const renderedBuffer = await offlineCtx.startRendering();
        await audioCtx.close().catch(() => {});
        
        const wavBlob = audioBufferToWav(renderedBuffer);
        const cleanName = file.name.replace(/\.[^/.]+$/, "") + "_compressed.wav";
        resolve(new File([wavBlob], cleanName, { type: "audio/wav" }));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

function decodeViaAudioElement(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.src = url;
    
    audio.oncanplaythrough = async () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const dest = ctx.createMediaStreamDestination();
        const source = ctx.createMediaElementSource(audio);
        source.connect(dest);

        const mediaRecorder = new MediaRecorder(dest.stream);
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) chunks.push(ev.data);
        };

        mediaRecorder.onstop = () => {
          URL.revokeObjectURL(url);
          ctx.close().catch(() => {});
          const blob = new Blob(chunks, { type: "audio/webm" });
          const cleanName = file.name.replace(/\.[^/.]+$/, "") + "_compressed.webm";
          resolve(new File([blob], cleanName, { type: "audio/webm" }));
        };

        mediaRecorder.start();
        audio.play().catch(reject);

        audio.onended = () => {
          mediaRecorder.stop();
        };
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    audio.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
  });
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  let channels: Float32Array[] = [];
  let sampleRate = buffer.sampleRate;
  let offset = 0;

  function writeString(str: string) {
    for (let i = 0; i < str.length; i++) {
      out.setUint8(offset++, str.charCodeAt(i));
    }
  }

  writeString("RIFF");
  out.setUint32(offset, length - 8, true); offset += 4;
  writeString("WAVE");
  writeString("fmt ");
  out.setUint32(offset, 16, true); offset += 4;
  out.setUint16(offset, 1, true); offset += 2;
  out.setUint16(offset, numOfChan, true); offset += 2;
  out.setUint32(offset, sampleRate, true); offset += 4;
  out.setUint32(offset, sampleRate * numOfChan * 2, true); offset += 4;
  out.setUint16(offset, numOfChan * 2, true); offset += 2;
  out.setUint16(offset, 16, true); offset += 2;
  writeString("data");
  out.setUint32(offset, length - offset - 4, true); offset += 4;

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let sample = 0;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numOfChan; channel++) {
      sample = Math.max(-1, Math.min(1, channels[channel][i]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(offset, sample, true);
      offset += 2;
    }
  }

  return new Blob([out.buffer], { type: "audio/wav" });
}

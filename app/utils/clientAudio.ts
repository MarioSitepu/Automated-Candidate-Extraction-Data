/**
 * Fast client-side audio compressor using Web Audio API.
 * Converts heavy video/audio files (e.g. 400 MB MP4) into a lightweight 16kHz WAV audio blob (~1-4 MB)
 * directly inside the user's browser in seconds to bypass Vercel serverless payload limits.
 */
export async function compressAudioInBrowser(file: File, onProgress?: (msg: string) => void): Promise<File> {
  // If file is already small audio (< 4 MB WAV/MP3), return directly
  if (file.size <= 4 * 1024 * 1024 && file.type.startsWith("audio/")) {
    return file;
  }

  if (onProgress) {
    onProgress(`Mengompres file ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB) di browser...`);
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) {
          return resolve(file);
        }
        const audioCtx = new AudioCtx();
        
        // Decode audio track from video/audio buffer
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        
        // Downsample to 16kHz mono for Deepgram Nova-3 AI
        const targetSampleRate = 16000;
        const offlineCtx = new OfflineAudioContext(1, Math.min(audioBuffer.duration * targetSampleRate, targetSampleRate * 3600), targetSampleRate);
        
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineCtx.destination);
        source.start(0);
        
        const renderedBuffer = await offlineCtx.startRendering();
        await audioCtx.close().catch(() => {});
        
        // Encode rendered PCM buffer to lightweight WAV file
        const wavBlob = audioBufferToWav(renderedBuffer);
        const cleanName = file.name.replace(/\.[^/.]+$/, "") + "_compressed.wav";
        const compressedFile = new File([wavBlob], cleanName, {
          type: "audio/wav"
        });
        
        console.log(`Browser compressed ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB) -> ${(compressedFile.size / (1024 * 1024)).toFixed(2)} MB`);
        resolve(compressedFile);
      } catch (err) {
        console.warn("Browser audio extraction skipped, proceeding with original file:", err);
        resolve(file);
      }
    };
    reader.onerror = () => resolve(file);
    reader.readAsArrayBuffer(file);
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

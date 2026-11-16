import * as MP4Box from "mp4box";

interface MP4Track {
  id: number;
  type: string;
  codec: string;
  audio?: {
    sample_rate: number;
    channel_count: number;
    sample_size: number;
  };
}

interface MP4Sample {
  offset: number;
  size: number;
  cts?: number;
  duration?: number;
}

interface SampleGroup {
  offset: number;
  size: number;
  samples: MP4Sample[];
}

const sampleRates = [
  96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350,
];

function getSampleRateIndex(rate: number): number {
  const idx = sampleRates.indexOf(rate);
  return idx !== -1 ? idx : 4; // default 44100
}

function createAdtsHeader(dataLength: number, sampleRate: number, channels: number): Uint8Array {
  const profile = 1; // AAC-LC (MPEG-4 Audio Object Type 2 - 1 = 1)
  const freqIdx = getSampleRateIndex(sampleRate);
  const chanCfg = channels || 1;
  const frameLength = dataLength + 7;

  const header = new Uint8Array(7);
  header[0] = 0xff;
  header[1] = 0xf1; // MPEG-4, Layer 0, No CRC
  header[2] = ((profile & 3) << 6) | ((freqIdx & 0x0f) << 2) | ((chanCfg >> 2) & 1);
  header[3] = ((chanCfg & 3) << 6) | ((frameLength >> 11) & 3);
  header[4] = (frameLength >> 3) & 0xff;
  header[5] = ((frameLength & 7) << 5) | 0x1f;
  header[6] = 0xfc;
  return header;
}

/**
 * Extracts AAC audio track from MP4 / MOV / M4A containers directly in the browser.
 * Skips reading multi-hundred-megabyte video frames (mdat) to keep memory footprint minimal (< 20 MB).
 */
export async function extractAudioFromMp4(
  file: File,
  onProgress?: (msg: string) => void
): Promise<File> {
  const createFileFn =
    MP4Box.createFile ||
    (MP4Box as unknown as { default?: { createFile: () => unknown } }).default?.createFile;
  if (typeof createFileFn !== "function") {
    throw new Error("MP4Box parser tidak tersedia.");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mp4box = (createFileFn as any)();

  let audioTrack: MP4Track | null = null;
  let parseError: Error | null = null;

  const readyPromise = new Promise<MP4Track>((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mp4box.onError = (e: any) => {
      const err = new Error(
        typeof e === "string" ? e : e?.message || "Gagal memproses struktur MP4"
      );
      parseError = err;
      reject(err);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mp4box.onReady = (info: any) => {
      const track = (info.tracks || []).find((t: MP4Track) => t.type === "audio");
      if (!track) {
        const err = new Error("Trek audio tidak ditemukan di dalam file video ini.");
        parseError = err;
        reject(err);
      } else {
        audioTrack = track;
        resolve(track);
      }
    };
  });

  if (onProgress) {
    onProgress("Membaca struktur box metadata video...");
  }

  // Stream boxes in chunks (256 KB), following nextFileStart to skip video data
  let offset = 0;
  const chunkSize = 256 * 1024;
  let isReady = false;

  readyPromise
    .then(() => {
      isReady = true;
    })
    .catch(() => {});

  while (offset < file.size && !isReady && !parseError) {
    const curSize = Math.min(chunkSize, file.size - offset);
    const slice = file.slice(offset, offset + curSize);
    const ab = await slice.arrayBuffer();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ab as any).fileStart = offset;

    const nextNeeded = mp4box.appendBuffer(ab);
    if (typeof nextNeeded === "number" && nextNeeded > offset && nextNeeded < file.size) {
      offset = nextNeeded;
    } else {
      offset += curSize;
    }
  }

  mp4box.flush();
  await readyPromise;

  if (!audioTrack) {
    throw new Error("Trek audio tidak valid atau tidak dapat diakses.");
  }

  const fullTrack = mp4box.getTrackById((audioTrack as MP4Track).id);
  const samples: MP4Sample[] = fullTrack?.samples || [];

  if (samples.length === 0) {
    throw new Error("Frame sampel audio tidak ditemukan di file video.");
  }

  const sRate = (audioTrack as MP4Track).audio?.sample_rate || 44100;
  const sChan = (audioTrack as MP4Track).audio?.channel_count || 1;

  // Group contiguous audio samples to drastically reduce file.slice() calls
  const groups: SampleGroup[] = [];
  let currentGroup: SampleGroup | null = null;

  for (const s of samples) {
    if (!currentGroup || s.offset !== currentGroup.offset + currentGroup.size) {
      currentGroup = { offset: s.offset, size: s.size, samples: [s] };
      groups.push(currentGroup);
    } else {
      currentGroup.size += s.size;
      currentGroup.samples.push(s);
    }
  }

  const adtsParts: BlobPart[] = [];
  let processedGroups = 0;

  for (const group of groups) {
    const groupBlob = file.slice(group.offset, group.offset + group.size);
    const groupBuf = new Uint8Array(await groupBlob.arrayBuffer());

    let groupInnerOffset = 0;
    for (const s of group.samples) {
      const header = createAdtsHeader(s.size, sRate, sChan);
      const sampleBytes = groupBuf.subarray(groupInnerOffset, groupInnerOffset + s.size);
      adtsParts.push(header as unknown as BlobPart);
      adtsParts.push(sampleBytes as unknown as BlobPart);
      groupInnerOffset += s.size;
    }

    processedGroups++;
    if (onProgress && groups.length > 10 && processedGroups % Math.ceil(groups.length / 10) === 0) {
      const percent = Math.round((processedGroups / groups.length) * 100);
      onProgress(`Mengekstrak audio dari video (${percent}%)...`);
    }
  }

  const cleanBaseName = file.name.replace(/\.[^/.]+$/, "");
  const aacBlob = new Blob(adtsParts, { type: "audio/aac" });
  return new File([aacBlob], `${cleanBaseName}.aac`, { type: "audio/aac" });
}

/**
 * Fast client-side audio compressor & extractor.
 * Converts heavy video/audio files (e.g. 600 MB MP4 or 20 MB MP3) into a lightweight audio file
 * directly inside the user's browser in seconds to bypass Vercel serverless payload limits.
 */
export async function compressAudioInBrowser(
  file: File,
  onProgress?: (msg: string) => void
): Promise<File> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const isVideo =
    ["mp4", "mov", "m4v", "mkv", "webm", "avi", "3gp", "ts"].includes(ext) ||
    file.type.startsWith("video/");

  // If already a small audio file (<= 4 MB), send directly without re-encoding!
  if (!isVideo && file.size <= 4 * 1024 * 1024) {
    return file;
  }

  let audioCandidate: File = file;

  // Pass 1: For MP4/MOV/M4V/M4A video & audio, perform instant in-browser MP4Box demuxing
  if (
    ["mp4", "mov", "m4v", "m4a"].includes(ext) ||
    file.type.includes("mp4") ||
    file.type.includes("quicktime")
  ) {
    try {
      if (onProgress) {
        onProgress(
          `Mengekstrak trek audio dari video (${(file.size / (1024 * 1024)).toFixed(1)} MB)...`
        );
      }
      const extractedAac = await extractAudioFromMp4(file, onProgress);
      if (extractedAac && extractedAac.size > 500) {
        console.log(
          `MP4Box extracted audio: ${(file.size / (1024 * 1024)).toFixed(2)} MB -> ${(extractedAac.size / (1024 * 1024)).toFixed(2)} MB`
        );
        audioCandidate = extractedAac;
      }
    } catch (e) {
      console.warn("MP4Box in-browser audio extraction fell back to Web Audio / direct:", e);
    }
  }

  // If the extracted audio is now <= 4.2 MB, return it directly!
  // AAC audio preserves original quality and is natively transcribed by Deepgram Nova-3.
  if (audioCandidate.size <= 4.2 * 1024 * 1024 && audioCandidate !== file) {
    if (onProgress) {
      onProgress(
        `Audio berhasil diekstrak (${(audioCandidate.size / (1024 * 1024)).toFixed(2)} MB). Siap diunggah!`
      );
    }
    return audioCandidate;
  }

  // Pass 2: If still > 4.2 MB or was a huge audio file, downsample via Web Audio API
  if (audioCandidate.size > 4.2 * 1024 * 1024) {
    if (onProgress) {
      onProgress(
        `Mengompresi file audio (${(audioCandidate.size / (1024 * 1024)).toFixed(2)} MB) di browser...`
      );
    }

    try {
      const compressedWav = await decodeAndReencodeWav(audioCandidate);
      if (compressedWav && compressedWav.size > 1000) {
        console.log(
          `Web Audio downsampled audio: ${(audioCandidate.size / (1024 * 1024)).toFixed(2)} MB -> ${(compressedWav.size / (1024 * 1024)).toFixed(2)} MB`
        );
        return compressedWav;
      }
    } catch (e) {
      console.warn("Web Audio decode failed, trying HTML5 Audio Element decoder...", e);
      try {
        const html5Compressed = await decodeViaAudioElement(audioCandidate);
        if (html5Compressed && html5Compressed.size > 1000) {
          return html5Compressed;
        }
      } catch (e2) {
        console.warn("HTML5 Audio decode skipped:", e2);
      }
    }
  }

  return audioCandidate;
}

function decodeAndReencodeWav(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return reject("No AudioContext");

        const audioCtx = new AudioCtx();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        // Downsample to 16kHz mono for Deepgram Nova-3 AI
        const targetSampleRate = 16000;
        const maxSamples = targetSampleRate * 7200; // max 2 hours
        const offlineCtx = new OfflineAudioContext(
          1,
          Math.min(audioBuffer.duration * targetSampleRate, maxSamples),
          targetSampleRate
        );

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
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
  const channels: Float32Array[] = [];
  const sampleRate = buffer.sampleRate;
  let offset = 0;

  function writeString(str: string) {
    for (let i = 0; i < str.length; i++) {
      out.setUint8(offset++, str.charCodeAt(i));
    }
  }

  writeString("RIFF");
  out.setUint32(offset, length - 8, true);
  offset += 4;
  writeString("WAVE");
  writeString("fmt ");
  out.setUint32(offset, 16, true);
  offset += 4;
  out.setUint16(offset, 1, true);
  offset += 2;
  out.setUint16(offset, numOfChan, true);
  offset += 2;
  out.setUint32(offset, sampleRate, true);
  offset += 4;
  out.setUint32(offset, sampleRate * numOfChan * 2, true);
  offset += 4;
  out.setUint16(offset, numOfChan * 2, true);
  offset += 2;
  out.setUint16(offset, 16, true);
  offset += 2;
  writeString("data");
  out.setUint32(offset, length - offset - 4, true);
  offset += 4;

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

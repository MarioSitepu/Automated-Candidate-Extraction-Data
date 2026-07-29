import os
import subprocess
import datetime
from dotenv import load_dotenv
from groq import Groq

# 1. Load Environment Variables
load_dotenv()

ACCESS_TOKEN = os.getenv("ACCESS_TOKEN")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not ACCESS_TOKEN or not GROQ_API_KEY:
    raise ValueError("Error: ACCESS_TOKEN atau GROQ_API_KEY belum diatur di file .env!")

FILE_ID = "1RKM-KP1e-Q8WdH0j-7OzrJ0XaJXYVE-x"
OUTPUT_AUDIO = f"audio_{FILE_ID}.mp3"
OUTPUT_SRT = f"subtitle_indonesia_{FILE_ID}.srt"

# 2. EKSTRAK AUDIO VIA FFMPEG
gdrive_url = f"https://www.googleapis.com/drive/v3/files/{FILE_ID}?alt=media"
auth_header = f"Authorization: Bearer {ACCESS_TOKEN.strip()}"

ffmpeg_command = [
    "ffmpeg",
    "-headers", auth_header,
    "-i", gdrive_url,
    "-vn",
    "-c:a", "libmp3lame",
    "-q:a", "2",
    "-y",
    OUTPUT_AUDIO
]

print("1. Mengunduh dan mengompres audio dari Google Drive via FFmpeg...")

try:
    subprocess.run(ffmpeg_command, check=True)
    print("   -> Audio berhasil diekstrak!")
except subprocess.CalledProcessError as e:
    print(f"\n❌ FFmpeg Gagal (Exit code: {e.returncode})")
    exit(1)

# 3. TRANSKRIPSI VIA GROQ API
print("\n2. Mengirim file audio ke Groq Whisper API...")

client = Groq(api_key=GROQ_API_KEY)

# Helper untuk format timestamp SRT (HH:MM:SS,mmm)
def format_time(seconds):
    td = datetime.timedelta(seconds=seconds)
    total_seconds = int(td.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60
    millis = int((td.total_seconds() - total_seconds) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

with open(OUTPUT_AUDIO, "rb") as file:
    transcription = client.audio.transcriptions.create(
        file=(OUTPUT_AUDIO, file.read()),
        model="whisper-large-v3",
        language="id",
        response_format="verbose_json"  # <--- Menggunakan verbose_json agar dapat timestamp
    )

# 4. PARSE DAN SIMPAN KE FILE .SRT
print("3. Mengubah hasil transkripsi ke format .SRT...")

with open(OUTPUT_SRT, "w", encoding="utf-8") as f:
    for i, segment in enumerate(transcription.segments, start=1):
        start = format_time(segment["start"])
        end = format_time(segment["end"])
        text = segment["text"].strip()
        
        f.write(f"{i}\n")
        f.write(f"{start} --> {end}\n")
        f.write(f"{text}\n\n")

print(f"\n🎉 SUKSES! File subtitle Bahasa Indonesia tersimpan di: {OUTPUT_SRT}")
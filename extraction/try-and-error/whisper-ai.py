# import subprocess
# import whisper
# import datetime

# import os
# import subprocess
# from dotenv import load_dotenv
# from groq import Groq

# # 1. Muat variabel dari file .env
# load_dotenv()

# # 2. Ambil nilai variabel environment
# ACCESS_TOKEN = os.getenv("ACCESS_TOKEN")
# GROQ_API_KEY = os.getenv("GROQ_API_KEY")
# OUTPUT_AUDIO = f"audio_{FILE_ID}.mp3"
# OUTPUT_SRT = f"subtitle_indonesia_{FILE_ID}.srt"

# # 1. EKSTRAK AUDIO DENGAN FFMPEG``
# gdrive_url = f"https://www.googleapis.com/drive/v3/files/{FILE_ID}?alt=media"
# auth_header = f"Authorization: Bearer {ACCESS_TOKEN}"

# ffmpeg_command = [
#     "ffmpeg", "-headers", auth_header, "-i", gdrive_url,
#     "-vn", "-c:a", "libmp3lame", "-q:a", "2", "-y", OUTPUT_AUDIO
# ]

# print("1. Mengunduh audio dari Google Drive via FFmpeg...")
# subprocess.run(ffmpeg_command, check=True)

# # 2. TRANSKRIP AUDIO KE SUBTITLE INDONESIA DENGAN WHISPER
# print("\n2. Memproses audio ke Subtitle Bahasa Indonesia menggunakan Whisper...")
# # Gunakan model 'base' atau 'small' (cepat & akurat untuk bahasa Indonesia)
# model = whisper.load_model("base") 

# # Transkrip khusus bahasa Indonesia
# result = model.transcribe(OUTPUT_AUDIO, language="id")

# # Helper untuk format waktu SRT (00:00:00,000)
# def format_time(seconds):
#     td = datetime.timedelta(seconds=seconds)
#     total_seconds = int(td.total_seconds())
#     hours = total_seconds // 3600
#     minutes = (total_seconds % 3600) // 60
#     secs = total_seconds % 60
#     millis = int((td.total_seconds() - total_seconds) * 1000)
#     return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

# # 3. SIMPAN KE FILE .SRT
# with open(OUTPUT_SRT, "w", encoding="utf-8") as f:
#     for i, seg in enumerate(result["segments"], start=1):
#         f.write(f"{i}\n")
#         f.write(f"{format_time(seg['start'])} --> {format_time(seg['end'])}\n")
#         f.write(f"{seg['text'].strip()}\n\n")

# print(f"\nSukses! File subtitle Bahasa Indonesia telah dibuat: {OUTPUT_SRT}")
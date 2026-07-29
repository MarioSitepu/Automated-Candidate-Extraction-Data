# import os
# import subprocess
# from dotenv import load_dotenv
# from groq import Groq

# # 1. Muat variabel dari file .env
# load_dotenv()

# # 2. Ambil nilai variabel environment
# ACCESS_TOKEN = os.getenv("ACCESS_TOKEN")
# GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# # Nama file hasil output lokal
# OUTPUT_AUDIO = f"audio_{FILE_ID}.mp3"
# OUTPUT_SUBTITLE = f"subtitle_{FILE_ID}.srt"
# # ==============================================================

# # Konstruksi URL Google Drive API
# gdrive_url = f"https://www.googleapis.com/drive/v3/files/{FILE_ID}?alt=media"

# # Konstruksi Header Authorization
# auth_header = f"Authorization: Bearer {ACCESS_TOKEN}"

# # Menyusun perintah FFmpeg dalam bentuk list (lebih aman dari command injection) 

# # ffmpeg_command = [
#     # "ffmpeg",
#     # "-headers", auth_header,
#     # "-i", gdrive_url,
#     # "-vn",
#     # "-c:a", "libmp3lame",
#     # "-q:a", "2",
#     # "-y",  # Menambahkan opsi -y agar otomatis overwrite jika file sudah ada
#     # OUTPUT_FILENAME
# # ]

# ffmpeg_command = [
#     "ffmpeg",
#     "-headers", auth_header,
#     "-i", gdrive_url,
    
#     # --- OUTPUT 1: AUDIO ---
#     "-map", "0:a:0",           # Ambil stream audio pertama (#0:1)
#     "-c:a", "libmp3lame",
#     "-q:a", "2",
#     "-y",
#     OUTPUT_AUDIO,
    
#     # --- OUTPUT 2: SUBTITLE ---
#     "-map", "0:s:0",           # Ambil stream subtitle pertama (#0:2)
#     "-y",
#     OUTPUT_SUBTITLE
# ]

# print("Sedang memproses dan mengunduh audio langsung dari Google Drive...")

# try:
#     # Menjalankan perintah FFmpeg
#     process = subprocess.run(ffmpeg_command, check=True, text=True)
#     print(f"\nSukses! File audio berhasil disimpan dengan nama: {OUTPUT_FILENAME}")
# except subprocess.CalledProcessError as e:
#     print(f"\nTerjadi kesalahan saat menjalankan FFmpeg: {e}")
# except FileNotFoundError:
#     print("\nError: FFmpeg tidak ditemukan di sistem kamu. Pastikan FFmpeg sudah masuk ke Environment Path.")
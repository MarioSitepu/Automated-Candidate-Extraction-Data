# import requests
# import os
# import subprocess
# from dotenv import load_dotenv
# from groq import Groq

# # 1. Muat variabel dari file .env
# load_dotenv()

# # 2. Ambil nilai variabel environment
# ACCESS_TOKEN = os.getenv("ACCESS_TOKEN")
# GROQ_API_KEY = os.getenv("GROQ_API_KEY")
# headers = {
#     "Authorization": f"Bearer {ACCESS_TOKEN}"
# }

# # 1. Cek daftar subtitle (caption tracks) yang ada di file video tersebut
# list_captions_url = f"https://www.googleapis.com/drive/v3/files/{FILE_ID}/captions"
# response = requests.get(list_captions_url, headers=headers)

# if response.status_code == 200:
#     captions = response.json().get('files', [])
#     print(f"Ditemukan {len(captions)} subtitle terpisah di Google Drive:")
    
#     indonesian_caption_id = None
    
#     for cap in captions:
#         print(f"- ID: {cap['id']} | Bahasa: {cap.get('language')} | Nama: {cap.get('name')}")
#         # Cari yang bahasanya Indonesia (biasanya kodenya 'id' atau 'ind')
#         if cap.get('language') in ['id', 'ind'] or 'indonesia' in cap.get('name', '').lower():
#             indonesian_caption_id = cap['id']
            
#     # 2. Jika ketemu, langsung download subtitle Bahasa Indonesia-nya
#     if indonesian_caption_id:
#         print(f"\nMengunduh subtitle Bahasa Indonesia (ID: {indonesian_caption_id})...")
#         download_url = f"https://www.googleapis.com/drive/v3/files/{FILE_ID}/captions/{indonesian_caption_id}?alt=media"
        
#         cap_response = requests.get(download_url, headers=headers)
#         if cap_response.status_code == 200:
#             with open("subtitle_indonesia_gdrive.srt", "wb") as f:
#                 f.write(cap_response.content)
#             print("Sukses! File 'subtitle_indonesia_gdrive.srt' berhasil disimpan.")
#         else:
#             print(f"Gagal mengunduh subtitle: {cap_response.status_code} - {cap_response.text}")
#     else:
#         print("\nSubtitle Bahasa Indonesia tidak ditemukan di daftar Caption Track GDrive.")
# else:
#     print(f"Gagal mengambil daftar caption: {response.status_code} - {response.text}")
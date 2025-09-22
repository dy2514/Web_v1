# source/file_handler.py - 파일 업로드 처리
import os
import uuid
from datetime import datetime

# 기본 설정
UPLOAD_FOLDER = 'tetris/web_interface/source/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# 업로드 폴더 생성
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def save_uploaded_file(file):
    """업로드된 파일 저장"""
    filename = f"upload_{uuid.uuid4().hex[:8]}.jpg"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    return filename, filepath

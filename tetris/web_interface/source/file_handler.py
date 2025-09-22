# source/file_handler.py - 파일 업로드 처리
import os
import uuid
from datetime import datetime

# 중앙 설정 사용 (라즈베리파이5 최적화와 일치)
try:
    from ...config import get_config  # tetris.config
except Exception:
    # 실행 컨텍스트에 따라 상대 임포트가 실패할 수 있어 안전 폴백
    from tetris.config import get_config  # type: ignore

_cfg = get_config()
UPLOAD_FOLDER = str(_cfg['upload']['UPLOAD_FOLDER'])
ALLOWED_EXTENSIONS = set(_cfg['upload']['ALLOWED_EXTENSIONS'])
MAX_FILE_SIZE = int(_cfg['upload']['MAX_FILE_SIZE'])

# 업로드 폴더 생성
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def _choose_extension(original_filename: str) -> str:
    """원본 파일 확장자를 보존하되, 허용되지 않으면 jpg로 대체."""
    ext = ''
    if '.' in (original_filename or ''):
        ext = original_filename.rsplit('.', 1)[1].lower()
    return ('.' + ext) if ext in ALLOWED_EXTENSIONS else '.jpg'

def save_uploaded_file(file):
    """업로드된 파일 저장 (설정과 일관)."""
    ext = _choose_extension(getattr(file, 'filename', ''))
    filename = f"upload_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    return filename, filepath

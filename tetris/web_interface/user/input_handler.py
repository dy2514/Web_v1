# input_handler.py - 사용자 입력 처리 로직

import os
import uuid
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from werkzeug.datastructures import FileStorage

logger = logging.getLogger(__name__)

class InputHandler:
    """사용자 입력 처리 클래스"""
    
    def __init__(self, upload_folder: str, allowed_extensions: set, max_file_size: int):
        self.upload_folder = Path(upload_folder)
        self.allowed_extensions = allowed_extensions
        self.max_file_size = max_file_size
        
        # 업로드 폴더 생성
        self.upload_folder.mkdir(parents=True, exist_ok=True)
    
    def validate_file(self, file: FileStorage) -> Tuple[bool, str]:
        """파일 유효성 검사"""
        if not file or not file.filename:
            return False, "파일이 선택되지 않았습니다."
        
        # 파일 확장자 검사
        if not self._allowed_file(file.filename):
            return False, f"허용되지 않는 파일 형식입니다. 허용 형식: {', '.join(self.allowed_extensions)}"
        
        # 파일 크기 검사
        file.seek(0, 2)  # 파일 끝으로 이동
        file_size = file.tell()
        file.seek(0)  # 파일 시작으로 이동
        
        if file_size > self.max_file_size:
            return False, f"파일 크기가 너무 큽니다. 최대 크기: {self.max_file_size // (1024*1024)}MB"
        
        return True, "파일 검증 통과"
    
    def validate_people_count(self, people_count: str) -> Tuple[bool, int, str]:
        """인원 수 유효성 검사"""
        try:
            count = int(people_count)
            if count < 0 or count > 4:
                return False, 0, "인원 수는 0-4명 사이여야 합니다."
            return True, count, "인원 수 검증 통과"
        except ValueError:
            return False, 0, "올바른 숫자를 입력해주세요."
    
    def save_uploaded_file(self, file: FileStorage) -> Tuple[str, str]:
        """업로드된 파일 저장"""
        # 고유한 파일명 생성
        filename = f"upload_{uuid.uuid4().hex[:8]}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        filepath = self.upload_folder / filename
        
        # 파일 저장
        file.save(str(filepath))
        
        logger.info(f"File uploaded: {filename} ({filepath})")
        return filename, str(filepath)
    
    def process_input(self, file: FileStorage, people_count_str: str) -> Dict[str, Any]:
        """사용자 입력 전체 처리"""
        result = {
            'success': False,
            'filename': None,
            'filepath': None,
            'people_count': 0,
            'upload_time': None,
            'errors': []
        }
        
        try:
            # 파일 검증
            is_valid, message = self.validate_file(file)
            if not is_valid:
                result['errors'].append(message)
                return result
            
            # 인원 수 검증
            is_valid, count, message = self.validate_people_count(people_count_str)
            if not is_valid:
                result['errors'].append(message)
                return result
            
            # 파일 저장
            filename, filepath = self.save_uploaded_file(file)
            
            result.update({
                'success': True,
                'filename': filename,
                'filepath': filepath,
                'people_count': count,
                'upload_time': datetime.now().isoformat()
            })
            
            logger.info(f"Input processed successfully: {filename}, people: {count}")
            
        except Exception as e:
            error_msg = f"입력 처리 중 오류 발생: {str(e)}"
            result['errors'].append(error_msg)
            logger.error(error_msg, exc_info=True)
        
        return result
    
    def _allowed_file(self, filename: str) -> bool:
        """파일 확장자 허용 여부 확인"""
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in self.allowed_extensions
    
    def get_file_info(self, filepath: str) -> Dict[str, Any]:
        """파일 정보 조회"""
        path = Path(filepath)
        if not path.exists():
            return {'exists': False}
        
        stat = path.stat()
        return {
            'exists': True,
            'filename': path.name,
            'size': stat.st_size,
            'created': datetime.fromtimestamp(stat.st_ctime).isoformat(),
            'modified': datetime.fromtimestamp(stat.st_mtime).isoformat()
        }
    
    def cleanup_old_files(self, max_age_hours: int = 24):
        """오래된 업로드 파일 정리"""
        cutoff_time = datetime.now().timestamp() - (max_age_hours * 3600)
        cleaned_count = 0
        
        try:
            for file_path in self.upload_folder.iterdir():
                if file_path.is_file() and file_path.stat().st_mtime < cutoff_time:
                    file_path.unlink()
                    cleaned_count += 1
            
            if cleaned_count > 0:
                logger.info(f"Cleaned up {cleaned_count} old files")
                
        except Exception as e:
            logger.error(f"File cleanup error: {e}")

def create_input_handler(config: Dict[str, Any]) -> InputHandler:
    """InputHandler 인스턴스 생성"""
    return InputHandler(
        upload_folder=config['upload']['UPLOAD_FOLDER'],
        allowed_extensions=config['upload']['ALLOWED_EXTENSIONS'],
        max_file_size=config['upload']['MAX_FILE_SIZE']
    )

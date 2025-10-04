# control/__init__.py - 관제 영역 Blueprint 초기화
from flask import Blueprint

# API 엔드포인트는 전역적으로 접근 가능하도록 별도 Blueprint 생성
control_bp = Blueprint('control', __name__, url_prefix='/desktop')
api_bp = Blueprint('api', __name__, url_prefix='/api')

from . import routes

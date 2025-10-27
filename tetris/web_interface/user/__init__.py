# user/__init__.py - 사용자 영역 Blueprint 초기화
from flask import Blueprint

user_bp = Blueprint('user', __name__, url_prefix='/mobile')

from . import routes

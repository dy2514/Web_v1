# control/__init__.py - 관제 영역 Blueprint 초기화
from flask import Blueprint

control_bp = Blueprint('control', __name__, url_prefix='/desktop')

from . import routes

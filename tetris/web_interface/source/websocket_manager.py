"""
WebSocket manager - bidirectional real-time communication
"""
import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Dict, Set

# WebSocket optional import
try:
    import websockets
    WEBSOCKETS_AVAILABLE = True
except ImportError:
    WEBSOCKETS_AVAILABLE = False
    # Mock websockets module for graceful degradation
    class MockWebSocketServerProtocol:
        pass
    websockets = type('MockWebSockets', (), {
        'WebSocketServerProtocol': MockWebSocketServerProtocol,
        'exceptions': type('exceptions', (), {
            'ConnectionClosed': Exception
        })()
    })()

logger = logging.getLogger(__name__)

class WebSocketManager:
    """WebSocket 연결 관리자"""
    
    def __init__(self):
        self.connections: Set[websockets.WebSocketServerProtocol] = set()
        self.connection_metadata: Dict[websockets.WebSocketServerProtocol, Dict[str, Any]] = {}
        self.message_handlers = {}
    
    def register_handler(self, message_type: str, handler):
        """메시지 타입별 핸들러 등록"""
        self.message_handlers[message_type] = handler
    
    async def register_connection(self, websocket: websockets.WebSocketServerProtocol, path: str):
        """새로운 WebSocket 연결 등록"""
        self.connections.add(websocket)
        self.connection_metadata[websocket] = {
            'path': path,
            'connected_at': datetime.now().isoformat(),
            'last_activity': datetime.now().isoformat()
        }
        
        logger.info(f"WebSocket 연결됨: {websocket.remote_address} ({path})")
        
        try:
            async for message in websocket:
                await self.handle_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"WebSocket 연결 종료됨: {websocket.remote_address}")
        finally:
            await self.unregister_connection(websocket)
    
    async def unregister_connection(self, websocket: websockets.WebSocketServerProtocol):
        """WebSocket 연결 해제"""
        if websocket in self.connections:
            self.connections.remove(websocket)
        if websocket in self.connection_metadata:
            del self.connection_metadata[websocket]
        logger.info(f"WebSocket 연결 해제됨: {websocket.remote_address}")
    
    async def handle_message(self, websocket: websockets.WebSocketServerProtocol, message: str):
        """메시지 처리"""
        try:
            data = json.loads(message)
            message_type = data.get('type', 'unknown')
            
            # 메타데이터 업데이트
            if websocket in self.connection_metadata:
                self.connection_metadata[websocket]['last_activity'] = datetime.now().isoformat()
            
            # 핸들러 실행
            if message_type in self.message_handlers:
                await self.message_handlers[message_type](websocket, data)
            else:
                logger.warning(f"알 수 없는 메시지 타입: {message_type}")
                
        except json.JSONDecodeError:
            logger.error(f"잘못된 JSON 메시지: {message}")
        except Exception as e:
            logger.error(f"메시지 처리 중 오류: {e}")
    
    async def broadcast(self, message: Dict[str, Any], exclude: websockets.WebSocketServerProtocol = None):
        """모든 연결에 메시지 브로드캐스트"""
        if not self.connections:
            return
        
        message_str = json.dumps(message, ensure_ascii=False)
        disconnected = set()
        
        for websocket in self.connections.copy():
            if websocket == exclude:
                continue
                
            try:
                await websocket.send(message_str)
            except websockets.exceptions.ConnectionClosed:
                disconnected.add(websocket)
            except Exception as e:
                logger.error(f"메시지 전송 실패: {e}")
                disconnected.add(websocket)
        
        # 연결이 끊어진 소켓들 정리
        for websocket in disconnected:
            await self.unregister_connection(websocket)
    
    async def send_to_connection(self, websocket: websockets.WebSocketServerProtocol, message: Dict[str, Any]):
        """특정 연결에 메시지 전송"""
        if websocket not in self.connections:
            return False
        
        try:
            message_str = json.dumps(message, ensure_ascii=False)
            await websocket.send(message_str)
            return True
        except websockets.exceptions.ConnectionClosed:
            await self.unregister_connection(websocket)
            return False
        except Exception as e:
            logger.error(f"메시지 전송 실패: {e}")
            return False
    
    def get_connection_count(self) -> int:
        """활성 연결 수 반환"""
        return len(self.connections)
    
    def get_connection_info(self) -> Dict[str, Any]:
        """연결 정보 반환"""
        return {
            'total_connections': len(self.connections),
            'connections': [
                {
                    'remote_address': str(conn.remote_address),
                    'path': meta.get('path', ''),
                    'connected_at': meta.get('connected_at', ''),
                    'last_activity': meta.get('last_activity', '')
                }
                for conn, meta in self.connection_metadata.items()
            ]
        }

# 전역 WebSocket 관리자 인스턴스
ws_manager = WebSocketManager()

# 메시지 핸들러 등록
async def handle_status_update(websocket: websockets.WebSocketServerProtocol, data: Dict[str, Any]):
    """상태 업데이트 메시지 처리"""
    logger.info(f"상태 업데이트 요청: {data}")
    # 상태 업데이트 로직 구현

async def handle_control_command(websocket: websockets.WebSocketServerProtocol, data: Dict[str, Any]):
    """제어 명령 메시지 처리"""
    logger.info(f"제어 명령 요청: {data}")
    # 제어 명령 처리 로직 구현

async def handle_user_input(websocket: websockets.WebSocketServerProtocol, data: Dict[str, Any]):
    """사용자 입력 메시지 처리"""
    logger.info(f"사용자 입력: {data}")
    # 사용자 입력 처리 로직 구현

# 핸들러 등록
ws_manager.register_handler('status_update', handle_status_update)
ws_manager.register_handler('control_command', handle_control_command)
ws_manager.register_handler('user_input', handle_user_input)

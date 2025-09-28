# user_input.py

import base64
import mimetypes
from io import BytesIO
from pathlib import Path
from typing import Optional, Tuple

def file_to_data_url(p: Path) -> str:
    """파일 경로 > data URL. 시나리오 모드"""
    mime, _ = mimetypes.guess_type(str(p))
    if not mime:
        mime = "application/octet-stream"
    b64 = base64.b64encode(p.read_bytes()).decode("utf-8")
    return f"data:{mime};base64,{b64}"

# ================================ 시나리오 모드 ================================
def input_scenario_image() -> str:
    while True:
        s = input("시나리오명을 입력하세요: ").strip()
        if s:
            return s
        print("❌ 시나리오명을 입력해주세요.")

def input_scenario_people() -> int:
    while True:
        ppl = input("1열을 제외한 차량 탑승 인원을 알려주세요! : ").strip()
        try:
            n = int(ppl)
            if n < 0:
                print("❌ 0 이상의 정수만 입력 가능합니다.")
                continue
           
            while True:
                confirm = input(f"차량 탑승 인원은 \"{n}명\"이 맞나요? (1) 네 (2) 아니요 : ").strip()
                if confirm == "1":
                    return n
                elif confirm == "2":
                    break  
                else:
                    print("❌ 1 또는 2로 입력해주세요.")
        except ValueError:
            print("❌ 숫자만 입력해주세요.")

def get_user_input_scenario() -> Tuple[int, str, str]:
    user_input_dir = Path(__file__).resolve().parent
    images_dir = user_input_dir / "luggage_image"

    scenario = input_scenario_image()
    people_count = input_scenario_people()

    img_path = images_dir / f"{scenario}.jpg"
    if not img_path.exists():
        raise FileNotFoundError(f"이미지 파일을 찾을 수 없습니다: {img_path}")

    image_data_url = file_to_data_url(img_path)
    
    return people_count, image_data_url, scenario

# ================================ 웹 모드 ================================
def get_user_input_web(
    port: int = 5002,
    auto_open_browser: bool = True,
) -> Tuple[int, str, str]:
    """
    웹 모드 입력 수집 - 통합 웹 서버 사용
    이 함수는 이제 통합 웹 서버의 상태를 모니터링하여 입력을 수집합니다.
    """
    import time
    import sys
    from pathlib import Path
    
    # 통합 웹 서버의 상태 관리 모듈 import
    try:
        from ..base.state_manager import get_global_status, update_status
    except ImportError:
        try:
            from base.state_manager import get_global_status, update_status
        except ImportError:
            # 직접 경로 추가
            web_interface_path = Path(__file__).parent.parent
            if str(web_interface_path) not in sys.path:
                sys.path.insert(0, str(web_interface_path))
            from base.state_manager import get_global_status, update_status

    print(f"통합 웹 서버에서 사용자 입력을 기다리는 중...")
    print(f"모바일 접속: http://localhost:{port}/mobile/input")
    print(f"데스크탑 접속: http://localhost:{port}/desktop/control")
    
    # 통합 웹 서버의 상태를 모니터링하여 입력 수집
    collected_people: Optional[int] = None
    collected_data_url: Optional[str] = None
    scenario: Optional[str] = None
    
    try:
        deadline = time.monotonic() + 1200
        while time.monotonic() < deadline:
            status = get_global_status()
            
            # 업로드된 파일과 인원 수가 모두 있는지 확인
            if status.get('uploaded_file') and status.get('people_count', 0) > 0:
                collected_people = status.get('people_count', 0)
                collected_data_url = status.get('image_data_url', '')
                scenario = status.get('scenario', 'items_unknown')
                
                print(f"✅ 사용자 입력 수집 완료: 인원 {collected_people}명, 시나리오 {scenario}")
                break
                
            time.sleep(0.5)
        else:
            raise TimeoutError("웹 입력 수집 대기 시간이 초과되었습니다.")
            
    except KeyboardInterrupt:
        print("\n[중단] 사용자가 프로그램을 중단했습니다.")
        raise SystemExit(0)
    
    if not collected_data_url:
        raise RuntimeError("이미지 수집에 실패했습니다.")
    if not isinstance(collected_people, int) or collected_people < 0:
        raise RuntimeError("탑승 인원 수집에 실패했습니다.")

    return collected_people, collected_data_url, (scenario or "items_unknown")

# ---------------------- 단독 실행 테스트 ----------------------
if __name__ == "__main__":
    ppl, url, scenario = get_user_input_scenario()
    print("people_count =", ppl)
    print("scenario =", scenario)
    print("image_data_url(head) =", url[:64], "...")
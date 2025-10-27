# 아두이노 통합 제어 시스템 - 멀티 아두이노 시리얼 통신 관리
import time

import readchar
import serial
import serial.tools.list_ports

# 아두이노 설정
ARDUINO_SERIAL_NUMBERS = [
    '33437363436351303113',  # 셀 1번
    '3343736343635121F0B0',  # 셀 2번
    '33437363436351409183',  # 셀 3번
    '33437363436351010223'   # 셀 4번
]
BAUD_RATE = 9600
AUTOMATION_COMMAND_LENGTH = 16

# 전역 변수
arduino_connections = {}

# 수동 제어 키 매핑
manual_key_map = {
    'Q': 'Q', 'A': 'A', # Stepper A
    'W': 'W', 'S': 'S', # Stepper B
    'E': 'E', 'D': 'D', # Stepper C
    'R': 'R', 'F': 'F', 'V': 'V', # Servo 1
    'T': 'T', 'G': 'G', 'B': 'B', # Servo 2
}

# 아두이노 연결 관리
def connect_to_arduinos():
    """시리얼 번호를 기반으로 아두이노에 연결"""
    print("아두이노 연결을 시작합니다...")
    found_ports = list(serial.tools.list_ports.comports())
    for i, sn in enumerate(ARDUINO_SERIAL_NUMBERS):
        port_found = False
        for p in found_ports:
            if p.serial_number and p.serial_number == sn:
                try:
                    last_exc = None
                    for attempt in range(3):
                        try:
                            ser = serial.Serial(p.device, BAUD_RATE, timeout=1)
                            break
                        except serial.SerialException as e:
                            last_exc = e
                            time.sleep(0.5 * (attempt + 1))
                    else:
                        raise serial.SerialException(f"연결 재시도 초과: {last_exc}")

                    time.sleep(2)
                    arduino_connections[sn] = ser
                    print(f"  [성공] 셀 {i+1}번 연결 성공 (SN: {sn}, Port: {p.device})")
                    port_found = True
                    break
                except serial.SerialException as e:
                    print(f"  [에러] 셀 {i+1}번 연결 실패 (SN: {sn}). {e}")
                    break
        if not port_found:
            print(f"  [경고] 셀 {i+1}번 아두이노를 찾을 수 없습니다 (SN: {sn}).")

# 수동 제어 모드
def run_manual_mode(cell_number):
    """선택된 셀에 대해 수동 모드 실행"""
    try:
        target_sn = ARDUINO_SERIAL_NUMBERS[cell_number - 1]
    except IndexError:
        print("[에러] 잘못된 셀 번호입니다.")
        return

    if target_sn not in arduino_connections:
        print(f"[에러] 셀 {cell_number}번은 연결되어 있지 않습니다. 메인 메뉴로 돌아갑니다.")
        return

    print("\n" + "="*55)
    print(f"셀 {cell_number}번 수동 제어 모드 시작 (SN: {target_sn})")
    print("    모터 제어 키를 누르세요. 메인 메뉴로 돌아가려면 'crtr+c'를 누르세요.")
    print("="*55)

    while True:
        try:
            key = readchar.readkey()
            key_upper = key.upper()

            if key == '\x1b':
                print("\n[완료] 수동 모드를 종료하고 메인 메뉴로 돌아갑니다.")
                break

            if key_upper in manual_key_map:
                command = manual_key_map[key_upper]
                arduino_connections[target_sn].write((command + '\n').encode('utf-8'))
                print(f"  > 셀 {cell_number}에 전송: '{command}'")

        except KeyboardInterrupt:
            print("\n[완료] 수동 모드를 종료하고 메인 메뉴로 돌아갑니다.")
            break

# 자동화 명령 실행
def send_automated_command(full_command):
    """16자리 명령을 4개 아두이노에 분할 전송"""
    print(f"[실행] 자동화 명령 실행: {full_command}")
    num_arduinos = AUTOMATION_COMMAND_LENGTH // 4
    command_chunks = [full_command[i:i+4] for i in range(0, AUTOMATION_COMMAND_LENGTH, 4)]

    for i in range(num_arduinos):
        serial_num = ARDUINO_SERIAL_NUMBERS[i]
        if serial_num in arduino_connections:
            conn = arduino_connections[serial_num]
            command_to_send = command_chunks[i]
            conn.write((command_to_send + '\n').encode('utf-8'))
            conn.flush()                 
            time.sleep(0.02)            
            print(f"  > 셀 {i+1}에 전송: '{command_to_send}'")
        else:
            print(f"  > 셀 {i+1} 건너뛰기 (연결 안됨).")
    print("-" * 20)

# 전체 방송 명령
def broadcast_command(command):
    """하나의 명령을 모든 연결된 아두이노에 전송"""
    print(f"'{command}' 명령을 전체 아두이노에 방송합니다...")
    for i, serial_num in enumerate(ARDUINO_SERIAL_NUMBERS):
        if serial_num in arduino_connections:
            conn = arduino_connections[serial_num]
            conn.write((command + '\n').encode('utf-8'))
            print(f"  > 셀 {i+1}에 방송 완료.")
    print("-" * 20)

# 연결 종료
def close_all_connections():
    """모든 시리얼 포트 연결 종료"""
    print("모든 시리얼 포트를 닫습니다...")
    BROADCAST_ON_CLOSE = False
    if BROADCAST_ON_CLOSE:           
        broadcast_command("0000")
        time.sleep(0.1)
    for conn in arduino_connections.values():
        if conn.isOpen():
            conn.close()
    print("[완료] 모든 연결이 안전하게 종료되었습니다.")

# 메인 실행
if __name__ == "__main__":
    connect_to_arduinos()
    if not arduino_connections:
        print("\n[에러] 연결된 아두이노가 없습니다. 프로그램을 종료합니다.")
        exit()

    print("\n" + "="*55)
    print(" 멀티 아두이노 통합 제어 시스템 (v1.1) ")
    print("="*55)
    
    try:
        while True:
            print("\n--- [메인 메뉴] ---")
            print(f"  - 수동 제어: 숫자 '1'~'{len(ARDUINO_SERIAL_NUMBERS)}' 입력")
            print(f"  - 자동 제어: '{AUTOMATION_COMMAND_LENGTH}'자리 숫자 입력 (예: 1210110221223120)")
            print("  - 전체 초기화: 'P' 또는 'p' 입력")
            print("  - 프로그램 종료: 'crtr+c' 입력")
            
            user_input = input("\n명령을 입력하세요: ").strip()

            if user_input.lower() == 'esc':
                break
            
            elif user_input.lower() == 'p':
                broadcast_command("P")

            elif user_input.isdigit() and len(user_input) == 1 and 1 <= int(user_input) <= len(ARDUINO_SERIAL_NUMBERS):
                run_manual_mode(int(user_input))

            elif user_input.isdigit() and len(user_input) == AUTOMATION_COMMAND_LENGTH:
                send_automated_command(user_input)
            
            else:
                print("[에러] 잘못된 명령입니다. 메뉴를 확인하고 다시 입력해주세요.")

    except (KeyboardInterrupt, Exception) as e:
        print(f"\n예외 발생 ({type(e).__name__}): 프로그램을 안전하게 종료합니다.")
    finally:
        close_all_connections()

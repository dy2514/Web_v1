// 펌웨어 버전: v1.3 (최종본)

/**
 * @file motor_control_v1.3.ino
 * @brief 4축 스테퍼 모터(A, B, C, D)의 정밀 제어 및 시리얼 통신 기반 수동 보정 시스템 펌웨어.
 * * 이 펌웨어는 PC의 파이썬 스크립트와 통신하여 스테퍼 모터를 제어하고,
 * 실시간으로 모터의 상대적인 위치(스텝 수)를 기록합니다.
 * 이전 버전에서 사용되던 서보 모터 관련 기능은 모두 제거하고,
 * 4번째 축(D) 모터의 제어 및 위치 기록 기능을 추가하여 확장성을 확보하였습니다.
 */


// --- 사용자 설정 영역 ---
/**
 * @brief 스텝 펄스 간 최소 지연 시간 (마이크로초).
 * 이 값이 낮을수록 모터 속도는 빨라집니다. 모터의 최대 속도와 안정성을 고려하여 설정해야 합니다.
 */
const int stepInterval = 500;

/**
 * @brief 수동 보정 명령 시 한 번에 이동할 스텝 단위 수.
 * 'q', 'a' 등 키 입력 한 번당 이 값만큼 모터가 이동합니다. (현재 50 스텝)
 */
const int CALIBRATION_STEP_UNIT = 50;

/**
 * @brief 한 번의 updateSteppers() 호출에서 연속으로 발생시킬 스텝 펄스 개수.
 * 현재 1로 설정되어 있어, updateSteppers() 호출당 최대 1개의 스텝이 발생합니다.
 * (stepsRemaining[i]와 stepInterval에 의해 최종 속도 결정)
 */
const int STEPS_PER_UPDATE = 1;

// 제거된 서보모터 관련 상수 (SERVO_STOP_POS, SERVO_CW_SPEED, SERVO_CCW_SPEED, MANUAL_SERVO_DURATION)
// 서보모터 제어 기능이 제거됨에 따라 해당 상수들도 삭제되었습니다.

// --- 모터 핀/변수 설정 ---
/**
 * @brief 4개의 스테퍼 모터 스텝 핀 배열.
 * 순서: [0: Motor B, 1: Motor C, 2: Motor A, 3: Motor D]
 * 모터 드라이버의 STEP 핀에 연결됩니다.
 */
const int stepPins[] = {2, 3, 4, 5};

/**
 * @brief 4개의 스테퍼 모터 방향(DIR) 핀 배열.
 * 순서: [0: Motor B, 1: Motor C, 2: Motor A, 3: Motor D]
 * 모터 드라이버의 DIR 핀에 연결되며, HIGH/LOW로 회전 방향을 제어합니다.
 */
const int dirPins[] = {6, 7, 8, 9};

/**
 * @brief 시스템이 제어하는 스테퍼 모터의 총 개수 (4축).
 */
const int motorCount = 4;

/**
 * @brief 각 모터별 남은 이동 스텝 수를 저장하는 배열.
 * 0이 될 때까지 updateSteppers() 함수에서 펄스를 발생시킵니다.
 */
long stepsRemaining[motorCount] = {0, 0, 0, 0};

/**
 * @brief 각 모터가 마지막으로 스텝 펄스를 발생시킨 시간을 저장하는 배열 (micros()).
 * stepInterval을 사용하여 모터 속도(주파수)를 제어하는 데 사용됩니다.
 */
unsigned long lastStepTime[motorCount] = {0, 0, 0, 0};

// 제거된 서보모터 객체 (Servo servo1; Servo servo2;) 및 타이머 변수 (servo1_stopTime, servo2_stopTime)

// 위치 기록용 변수: 각 모터의 상대적인 현재 위치(스텝 수)를 기록합니다.
long motor_B_Position = 0;
long motor_C_Position = 0;
long motor_A_Position = 0;
long motor_D_Position = 0; // [추가] 4번째 모터(D)의 현재 상대 위치를 스텝 단위로 저장

/**
 * @brief 초기 설정 함수. 프로그램 시작 시 한 번 실행됩니다.
 */
void setup() {
  // 시리얼 통신을 9600 bps로 시작합니다. PC와의 데이터 교환을 위해 필수적입니다.
  Serial.begin(9600);

  // 모든 스테퍼 모터 핀을 출력 모드로 설정합니다.
  for (int i = 0; i < motorCount; i++) {
    pinMode(stepPins[i], OUTPUT);
    pinMode(dirPins[i], OUTPUT);
  }

  // 제거된 서보모터 초기화 코드 (attach, write)

  // [수정] PC의 파이썬 스크립트가 펌웨어 버전을 인식하고 통신을 시작할 수 있도록 특정 시작 신호를 전송합니다.
  Serial.println("ReadyForCalibration_v1.3");
}

/**
 * @brief 메인 루프 함수. 무한 반복되며 시스템의 주요 기능을 처리합니다.
 */
void loop() {
  // 1. 시리얼 포트를 통해 들어오는 명령(수동 보정 키 입력)을 처리합니다.
  handleSerialCommands();

  // 2. stepsRemaining 변수를 확인하여 스테퍼 모터를 움직이는 펄스를 발생시킵니다.
  updateSteppers();

  // 제거된 서보모터 업데이트 함수 호출 (updateServos())
}

/**
 * @brief 현재 4개 모터의 상대적인 위치(스텝 수)를 시리얼 포트로 출력합니다.
 * PC 프로그램과의 동기화를 위해 사용됩니다.
 */
// [수정] 4번째 모터(D)의 좌표를 출력 포맷에 추가
void printPositions() {
  // 시리얼 출력 문자열을 저장하기 위한 버퍼를 선언하고 크기를 확장합니다.
  char buffer[70];

  // sprintf를 사용하여 A, B, C, D 네 축의 위치 데이터를 지정된 형식으로 버퍼에 저장합니다.
  // %5ld는 5자리 너비로 long decimal(10진수) 값을 출력하라는 의미입니다.
  sprintf(buffer, "   좌표 -> [ A: %5ld | B: %5ld | C: %5ld | D: %5ld ]",
           motor_A_Position, motor_B_Position, motor_C_Position, motor_D_Position);

  // 포맷된 문자열을 시리얼 포트로 출력합니다.
  Serial.print(buffer);
}

/**
 * @brief 시리얼 포트에서 명령(키 입력)을 읽고 해당 모터를 제어합니다.
 * 주로 수동 보정 및 원점 설정(Zeroing)에 사용됩니다.
 */
void handleSerialCommands() {
  // 시리얼 버퍼에 데이터가 있는지 확인합니다.
  if (Serial.available() > 0) {
    // 들어오는 데이터가 완전히 수신될 때까지 아주 짧은 시간(2ms) 대기하여 데이터 손실을 방지합니다.
    delay(2);

    // 줄바꿈 문자('\n')를 만날 때까지 수신된 문자열을 읽습니다.
    String raw_command = Serial.readStringUntil('\n');
    raw_command.trim(); // 문자열 앞뒤의 공백/제어 문자(CR, LF)를 제거합니다.

    // 유효한 명령이 없으면 함수를 종료합니다.
    if (raw_command.length() == 0) return;

    // 명령은 수신된 문자열의 첫 번째 문자입니다.
    char command = raw_command.charAt(0);
    // unsigned long currentTime = millis(); // 현재 사용되지 않는 변수

    // 'z' 명령은 모든 축의 위치를 0으로 초기화하고, 남은 스텝을 취소(0으로 설정)합니다.
    if (command == 'z') {
      // [수정] A, B, C, D 네 축의 위치를 모두 0으로 설정하여 원점을 재설정합니다.
      motor_A_Position = 0; motor_B_Position = 0; motor_C_Position = 0; motor_D_Position = 0;

      // 현재 진행 중인 모든 모터의 움직임을 즉시 멈춥니다.
      for(int i=0; i<motorCount; i++) { stepsRemaining[i] = 0; }
    } else {
      // 그 외의 명령(모터 이동)을 처리합니다.
      switch (command) {
        // Motor A (Index 2): 'q' (음의 방향), 'a' (양의 방향)
        case 'q':
          digitalWrite(dirPins[2], HIGH); // 방향 핀 설정 (HIGH = 음의 방향)
          stepsRemaining[2] += CALIBRATION_STEP_UNIT; // 이동할 스텝 수 추가
          motor_A_Position -= CALIBRATION_STEP_UNIT; // 위치 기록 업데이트 (음수)
          break;
        case 'a':
          digitalWrite(dirPins[2], LOW);  // 방향 핀 설정 (LOW = 양의 방향)
          stepsRemaining[2] += CALIBRATION_STEP_UNIT; // 이동할 스텝 수 추가
          motor_A_Position += CALIBRATION_STEP_UNIT; // 위치 기록 업데이트 (양수)
          break;

        // Motor B (Index 0): 'w' (음의 방향), 's' (양의 방향)
        case 'w':
          digitalWrite(dirPins[0], HIGH);
          stepsRemaining[0] += CALIBRATION_STEP_UNIT;
          motor_B_Position -= CALIBRATION_STEP_UNIT;
          break;
        case 's':
          digitalWrite(dirPins[0], LOW);
          stepsRemaining[0] += CALIBRATION_STEP_UNIT;
          motor_B_Position += CALIBRATION_STEP_UNIT;
          break;

        // Motor C (Index 1): 'e' (양의 방향), 'd' (음의 방향)
        case 'e':
          digitalWrite(dirPins[1], HIGH); // 참고: C 모터는 HIGH가 + 방향으로 설정됨
          stepsRemaining[1] += CALIBRATION_STEP_UNIT;
          motor_C_Position += CALIBRATION_STEP_UNIT;
          break;
        case 'd':
          digitalWrite(dirPins[1], LOW);  // 참고: C 모터는 LOW가 - 방향으로 설정됨
          stepsRemaining[1] += CALIBRATION_STEP_UNIT;
          motor_C_Position -= CALIBRATION_STEP_UNIT;
          break;

        // [수정] Motor D (Index 3): 'r' (음의 방향), 'f' (양의 방향) 제어 추가
        case 'r':
          digitalWrite(dirPins[3], HIGH); // 방향 핀 설정 (HIGH = 음의 방향)
          stepsRemaining[3] += CALIBRATION_STEP_UNIT;
          motor_D_Position -= CALIBRATION_STEP_UNIT;
          break;
        case 'f':
          digitalWrite(dirPins[3], LOW);  // 방향 핀 설정 (LOW = 양의 방향)
          stepsRemaining[3] += CALIBRATION_STEP_UNIT;
          motor_D_Position += CALIBRATION_STEP_UNIT;
          break;
      }
    }
    // 명령 처리 후 현재 위치를 출력합니다.
    printPositions();

    // [수정] PC의 파이썬 스크립트가 하나의 완전한 데이터를 수신했음을 알 수 있도록 줄바꿈 문자('\n')를 전송합니다.
    Serial.println();
  }
}

/**
 * @brief 모든 스테퍼 모터를 확인하여, 남은 스텝이 있고 지정된 시간 간격(stepInterval)이 지났다면 스텝 펄스를 발생시킵니다.
 * 이 함수는 비동기적으로 모터 움직임을 제어하여 루프를 차단하지 않습니다.
 */
void updateSteppers() {
  unsigned long currentTime = micros(); // 현재 시간을 마이크로초 단위로 가져옵니다.

  // 모든 모터를 순회하며 개별적으로 제어합니다.
  for (int i = 0; i < motorCount; i++) {
    // 1. 남은 스텝이 있고 (stepsRemaining[i] > 0)
    // 2. 마지막 펄스 이후 stepInterval(속도 제어)만큼 시간이 지났다면 (currentTime - lastStepTime[i] >= stepInterval)
    if (stepsRemaining[i] > 0 && (currentTime - lastStepTime[i] >= stepInterval)) {

      // STEPS_PER_UPDATE만큼 스텝 펄스를 연속으로 발생시킵니다 (현재는 1).
      for (int s = 0; s < STEPS_PER_UPDATE; s++) {
        // 펄스를 발생시키기 전 남은 스텝을 다시 한 번 확인합니다.
        if (stepsRemaining[i] <= 0) break;

        // 스텝 펄스 HIGH: 모터 드라이버에 스텝 명령을 전달
        digitalWrite(stepPins[i], HIGH);

        // 스텝 펄스 LOW: 펄스 종료 (HIGH-LOW 전환으로 1 스텝 완료)
        digitalWrite(stepPins[i], LOW);

        // 남은 스텝 수를 1 감소시킵니다.
        stepsRemaining[i]--;
      }
      // 마지막 펄스 발생 시간을 현재 시간으로 갱신하여 다음 펄스 발생 시점을 제어합니다.
      lastStepTime[i] = currentTime;
    }
  }
}
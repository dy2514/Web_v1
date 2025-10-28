// 펌웨어 버전: v2.7 (최종본)


// =================================================================================
// ▼▼▼ 사용자 설정 영역 (펌웨어 동작 파라미터 정의) ▼▼▼
// =================================================================================

const int stepInterval = 500; // 스텝 펄스 간의 최소 간격 (마이크로초, us). 이 값이 작을수록 모터 속도는 빨라집니다.
const int BASE_STEPS = 200; // 수동 모드('Q', 'A' 등)에서 한 번의 명령 당 이동할 기본 스텝 수입니다.
const int STEPS_PER_UPDATE = 1; // 한 번의 'updateSteppers()' 호출 시 발생시킬 스텝 펄스 수. 현재는 1로 설정되어 있습니다.

// =================================================================================
// ▲▲▲ 사용자 설정 영역 끝 ▲▲▲
// =================================================================================

// --- 스텝모터 설정 ---
// 모터 제어 핀 배열 정의 (물리적 연결 순서: B, C, A, D)
const int stepPins[] = {2, 3, 4, 5}; // [B, C, A, D] 순서로 스텝 핀 (펄스 발생 핀) 정의
const int dirPins[]  = {6, 7, 8, 9}; // [B, C, A, D] 순서로 방향 핀 (DIR 핀) 정의
const int motorCount = 4; // 제어할 스텝모터의 총 개수입니다.
long stepsRemaining[motorCount] = {0, 0, 0, 0}; // 각 모터별로 남은 이동 스텝 수를 저장하는 배열. 0보다 클 경우 모터가 작동합니다.
unsigned long lastStepTime[motorCount] = {0, 0, 0, 0}; // 각 모터별로 마지막 스텝 펄스를 발생시킨 시간을 저장합니다. (비동기 제어용)

// --- 상태 저장 변수 ---
String lastAutomatedCommand = "0000"; // 시리얼로 수신된 마지막 4자리 자동화 명령(예: "1023")을 저장합니다. 초기화(역재생) 로직에 사용됩니다.
int lastAutomatedDirection[motorCount] = {LOW, LOW, LOW, LOW}; // 마지막 자동화 명령 시 각 모터의 설정된 방향(HIGH 또는 LOW)을 저장합니다. 초기화 시 '반대' 방향 설정을 위해 사용됩니다. [B, C, A, D]

void setup() {
  Serial.begin(9600); // 시리얼 통신을 9600 보율로 시작합니다. PC와의 명령 송수신에 사용됩니다.
  for (int i = 0; i < motorCount; i++) {
    pinMode(stepPins[i], OUTPUT); // 스텝 핀을 출력 모드로 설정합니다.
    pinMode(dirPins[i], OUTPUT); // 방향 핀을 출력 모드로 설정합니다.
  }
  Serial.println("Arduino Automation FW v2.7 Ready."); // 펌웨어 버전 정보 및 준비 완료 메시지를 출력합니다. (버전 업데이트 반영)
}

void loop() {
  Manual_Mode(); // 시리얼 포트를 통해 수동/자동 명령을 확인하고 처리하는 함수를 호출합니다.
  updateSteppers(); // 각 모터의 남은 스텝(stepsRemaining)을 확인하고, 타이밍에 맞춰 스텝 펄스를 발생시키는 함수를 호출합니다. (비동기 모터 구동)
}

void Manual_Mode() {
  if (Serial.available() > 0) { // 시리얼 포트에 수신된 데이터가 있다면
    String raw_command = Serial.readStringUntil('\n'); // 개행 문자('\n')가 나올 때까지 문자열을 읽어옵니다.
    raw_command.trim(); // 문자열 앞뒤의 공백(white space)을 제거합니다.
    if (raw_command.length() == 0) return; // 빈 문자열이면 함수를 종료합니다.

    char firstChar = raw_command.charAt(0); // 첫 번째 문자를 확인합니다.

    if (firstChar >= '0' && firstChar <= '9') {
      // 첫 글자가 숫자('0'~'9')이면 자동화 명령으로 간주하여 시나리오 모드를 실행합니다.
      Scenario_Mode(raw_command);
    } else if (firstChar == 'P') {
      // 첫 글자가 'P'이면 초기화 명령으로 간주하여 역재생 함수를 실행합니다.
      Initialization_Mode();
    } else {
      // 그 외의 문자(예: 'Q', 'A' 등)는 수동 명령으로 간주하여 수동 제어 함수를 실행합니다.
      executeManualCommand(firstChar);
    }
  }
}

// =================================================================================
// ▼▼▼ [수정] 자동화 명령 해석 함수 (Scenario_Mode) ▼▼▼
// =================================================================================
// 4자리 숫자로 된 자동화 명령(예: "1023")을 해석하여 각 모터의 이동 스텝 수와 방향을 설정합니다.
void Scenario_Mode(String command) {
  if (command.length() != 4) return; // 명령 길이가 4자리가 아니면 무시합니다.

  Serial.print("Auto Command: ");
  Serial.println(command);
  lastAutomatedCommand = command; // 나중에 초기화(P 명령)를 위해 현재 명령을 저장합니다.

  // --- [첫째 자리] 스텝모터 A (배열 인덱스 2) 처리 ---
  char cmdA = command.charAt(0);
  if (cmdA == '0') {
    stepsRemaining[2] = 0; // 정지
  } else if (cmdA == '1') { // 특정 동작 1 (+ 방향)
    digitalWrite(dirPins[2], LOW);
    lastAutomatedDirection[2] = LOW; // 초기화 시 사용될 방향 저장
    stepsRemaining[2] = 1650; // 변경된 스텝 수
  } else if (cmdA == '2') { // 특정 동작 2 (+ 방향)
    digitalWrite(dirPins[2], LOW);
    lastAutomatedDirection[2] = LOW; // 초기화 시 사용될 방향 저장
    stepsRemaining[2] = 3200; // 변경된 스텝 수
  } else if (cmdA == '3') { // 특정 동작 3 (- 방향)
    digitalWrite(dirPins[2], HIGH);
    lastAutomatedDirection[2] = HIGH; // 초기화 시 사용될 방향 저장
    stepsRemaining[2] = 1700; // 변경된 스텝 수
  } else {
    stepsRemaining[2] = 0; // 정의되지 않은 명령일 경우 정지
  }

  // --- [둘째 자리] 스텝모터 B (배열 인덱스 0) 처리 ---
  char cmdB = command.charAt(1);
  if (cmdB == '0') {
    stepsRemaining[0] = 0; // 정지
  } else if (cmdB == '1') { // + 방향
    digitalWrite(dirPins[0], LOW);
    lastAutomatedDirection[0] = LOW; // 방향 저장
    stepsRemaining[0] = 1400;
  } else if (cmdB == '2') { // - 방향
    digitalWrite(dirPins[0], HIGH);
    lastAutomatedDirection[0] = HIGH; // 방향 저장
    stepsRemaining[0] = 1400;
  }

  // --- [셋째 자리] 스텝모터 C (배열 인덱스 1) 처리 ---
  char cmdC = command.charAt(2);
  if (cmdC == '0') {
    stepsRemaining[1] = 0; // 정지
  } else if (cmdC == '1') { // + 방향
    digitalWrite(dirPins[1], HIGH);
    lastAutomatedDirection[1] = HIGH; // 방향 저장
    stepsRemaining[1] = 5000;
  } else if (cmdC == '2') { // - 방향
    digitalWrite(dirPins[1], LOW);
    lastAutomatedDirection[1] = LOW; // 방향 저장
    stepsRemaining[1] = 5000;
  }

  // --- [넷째 자리] 스텝모터 D (배열 인덱스 3) 처리 ---
  char cmdD = command.charAt(3);
  if (cmdD == '0') {
    stepsRemaining[3] = 0; // 정지
  } else if (cmdD == '1') { // 특정 동작 1 (+ 방향)
    digitalWrite(dirPins[3], LOW);
    lastAutomatedDirection[3] = LOW;
    stepsRemaining[3] = 1300; // 변경된 스텝 수
  } else if (cmdD == '2') { // 특정 동작 2 (- 방향)
    digitalWrite(dirPins[3], HIGH);
    lastAutomatedDirection[3] = HIGH;
    stepsRemaining[3] = 1300; // 변경된 스텝 수
  } else {
    stepsRemaining[3] = 0; // 정의되지 않은 명령일 경우 정지
  }
}
// =================================================================================
// ▲▲▲ [수정] 끝 ▲▲▲
// =================================================================================

// =================================================================================
// ▼▼▼ 수동 제어 함수 (executeManualCommand) ▼▼▼
// =================================================================================
// 단일 문자 명령을 받아 해당 모터를 BASE_STEPS만큼 회전시킵니다.
void executeManualCommand(char command) {
  Serial.print("Manual Command: ");
  Serial.println(command);
  switch (command) {
    // 모터 A 제어 (인덱스 2)
    case 'Q': digitalWrite(dirPins[2], HIGH); stepsRemaining[2] += BASE_STEPS; break; // A 모터 (-) 방향
    case 'A': digitalWrite(dirPins[2], LOW);  stepsRemaining[2] += BASE_STEPS; break; // A 모터 (+) 방향
    // 모터 B 제어 (인덱스 0)
    case 'W': digitalWrite(dirPins[0], HIGH); stepsRemaining[0] += BASE_STEPS; break; // B 모터 (-) 방향
    case 'S': digitalWrite(dirPins[0], LOW);  stepsRemaining[0] += BASE_STEPS; break; // B 모터 (+) 방향
    // 모터 C 제어 (인덱스 1)
    case 'E': digitalWrite(dirPins[1], HIGH); stepsRemaining[1] += BASE_STEPS; break; // C 모터 (+) 방향
    case 'D': digitalWrite(dirPins[1], LOW);  stepsRemaining[1] += BASE_STEPS; break; // C 모터 (-) 방향
    // 모터 D 제어 (인덱스 3)
    case 'R': digitalWrite(dirPins[3], HIGH); stepsRemaining[3] += BASE_STEPS; break; // D 모터 (-) 방향
    case 'F': digitalWrite(dirPins[3], LOW);  stepsRemaining[3] += BASE_STEPS; break; // D 모터 (+) 방향
  }
}
// =================================================================================
// ▲▲▲ 수동 제어 함수 끝 ▲▲▲
// =================================================================================

// =================================================================================
// ▼▼▼ [수정] 초기화 함수 (Initialization_Mode) ▼▼▼
// =================================================================================
// 마지막으로 실행된 자동화 명령(lastAutomatedCommand)을 기반으로 정확히 **역방향**으로 **같은 스텝 수**만큼 이동하여 초기 위치로 되돌립니다.
void Initialization_Mode() {
  Serial.print("Running Initialization to reverse command: ");
  Serial.println(lastAutomatedCommand); // 역재생할 자동화 명령을 출력합니다.

  if (lastAutomatedCommand.length() != 4) return; // 유효한 자동화 명령이 없으면 실행하지 않습니다.

  // --- [첫째 자리] 스텝모터 A (인덱스 2) 역방향 처리 ---
  char cmdA = lastAutomatedCommand.charAt(0);
  // **핵심 수정**: 이전에 저장된 방향(lastAutomatedDirection[2])의 '반대' 방향으로 방향 핀을 설정합니다.
  digitalWrite(dirPins[2], !lastAutomatedDirection[2]);
  if (cmdA == '1') {
    stepsRemaining[2] = 1650; // '1' 명령의 스텝 수와 동일
  } else if (cmdA == '2') {
    stepsRemaining[2] = 3200; // '2' 명령의 스텝 수와 동일
  } else if (cmdA == '3') {
    stepsRemaining[2] = 1700; // '3' 명령의 스텝 수와 동일
  } else {
    stepsRemaining[2] = 0; // 정지 명령(0)은 역재생할 필요 없음
  }

  // --- [둘째 자리] 스텝모터 B (인덱스 0) 역방향 처리 ---
  char cmdB = lastAutomatedCommand.charAt(1);
  // **핵심 수정**: 이전에 저장된 방향(lastAutomatedDirection[0])의 '반대' 방향으로 방향 핀을 설정합니다.
  digitalWrite(dirPins[0], !lastAutomatedDirection[0]);
  if (cmdB == '1' || cmdB == '2') {
    stepsRemaining[0] = 1400; // '1' 또는 '2' 명령의 스텝 수와 동일
  } else {
    stepsRemaining[0] = 0;
  }

  // --- [셋째 자리] 스텝모터 C (인덱스 1) 역방향 처리 ---
  char cmdC = lastAutomatedCommand.charAt(2);
  // **핵심 수정**: 이전에 저장된 방향(lastAutomatedDirection[1])의 '반대' 방향으로 방향 핀을 설정합니다.
  digitalWrite(dirPins[1], !lastAutomatedDirection[1]);
  if (cmdC == '1' || cmdC == '2') {
    stepsRemaining[1] = 5000; // '1' 또는 '2' 명령의 스텝 수와 동일
  } else {
    stepsRemaining[1] = 0;
  }

  // --- [넷째 자리] 스텝모터 D (인덱스 3) 역방향 처리 ---
  char cmdD = lastAutomatedCommand.charAt(3);
  // **핵심 수정**: 이전에 저장된 방향(lastAutomatedDirection[3])의 '반대' 방향으로 방향 핀을 설정합니다.
  digitalWrite(dirPins[3], !lastAutomatedDirection[3]);
  if (cmdD == '1' || cmdD == '2') {
    stepsRemaining[3] = 1300; // '1' 또는 '2' 명령의 스텝 수와 동일
  } else {
    stepsRemaining[3] = 0;
  }
}
// =================================================================================
// ▲▲▲ [수정] 끝 ▲▲▲
// =================================================================================

// 스텝모터를 비동기적으로 구동하는 함수
void updateSteppers() {
  unsigned long currentTime = micros(); // 현재 시간을 마이크로초 단위로 가져옵니다.
  for (int i = 0; i < motorCount; i++) {
    // 1. 남은 스텝이 0보다 크고 (이동할 거리가 있고)
    // 2. 마지막 스텝 펄스 발생 시간으로부터 stepInterval만큼의 시간이 지났다면
    if (stepsRemaining[i] > 0 && (currentTime - lastStepTime[i] >= stepInterval)) {
      // STEPS_PER_UPDATE 횟수만큼 스텝 펄스를 발생시킵니다.
      for (int s = 0; s < STEPS_PER_UPDATE; s++) {
        if (stepsRemaining[i] <= 0) break; // 스텝 수가 0이 되면 루프를 종료합니다.
        
        digitalWrite(stepPins[i], HIGH); // 스텝 펄스를 High로 설정합니다.
        digitalWrite(stepPins[i], LOW);  // 스텝 펄스를 Low로 설정합니다. (스텝 펄스 발생)
        
        stepsRemaining[i]--; // 남은 스텝 수를 1 감소시킵니다.
      }
      lastStepTime[i] = currentTime; // 마지막 스텝 발생 시간을 현재 시간으로 갱신합니다.
    }
  }
}
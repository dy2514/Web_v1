// 펌웨어 버전: v1.3

// 설정 파라미터
const int stepInterval = 500;
const int CALIBRATION_STEP_UNIT = 50;
const int STEPS_PER_UPDATE = 1;

// 모터 제어 핀 (B, C, A, D 순서)
const int stepPins[] = {2, 3, 4, 5};
const int dirPins[] = {6, 7, 8, 9};
const int motorCount = 4;
long stepsRemaining[motorCount] = {0, 0, 0, 0};
unsigned long lastStepTime[motorCount] = {0, 0, 0, 0};

// 위치 기록 변수
long motor_B_Position = 0;
long motor_C_Position = 0;
long motor_A_Position = 0;
long motor_D_Position = 0;

void setup() {
  Serial.begin(9600);
  for (int i = 0; i < motorCount; i++) {
    pinMode(stepPins[i], OUTPUT);
    pinMode(dirPins[i], OUTPUT);
  }
  Serial.println("ReadyForCalibration_v1.3");
}

void loop() {
  handleSerialCommands();
  updateSteppers();
}

// 현재 모터 위치 출력
void printPositions() {
  char buffer[70];
  sprintf(buffer, "   좌표 -> [ A: %5ld | B: %5ld | C: %5ld | D: %5ld ]",
           motor_A_Position, motor_B_Position, motor_C_Position, motor_D_Position);
  Serial.print(buffer);
}

// 시리얼 명령 처리
void handleSerialCommands() {
  if (Serial.available() > 0) {
    delay(2);
    String raw_command = Serial.readStringUntil('\n');
    raw_command.trim();
    if (raw_command.length() == 0) return;

    char command = raw_command.charAt(0);

    if (command == 'z') {
      // 원점 설정
      motor_A_Position = 0; motor_B_Position = 0; motor_C_Position = 0; motor_D_Position = 0;
      for(int i=0; i<motorCount; i++) { stepsRemaining[i] = 0; }
    } else {
      switch (command) {
        // Motor A (Index 2)
        case 'q':
          digitalWrite(dirPins[2], HIGH);
          stepsRemaining[2] += CALIBRATION_STEP_UNIT;
          motor_A_Position -= CALIBRATION_STEP_UNIT;
          break;
        case 'a':
          digitalWrite(dirPins[2], LOW);
          stepsRemaining[2] += CALIBRATION_STEP_UNIT;
          motor_A_Position += CALIBRATION_STEP_UNIT;
          break;

        // Motor B (Index 0)
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

        // Motor C (Index 1)
        case 'e':
          digitalWrite(dirPins[1], HIGH);
          stepsRemaining[1] += CALIBRATION_STEP_UNIT;
          motor_C_Position += CALIBRATION_STEP_UNIT;
          break;
        case 'd':
          digitalWrite(dirPins[1], LOW);
          stepsRemaining[1] += CALIBRATION_STEP_UNIT;
          motor_C_Position -= CALIBRATION_STEP_UNIT;
          break;

        // Motor D (Index 3)
        case 'r':
          digitalWrite(dirPins[3], HIGH);
          stepsRemaining[3] += CALIBRATION_STEP_UNIT;
          motor_D_Position -= CALIBRATION_STEP_UNIT;
          break;
        case 'f':
          digitalWrite(dirPins[3], LOW);
          stepsRemaining[3] += CALIBRATION_STEP_UNIT;
          motor_D_Position += CALIBRATION_STEP_UNIT;
          break;
      }
    }
    printPositions();
    Serial.println();
  }
}

// 스텝모터 비동기 구동
void updateSteppers() {
  unsigned long currentTime = micros();
  for (int i = 0; i < motorCount; i++) {
    if (stepsRemaining[i] > 0 && (currentTime - lastStepTime[i] >= stepInterval)) {
      for (int s = 0; s < STEPS_PER_UPDATE; s++) {
        if (stepsRemaining[i] <= 0) break;
        digitalWrite(stepPins[i], HIGH);
        digitalWrite(stepPins[i], LOW);
        stepsRemaining[i]--;
      }
      lastStepTime[i] = currentTime;
    }
  }
}
// 펌웨어 버전: v2.7

// 설정 파라미터
const int stepInterval = 500;
const int BASE_STEPS = 200;
const int STEPS_PER_UPDATE = 1;

// 모터 제어 핀 (B, C, A, D 순서)
const int stepPins[] = {2, 3, 4, 5};
const int dirPins[]  = {6, 7, 8, 9};
const int motorCount = 4;
long stepsRemaining[motorCount] = {0, 0, 0, 0};
unsigned long lastStepTime[motorCount] = {0, 0, 0, 0};

// 상태 저장 변수
String lastAutomatedCommand = "0000";
int lastAutomatedDirection[motorCount] = {LOW, LOW, LOW, LOW};

void setup() {
  Serial.begin(9600);
  for (int i = 0; i < motorCount; i++) {
    pinMode(stepPins[i], OUTPUT);
    pinMode(dirPins[i], OUTPUT);
  }
  Serial.println("Arduino Automation FW v2.7 Ready.");
}

void loop() {
  Manual_Mode();
  updateSteppers();
}

void Manual_Mode() {
  if (Serial.available() > 0) {
    String raw_command = Serial.readStringUntil('\n');
    raw_command.trim();
    if (raw_command.length() == 0) return;

    char firstChar = raw_command.charAt(0);

    if (firstChar >= '0' && firstChar <= '9') {
      Scenario_Mode(raw_command);
    } else if (firstChar == 'P') {
      Initialization_Mode();
    } else {
      executeManualCommand(firstChar);
    }
  }
}

// 자동화 명령 처리 (4자리 숫자)
void Scenario_Mode(String command) {
  if (command.length() != 4) return;

  Serial.print("Auto Command: ");
  Serial.println(command);
  lastAutomatedCommand = command;

  // 모터 A (인덱스 2)
  char cmdA = command.charAt(0);
  if (cmdA == '0') {
    stepsRemaining[2] = 0;
  } else if (cmdA == '1') {
    digitalWrite(dirPins[2], LOW);
    lastAutomatedDirection[2] = LOW;
    stepsRemaining[2] = 1650;
  } else if (cmdA == '2') {
    digitalWrite(dirPins[2], LOW);
    lastAutomatedDirection[2] = LOW;
    stepsRemaining[2] = 3200;
  } else if (cmdA == '3') {
    digitalWrite(dirPins[2], HIGH);
    lastAutomatedDirection[2] = HIGH;
    stepsRemaining[2] = 1700;
  } else {
    stepsRemaining[2] = 0;
  }

  // 모터 B (인덱스 0)
  char cmdB = command.charAt(1);
  if (cmdB == '0') {
    stepsRemaining[0] = 0;
  } else if (cmdB == '1') {
    digitalWrite(dirPins[0], LOW);
    lastAutomatedDirection[0] = LOW;
    stepsRemaining[0] = 1400;
  } else if (cmdB == '2') {
    digitalWrite(dirPins[0], HIGH);
    lastAutomatedDirection[0] = HIGH;
    stepsRemaining[0] = 1400;
  }

  // 모터 C (인덱스 1)
  char cmdC = command.charAt(2);
  if (cmdC == '0') {
    stepsRemaining[1] = 0;
  } else if (cmdC == '1') {
    digitalWrite(dirPins[1], HIGH);
    lastAutomatedDirection[1] = HIGH;
    stepsRemaining[1] = 5000;
  } else if (cmdC == '2') {
    digitalWrite(dirPins[1], LOW);
    lastAutomatedDirection[1] = LOW;
    stepsRemaining[1] = 5000;
  }

  // 모터 D (인덱스 3)
  char cmdD = command.charAt(3);
  if (cmdD == '0') {
    stepsRemaining[3] = 0;
  } else if (cmdD == '1') {
    digitalWrite(dirPins[3], LOW);
    lastAutomatedDirection[3] = LOW;
    stepsRemaining[3] = 1300;
  } else if (cmdD == '2') {
    digitalWrite(dirPins[3], HIGH);
    lastAutomatedDirection[3] = HIGH;
    stepsRemaining[3] = 1300;
  } else {
    stepsRemaining[3] = 0;
  }
}

// 수동 제어 (단일 문자 명령)
void executeManualCommand(char command) {
  Serial.print("Manual Command: ");
  Serial.println(command);
  switch (command) {
    case 'Q': digitalWrite(dirPins[2], HIGH); stepsRemaining[2] += BASE_STEPS; break; // A 모터 (-)
    case 'A': digitalWrite(dirPins[2], LOW);  stepsRemaining[2] += BASE_STEPS; break; // A 모터 (+)
    case 'W': digitalWrite(dirPins[0], HIGH); stepsRemaining[0] += BASE_STEPS; break; // B 모터 (-)
    case 'S': digitalWrite(dirPins[0], LOW);  stepsRemaining[0] += BASE_STEPS; break; // B 모터 (+)
    case 'E': digitalWrite(dirPins[1], HIGH); stepsRemaining[1] += BASE_STEPS; break; // C 모터 (+)
    case 'D': digitalWrite(dirPins[1], LOW);  stepsRemaining[1] += BASE_STEPS; break; // C 모터 (-)
    case 'R': digitalWrite(dirPins[3], HIGH); stepsRemaining[3] += BASE_STEPS; break; // D 모터 (-)
    case 'F': digitalWrite(dirPins[3], LOW);  stepsRemaining[3] += BASE_STEPS; break; // D 모터 (+)
  }
}

// 초기화 (마지막 자동화 명령 역재생)
void Initialization_Mode() {
  Serial.print("Running Initialization to reverse command: ");
  Serial.println(lastAutomatedCommand);

  if (lastAutomatedCommand.length() != 4) return;

  // 모터 A (인덱스 2) 역방향
  char cmdA = lastAutomatedCommand.charAt(0);
  digitalWrite(dirPins[2], !lastAutomatedDirection[2]);
  if (cmdA == '1') {
    stepsRemaining[2] = 1650;
  } else if (cmdA == '2') {
    stepsRemaining[2] = 3200;
  } else if (cmdA == '3') {
    stepsRemaining[2] = 1700;
  } else {
    stepsRemaining[2] = 0;
  }

  // 모터 B (인덱스 0) 역방향
  char cmdB = lastAutomatedCommand.charAt(1);
  digitalWrite(dirPins[0], !lastAutomatedDirection[0]);
  if (cmdB == '1' || cmdB == '2') {
    stepsRemaining[0] = 1400;
  } else {
    stepsRemaining[0] = 0;
  }

  // 모터 C (인덱스 1) 역방향
  char cmdC = lastAutomatedCommand.charAt(2);
  digitalWrite(dirPins[1], !lastAutomatedDirection[1]);
  if (cmdC == '1' || cmdC == '2') {
    stepsRemaining[1] = 5000;
  } else {
    stepsRemaining[1] = 0;
  }

  // 모터 D (인덱스 3) 역방향
  char cmdD = lastAutomatedCommand.charAt(3);
  digitalWrite(dirPins[3], !lastAutomatedDirection[3]);
  if (cmdD == '1' || cmdD == '2') {
    stepsRemaining[3] = 1300;
  } else {
    stepsRemaining[3] = 0;
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
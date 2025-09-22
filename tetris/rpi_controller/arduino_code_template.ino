// TETRIS 하드웨어 제어 아두이노 코드
// Arduino Code for TETRIS Hardware Control

#include <Servo.h>
#include <Stepper.h>

// 핀 정의
const int MOTOR_STEP_PIN = 2;
const int MOTOR_DIR_PIN = 3;
const int MOTOR_ENABLE_PIN = 4;
const int LED_PIN = 13;
const int TRIGGER_PIN = 8;
const int ECHO_PIN = 9;
const int SERVO_PIN = 10;

// 하드웨어 객체
Stepper stepper(200, MOTOR_STEP_PIN, MOTOR_DIR_PIN);
Servo servo;

// 전역 변수
bool motorEnabled = false;
int currentPosition = 0;
String inputString = "";
bool stringComplete = false;

void setup() {
  // 시리얼 통신 초기화
  Serial.begin(9600);
  inputString.reserve(200);
  
  // 핀 모드 설정
  pinMode(MOTOR_ENABLE_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(TRIGGER_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  
  // 초기 상태 설정
  digitalWrite(MOTOR_ENABLE_PIN, HIGH);  // 모터 비활성화
  digitalWrite(LED_PIN, LOW);
  
  // 서보 모터 초기화
  servo.attach(SERVO_PIN);
  servo.write(90);  // 중앙 위치
  
  // 스테퍼 모터 초기화
  stepper.setSpeed(100);
  
  Serial.println("ARDUINO_READY");
}

void loop() {
  // 시리얼 명령 처리
  if (stringComplete) {
    processCommand(inputString);
    inputString = "";
    stringComplete = false;
  }
  
  // 주기적 상태 업데이트 (5초마다)
  static unsigned long lastStatusTime = 0;
  if (millis() - lastStatusTime > 5000) {
    sendStatus();
    lastStatusTime = millis();
  }
}

void serialEvent() {
  while (Serial.available()) {
    char inChar = (char)Serial.read();
    inputString += inChar;
    if (inChar == '\n') {
      stringComplete = true;
    }
  }
}

void processCommand(String command) {
  // 명령어 파싱
  if (command.indexOf("MOTOR_ENABLE") >= 0) {
    motorEnable();
  }
  else if (command.indexOf("MOTOR_DISABLE") >= 0) {
    motorDisable();
  }
  else if (command.indexOf("MOTOR_MOVE") >= 0) {
    motorMove(command);
  }
  else if (command.indexOf("MOTOR_STOP") >= 0) {
    motorStop();
  }
  else if (command.indexOf("SENSOR_READ") >= 0) {
    readSensor(command);
  }
  else if (command.indexOf("LED_ON") >= 0) {
    ledControl(true);
  }
  else if (command.indexOf("LED_OFF") >= 0) {
    ledControl(false);
  }
  else if (command.indexOf("STATUS_CHECK") >= 0) {
    sendStatus();
  }
  else if (command.indexOf("RESET") >= 0) {
    resetArduino();
  }
  else {
    Serial.println("ERROR:UNKNOWN_COMMAND");
  }
}

void motorEnable() {
  digitalWrite(MOTOR_ENABLE_PIN, LOW);  // 모터 활성화
  motorEnabled = true;
  Serial.println("OK:MOTOR_ENABLED");
}

void motorDisable() {
  digitalWrite(MOTOR_ENABLE_PIN, HIGH);  // 모터 비활성화
  motorEnabled = false;
  Serial.println("OK:MOTOR_DISABLED");
}

void motorMove(String command) {
  if (!motorEnabled) {
    Serial.println("ERROR:MOTOR_NOT_ENABLED");
    return;
  }
  
  // JSON 파라미터 파싱
  int jsonStart = command.indexOf('{');
  if (jsonStart >= 0) {
    String jsonStr = command.substring(jsonStart);
    
    // 간단한 JSON 파싱 (실제로는 JSON 라이브러리 사용 권장)
    int direction = 0;
    int steps = 0;
    int speed = 100;
    
    // direction 추출
    int dirIndex = jsonStr.indexOf("\"direction\":");
    if (dirIndex >= 0) {
      direction = jsonStr.substring(dirIndex + 12).toInt();
    }
    
    // steps 추출
    int stepsIndex = jsonStr.indexOf("\"steps\":");
    if (stepsIndex >= 0) {
      steps = jsonStr.substring(stepsIndex + 8).toInt();
    }
    
    // speed 추출
    int speedIndex = jsonStr.indexOf("\"speed\":");
    if (speedIndex >= 0) {
      speed = jsonStr.substring(speedIndex + 8).toInt();
    }
    
    // 모터 제어
    stepper.setSpeed(speed);
    if (direction == 1) {
      stepper.step(steps);
      currentPosition += steps;
    } else {
      stepper.step(-steps);
      currentPosition -= steps;
    }
    
    Serial.println("OK:MOTOR_MOVED");
  } else {
    Serial.println("ERROR:INVALID_JSON");
  }
}

void motorStop() {
  // 모터 정지 (하드웨어적으로는 계속 동작하지만 위치 기록)
  Serial.println("OK:MOTOR_STOPPED");
}

void readSensor(String command) {
  // 센서 타입 확인
  String sensorType = "ultrasonic";
  int typeIndex = command.indexOf("\"sensor_type\":");
  if (typeIndex >= 0) {
    int start = command.indexOf("\"", typeIndex + 14) + 1;
    int end = command.indexOf("\"", start);
    sensorType = command.substring(start, end);
  }
  
  float value = 0.0;
  
  if (sensorType == "ultrasonic") {
    value = readUltrasonic();
  } else if (sensorType == "temperature") {
    value = readTemperature();
  } else if (sensorType == "pressure") {
    value = readPressure();
  }
  
  Serial.print("SENSOR_VALUE:");
  Serial.println(value);
}

float readUltrasonic() {
  digitalWrite(TRIGGER_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIGGER_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIGGER_PIN, LOW);
  
  long duration = pulseIn(ECHO_PIN, HIGH);
  float distance = duration * 0.034 / 2;
  
  return distance;
}

float readTemperature() {
  // 온도 센서 읽기 (예: LM35)
  int sensorValue = analogRead(A0);
  float voltage = sensorValue * (5.0 / 1023.0);
  float temperature = voltage * 100;  // LM35는 10mV/°C
  
  return temperature;
}

float readPressure() {
  // 압력 센서 읽기 (예: MPX5700)
  int sensorValue = analogRead(A1);
  float voltage = sensorValue * (5.0 / 1023.0);
  float pressure = (voltage - 0.2) * 50;  // 0.2V 오프셋, 50kPa/V
  
  return pressure;
}

void ledControl(bool state) {
  digitalWrite(LED_PIN, state ? HIGH : LOW);
  Serial.print("OK:LED_");
  Serial.println(state ? "ON" : "OFF");
}

void sendStatus() {
  Serial.print("STATUS:{\"motor_enabled\":");
  Serial.print(motorEnabled ? "true" : "false");
  Serial.print(",\"position\":");
  Serial.print(currentPosition);
  Serial.print(",\"ultrasonic\":");
  Serial.print(readUltrasonic());
  Serial.print(",\"temperature\":");
  Serial.print(readTemperature());
  Serial.println("}");
}

void resetArduino() {
  Serial.println("OK:RESETTING");
  delay(1000);
  // 소프트웨어 리셋
  asm volatile ("  jmp 0");
}

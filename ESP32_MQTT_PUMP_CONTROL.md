# ESP32 Smart Irrigation - Complete Code

Upload this complete code to your ESP32.

```cpp
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include "DHT.h"
#include <OneWire.h>
#include <DallasTemperature.h>

// ---------------- WIFI ----------------
const char* ssid = "S.Thurairatnam";
const char* password = "0212227346";

// ---------------- MQTT ----------------
const char* mqtt_server = "7744fd3022de42109b7bf3120b20c7a2.s1.eu.hivemq.cloud";
const int mqtt_port = 8883;
const char* mqtt_username = "mithu-iot";
const char* mqtt_password = "Mithu@1202";

// ---------------- CLIENT ----------------
WiFiClientSecure espClient;
PubSubClient client(espClient);

// ---------------- PINS ----------------
#define SOIL_PIN 34
#define DHTPIN 4
#define DHTTYPE DHT22
#define RELAY_PIN 26
#define ONE_WIRE_BUS 15

// ---------------- SENSORS ----------------
DHT dht(DHTPIN, DHTTYPE);
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// ---------------- CALIBRATION (for soil moisture %) ----------------
const int DRY_VALUE = 4095;   // ADC when dry (0%)
const int WET_VALUE = 1500;   // ADC when wet (100%)

// ---------------- THRESHOLDS ----------------
#define DRY_THRESHOLD 30      // Moisture % below this = needs water
#define TEMP_THRESHOLD 30
#define HUM_THRESHOLD 50

// ---------------- CONTROL MODE ----------------
bool manualMode = false;
bool manualPumpState = false;

// ---------------- CONVERT TO PERCENT ----------------
int convertMoistureToPercent(int rawValue) {
  int percent = map(rawValue, DRY_VALUE, WET_VALUE, 0, 100);
  return constrain(percent, 0, 100);
}

// ---------------- WIFI ----------------
void setup_wifi() {
  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected");
}

// ---------------- MQTT CALLBACK ----------------
void callback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.print("📩 MQTT: ");
  Serial.println(message);

  if (message == "ON") {
    manualMode = true;
    manualPumpState = true;
    Serial.println("✅ Manual: Pump ON");
  } 
  else if (message == "OFF") {
    manualMode = true;
    manualPumpState = false;
    Serial.println("✅ Manual: Pump OFF");
  } 
  else if (message == "AUTO") {
    manualMode = false;
    Serial.println("✅ AUTO mode");
  }
}

// ---------------- MQTT RECONNECT ----------------
void reconnect() {
  while (!client.connected()) {
    Serial.print("MQTT connecting...");
    String clientId = "ESP32-" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str(), mqtt_username, mqtt_password)) {
      Serial.println("✅ Connected");
      client.subscribe("smart_irrigation/control");
    } else {
      Serial.println(" retry in 5s");
      delay(5000);
    }
  }
}

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);  // OFF
  dht.begin();
  sensors.begin();
  setup_wifi();
  espClient.setInsecure();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

// ---------------- LOOP ----------------
void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  // --- READINGS ---
  int soilRaw = analogRead(SOIL_PIN);
  int soilPercent = convertMoistureToPercent(soilRaw);
  float airTemp = dht.readTemperature();
  float humidity = dht.readHumidity();
  sensors.requestTemperatures();
  float soilTemp = sensors.getTempCByIndex(0);

  if (isnan(airTemp) || isnan(humidity)) {
    Serial.println("⚠️ DHT ERROR");
    delay(2000);
    return;
  }
  if (soilTemp < -100) soilTemp = 0;

  bool pumpState = false;

  // --- CONTROL ---
  if (manualMode) {
    pumpState = manualPumpState;
  } else {
    // AUTO: pump ON if dry AND (hot OR low humidity)
    if (soilPercent < DRY_THRESHOLD && (airTemp > TEMP_THRESHOLD || humidity < HUM_THRESHOLD)) {
      pumpState = true;
    }
  }

  // --- RELAY ---
  static bool lastPumpState = false;
  if (pumpState != lastPumpState) {
    digitalWrite(RELAY_PIN, pumpState ? LOW : HIGH);
    Serial.println(pumpState ? "🚿 Pump ON" : "⏹️ Pump OFF");
    lastPumpState = pumpState;
  }

  // --- DEBUG ---
  Serial.printf("Mode:%s | Moisture:%d%% | Temp:%.1f°C | Hum:%.1f%% | Pump:%s\n",
    manualMode ? "MANUAL" : "AUTO", soilPercent, airTemp, humidity, pumpState ? "ON" : "OFF");

  // --- SEND DATA ---
  String payload = "{";
  payload += "\"device_id\":\"ESP32_001\",";
  payload += "\"soil_moisture\":" + String(soilPercent) + ",";
  payload += "\"temperature\":" + String(airTemp) + ",";
  payload += "\"humidity\":" + String(humidity) + ",";
  payload += "\"soil_temp\":" + String(soilTemp) + ",";
  payload += "\"mode\":\"" + String(manualMode ? "MANUAL" : "AUTO") + "\",";
  payload += "\"pump_status\":\"" + String(pumpState ? "ON" : "OFF") + "\"";
  payload += "}";
  client.publish("smart_irrigation/data", payload.c_str());

  delay(2000);
}
```

## Key Changes from Your Version

| Your Code | Updated Code |
|-----------|-------------|
| `soil_moisture: 3216` (raw ADC) | `soil_moisture: 34` (percentage 0-100%) |
| `DRY_THRESHOLD 2800` (raw) | `DRY_THRESHOLD 30` (30% moisture) |
| No conversion function | `convertMoistureToPercent()` added |

## Calibration

1. Sensor in **dry air** → raw value ≈ 4095 → 0%
2. Sensor in **water** → raw value ≈ 1500 → 100%

Adjust `DRY_VALUE` and `WET_VALUE` if needed.

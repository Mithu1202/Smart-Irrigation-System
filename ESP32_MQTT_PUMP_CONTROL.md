# ESP32 MQTT Pump Control Integration

Add this code to your ESP32 to receive pump commands from the web dashboard.

## Subscribe to Control Topic

Add this in your `setup()` after MQTT connection:

```cpp
// Subscribe to control topic for this device
String controlTopic = "smart_irrigation/control/" + String(device_id);
client.subscribe(controlTopic.c_str());
Serial.println("Subscribed to: " + controlTopic);
```

## Handle Incoming Messages

Add this callback function:

```cpp
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Convert payload to string
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.println("Received message on topic: " + String(topic));
  Serial.println("Message: " + message);
  
  // Parse JSON
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, message);
  
  if (error) {
    Serial.println("JSON parse error");
    return;
  }
  
  // Check if it's a pump command
  const char* command = doc["command"];
  if (strcmp(command, "pump") == 0) {
    const char* state = doc["state"];
    
    if (strcmp(state, "ON") == 0) {
      digitalWrite(PUMP_RELAY_PIN, HIGH);
      pumpStatus = "ON";
      Serial.println("Pump turned ON via dashboard");
    } else {
      digitalWrite(PUMP_RELAY_PIN, LOW);
      pumpStatus = "OFF";
      Serial.println("Pump turned OFF via dashboard");
    }
  }
}
```

## Set Callback in Setup

```cpp
void setup() {
  // ... existing setup code ...
  
  // Set MQTT callback
  client.setCallback(mqttCallback);
  
  // ... rest of setup ...
}
```

## Message Format from Server

The server sends commands in this JSON format:

```json
{
  "command": "pump",
  "state": "ON",  // or "OFF"
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Topic Structure

- **Data Topic (publish)**: `smart_irrigation/data`
- **Control Topic (subscribe)**: `smart_irrigation/control/ESP32_001`

Replace `ESP32_001` with your device ID.

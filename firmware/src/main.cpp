#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <esp_system.h>
#include "wifi_credentials.h"

// Board profile assumption: classic ESP32-WROOM-32 DevKit (PlatformIO: esp32dev).
// This allowlist is not universal across ESP32 boards. Confirm the exact board/module
// pinout and relay module polarity before wiring or connecting loads. Software cannot
// guarantee relay OFF during reset/boot: external biasing and/or a hardware enable
// interlock that defaults disabled is required for a fail-safe design.
// This conservative list excludes
// flash pins 6-11, input-only pins 34-39, boot strapping pins, UART0, and onboard LED ambiguity.
static constexpr uint8_t CHANNELS = 6;
static const uint8_t ALLOWED_GPIOS[] = {16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33};
static const uint8_t ALLOWED_COUNT = sizeof(ALLOWED_GPIOS);
static const uint8_t DEFAULT_GPIOS[CHANNELS] = {16, 17, 18, 19, 21, 22};
static constexpr bool ACTIVE_HIGH = true;
static constexpr char* FW_VERSION = (char*)"NEXUS-2810-Alpha-2.0.0";

WebServer server(80);
Preferences prefs;
uint8_t activeGpios[CHANNELS];
uint8_t stagedGpios[CHANNELS];
bool staged = false;
bool relayStates[CHANNELS] = {false, false, false, false, false, false};
bool commandPending = false;
uint32_t revision = 1;

bool supported(uint8_t pin) { for (uint8_t p : ALLOWED_GPIOS) if (pin == p) return true; return false; }
bool validMapping(const uint8_t* pins) {
  for (uint8_t i = 0; i < CHANNELS; ++i) {
    if (!supported(pins[i])) return false;
    for (uint8_t j = 0; j < i; ++j) if (pins[i] == pins[j]) return false;
  }
  return true;
}
const char* resetReasonName(esp_reset_reason_t reason) {
  switch (reason) {
    case ESP_RST_POWERON: return "power-on";
    case ESP_RST_EXT: return "external";
    case ESP_RST_SW: return "software";
    case ESP_RST_PANIC: return "panic";
    case ESP_RST_INT_WDT: return "interrupt watchdog";
    case ESP_RST_TASK_WDT: return "task watchdog";
    case ESP_RST_WDT: return "watchdog";
    case ESP_RST_DEEPSLEEP: return "deep sleep";
    case ESP_RST_BROWNOUT: return "brownout";
    default: return "unknown/other";
  }
}
void setOff(uint8_t pin) { digitalWrite(pin, ACTIVE_HIGH ? LOW : HIGH); }
void setOn(uint8_t pin) { digitalWrite(pin, ACTIVE_HIGH ? HIGH : LOW); }
void writeChannel(uint8_t id, bool on) { if (on) setOn(activeGpios[id]); else setOff(activeGpios[id]); relayStates[id] = on; }
void jsonError(int code, const char* message) { StaticJsonDocument<192> doc; doc["success"] = false; doc["error"] = message; String body; serializeJson(doc, body); server.send(code, "application/json", body); }
void sendJson(JsonDocument& doc, int code=200) { String body; serializeJson(doc, body); server.send(code, "application/json", body); }

void configJson(JsonDocument& doc) {
  doc["board"] = "ESP32-WROOM-32 DevKit (esp32dev profile; verify exact board)";
  doc["polarity"] = "ACTIVE_HIGH";
  JsonArray pins = doc["supportedGpios"].to<JsonArray>(); for (uint8_t pin : ALLOWED_GPIOS) pins.add(pin);
  JsonArray active = doc["activeGpios"].to<JsonArray>(); JsonArray channels = doc["channels"].to<JsonArray>();
  for (uint8_t i=0; i<CHANNELS; ++i) { active.add(activeGpios[i]); JsonObject item=channels.add<JsonObject>(); item["id"]=i+1; item["gpio"]=activeGpios[i]; }
  if (staged) { JsonArray pending = doc["stagedGpios"].to<JsonArray>(); for (uint8_t pin : stagedGpios) pending.add(pin); } else doc["stagedGpios"] = nullptr;
  bool off=true; for (bool state : relayStates) if (state) off=false;
  doc["allRelaysOff"] = off; doc["commandPending"] = commandPending;
  // Compatibility field: this is software command bookkeeping only, not relay/load feedback.
  doc["stateCertain"] = true;
}

void handleStatus() {
  StaticJsonDocument<512> doc; doc["revision"]=revision; JsonArray relays=doc["relays"].to<JsonArray>();
  for (uint8_t i=0;i<CHANNELS;++i) { JsonObject relay=relays.add<JsonObject>(); relay["id"]=i+1; relay["state"]=relayStates[i]; }
  doc["uptimeSeconds"]=millis()/1000; doc["wifiRssi"]=WiFi.RSSI(); doc["freeHeap"]=ESP.getFreeHeap(); sendJson(doc);
}
void handleRelay() {
  if (!server.hasArg("plain")) return jsonError(400,"Missing JSON body");
  const String prefix="/api/v1/relays/"; const int id=server.uri().substring(prefix.length()).toInt(); StaticJsonDocument<96> body;
  if (deserializeJson(body,server.arg("plain")) || !body["state"].is<bool>()) return jsonError(400,"Expected JSON boolean state");
  if (id<1 || id>CHANNELS) return jsonError(400,"channelId must be 1 through 6");
  commandPending=true; writeChannel(id-1,body["state"].as<bool>()); ++revision; commandPending=false;
  StaticJsonDocument<160> out; out["success"]=true; out["channelId"]=id; out["state"]=relayStates[id-1]; out["revision"]=revision; sendJson(out);
}
void handleAll() {
  if (!server.hasArg("plain")) return jsonError(400,"Missing JSON body");
  StaticJsonDocument<96> body; if (deserializeJson(body,server.arg("plain")) || !body["state"].is<bool>()) return jsonError(400,"Expected JSON boolean state");
  commandPending=true; for (uint8_t i=0;i<CHANNELS;++i) writeChannel(i,body["state"].as<bool>()); ++revision; commandPending=false;
  StaticJsonDocument<128> out; out["success"]=true; out["state"]=body["state"].as<bool>(); out["revision"]=revision; sendJson(out);
}
void handleSaveMapping() {
  if (!server.hasArg("plain")) return jsonError(400,"Missing JSON body");
  StaticJsonDocument<512> body; if (deserializeJson(body,server.arg("plain"))) return jsonError(400,"Malformed JSON");
  JsonArray channels=body["channels"].as<JsonArray>(); if (channels.isNull() || channels.size()!=CHANNELS) return jsonError(400,"channels must contain exactly six entries");
  uint8_t proposal[CHANNELS]; bool seenIds[CHANNELS]={false}; bool seenPins[40]={false};
  for (JsonObject ch : channels) {
    if (ch.isNull() || !ch["id"].is<int>() || !ch["gpio"].is<int>()) return jsonError(400,"Each channel requires integer id and gpio");
    int rawId=ch["id"].as<int>(), rawPin=ch["gpio"].as<int>();
    if(rawId<1 || rawId>CHANNELS) return jsonError(400,"Channel IDs must be unique values 1 through 6");
    if(rawPin<0 || rawPin>39) return jsonError(422,"GPIO is unsupported by this board profile");
    uint8_t id=(uint8_t)rawId, pin=(uint8_t)rawPin;
    if(seenIds[id-1]) return jsonError(400,"Channel IDs must be unique values 1 through 6");
    if (!supported(pin)) return jsonError(422,"GPIO is unsupported by this board profile");
    if(seenPins[pin]) return jsonError(422,"GPIO assignments must be unique");
    seenPins[pin]=true;
    proposal[id-1]=pin; seenIds[id-1]=true;
  }
  for(uint8_t i=0;i<CHANNELS;++i) if(!seenIds[i]) return jsonError(400,"Channel IDs must contain every value from 1 through 6");
  memcpy(stagedGpios,proposal,CHANNELS); staged=true; StaticJsonDocument<512> out; configJson(out); sendJson(out);
}
void handleApplyMapping() {
  bool off=true; for(bool s:relayStates) if(s) off=false;
  if(commandPending || !off) return jsonError(409,"Cannot apply mapping: command pending or a commanded relay is ON");
  if(!staged) return jsonError(409,"No validated staged mapping");
  // Persist first so a failed NVS write leaves the current runtime mapping untouched.
  if(prefs.putBytes("gpios",stagedGpios,CHANNELS)!=CHANNELS) return jsonError(500,"Could not persist relay mapping");
  // Set the output latch to the OFF level before OUTPUT mode. Keep pins shared with the
  // old mapping configured; release only pins absent from the complete new mapping.
  for(uint8_t pin:stagedGpios) {
    bool wasActive=false; for(uint8_t oldPin:activeGpios) if(pin==oldPin) wasActive=true;
    if(!wasActive) { setOff(pin); pinMode(pin,OUTPUT); }
    else setOff(pin);
  }
  for(uint8_t oldPin:activeGpios) {
    bool remains=false; for(uint8_t newPin:stagedGpios) if(oldPin==newPin) remains=true;
    if(!remains) pinMode(oldPin,INPUT);
  }
  memcpy(activeGpios,stagedGpios,CHANNELS);
  staged=false; ++revision;
  StaticJsonDocument<512> out; configJson(out); sendJson(out);
}
void handleAppConfig() {
  if(server.method()==HTTP_GET) {
    StaticJsonDocument<512> d; d["deviceName"]="NEXUS-2810-Alpha-ESP32";
    JsonObject names=d["names"].to<JsonObject>(); JsonObject rooms=d["rooms"].to<JsonObject>();
    const char* defaultNames[]={"Bedroom Light","Ceiling Fan","Study Lamp","Living Room Light","Power Outlet","Spare Channel"};
    const char* defaultRooms[]={"Master Bedroom","Master Bedroom","Office","Living Room","Kitchen","Utility"};
    for(uint8_t i=0;i<CHANNELS;++i){ names[String(i+1)]=defaultNames[i]; rooms[String(i+1)]=defaultRooms[i]; }
    sendJson(d); return;
  }
  if(!server.hasArg("plain")) return jsonError(400,"Missing JSON body");
  StaticJsonDocument<512> parsed; if(deserializeJson(parsed,server.arg("plain")) || !parsed["deviceName"].is<const char*>()) return jsonError(400,"Malformed app configuration");
  if(prefs.putString("appConfig",server.arg("plain"))!=server.arg("plain").length()) return jsonError(500,"Could not persist app configuration");
  sendJson(parsed);
}
void setupRoutes() {
  server.on("/api/v1/status",HTTP_GET,handleStatus);
  server.on("/api/v1/device",HTTP_GET,[](){ StaticJsonDocument<256> d; d["model"]="ESP32-WROOM-32 DevKit (profile assumption)"; d["firmware"]=FW_VERSION; d["chipId"]=String((uint32_t)(ESP.getEfuseMac()>>24),HEX); d["mac"]=WiFi.macAddress(); d["ip"]=WiFi.localIP().toString(); sendJson(d); });
  server.on("/api/v1/config",HTTP_GET,handleAppConfig);
  server.on("/api/v1/config",HTTP_PUT,handleAppConfig);
  server.on("/api/v1/config/relays",HTTP_GET,[](){ StaticJsonDocument<512> d; configJson(d); sendJson(d); });
  server.on("/api/v1/config/relays",HTTP_PUT,handleSaveMapping);
  server.on("/api/v1/config/relays/apply",HTTP_POST,handleApplyMapping);
  server.on("/api/v1/relays/all",HTTP_PUT,handleAll);
  server.onNotFound([](){ if(server.method()==HTTP_PUT && server.uri().startsWith("/api/v1/relays/")){ handleRelay(); } else jsonError(404,"Route not found"); });
}
void setup() {
  Serial.begin(115200);
  const esp_reset_reason_t resetReason = esp_reset_reason();
  Serial.printf("\n[NEXUS] Firmware %s\n", FW_VERSION);
  Serial.printf("[NEXUS] setup entered; reset reason: %s (%d)\n",
                resetReasonName(resetReason), static_cast<int>(resetReason));

  memcpy(activeGpios,DEFAULT_GPIOS,CHANNELS);
  const bool nvsReady = prefs.begin("nexus", false);
  Serial.printf("[NEXUS] NVS initialization: %s\n", nvsReady ? "complete" : "FAILED; using default GPIO mapping");
  if (nvsReady) {
    const size_t storedLength = prefs.getBytesLength("gpios");
    if (storedLength == CHANNELS) {
      uint8_t loaded[CHANNELS];
      if (prefs.getBytes("gpios", loaded, CHANNELS) == CHANNELS) {
        if (validMapping(loaded)) {
          memcpy(activeGpios, loaded, CHANNELS);
          Serial.println("[NEXUS] Stored GPIO mapping validation: passed");
        } else {
          Serial.println("[NEXUS] Stored GPIO mapping validation: FAILED; using defaults");
        }
      } else {
        Serial.println("[NEXUS] Stored GPIO mapping read: FAILED; using defaults");
      }
    } else if (storedLength == 0) {
      Serial.println("[NEXUS] No stored GPIO mapping; using defaults");
    } else {
      Serial.printf("[NEXUS] Stored GPIO mapping length %u is invalid; using defaults\n",
                    static_cast<unsigned>(storedLength));
    }
  }
  Serial.print("[NEXUS] Active GPIO mapping (ACTIVE_HIGH): ");
  for (uint8_t i = 0; i < CHANNELS; ++i) {
    Serial.printf("%s%u", i == 0 ? "" : ", ", activeGpios[i]);
  }
  Serial.printf(" (validation: %s)\n", validMapping(activeGpios) ? "passed" : "FAILED");

  // ACTIVE_HIGH is fixed by firmware; stored polarity is ignored for compatibility.
  // Configure the output latch OFF before enabling each output. Reset/boot pin states
  // before setup() remain a hardware responsibility (default pulls/relay enable circuit).
  for(uint8_t pin:activeGpios){ setOff(pin); pinMode(pin,OUTPUT); }
  Serial.println("[NEXUS] Relay GPIO initialization complete; commanded states remain OFF");

  Serial.println("[NEXUS] Starting Wi-Fi connection (credentials omitted)");
  if (!WiFi.mode(WIFI_STA)) Serial.println("[NEXUS] ERROR: could not set Wi-Fi station mode");
  WiFi.begin(WIFI_SSID,WIFI_PASSWORD);
  const uint32_t start = millis();
  uint32_t lastProgress = start;
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(250);
    if (millis() - lastProgress >= 2500) {
      Serial.printf("[NEXUS] Wi-Fi connecting... %lu s elapsed\n",
                    static_cast<unsigned long>((millis() - start) / 1000));
      lastProgress = millis();
    }
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[NEXUS] Wi-Fi connected; IP address: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("[NEXUS] Wi-Fi connection timed out after 20 s; continuing without Wi-Fi");
  }

  setupRoutes();
  Serial.println("[NEXUS] HTTP routes configured; starting server");
  server.begin();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[NEXUS] HTTP server started on port 80; IP address: %s\n",
                  WiFi.localIP().toString().c_str());
  } else {
    Serial.println("[NEXUS] HTTP server started on port 80; waiting for Wi-Fi");
  }
}
void loop(){ server.handleClient(); }

# NEXUS-2810-Alpha — Smart Home Controller

A dedicated, mobile-first web controller for 6-channel ESP32 relay-based home automation systems.

## Local Development
```bash
npm install
npm run dev
```
Visit `http://localhost:3000`. Defaults to **Simulated (Demo)** driver.

## Testing
```bash
npm run test
```

## Static Production Build for LittleFS
```bash
npm run build
```
Outputs pure static HTML/JS/CSS to `dist/` using relative paths (`./assets/...`). 

### Flashing to ESP32:
1. Copy contents of `dist/` into your ESP32 project's `data/` directory.
2. Run `Upload Filesystem Image` (LittleFS) in PlatformIO or Arduino IDE.
3. Access `http://<esp32-ip>/` on Android Chrome.

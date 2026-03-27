#!/bin/bash

# Step 1: Enable ADB over TCP/IP on port 5555
echo "[*] Setting ADB to TCP mode on port 5555..."
adb tcpip 5555
sleep 1

# Step 2: Get the IP address of the connected device via USB
echo "[*] Detecting device IP address..."

DEVICE_IP=$(adb shell ip route | awk '{print $9}' | head -n 1)

if [[ -z "$DEVICE_IP" ]]; then
  echo "[!] Could not detect device IP address. Make sure the device is connected via USB and ADB is authorized."
  exit 1
fi

echo "[*] Device IP detected: $DEVICE_IP"

# Step 3: Connect to the device over Wi-Fi
echo "[*] Connecting to $DEVICE_IP:5555 ..."
adb connect "$DEVICE_IP:5555"

# Step 4: Show connected devices
echo "[*] Connected devices:"
adb devices

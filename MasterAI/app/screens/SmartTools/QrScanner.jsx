import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Linking, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import ToolHeader from './ToolHeader';
import ResultAdFooter from './ResultAdFooter';
import { sharedStyles } from './SmartToolsStyles';

const isUrl = value => /^https?:\/\//i.test(value);

const QrScanner = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(null);

  const onScanned = ({ data, type }) => {
    // The camera fires repeatedly; ignore events until the user rescans.
    if (scanned) return;
    setScanned({ data, type });
  };

  const openLink = async () => {
    try {
      await Linking.openURL(scanned.data);
    } catch (e) {
      Alert.alert('Could not open link', scanned.data);
    }
  };

  const copy = async () => {
    await Clipboard.setStringAsync(scanned.data);
    Alert.alert('Copied', 'Copied to clipboard.');
  };

  return (
    <SafeAreaView style={sharedStyles.screen} edges={['top', 'left', 'right']}>
      <ToolHeader title="QR & Barcode Scanner" />
      {!permission ? null : !permission.granted ? (
        <View style={sharedStyles.body}>
          <View style={sharedStyles.card}>
            <Text style={sharedStyles.title}>Camera access needed</Text>
            <Text style={sharedStyles.subtitle}>
              The camera is only used to read codes. Nothing is uploaded.
            </Text>
            <TouchableOpacity style={sharedStyles.primaryBtn} onPress={requestPermission}>
              <Text style={sharedStyles.primaryBtnText}>Allow camera</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: [
                'qr',
                'ean13',
                'ean8',
                'upc_a',
                'upc_e',
                'code128',
                'code39',
                'pdf417',
                'datamatrix',
              ],
            }}
            onBarcodeScanned={scanned ? undefined : onScanned}
          />
          {!scanned && (
            <View style={styles.frameWrap} pointerEvents="none">
              <View style={styles.frame} />
              <Text style={styles.hint}>Point the camera at a QR code or barcode</Text>
            </View>
          )}
          {scanned && (
            <View style={styles.resultSheet}>
              <Text style={sharedStyles.title}>Scanned ({scanned.type})</Text>
              <Text selectable style={sharedStyles.subtitle}>
                {scanned.data}
              </Text>
              {isUrl(scanned.data) && (
                <TouchableOpacity style={sharedStyles.primaryBtn} onPress={openLink}>
                  <Text style={sharedStyles.primaryBtnText}>Open link</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={sharedStyles.outlineBtn} onPress={copy}>
                <Text style={sharedStyles.outlineBtnText}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={sharedStyles.outlineBtn} onPress={() => setScanned(null)}>
                <Text style={sharedStyles.outlineBtnText}>Scan again</Text>
              </TouchableOpacity>
              <ResultAdFooter rewardLabel="Unlock unlimited use of all Smart Tools for 24h" />
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  frameWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: 20,
  },
  hint: { color: '#fff', marginTop: 16, fontSize: 14, textShadowColor: '#000', textShadowRadius: 4 },
  resultSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
});

export default QrScanner;

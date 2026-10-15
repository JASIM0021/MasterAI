import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ToolHeader from './ToolHeader';
import { COLORS, sharedStyles } from './SmartToolsStyles';
import { SCREEN_NAME } from '../../Constant/screenNames';

const SMART_TOOLS = [
  {
    title: 'Image to PDF',
    description: 'Turn photos into one PDF',
    icon: 'picture-as-pdf',
    screen: SCREEN_NAME.ImageToPdf,
  },
  {
    title: 'Photo Resizer',
    description: 'Shrink to 20 KB, 50 KB, 100 KB or passport size',
    icon: 'photo-size-select-large',
    screen: SCREEN_NAME.PhotoResizer,
  },
  {
    title: 'QR & Barcode Scanner',
    description: 'Scan codes and open links',
    icon: 'qr-code-scanner',
    screen: SCREEN_NAME.QrScanner,
  },
];

const SmartToolsHub = () => {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={sharedStyles.screen} edges={['top', 'left', 'right']}>
      <ToolHeader title="Smart Tools" />
      <ScrollView contentContainerStyle={sharedStyles.body}>
        <Text style={[sharedStyles.subtitle, { marginBottom: 12 }]}>
          Free tools that work offline. Your files never leave your phone.
        </Text>
        {SMART_TOOLS.map(tool => (
          <TouchableOpacity
            key={tool.title}
            style={[sharedStyles.card, { flexDirection: 'row', alignItems: 'center' }]}
            onPress={() => navigation.navigate(tool.screen)}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: '#ECE9FF',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
              }}
            >
              <Icon name={tool.icon} size={26} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[sharedStyles.title, { marginBottom: 2 }]}>{tool.title}</Text>
              <Text style={sharedStyles.subtitle}>{tool.description}</Text>
            </View>
            <Icon name="chevron-right" size={24} color={COLORS.muted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SmartToolsHub;

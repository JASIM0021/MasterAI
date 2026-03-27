import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import React from 'react';
import { useTheme } from 'react-native-paper';
import { darkTheme, lightTheme } from '../../themes';

const CustomText = ({
  text,
  size,
  color,
  spacing,
  textAlign,
  underline,
  onPress,
  bold,
  ...rest
}) => {
  const theme = useTheme();
  const colorScheme = useColorScheme();

  return (
    <View style={{ flexDirection: 'column', alignItems: textAlign }}>
      <Text
        style={{
          textAlign:textAlign ? 'center' : 'auto',
          fontSize: size === 'md' ? 16 : size === 'lg' ? 24 : size === 'sm' ? 12 : 10,
          color: color || (colorScheme !== 'dark' ? darkTheme.colors.background : lightTheme.colors.background),
          letterSpacing: spacing || 1.5,
          fontWeight:bold == "bold" ? 'bold': bold,
          ...rest
        }}
        onPress={()=>onPress? onPress() : {}}
      >
        {text}
      </Text>
      {underline && (
        <View
          style={{
            height: 1,
            backgroundColor: color || (colorScheme === 'dark' ? lightTheme.colors.background : darkTheme.colors.background),
            width: '100%',
            marginTop: 2,
          }}
        />
      )}
    </View>
  );
};

export default CustomText;

const styles = StyleSheet.create({});

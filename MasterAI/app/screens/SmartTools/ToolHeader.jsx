import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { sharedStyles } from './SmartToolsStyles';

const ToolHeader = ({ title }) => {
  const navigation = useNavigation();
  return (
    <View style={sharedStyles.header}>
      <TouchableOpacity style={sharedStyles.backBtn} onPress={() => navigation.goBack()}>
        <Icon name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      <Text style={sharedStyles.headerTitle}>{title}</Text>
    </View>
  );
};

export default ToolHeader;

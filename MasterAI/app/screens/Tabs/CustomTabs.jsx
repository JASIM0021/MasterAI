import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const TabComponent = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(0);

  const renderScreen = () => {
    const ActiveScreen = tabs[activeTab].component;
    return <ActiveScreen />;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Main Content */}
      <View style={styles.content}>{renderScreen()}</View>

      {/* Custom Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabItem,
              activeTab === index && styles.activeTabItem,
            ]}
            onPress={() => setActiveTab(index)}
          >
            <MaterialCommunityIcons
              name={activeTab === index ? tab.activeIcon : tab.inactiveIcon}
              size={24}
              color={activeTab === index ? '#6200ee' : '#757575'}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === index ? '#6200ee' : '#757575' },
              ]}
            >
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTabItem: {
    borderTopWidth: 2,
    borderTopColor: '#6200ee',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default TabComponent;

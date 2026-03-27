import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";

const TabsBottom = ({ onTabPress, selectedTabs }) => {
  const [activeTab, setActiveTab] = useState(selectedTabs || "All Tools");
  const { width } = Dimensions.get("window");
  const translateX = new Animated.Value(0); // For animating the indicator

  const navigation = useNavigation();
  const handleTabPress = (tab) => {
    setActiveTab(tab);
    // onTabPress && onTabPress(tab);

    if (tab === "All Tools") {
      navigation.navigate("ToolList");
    } else {
      navigation.navigate("SocialAutomate");
    }

    // Animate the indicator
    Animated.timing(translateX, {
      toValue: tab === "All Tools" ? 0 : width / 2,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <LinearGradient
        colors={["#6200ee", "#9c27b0"]}
        style={styles.gradientBackground}
      >
        {/* Tab Items */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleTabPress("All Tools")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "All Tools" && styles.activeTabText,
              ]}
            >
              All Tools
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleTabPress("Social Automate")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "Social Automate" && styles.activeTabText,
              ]}
            >
              Social Automate
            </Text>
          </TouchableOpacity>
        </View>
        {/* Animated Indicator */}
        <Animated.View
          style={[
            styles.indicator,
            { transform: [{ translateX }], width: width / 2 },
          ]}
        />
      </LinearGradient>
    </View>
  );
};

export default TabsBottom;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: "0%",
    left: "10%",
    right: "10%",
    height: 60,
    borderRadius: 20,
    overflow: "hidden",
  },
  gradientBackground: {
    flex: 1,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderWidth: 1,
    borderColor: "#6200ee", // Added border color
    shadowColor: "#000", // Added shadow color
    shadowOffset: { width: 0, height: 2 }, // Added shadow offset
    shadowOpacity: 0.25, // Added shadow opacity
    shadowRadius: 3.84, // Added shadow radius
    elevation: 5, // Added elevation for Android
  },
  tabContainer: {
    flexDirection: "row",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "space-around",
  },
  tab: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabText: {
    fontSize: 16,
    color: "#ffffffa0", // Semi-transparent white
    fontWeight: "500",
  },
  activeTabText: {
    fontWeight: "bold",
    color: "#ffffff",
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    height: 4,
    backgroundColor: "#ffffff",
    borderRadius: 2,
  },
});

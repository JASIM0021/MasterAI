import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Text,
  Card,
  Chip,
  useTheme,
  Switch,
  List,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const EnhancementOptions = ({ selectedEnhancements, onToggleEnhancement, disabled = false }) => {
  const theme = useTheme();

  const enhancementOptions = [
    {
      label: 'Brightness',
      value: 'improve brightness and exposure',
      icon: 'brightness-6',
      description: 'Automatically adjust brightness levels'
    },
    {
      label: 'Contrast',
      value: 'enhance contrast and definition',
      icon: 'contrast-circle',
      description: 'Improve contrast for better definition'
    },
    {
      label: 'Sharpness',
      value: 'increase sharpness and clarity',
      icon: 'image-filter-center-focus',
      description: 'Make details crisp and sharp'
    },
    {
      label: 'Color Saturation',
      value: 'enhance color saturation',
      icon: 'palette-advanced',
      description: 'Make colors more vibrant and rich'
    },
    {
      label: 'Overall Quality',
      value: 'improve overall image quality and resolution',
      icon: 'high-definition-box',
      description: 'AI-powered quality enhancement'
    },
    {
      label: 'Noise Reduction',
      value: 'reduce noise and grain',
      icon: 'blur-off',
      description: 'Remove unwanted noise and grain'
    },
    {
      label: 'White Balance',
      value: 'correct white balance and color temperature',
      icon: 'white-balance-sunny',
      description: 'Fix color temperature issues'
    },
    {
      label: 'Shadow/Highlights',
      value: 'balance shadows and highlights',
      icon: 'circle-half-full',
      description: 'Recover details in shadows and highlights'
    },
  ];

  const isSelected = (enhancement) => {
    return selectedEnhancements.includes(enhancement.value);
  };

  const getSelectionSummary = () => {
    if (selectedEnhancements.length === 0) {
      return 'No enhancements selected';
    }
    if (selectedEnhancements.length === 1) {
      const selected = enhancementOptions.find(opt => selectedEnhancements.includes(opt.value));
      return `${selected?.label} enhancement selected`;
    }
    return `${selectedEnhancements.length} enhancements selected`;
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="image-filter-hdr" size={24} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Image Enhancement</Text>
        </View>

        <Text style={styles.description}>
          Improve your image quality with AI-powered enhancements. Select multiple options for comprehensive improvement.
        </Text>

        <View style={styles.enhancementsContainer}>
          {enhancementOptions.map((enhancement, index) => (
            <List.Item
              key={index}
              title={enhancement.label}
              description={enhancement.description}
              left={(props) => (
                <MaterialCommunityIcons
                  name={enhancement.icon}
                  size={24}
                  color={isSelected(enhancement) ? theme.colors.primary : '#666'}
                  style={styles.enhancementIcon}
                />
              )}
              right={() => (
                <Switch
                  value={isSelected(enhancement)}
                  onValueChange={() => onToggleEnhancement(enhancement.value)}
                  disabled={disabled}
                />
              )}
              style={[
                styles.enhancementItem,
                isSelected(enhancement) && styles.selectedEnhancementItem
              ]}
              titleStyle={[
                styles.enhancementTitle,
                isSelected(enhancement) && styles.selectedEnhancementTitle
              ]}
              descriptionStyle={styles.enhancementDescription}
              onPress={() => onToggleEnhancement(enhancement.value)}
            />
          ))}
        </View>

        {/* Selection Summary */}
        <View style={styles.summaryContainer}>
          <MaterialCommunityIcons
            name="information"
            size={16}
            color={theme.colors.primary}
          />
          <Text style={styles.summaryText}>
            {getSelectionSummary()}
          </Text>
        </View>

        {/* Quick Select Options */}
        <View style={styles.quickSelectContainer}>
          <Text style={styles.quickSelectTitle}>Quick Select:</Text>
          <View style={styles.quickSelectButtons}>
            <Chip
              mode="outlined"
              onPress={() => {
                // Select all basic enhancements
                const basicEnhancements = ['improve brightness and exposure', 'enhance contrast and definition', 'increase sharpness and clarity'];
                basicEnhancements.forEach(enhancement => {
                  if (!selectedEnhancements.includes(enhancement)) {
                    onToggleEnhancement(enhancement);
                  }
                });
              }}
              style={styles.quickSelectChip}
              disabled={disabled}
            >
              Basic Enhancement
            </Chip>
            <Chip
              mode="outlined"
              onPress={() => {
                // Select all enhancements
                enhancementOptions.forEach(enhancement => {
                  if (!selectedEnhancements.includes(enhancement.value)) {
                    onToggleEnhancement(enhancement.value);
                  }
                });
              }}
              style={styles.quickSelectChip}
              disabled={disabled}
            >
              Professional
            </Chip>
            <Chip
              mode="outlined"
              onPress={() => {
                // Clear all selections
                selectedEnhancements.forEach(enhancement => {
                  onToggleEnhancement(enhancement);
                });
              }}
              style={styles.quickSelectChip}
              disabled={disabled || selectedEnhancements.length === 0}
            >
              Clear All
            </Chip>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  enhancementsContainer: {
    marginBottom: 16,
  },
  enhancementItem: {
    paddingLeft: 0,
    paddingRight: 0,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  selectedEnhancementItem: {
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
  },
  enhancementIcon: {
    marginLeft: 8,
    marginRight: 16,
  },
  enhancementTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedEnhancementTitle: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  enhancementDescription: {
    fontSize: 12,
    color: '#666',
  },
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  summaryText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  quickSelectContainer: {
    marginTop: 8,
  },
  quickSelectTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  quickSelectButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickSelectChip: {
    marginRight: 8,
    marginBottom: 8,
  },
});

export default EnhancementOptions;
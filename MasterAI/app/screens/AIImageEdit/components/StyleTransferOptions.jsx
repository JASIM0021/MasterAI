import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  Card,
  Chip,
  useTheme,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const StyleTransferOptions = ({ selectedStyle, onStyleSelect, disabled = false }) => {
  const theme = useTheme();

  const styleOptions = [
    {
      label: 'Artistic',
      value: 'artistic painting style',
      icon: 'palette',
      description: 'Transform into an artistic painting'
    },
    {
      label: 'Vintage',
      value: 'vintage retro style',
      icon: 'camera-retro',
      description: 'Add a nostalgic, vintage feel'
    },
    {
      label: 'Modern',
      value: 'modern sleek design',
      icon: 'trending-up',
      description: 'Clean, contemporary appearance'
    },
    {
      label: 'Cartoon',
      value: 'cartoon animation style',
      icon: 'emoticon-happy',
      description: 'Convert to cartoon/animated style'
    },
    {
      label: 'Watercolor',
      value: 'watercolor painting style',
      icon: 'water',
      description: 'Soft watercolor painting effect'
    },
    {
      label: 'Oil Painting',
      value: 'oil painting style',
      icon: 'brush',
      description: 'Rich oil painting texture'
    },
    {
      label: 'Sketch',
      value: 'pencil sketch style',
      icon: 'pencil',
      description: 'Hand-drawn pencil sketch look'
    },
    {
      label: 'Pop Art',
      value: 'pop art style',
      icon: 'star-four-points',
      description: 'Bold, colorful pop art style'
    },
    {
      label: 'Minimalist',
      value: 'minimalist style',
      icon: 'circle-outline',
      description: 'Simple, clean minimalist design'
    },
    {
      label: 'Fantasy',
      value: 'fantasy art style',
      icon: 'castle',
      description: 'Magical, fantasy-themed style'
    },
  ];

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="palette" size={24} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Style Transfer</Text>
        </View>

        <Text style={styles.description}>
          Apply artistic styles to transform your image's appearance.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.stylesGrid}>
            {styleOptions.map((style, index) => (
              <View key={index} style={styles.styleItem}>
                <Chip
                  mode={selectedStyle === style.value ? 'flat' : 'outlined'}
                  selected={selectedStyle === style.value}
                  onPress={() => onStyleSelect(style.value)}
                  style={[
                    styles.styleChip,
                    selectedStyle === style.value && styles.selectedChip
                  ]}
                  textStyle={[
                    styles.chipText,
                    selectedStyle === style.value && styles.selectedChipText
                  ]}
                  disabled={disabled}
                  icon={({ size, color }) => (
                    <MaterialCommunityIcons
                      name={style.icon}
                      size={size}
                      color={selectedStyle === style.value ? '#fff' : color}
                    />
                  )}
                >
                  {style.label}
                </Chip>
                <Text style={styles.styleDescription}>
                  {style.description}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {selectedStyle && (
          <View style={styles.selectedStyleInfo}>
            <MaterialCommunityIcons
              name="check-circle"
              size={16}
              color={theme.colors.primary}
            />
            <Text style={styles.selectedStyleText}>
              Style selected: {styleOptions.find(s => s.value === selectedStyle)?.label}
            </Text>
          </View>
        )}
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
  scrollContainer: {
    marginBottom: 12,
  },
  scrollContent: {
    paddingRight: 16,
  },
  stylesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  styleItem: {
    marginRight: 8,
    marginBottom: 8,
    alignItems: 'center',
    maxWidth: 120,
  },
  styleChip: {
    marginBottom: 4,
  },
  selectedChip: {
    backgroundColor: '#4CAF50',
  },
  chipText: {
    fontSize: 12,
  },
  selectedChipText: {
    color: '#fff',
  },
  styleDescription: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    lineHeight: 12,
  },
  selectedStyleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
  },
  selectedStyleText: {
    fontSize: 12,
    color: '#2E7D32',
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default StyleTransferOptions;
import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Text,
  Card,
  TextInput,
  useTheme,
  HelperText,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const TextBasedEditOptions = ({ value, onValueChange, disabled = false }) => {
  const theme = useTheme();

  const examplePrompts = [
    "Remove the background",
    "Change the sky to sunset",
    "Make the colors more vibrant",
    "Add a soft blur to the background",
    "Convert to black and white",
    "Brighten the image"
  ];

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="text-box" size={24} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Text-Based Editing</Text>
        </View>

        <Text style={styles.description}>
          Describe what you want to change in your image using natural language.
        </Text>

        <TextInput
          mode="outlined"
          label="Edit instructions"
          placeholder="e.g., Remove the background, change colors, add effects..."
          value={value}
          onChangeText={onValueChange}
          multiline
          numberOfLines={3}
          style={styles.textInput}
          disabled={disabled}
        />

        <HelperText type="info" visible={true}>
          Be specific about what you want to change. Examples:
        </HelperText>

        <View style={styles.examplesContainer}>
          {examplePrompts.map((prompt, index) => (
            <Text key={index} style={styles.examplePrompt}>
              • {prompt}
            </Text>
          ))}
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
  textInput: {
    marginBottom: 8,
  },
  examplesContainer: {
    marginTop: 8,
    paddingLeft: 8,
  },
  examplePrompt: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    lineHeight: 16,
  },
});

export default TextBasedEditOptions;
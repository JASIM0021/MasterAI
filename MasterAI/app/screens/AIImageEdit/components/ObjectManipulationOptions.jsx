import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Text,
  Card,
  TextInput,
  useTheme,
  HelperText,
  Chip,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const ObjectManipulationOptions = ({ value, onValueChange, disabled = false }) => {
  const theme = useTheme();

  const quickActions = [
    { label: 'Remove Background', value: 'remove the background completely' },
    { label: 'Add Shadow', value: 'add realistic shadows to objects' },
    { label: 'Remove Object', value: 'remove unwanted objects from the image' },
    { label: 'Add Object', value: 'add new objects to the scene' },
    { label: 'Move Object', value: 'reposition objects in the image' },
    { label: 'Resize Object', value: 'change the size of specific objects' },
  ];

  const examplePrompts = [
    "Remove the person in the background",
    "Add a cat sitting on the table",
    "Move the car to the left side",
    "Replace the blue car with a red bicycle",
    "Remove all text from the image",
    "Add clouds to the sky",
    "Change the tree into a lamp post"
  ];

  const handleQuickAction = (actionValue) => {
    if (value.includes(actionValue)) {
      // Remove if already selected
      const newValue = value.replace(actionValue, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim();
      onValueChange(newValue);
    } else {
      // Add to existing value
      const newValue = value ? `${value}, ${actionValue}` : actionValue;
      onValueChange(newValue);
    }
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="vector-arrange-above" size={24} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Object Manipulation</Text>
        </View>

        <Text style={styles.description}>
          Add, remove, move, or modify objects in your image with AI precision.
        </Text>

        {/* Quick Actions */}
        <Text style={styles.subsectionTitle}>Quick Actions:</Text>
        <View style={styles.quickActionsContainer}>
          {quickActions.map((action, index) => (
            <Chip
              key={index}
              mode={value.includes(action.value) ? 'flat' : 'outlined'}
              selected={value.includes(action.value)}
              onPress={() => handleQuickAction(action.value)}
              style={[
                styles.quickActionChip,
                value.includes(action.value) && styles.selectedQuickAction
              ]}
              textStyle={[
                styles.quickActionText,
                value.includes(action.value) && styles.selectedQuickActionText
              ]}
              disabled={disabled}
            >
              {action.label}
            </Chip>
          ))}
        </View>

        {/* Custom Instructions */}
        <Text style={styles.subsectionTitle}>Custom Instructions:</Text>
        <TextInput
          mode="outlined"
          label="Object manipulation instructions"
          placeholder="e.g., Remove the car and add a bicycle in its place..."
          value={value}
          onChangeText={onValueChange}
          multiline
          numberOfLines={3}
          style={styles.textInput}
          disabled={disabled}
        />

        <HelperText type="info" visible={true}>
          Be specific about what objects to modify and how. Examples:
        </HelperText>

        <View style={styles.examplesContainer}>
          {examplePrompts.map((prompt, index) => (
            <Text key={index} style={styles.examplePrompt}>
              • {prompt}
            </Text>
          ))}
        </View>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <MaterialCommunityIcons name="lightbulb" size={16} color="#FFA726" />
          <Text style={styles.tipsText}>
            Tip: For best results, be specific about object positions (left, right, center, foreground, background)
          </Text>
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
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  quickActionChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  selectedQuickAction: {
    backgroundColor: '#4CAF50',
  },
  quickActionText: {
    fontSize: 12,
  },
  selectedQuickActionText: {
    color: '#fff',
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
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
  },
  tipsText: {
    fontSize: 12,
    color: '#F57C00',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});

export default ObjectManipulationOptions;
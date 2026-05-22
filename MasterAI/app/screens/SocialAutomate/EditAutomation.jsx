import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';

// Import RTK Query mutations and hooks
import {
  useUpdateScheduleMutation,
  useFetchScheduleQuery
} from '../../features/api/schedulesApiSlice';
import { useFetchUserCreditsQuery } from '../../features/api/creditsApiSlice';
import { selectIsAuthenticated } from '../../features/auth/authSlice';
import { useSelector } from 'react-redux';

const EditAutomation = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { scheduleId } = route.params;

  // Auth and data fetching
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const {
    data: scheduleData,
    isLoading: isLoadingSchedule,
    isError: scheduleError,
    error: scheduleErrorData
  } = useFetchScheduleQuery(scheduleId, { skip: !isAuthenticated || !scheduleId });

  const {
    data: creditsData,
    isLoading: creditsLoading,
    isError: creditsError
  } = useFetchUserCreditsQuery(undefined, { skip: !isAuthenticated });

  // RTK Query mutation hook
  const [updateSchedule, { isLoading: isUpdating }] = useUpdateScheduleMutation();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    topics: [],
    tone: 'professional',
    language: 'english',
    frequency: 'daily',
    minuteInterval: 5, // For per-minute scheduling
    timeSlots: ['09:00'],
    isActive: true,
    platforms: [],
    contentType: 'text', // Single content type selection (mutually exclusive)
  });

  // Predefined options (same as CreateAutomation)
  const toneOptions = [
    { id: 'professional', label: 'Professional', icon: 'briefcase', color: '#3498db' },
    { id: 'casual', label: 'Casual', icon: 'coffee', color: '#e67e22' },
    { id: 'friendly', label: 'Friendly', icon: 'heart', color: '#e74c3c' },
    { id: 'authoritative', label: 'Authoritative', icon: 'shield-check', color: '#9b59b6' },
    { id: 'humorous', label: 'Humorous', icon: 'emoticon-happy', color: '#f39c12' },
    { id: 'inspirational', label: 'Inspirational', icon: 'lightbulb', color: '#27ae60' },
  ];

  const languageOptions = [
    { id: 'english', label: 'English', flag: '🇺🇸' },
    { id: 'spanish', label: 'Spanish', flag: '🇪🇸' },
    { id: 'french', label: 'French', flag: '🇫🇷' },
    { id: 'german', label: 'German', flag: '🇩🇪' },
    { id: 'italian', label: 'Italian', flag: '🇮🇹' },
    { id: 'portuguese', label: 'Portuguese', flag: '🇵🇹' },
    { id: 'chinese', label: 'Chinese', flag: '🇨🇳' },
    { id: 'japanese', label: 'Japanese', flag: '🇯🇵' },
    { id: 'korean', label: 'Korean', flag: '🇰🇷' },
    { id: 'hindi', label: 'Hindi', flag: '🇮🇳' },
    { id: 'bengali', label: 'Bengali', flag: '🇧🇩' },
    { id: 'arabic', label: 'Arabic', flag: '🇸🇦' },
  ];

  const frequencyOptions = [
    { id: 'daily', label: 'Daily', description: 'Generate content every day' },
    { id: 'weekly', label: 'Weekly', description: 'Generate content once a week' },
    { id: 'bi-weekly', label: 'Bi-weekly', description: 'Generate content every 2 weeks' },
    { id: 'monthly', label: 'Monthly', description: 'Generate content once a month' },
    { id: 'per-minute', label: 'Per-Minute (Experimental)', description: 'Generate content every few minutes - for testing only' },
  ];

  const minuteIntervalOptions = [
    { value: 1, label: '1 minute' },
    { value: 2, label: '2 minutes' },
    { value: 5, label: '5 minutes' },
    { value: 10, label: '10 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
  ];

  const contentTypeOptions = [
    { id: 'text', label: 'Text Posts', icon: 'text', description: 'AI-generated text content' },
    { id: 'image', label: 'Image Posts', icon: 'image', description: 'AI-generated images with captions' },
    { id: 'quote', label: 'Quote Posts', icon: 'format-quote-close', description: 'Inspirational quotes with backgrounds' },
  ];

  // Popular topic suggestions
  const topicSuggestions = [
    'Technology Trends', 'Business Tips', 'Productivity Hacks', 'Industry News',
    'Motivational Quotes', 'Health & Wellness', 'Marketing Strategies', 'Leadership',
    'Innovation', 'Entrepreneurship', 'Digital Transformation', 'Success Stories',
    'Team Building', 'Work-Life Balance', 'Financial Tips', 'Career Growth'
  ];

  // Populate form data when schedule data is loaded
  useEffect(() => {
    if (scheduleData) {
      const schedule = scheduleData;
      const aiConfig = schedule.content?.aiConfig || {};
      const recurrence = schedule.recurrence || {};

      // Convert time slots back to string format
      const timeSlots = recurrence.timeSlots?.map(slot =>
        `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`
      ) || ['09:00'];

      setFormData({
        title: schedule.name || '',
        description: schedule.description || '',
        topics: aiConfig.topics || [],
        tone: aiConfig.tone || 'professional',
        language: aiConfig.language || 'english',
        frequency: recurrence.frequency || 'daily',
        minuteInterval: recurrence.minuteInterval || 5,
        timeSlots: timeSlots,
        isActive: schedule.isActive !== undefined ? schedule.isActive : true,
        platforms: schedule.targetPlatforms || [],
        contentType: aiConfig.contentType || 'text',
      });
    }
  }, [scheduleData]);

  const updateFormData = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const toggleTopic = (topic) => {
    const currentTopics = formData.topics;
    if (currentTopics.includes(topic)) {
      updateFormData('topics', currentTopics.filter(t => t !== topic));
    } else {
      updateFormData('topics', [...currentTopics, topic]);
    }
  };

  const selectContentType = (type) => {
    // Mutually exclusive selection - only one content type at a time
    updateFormData('contentType', type);
  };

  const addCustomTopic = () => {
    Alert.prompt(
      'Add Custom Topic',
      'Enter a custom topic for content generation:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (text) => {
            if (text && text.trim()) {
              updateFormData('topics', [...formData.topics, text.trim()]);
            }
          }
        }
      ]
    );
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a title for your automation');
      return false;
    }
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please enter a description for your automation');
      return false;
    }
    if (formData.topics.length === 0) {
      Alert.alert('Error', 'Please select at least one topic');
      return false;
    }
    if (!formData.contentType) {
      Alert.alert('Error', 'Please select a content type');
      return false;
    }
    if (!formData.language) {
      Alert.alert('Error', 'Please select a language');
      return false;
    }
    if (!formData.tone) {
      Alert.alert('Error', 'Please select a tone');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      // Create update payload using same structure as CreateAutomation
      const recurrenceConfig = {
        frequency: formData.frequency,
        timezone: 'UTC'
      };

      // Add frequency-specific configurations
      if (formData.frequency === 'per-minute') {
        recurrenceConfig.minuteInterval = formData.minuteInterval;
      } else {
        recurrenceConfig.timeSlots = formData.timeSlots.map(time => {
          const [hour, minute] = time.split(':');
          return { hour: parseInt(hour), minute: parseInt(minute) };
        });
      }

      const updateData = {
        name: formData.title,
        description: formData.description,
        type: 'recurring',
        recurrence: recurrenceConfig,
        content: {
          type: 'ai-generated',
          aiConfig: {
            topics: formData.topics,
            tone: formData.tone,
            language: formData.language,
            keywords: formData.topics,
            contentLength: 'medium',
            contentType: formData.contentType,
            includeHashtags: true,
            maxHashtags: 5,
            requireApproval: true,
            autoPublish: false,
            generationModel: 'gemini-2.5-flash'
          },
          rotation: 'random'
        },
        targetPlatforms: formData.platforms || [],
        limits: {},
        isActive: formData.isActive
      };

      const result = await updateSchedule({
        scheduleId,
        updates: updateData
      }).unwrap();

      Alert.alert(
        'Success',
        'Automation updated successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Update schedule error:', error);
      Alert.alert('Error', 'Failed to update automation. Please try again.');
    }
  };

  // Loading state
  if (isLoadingSchedule) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading automation details...</Text>
      </View>
    );
  }

  // Error state
  if (scheduleError) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Icon name="alert-circle" size={48} color="#e74c3c" />
        <Text style={styles.errorText}>Failed to load automation details</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Basic Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <Text style={styles.inputLabel}>Automation Title *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Daily Tech Updates"
            value={formData.title}
            onChangeText={(text) => updateFormData('title', text)}
          />

          <Text style={styles.inputLabel}>Description (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Describe what this automation will do..."
            value={formData.description}
            onChangeText={(text) => updateFormData('description', text)}
            multiline={true}
            numberOfLines={3}
          />
        </View>

        {/* Topics Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Content Topics *</Text>
            <TouchableOpacity onPress={addCustomTopic} style={styles.addButton}>
              <Icon name="plus" size={16} color="#6200ee" />
              <Text style={styles.addButtonText}>Custom</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionDescription}>
            Select topics that interest you. AI will generate content based on these topics.
          </Text>

          <View style={styles.chipContainer}>
            {topicSuggestions.map((topic) => (
              <TouchableOpacity
                key={topic}
                style={[
                  styles.chip,
                  formData.topics.includes(topic) && styles.chipSelected
                ]}
                onPress={() => toggleTopic(topic)}
              >
                <Text style={[
                  styles.chipText,
                  formData.topics.includes(topic) && styles.chipTextSelected
                ]}>
                  {topic}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom topics */}
          {formData.topics.filter(topic => !topicSuggestions.includes(topic)).map((topic) => (
            <View key={topic} style={styles.customTopicItem}>
              <Text style={styles.customTopicText}>{topic}</Text>
              <TouchableOpacity
                onPress={() => toggleTopic(topic)}
                style={styles.removeButton}
              >
                <Icon name="close" size={16} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Tone Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content Tone</Text>
          <Text style={styles.sectionDescription}>
            Choose the tone that matches your brand voice.
          </Text>

          <View style={styles.toneGrid}>
            {toneOptions.map((tone) => (
              <TouchableOpacity
                key={tone.id}
                style={[
                  styles.toneOption,
                  formData.tone === tone.id && styles.toneOptionSelected
                ]}
                onPress={() => updateFormData('tone', tone.id)}
              >
                <Icon
                  name={tone.icon}
                  size={24}
                  color={formData.tone === tone.id ? '#ffffff' : tone.color}
                />
                <Text style={[
                  styles.toneLabel,
                  formData.tone === tone.id && styles.toneLabelSelected
                ]}>
                  {tone.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Language Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Language *</Text>
          <Text style={styles.sectionDescription}>
            Select the language for content generation.
          </Text>

          <View style={styles.languageGrid}>
            {languageOptions.map((language) => (
              <TouchableOpacity
                key={language.id}
                style={[
                  styles.languageOption,
                  formData.language === language.id && styles.languageOptionSelected
                ]}
                onPress={() => updateFormData('language', language.id)}
              >
                <Text style={styles.languageFlag}>{language.flag}</Text>
                <Text style={[
                  styles.languageLabel,
                  formData.language === language.id && styles.languageLabelSelected
                ]}>
                  {language.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Content Types Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content Type *</Text>
          <Text style={styles.sectionDescription}>
            Choose one content type for your automation. You can only select one at a time.
          </Text>

          {contentTypeOptions.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.contentTypeOption,
                formData.contentType === type.id && styles.contentTypeSelected
              ]}
              onPress={() => selectContentType(type.id)}
            >
              <View style={styles.contentTypeInfo}>
                <Icon
                  name={type.icon}
                  size={24}
                  color={formData.contentType === type.id ? '#6200ee' : '#666'}
                />
                <View style={styles.contentTypeText}>
                  <Text style={[
                    styles.contentTypeLabel,
                    formData.contentType === type.id && styles.contentTypeLabelSelected
                  ]}>
                    {type.label}
                  </Text>
                  <Text style={styles.contentTypeDescription}>{type.description}</Text>
                </View>
              </View>
              <View style={[
                styles.checkbox,
                formData.contentType === type.id && styles.checkboxSelected
              ]}>
                {formData.contentType === type.id && (
                  <Icon name="check" size={16} color="#ffffff" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Frequency Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Generation Frequency</Text>
          <Text style={styles.sectionDescription}>
            How often should AI generate new content for you?
          </Text>

          {frequencyOptions.map((freq) => (
            <TouchableOpacity
              key={freq.id}
              style={[
                styles.frequencyOption,
                formData.frequency === freq.id && styles.frequencySelected
              ]}
              onPress={() => updateFormData('frequency', freq.id)}
            >
              <View style={styles.frequencyInfo}>
                <Text style={[
                  styles.frequencyLabel,
                  formData.frequency === freq.id && styles.frequencyLabelSelected
                ]}>
                  {freq.label}
                </Text>
                <Text style={styles.frequencyDescription}>{freq.description}</Text>
              </View>
              <View style={[
                styles.radioButton,
                formData.frequency === freq.id && styles.radioButtonSelected
              ]}>
                {formData.frequency === freq.id && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </TouchableOpacity>
          ))}

          {/* Minute Interval Selection (only shown when per-minute is selected) */}
          {formData.frequency === 'per-minute' && (
            <View style={styles.minuteIntervalSection}>
              <Text style={styles.minuteIntervalTitle}>Minute Interval</Text>
              <Text style={styles.minuteIntervalDescription}>
                Choose how many minutes between each content generation:
              </Text>

              <View style={styles.minuteIntervalOptions}>
                {minuteIntervalOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.minuteIntervalOption,
                      formData.minuteInterval === option.value && styles.minuteIntervalSelected
                    ]}
                    onPress={() => updateFormData('minuteInterval', option.value)}
                  >
                    <Text style={[
                      styles.minuteIntervalText,
                      formData.minuteInterval === option.value && styles.minuteIntervalTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.experimentalWarning}>
                <Icon name="alert-circle" size={16} color="#ff9800" />
                <Text style={styles.experimentalWarningText}>
                  Per-minute scheduling is experimental and may consume execution credits quickly.
                  Use with caution!
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Active Toggle */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Automation Status</Text>
              <Text style={styles.toggleDescription}>
                Enable or disable this automation
              </Text>
            </View>
            <Switch
              value={formData.isActive}
              onValueChange={(value) => updateFormData('isActive', value)}
              trackColor={{ false: '#e0e6ed', true: '#6200ee40' }}
              thumbColor={formData.isActive ? '#6200ee' : '#666'}
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isUpdating && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isUpdating}
        >
          <LinearGradient
            colors={isUpdating ? ['#ccc', '#999'] : ['#00796b', '#48a999']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientButton}
          >
            {isUpdating ? (
              <Text style={styles.submitButtonText}>Updating...</Text>
            ) : (
              <>
                <Icon name="content-save" size={20} color="#ffffff" style={styles.buttonIcon} />
                <Text style={styles.submitButtonText}>Update Automation</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#6200ee',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    marginTop: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e6ed',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2c3e50',
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f0ff',
  },
  addButtonText: {
    fontSize: 12,
    color: '#6200ee',
    fontWeight: '600',
    marginLeft: 4,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e6ed',
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
  },
  chipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  customTopicItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f3f0ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  customTopicText: {
    fontSize: 14,
    color: '#6200ee',
    fontWeight: '500',
  },
  removeButton: {
    padding: 4,
  },
  toneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  toneOption: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e6ed',
    marginBottom: 12,
  },
  toneOptionSelected: {
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
  },
  toneLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginTop: 8,
  },
  toneLabelSelected: {
    color: '#ffffff',
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  languageOption: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e6ed',
    marginBottom: 12,
  },
  languageOptionSelected: {
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
  },
  languageFlag: {
    fontSize: 20,
    marginBottom: 4,
  },
  languageLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
  },
  languageLabelSelected: {
    color: '#ffffff',
  },
  contentTypeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e6ed',
    marginBottom: 12,
  },
  contentTypeSelected: {
    backgroundColor: '#f3f0ff',
    borderColor: '#6200ee',
  },
  contentTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contentTypeText: {
    marginLeft: 12,
    flex: 1,
  },
  contentTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  contentTypeLabelSelected: {
    color: '#6200ee',
  },
  contentTypeDescription: {
    fontSize: 12,
    color: '#666',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e0e6ed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
  },
  frequencyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e6ed',
    marginBottom: 12,
  },
  frequencySelected: {
    backgroundColor: '#f3f0ff',
    borderColor: '#6200ee',
  },
  frequencyInfo: {
    flex: 1,
  },
  frequencyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  frequencyLabelSelected: {
    color: '#6200ee',
  },
  frequencyDescription: {
    fontSize: 12,
    color: '#666',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e0e6ed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#6200ee',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6200ee',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 12,
    color: '#666',
  },
  submitButton: {
    marginVertical: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  gradientButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Minute interval styles
  minuteIntervalSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  minuteIntervalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  minuteIntervalDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  minuteIntervalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  minuteIntervalOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e6ed',
    marginRight: 8,
    marginBottom: 8,
  },
  minuteIntervalSelected: {
    backgroundColor: '#f3f0ff',
    borderColor: '#6200ee',
  },
  minuteIntervalText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  minuteIntervalTextSelected: {
    color: '#6200ee',
    fontWeight: '600',
  },
  experimentalWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff8e1',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcc02',
  },
  experimentalWarningText: {
    fontSize: 12,
    color: '#e65100',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});

export default EditAutomation;
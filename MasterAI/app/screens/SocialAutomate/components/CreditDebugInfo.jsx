import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFetchUserCreditsQuery } from '../../../features/api/creditsApiSlice';

const CreditDebugInfo = ({ isAuthenticated, authLoading }) => {
  const {
    data: creditsData,
    isLoading: creditsLoading,
    isError: creditsError,
    error: creditsErrorDetails
  } = useFetchUserCreditsQuery(
    undefined,
    { skip: !isAuthenticated || authLoading }
  );

  if (!__DEV__) {
    return null; // Only show in development
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🐛 Credit Debug Info (DEV ONLY)</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Auth Status:</Text>
        <Text style={styles.text}>Authenticated: {isAuthenticated ? '✅' : '❌'}</Text>
        <Text style={styles.text}>Auth Loading: {authLoading ? '⏳' : '✅'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Status:</Text>
        <Text style={styles.text}>Credits Loading: {creditsLoading ? '⏳' : '✅'}</Text>
        <Text style={styles.text}>Credits Error: {creditsError ? '❌' : '✅'}</Text>
      </View>

      {creditsError && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Error Details:</Text>
          <ScrollView style={styles.errorScroll}>
            <Text style={styles.errorText}>
              {JSON.stringify(creditsErrorDetails, null, 2)}
            </Text>
          </ScrollView>
        </View>
      )}

      {creditsData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Raw Credits Data:</Text>
          <ScrollView style={styles.dataScroll}>
            <Text style={styles.dataText}>
              {JSON.stringify(creditsData, null, 2)}
            </Text>
          </ScrollView>
        </View>
      )}

      {creditsData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parsed Values:</Text>
          <Text style={styles.text}>
            Automation: {creditsData?.automation?.used || 0} / {creditsData?.automation?.total || 0}
          </Text>
          <Text style={styles.text}>
            Execution: {creditsData?.execution?.used || 0} / {creditsData?.execution?.total || 0}
          </Text>
          <Text style={styles.text}>
            Auto %: {((creditsData?.automation?.used / creditsData?.automation?.total) * 100 || 0).toFixed(1)}%
          </Text>
          <Text style={styles.text}>
            Exec %: {((creditsData?.execution?.used / creditsData?.execution?.total) * 100 || 0).toFixed(1)}%
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    margin: 16,
    borderWidth: 2,
    borderColor: '#ffeaa7',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 4,
  },
  text: {
    fontSize: 11,
    color: '#856404',
    marginBottom: 2,
  },
  errorScroll: {
    maxHeight: 100,
    backgroundColor: '#f8d7da',
    padding: 4,
    borderRadius: 4,
  },
  errorText: {
    fontSize: 10,
    color: '#721c24',
    fontFamily: 'monospace',
  },
  dataScroll: {
    maxHeight: 150,
    backgroundColor: '#d1ecf1',
    padding: 4,
    borderRadius: 4,
  },
  dataText: {
    fontSize: 10,
    color: '#0c5460',
    fontFamily: 'monospace',
  },
});

export default CreditDebugInfo;
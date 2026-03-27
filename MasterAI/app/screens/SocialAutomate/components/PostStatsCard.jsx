import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const PostStatsCard = ({ title, count, color, icon, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.card, { borderTopColor: color }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.iconContainer}>
        <Icon name={icon} size={24} color={color} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.count, { color }]}>{count}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderTopWidth: 4,
    minHeight: 100,
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 8,
  },
  content: {
    alignItems: 'center',
  },
  count: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default PostStatsCard;
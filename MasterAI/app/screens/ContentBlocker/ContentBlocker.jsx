import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { List, Divider, Switch, Text } from 'react-native-paper';

export default function ContentBlocker() {
  const [blockAdultContent, setBlockAdultContent] = useState(true);
  const [filterSearchResults, setFilterSearchResults] = useState(true);
  const [blockMediaSearch, setBlockMediaSearch] = useState(true);
  const [blockYoutubeShorts, setBlockYoutubeShorts] = useState(true);

  return (
    <ScrollView style={styles.container}>
      <List.Section>
        <List.Subheader style={styles.warningText}>
          # Accessibility is OFF
        </List.Subheader>
        <Text style={styles.warningSubtext}>
          Some features may not work unless you turn on accessibility service.
        </Text>

        <Divider style={styles.divider} />

        <List.Subheader>Accountability Partner</List.Subheader>
        <List.Item
          title="Myself"
          right={() => <Text style={styles.removeText}>Remove</Text>}
        />

        <Divider style={styles.divider} />

        <List.Subheader>Content Blocking</List.Subheader>
        <List.Item
          title="Block Adult content"
          right={() => (
            <Switch
              value={blockAdultContent}
              onValueChange={setBlockAdultContent}
            />
          )}
        />
        <List.Item
          title="Filter Search results"
          right={() => (
            <Switch
              value={filterSearchResults}
              onValueChange={setFilterSearchResults}
            />
          )}
        />
        <List.Item
          title="Block Image/Video search"
          right={() => (
            <Switch
              value={blockMediaSearch}
              onValueChange={setBlockMediaSearch}
            />
          )}
        />
        <List.Item
          title="Block Youtube shorts"
          right={() => (
            <Switch
              value={blockYoutubeShorts}
              onValueChange={setBlockYoutubeShorts}
            />
          )}
        />

        <Divider style={styles.divider} />

        <List.Subheader>Uninstall Protection</List.Subheader>
        <List.Item
          title="Block Screen Customization"
          description="Focus Mode"
        />
        <List.Item
          title="Block Screen message"
          description="This name is blocked"
        />
        <List.Item title="Blocking" description="Blocklist Settings" />
      </List.Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  warningText: {
    color: 'orange',
    fontWeight: 'bold',
  },
  warningSubtext: {
    color: 'gray',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  removeText: {
    color: 'red',
    alignSelf: 'center',
    paddingRight: 8,
  },
  divider: {
    marginVertical: 12,
  },
});

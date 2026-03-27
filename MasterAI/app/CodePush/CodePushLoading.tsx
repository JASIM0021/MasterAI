// import React from 'react'; // Import React
// import { Text, View } from 'react-native';
// import { ActivityIndicator } from 'react-native-paper';

// interface CodePushLoadingProps {
//   // Define the props interface
//   header?: string;
//   subHeader?: string;
//   progress?: string;
// }

// const CodePushLoading: React.FC<CodePushLoadingProps> = ({
//   // Use React.FC
//   header = 'Downloading',
//   subHeader = 'general_codePush_codePush_text',
//   progress = '0%',
// }) => {
//   return (
//     <View>
//       <Text>{header}</Text> {/* Changed label to children */}
//       <View style={{ marginVertical: 12 }} />
//       {/* Replaced Space with View for spacing */}
//       <Text>{subHeader}</Text> {/* Changed label to children */}
//       <View style={{ marginVertical: 24 }} />
//       {/* Replaced Space with View for spacing */}
//       <ActivityIndicator color="darkgrey" size="large" />
//       {/* Changed colors.darkGrey to a string */}
//       <View style={{ marginVertical: 24 }} />
//       {/* Replaced Space with View for spacing */}
//       <Text>{progress}</Text> {/* Changed label to children */}
//     </View>
//   );
// };

// export default CodePushLoading;

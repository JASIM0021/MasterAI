import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { lightTheme, responsiveHeight } from '../themes';

import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const GolbalStyle = StyleSheet.create({
  topPositionRight: {
    position: 'absolute',
    right: 10,
    top: 10,
  },

  statusBar: {
    marginTop: StatusBar.currentHeight,
  },

  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  mtSM: {
    marginTop: 10,
  },
  mtMD: {
    marginTop: 20,
  },
  mtLG: {
    marginTop: 40,
  },

  justify: {
    justifyContent: 'center',
  },
  align: {
    alignItems: 'center',
  },
  btn: {
    height: 58,
    backgroundColor: lightTheme.colors.primary, // Use theme primary color
    paddingVertical: 16,
    paddingHorizontal: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12, // Slightly more rounded for modern look
  },
  row_space_between: {
    flexDirection: 'row',
    columnGap: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundedInput: {
    borderWidth: 0.5,

    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 3,
    shadowColor: lightTheme.colors.elevation.level2,
    shadowOffset: {
      width: 1,
      height: 1,
    },
    shadowOpacity: 1,
  },
  btnComon: {
    height: (height * 6.5) / 100,
    borderRadius: 30,
    width: 'auto',
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowCenter: {
    display: 'flex',
    flexDirection: 'row',
    columnGap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ImgOnBoard: {
    width: 350,
    height: 380,
  },
  header: {
    height: StatusBar.currentHeight * 2,
    width: '100%',
    justifyContent: 'space-between',
  },
  txtRounded: {
    width: '100%',
    borderRadius: (width / 25) * 2,
    borderTopLeftRadius: (width / 25) * 2,
    borderTopRightRadius: (width / 25) * 2,

    height: (height / 50) * 3,
    borderWidth: 1,
    borderColor: lightTheme.colors.elevation,

    // borderTopLeftRadius:50
  },
  card: {
    borderRadius: 5,
    borderWidth: 0.5,
    padding: 10,
    elevation: 3,
    shadowColor: lightTheme.colors.elevation,
    shadowOffset: {
      width: 1,
      height: 1,
    },
    shadowRadius: 2,
    shadowOpacity: 1,
    flexDirection: 'row',
    columnGap: 10,
    // alignItems:'center'
  },
  chip: {
    height: responsiveHeight / 2,
    // width:responsiveHeight +10 ,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    rowGap: 10,
    alignItems: 'center',
  },

  column: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: 10,
    // alignItems:'center'
  },
  scroll: {
    paddingBottom: StatusBar.currentHeight * 3,
  },
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnSmall: {
    width: 100,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: lightTheme.colors.accent, // Use theme accent color
    borderRadius: 12, // Consistent modern rounded corners
  },
});

export default GolbalStyle;

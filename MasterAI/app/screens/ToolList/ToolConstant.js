import { Alert, ToastAndroid } from 'react-native';
import { SCREEN_NAME } from '../../Constant';

export const CATEGORIES = [
  'All',
  'New',
  'Image',
  'Social Media',
  'Education',
  'Analysis',
  'Writing',
  'Coding',
  'Design',
];

  const upcommingTools = () => {
    // Alert.alert('Coming Soon', 'This feature is not yet available.');
    ToastAndroid.show('This feature is not yet available.', ToastAndroid.SHORT);
    // ShowAlertMsg.showWarn('Coming Soon', 'This feature is not yet available.');
  };

export const ALL_TOOLS = navigation => [
  {
    title: 'Virtual Cloth Test',
    icon: 'tshirt-crew',
    category: 'New',
    onNavigate: title => {
      navigation.navigate(SCREEN_NAME.VirtualClothTest, {
        url: 'https://huggingface.co/spaces/Kwai-Kolors/Kolors-Virtual-Try-On',
        name: 'Kolors Virtual Try-On in the Wild',
      });
    },
  },
  // {
  //   title: 'AI Image Editing',
  //   icon: 'image-edit', // Assuming an appropriate icon for image editing
  //   category: 'New',
  //   // onNavigate: title => {
  //   //   navigation.navigate(SCREEN_NAME.VirtualClothTest, {
  //   //     url: 'https://huggingface.co/spaces/jasim0021/Gemini-Image-Edit', // Replace with actual URL
  //   //     name: 'AI Image Editing Tool',
  //   //   });
  //   // },
  //   onNavigate: title => {
  //     navigation.navigate(SCREEN_NAME.AIImageEdits);
  //   },
  // },
  {
    title: 'AI Video',
    icon: 'video', // Changed icon to 'video' based on title
    category: 'New',
    onNavigate: title => {
      navigation.navigate(SCREEN_NAME.VideoGeneration);
    },
  },
  {
    title: 'AI Math Solver',
    icon: 'calculate',
    category: 'Education',
    onNavigate: title => {
      navigation.navigate(SCREEN_NAME.AIMathSolver, {
        platform: 'AI Math Solver',
      });
    },
  },
  {
    title: 'Extract MCQs from Images',
    icon: 'question-answer',
    category: 'Education',
    onNavigate: title => {
      navigation.navigate(SCREEN_NAME.UploadPhoto, {
        title,
      });
    },
  },
  {
    title: 'Extract SAQs from Images',
    icon: 'question-answer',
    category: 'Education',
    onNavigate: title => {
      navigation.navigate(SCREEN_NAME.UploadPhoto, {
        title,
      });
    },
  },
  {
    title: 'AI Image Generation',
    icon: 'image',
    category: 'Image',
    onNavigate: title => {
      navigation.navigate(SCREEN_NAME.AIImageGeneration, {
        title,
      });
      // Alert.alert('Coming Soon', 'This feature is coming soon!');
    },
  },
  {
    title: 'AI Image Edit',
    icon: 'image',
    category: 'Image',
    onNavigate: title => {
      navigation.navigate(SCREEN_NAME.AIImageEditScreen, {
        title,
      });
      // Alert.alert('Coming Soon', 'This feature is coming soon!');
    },
  },
  {
    title: 'AI Image Edit',
    icon: 'image',
    category: 'New',
    onNavigate: title => {
      navigation.navigate(SCREEN_NAME.AIImageEditScreen, {
        title,
      });
      // Alert.alert('Coming Soon', 'This feature is coming soon!');
    },
  },

  
  {
    title: 'Create Facebook Captions from Photos',
    icon: 'facebook',
    category: 'Social Media',
    onNavigate: title => {
      navigation.navigate(SCREEN_NAME.CreateCaption, {
        platform: 'Facebook',
      });
    },
  },
  {
    title: 'Create Instagram Captions from Photos',
    icon: 'instagram',
    category: 'Social Media',
    onNavigate: title => {
      navigation.navigate(SCREEN_NAME.CreateCaption, {
        platform: 'Instagram',
      });
    },
  },
  {
    title: 'Create LinkedIn Post',
    icon: 'business-center',
    category: 'Social Media',
    onNavigate: title => {
      navigation.navigate(SCREEN_NAME.PostCreation, {
        platform: 'LinkedIn',
      });
    },
  }, // New Tool
  {
    title: 'Create Facebook Post',
    icon: 'facebook',
    category: 'Social Media',
    onNavigate: title => {
      navigation.navigate(SCREEN_NAME.PostCreation, {
        platform: 'Facebook',
      });
    },
  }, // New Tool
  {
    title: 'Create Twitter Post',
    icon: 'twitter',
    category: 'Social Media',
    onNavigate: title => {
      navigation.navigate(SCREEN_NAME.PostCreation, {
        platform: 'Twitter',
      });
    },
  }, // New Tool

  {
    title: 'Analyze User Feelings from Photos',
    icon: 'sentiment-satisfied',
    category: 'Analysis',
    onNavigate: title => {
      navigation.navigate(SCREEN_NAME.AnalyzeUserFeelings, {
        platform: 'Analyze User Feelings',
      });
    },
  },
  {
    title: 'Estimate Age from Photos',
    icon: 'accessibility',
    category: 'Analysis',
    onNavigate: title => {
      // upcommingTools();
      navigation.navigate(SCREEN_NAME.AgeAnalizer, {
        platform: 'Analyze User Feelings',
      });
    },
  },
  {
    title: 'Identify Trees from Photos',
    icon: 'pine-tree',
    category: 'Analysis',
    onNavigate: title => {
      // upcommingTools();
      navigation.navigate(SCREEN_NAME.TreeAnalize, {
        platform: 'Analyze Tree',
      });
    },
  },
  {
    title: 'Identify Animals from Photos',
    icon: 'pets',
    category: 'Analysis',
    onNavigate: title => {
      // upcommingTools();
      navigation.navigate(SCREEN_NAME.AnimalAnalizer, {
        platform: 'Analyze Animal',
      });
    },
  },
  {
    title: 'Generate status with music based on photo',
    icon: 'music-note',
    category: 'Writing',
    onNavigate: title => {
      upcommingTools();
    },
  },
  {
    title: 'Write Quotes',
    icon: 'format-quote',
    category: 'Writing',
    onNavigate: title => {
      upcommingTools();
    },
  },
  {
    title: 'Craft Stories',
    icon: 'book',
    category: 'Writing',
    onNavigate: title => {
      upcommingTools();
    },
  },
  {
    title: 'Generate Code Snippets',
    icon: 'code',
    category: 'Coding',
    onNavigate: title => {
      upcommingTools();
    },
  },
  {
    title: 'Take Quick Notes',
    icon: 'note',
    category: 'Writing',
    onNavigate: title => {
      upcommingTools();
    },
  },
  {
    title: 'Design Responsive UI',
    icon: 'design-services',
    category: 'Design',
    onNavigate: title => {
      upcommingTools();
    },
  },
  {
    title: 'AI Photo Edit',
    icon: 'edit',
    category: 'Design',
    onNavigate: title => {
      // navigation.navigate(SCREEN_NAME.AIPhotoEdit, {
      //   platform: 'Analyze User Feelings',
      // });
      upcommingTools();
    },
  },
];

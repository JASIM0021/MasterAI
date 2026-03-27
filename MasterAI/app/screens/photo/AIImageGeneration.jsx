import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  Chip,
  Portal,
  Modal,
  ActivityIndicator,
  Snackbar,
} from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Header from "../../Components/header/Header";
import { useGenerateImageMutation } from "../../features/api/imageSlice";
import axios from "axios";
import Loader from "../../Components/loader/Loader";
import { useNavigation } from "@react-navigation/native";
import { SCREEN_NAME } from "../../Constant";
import ReportContentModal from "../../Components/Model/ReportContentModal";
import { useReportMutation } from "../../features/api/upload/uploadPhoto";
import GolbalStyle from "../../Style";
import apiconstant from "../../Constant/apiconstant";
import { CompactLowCreditBanner } from "../../Components/ads/LowCreditBanner";

const { width } = Dimensions.get("window");

const FORBIDDEN_WORDS = [
  "sex",
  "fucking",
  "fuck",
  "porn",
  "porno",
  "pornography",
  "xxx",
  "sex video",
  "nude",
  "naked",
  "adult",
  "18+",
  "hot video",
  "escort",
  "call girl",
  "hookup",
  "prostitute",
  "cam girl",
  "live sex",
  "erotic",
  "fetish",
  "bdsm",
  "hardcore",
  "softcore",
  "stripper",
  "strip club",
  "onlyfans",
  "fansly",
  "sugar daddy",
  "sugar baby",
  "affair",
  "one night stand",
  "dating",
  "tinder",
  "grindr",
  "bumble",
  "sex chat",
  "live cam",
  "sex toy",
  "sex store",
  "vibrator",
  "dildo",
  "adult shop",
  "sex shop",
  "gay porn",
  "lesbian porn",
  "incest",
  "taboo",
  "milf",
  "teen porn",
  "hentai",
  "jav",
  "pussy",
  "boobs",
  "breast",
  "nipple",
  "dick",
  "penis",
  "vagina",
  "anal",
  "oral sex",
  "deep throat",
  "69",
  "fisting",
  "cum",
  "ejaculation",
  "orgy",
  "threesome",
  "gangbang",
  "swinger",
  "cuckold",
  "stepmom",
  "stepdad",
  "stepsister",
  "stepbrother",
  "mistress",
  "dominatrix",
  "sissy",
  "panties",
  "lingerie",
  "sex doll",
  "masturbation",
  "handjob",
  "blowjob",
  "doggy style",
  "missionary",
  "cowgirl",
  "reverse cowgirl",
  "creampie",
  "facial",
  "bukkake",
  "spank",
  "bondage",
  "kinky",
  "pegging",
  "golden shower",
  "bdsm porn",
  "submissive",
  "dominant",
  "latex",
  "furry porn",
  "cartoon porn",
  "cosplay porn",
  "sex position",
  "pornhub",
  "xvideos",
  "xhamster",
  "redtube",
  "brazzers",
  "bangbros",
  "naughty america",
  "playboy",
  "hustler",
  "penthouse",
  "onlyfans leak",
  "sex fantasy",
  "erotic massage",
  "happy ending",
  "cam show",
  "cam model",
  "squirting",
  "sex education (non-legit)",
  "sex training",
  "nsfw",
  "nude model",
];

const AIImageGeneration = () => {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("");
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReportModalVisible, setReportModalVisible] = useState(false);
  const [generateImage, { isLoading: apiLoading, data, error }] =
    useGenerateImageMutation();
  const navigation = useNavigation();

  const [currentImageId, setCurrentImageId] = useState(null);
  const [report] = useReportMutation(); //

  const containsBadWords = (text) => {
    const lowerText = text.toLowerCase();
    return FORBIDDEN_WORDS.some((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "i");
      return regex.test(lowerText);
    });
  };

  const handleReport = async (captionId) => {
    console.log("first", captionId);
    setCurrentImageId(captionId);
    setReportModalVisible(true); // Show the report modal
    console.log("isReportModalVisible", isReportModalVisible);
  };

  const handleSubmitReport = async (reportData) => {
    console.log(`Report for caption ${currentImageId}:`, reportData);
    report(reportData); // Submit the report
    setSnackbarVisible(true);
    setErrorMessage(
      `Report for  ${
        currentImageId || Math.random().toString(36).substr(2, 9)
      } submitted.`,
    );
  };

  // console.log({ data, error });
  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      padding: 16,
    },
    input: {
      marginBottom: 16,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    chipContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: 16,
    },
    chip: {
      margin: 4,
    },
    imageContainer: {
      width: "100%",
      height: width,
      borderRadius: 20,
      overflow: "hidden",
      marginBottom: 24,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      justifyContent: "center",
      alignItems: "center",
    },
    image: {
      width: "100%",
      height: "100%",
    },
    generateButton: {
      marginTop: 16,
    },
    modalContent: {
      backgroundColor: "white",
      padding: 20,
      margin: 20,
      borderRadius: 15,
    },
    generatePostButton: {
      position: "absolute",
      bottom: 16,
      left: 16,
      right: 16,
    },
  });

  const styleOptions = [
    "Realistic",
    "Cartoon",
    "Anime",
    "Watercolor",
    "Oil Painting",
    "Sketch",
    "Digital Art",
    "Pixel Art",
    "3D Render",
    "Abstract",
  ];
  const handleGenerate = async () => {
    // Basic validation
    if (!prompt || !style) {
      setErrorMessage("Please provide both a prompt and a style.");
      setSnackbarVisible(true);
      setIsLoading(false);
      return;
    }
    if (containsBadWords(prompt)) {
      setErrorMessage(
        "Prompt contains inappropriate content. Please modify your request.",
      );
      setSnackbarVisible(true);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    if (prompt && style) {
      console.log("prompt", prompt);
      const filterPrompt = await checkPrompt(prompt);
      console.log("filterPrompt", filterPrompt);
      setPrompt(filterPrompt);
      try {
        const response = await axios.post(
          "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev",
          {
            inputs: `${filterPrompt} in ${style} style. Use english for all text.
            - do not  return any sextual image
            - do not create any image that harm comunity
            - do not create any image that harm animal
            - do not create any image that harm enviroment
            - do not create any image that harm human
            - do not create any image that harm society
            - do not create any image that harm children
            `,
          },
          {
            headers: {
              Authorization:
                "Bearer " + process.env.EXPO_PUBLIC_HUGGING_FACE_API,
              "Content-Type": "application/json",
            },
            responseType: "arraybuffer",
          },
        );

        // console.log('response', response?.request?._response);
        if (response.data) {
          // const base64Image = Buffer.from(
          //   response?.request?._response,
          //   'binary',
          // ).toString('base64');
          const imageUrl = `data:image/jpeg;base64,${response?.request?._response}`;
          setGeneratedImage(imageUrl);
          setIsModalVisible(true);
        } else {
          throw new Error("Failed to generate image");
        }
      } catch (err) {
        console.log("err", err);
        console.log("err", err);
        if (err.message === "Network Error") {
          setErrorMessage(
            "Network error. Please check your internet connection and try again.",
          );
        } else if (err.response && err.response.status === 400) {
          // Handle the parsing error
          const blob = new Blob([err.response.data], { type: "image/jpeg" });
          const imageUrl = URL.createObjectURL(blob);
          setGeneratedImage(imageUrl);
          setIsModalVisible(true);
        } else {
          setIsLoading(false);
          setErrorMessage("Failed to generate image. Please try again.");
        }
        setSnackbarVisible(true);
      }
    } else {
      setErrorMessage("Please provide both a prompt and a style.");
      setSnackbarVisible(true);
    }
    setIsLoading(false);
  };

  const checkPrompt = async (prompt) => {
    const new_prompt = await axios.get(
      `http://43.204.234.134:3000/api/checkPrompt?prompt=You are an intermediary tasked with evaluating user-submitted text prompts intended for image generation. Your role is to determine if the prompt is appropriate. If the prompt contains offensive, sexually explicit, or otherwise inappropriate content, you must rephrase it to remove the objectionable elements. Here is the user's prompt:${prompt}`,
      {
        headers: {
          apiKey: apiconstant.masterAiKey,
          "Content-Type": "application/json",
        },
      },
    );
    console.log(
      "new_prompt",
      new_prompt?.data?.response?.response?.verifiedPrompt,
    );

    return new_prompt?.data?.response?.response?.verifiedPrompt;
  };

  const handleGeneratePost = () => {
    if (generatedImage) {
      navigation.navigate(SCREEN_NAME.PostCreation, {
        imageUri: generatedImage,
        platform: "AI Generated", // You can change this as needed
      });
    }
  };

  return (
    <LinearGradient
      colors={["#4158D0", "#C850C0", "#FFCC70"]}
      style={styles.container}
    >
      <ScrollView>
        <Header isBack={true} title="AI Image Generation" />
        <CompactLowCreditBanner source="ai_generation" />
        <View style={styles.content}>
          <TextInput
            label="Describe your image"
            value={prompt}
            onChangeText={setPrompt}
            style={styles.input}
            multiline
            numberOfLines={3}
          />

          <Text style={{ marginBottom: 8, color: "white" }}>
            Choose a style:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipContainer}
          >
            {styleOptions.map((option) => (
              <Chip
                key={option}
                selected={style === option}
                onPress={() => setStyle(option)}
                style={styles.chip}
              >
                {option}
              </Chip>
            ))}
          </ScrollView>

          <View style={styles.imageContainer}>
            {generatedImage ? (
              <>
                <Image
                  source={{ uri: generatedImage }}
                  style={styles.image}
                  resizeMode="cover"
                />
                <Button
                  mode="contained"
                  onPress={handleGeneratePost}
                  style={styles.generatePostButton}
                  icon="post"
                >
                  Generate Post with This Image
                </Button>
                <Button
                  mode="outlined"
                  onPress={() =>
                    handleReport(Math.random().toString(36).substr(2, 9))
                  }
                  style={GolbalStyle.topPositionRight}
                  icon="alert-circle-outline"
                >
                  Report
                </Button>
              </>
            ) : (
              <MaterialCommunityIcons
                name="image-plus"
                size={64}
                color="rgba(255, 255, 255, 0.8)"
              />
            )}
          </View>

          <Button
            mode="contained"
            onPress={handleGenerate}
            style={styles.generateButton}
            icon="magic-staff"
            loading={isLoading}
            disabled={isLoading || !prompt || !style}
          >
            Generate Image
          </Button>
        </View>

        <Portal>
          <Modal
            visible={isModalVisible}
            onDismiss={() => setIsModalVisible(false)}
            contentContainerStyle={styles.modalContent}
          >
            {generatedImage && (
              <Image
                source={{ uri: generatedImage }}
                style={{ width: "100%", height: 300, marginBottom: 20 }}
                resizeMode="contain"
              />
            )}
            <Button mode="contained" onPress={() => setIsModalVisible(false)}>
              Close
            </Button>
            <Button
              mode="outlined"
              onPress={() =>
                handleReport(Math.random().toString(36).substr(2, 9))
              }
              style={{ marginTop: 8 }}
              icon="alert-circle-outline"
            >
              Report
            </Button>
          </Modal>
        </Portal>
      </ScrollView>
      <Loader isAnalyzing={isLoading} />
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        action={{ label: "OK", onPress: () => setSnackbarVisible(false) }}
      >
        {errorMessage}
      </Snackbar>
      <ReportContentModal
        visible={isReportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleSubmitReport}
      />
    </LinearGradient>
  );
};

export default AIImageGeneration;

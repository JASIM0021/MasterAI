import React, { useState } from "react";
import { View, Button, Text } from "react-native";
import { LoginManager, AccessToken } from "react-native-fbsdk-next";

const LoginFB = () => {
  const [accessToken, setAccessToken] = useState(null);
  const [userId, setUserId] = useState(null);

  const handleLogin = async () => {
    try {
      const result = await LoginManager.logInWithPermissions([
        "public_profile",

        "email",
        "pages_manage_posts",
        "pages_read_engagement",
        // "publish_pages",
      ]);
      console.log("result", result);
      if (result.isCancelled) {
        console.log("Login cancelled");
      } else {
        const currentAccessToken = await AccessToken.getCurrentAccessToken();
        if (currentAccessToken) {
          setAccessToken(currentAccessToken.accessToken);
          // Fetch user profile
          fetchUserProfile(currentAccessToken.accessToken);
        }
      }
    } catch (error) {
      console.log("Login error:", error);
    }
  };

  const fetchUserProfile = async (token) => {
    try {
      const response = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email&access_token=${token}`
      );
      const data = await response.json();
      console.log("User Profile:", data);
      setUserId(data.id); // Extract the userId
    } catch (error) {
      console.log("Error fetching user profile:", error);
    }
  };

  console.log("accessToken", accessToken);
  return (
    <View>
      <Button title="Login with Facebook" onPress={handleLogin} />
      {accessToken && <Text>Access Token: {accessToken}</Text>}
      {userId && <Text>User ID: {userId}</Text>}
    </View>
  );
};

export default LoginFB;

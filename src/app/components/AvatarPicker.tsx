import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, View } from "react-native";
import { uploadImage } from "../../api/uploadApi";

export default function AvatarPicker({
  uri,
  onUploaded,
  size = 112,
}: {
  uri?: string;
  onUploaded: (url: string) => Promise<void> | void;
  size?: number;
}) {
  const [uploading, setUploading] = useState(false);

  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;

    const asset = result.assets[0];

    try {
      setUploading(true);
      const url = await uploadImage(asset.uri, "profiles");
      await onUploaded(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Avatar upload error:", error);
      Alert.alert("Could not update photo", message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Pressable
      onPress={pick}
      disabled={uploading}
      accessibilityRole="button"
      accessibilityLabel="Change profile photo"
      style={{ width: size, height: size }}>
      <Image
        source={uri ? { uri } : require("../../../assets/images/user.png")}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        className="border-2 border-blue-700"
      />

      {uploading ? (
        <View
          className="absolute items-center justify-center bg-black/40"
          style={{ width: size, height: size, borderRadius: size / 2 }}>
          <ActivityIndicator color="white" />
        </View>
      ) : (
        <View className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-blue-700">
          <Ionicons name="camera" size={18} color="white" />
        </View>
      )}
    </Pressable>
  );
}

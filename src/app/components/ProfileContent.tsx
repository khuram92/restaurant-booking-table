import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { ActivityIndicator, Button, TextInput } from "react-native-paper";
import { deleteMe, getMe, updateMe } from "../../api/authApi";
import AvatarPicker from "./AvatarPicker";

type Profile = {
  firstName?: string;
  lastName?: string;
  address?: string;
  phone?: string;
  email?: string;
  avatar?: string;
};

type Props = {
  showFoodInterest?: boolean;
};

const clearSession = async () => {
  await SecureStore.deleteItemAsync("authToken");
  await SecureStore.deleteItemAsync("userRole");
  await SecureStore.deleteItemAsync("rememberMePreference");
};

const ProfileContent = ({ showFoodInterest = true }: Props) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [address, setAddress] = useState("");

  const openUpdateModal = () => {
    setFirstName(profile?.firstName ?? "");
    setLastName(profile?.lastName ?? "");
    setPhone(profile?.phone ?? "");
    setEmail(profile?.email ?? "");
    setAddress(profile?.address ?? "");
    setCurrentPassword("");
    setNewPassword("");
    setShowUpdateModal(true);
  };

  const closeUpdateModal = () => {
    setShowUpdateModal(false);
    setCurrentPassword("");
    setNewPassword("");
  };

  const handleUpdate = async () => {
    const passwordChanging = newPassword.length > 0;

    if (passwordChanging && !currentPassword) {
      Alert.alert(
        "Current password required",
        "Enter your current password to change your  password.",
      );
      return;
    }
    if (passwordChanging && newPassword.length < 8) {
      Alert.alert(
        "Password too short",
        "Your new password must be at least 8 characters.",
      );
      return;
    }

    try {
      setSaving(true);

      const token = await SecureStore.getItemAsync("authToken");
      if (!token) {
        router.replace("/");
        return;
      }

      await updateMe(token, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        address: address.trim(),

        ...(passwordChanging ? { currentPassword } : {}),
        ...(passwordChanging ? { newPassword } : {}),
      });

      await loadProfile(); // same data shape as the first load
      closeUpdateModal();
      Alert.alert("Profile updated", "Your information has been saved.");
    } catch (error) {
      Alert.alert(
        "Could not update profile",
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setSaving(false);
    }
  };

  const getStoredToken = async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync("authToken");
    } catch (error) {
      console.error("Error reading auth token:", error);
      return null;
    }
  };

  const loadProfile = useCallback(async () => {
    try {
      const token = await getStoredToken();
      if (!token) return;

      const data: any = await getMe(token);
      const u = data?.user ?? data;
      setProfile({
        firstName: u?.firstName,
        lastName: u?.lastName,
        address: u?.address,
        phone: u?.phone,
        email: u?.email,
        avatar: u?.avatar,
      });
    } catch (e) {
      console.log("Error loading profile:", e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  const handleLogout = async () => {
    try {
      await clearSession();
      router.replace("/");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  const handleDelete = async () => {
    if (!password) {
      Alert.alert(
        "Password required",
        "Enter your password to delete your account.",
      );
      return;
    }

    try {
      setDeleting(true);

      const token = await SecureStore.getItemAsync("authToken");
      if (!token) {
        router.replace("/");
        return;
      }

      await deleteMe(token, password);

      await clearSession();
      setShowDeleteModal(false);
      router.replace("/");
    } catch (error) {
      Alert.alert(
        "Could not delete account",
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setDeleting(false);
      setPassword("");
    }
  };

  return (
    <View className="flex-1 pt-16 justify-between bg-white ">
      <ScrollView className="px-4  mb-2">
        <View className="flex items-center mt-6 bg-white border-dashed border-gray-600 border rounded-2xl">
          <View className="flex mt-14">
            <AvatarPicker
              uri={profile?.avatar}
              onUploaded={async (url) => {
                const token = await SecureStore.getItemAsync("authToken");
                if (!token) return;
                await updateMe(token, { avatar: url });
                await loadProfile();
              }}
            />
          </View>

          <View className="flex items-center mt-6">
            <Text className="text-2xl font-bold text-black">
              {profile?.lastName ?? "there"}
            </Text>

            <View className="flex-row items-center mt-4 mb-6">
              <Text numberOfLines={3} className=" text-black text-base">
                {profile?.address || "Address not provided"}
              </Text>
            </View>
          </View>
        </View>

        <View className="flex  mt-4 bg-white border border-dashed border-gray-500 rounded-2xl px-4 py-4">
          <Text className="text-black font-bold text-xl ">
            Personal Information
          </Text>
          <View className="flex mt-8">
            <View className="border-1 bg-white border border-dashed border-gray-500   rounded-full h-12  p-2 flex justify-center">
              <Text className="text-base ml-4 text-black font-medium  ">
                {profile?.phone}
              </Text>
            </View>
          </View>
          <View className="flex mt-4">
            <View className="border-1 bg-white border border-dashed border-gray-500 rounded-full h-12  p-2 flex justify-center">
              <Text className="text-base ml-4 text-black font-medium ">
                {profile?.firstName} {profile?.lastName}
              </Text>
            </View>
          </View>
          <View className="flex mt-4">
            <View className="border-1 bg-white border border-dashed border-gray-500  rounded-full h-12  p-2 flex justify-center">
              <Text className="text-base ml-4 text-black font-medium  ">
                {profile?.email}
              </Text>
            </View>
          </View>
          <View className="flex mt-4">
            <View className="border-1 bg-white border border-dashed border-gray-500 rounded-xl h-28  p-2 flex ">
              <Text
                numberOfLines={3}
                className="text-base ml-2  text-black font-medium ">
                {profile?.address || "Not Provided"}
              </Text>
            </View>
          </View>
        </View>

        {showFoodInterest && (
          <View className="flex  mt-4 bg-gray-100 rounded-2xl px-4 py-4">
            <Text className="text-black font-bold text-xl ">
              Food Interest
            </Text>
          </View>
        )}

        <View className="mt-4 border-1 bg-blue-400 border border-blue-500 rounded-full justify-center flex ">
          <Button onPress={openUpdateModal}>
            <Text className="text-xl font-bold text-white">Edit profile </Text>
          </Button>
        </View>
        <Modal
          visible={showUpdateModal}
          transparent
          animationType="fade"
          onRequestClose={closeUpdateModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 bg-black/60 justify-center">
            <ScrollView
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "center",
                padding: 20,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View
                className="rounded-3xl bg-white p-6 shadow-2xl"
                style={{ elevation: 6 }}>
                <View className="mb-5 flex-row items-center justify-between border-b border-gray-100 pb-3">
                  <View>
                    <Text className="text-xl font-extrabold text-blue-900">
                      Edit profile
                    </Text>
                    <Text className="text-xs text-gray-400 mt-0.5">
                      Keep your account details up to date
                    </Text>
                  </View>
                  <Pressable
                    onPress={closeUpdateModal}
                    disabled={saving}
                    hitSlop={8}
                    className="h-8 w-8 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200">
                    <Ionicons name="close" size={18} color="#4B5563" />
                  </Pressable>
                </View>

                {/* Inputs */}
                <TextInput
                  label="First name"
                  value={firstName}
                  onChangeText={setFirstName}
                  style={{ marginBottom: 12 }}
                />
                <TextInput
                  label="Last name"
                  value={lastName}
                  onChangeText={setLastName}
                  style={{ marginBottom: 12 }}
                />
                <TextInput
                  label="Phone"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  style={{ marginBottom: 12 }}
                />
                <TextInput
                  label="Address"
                  value={address}
                  onChangeText={setAddress}
                  multiline
                  style={{ marginBottom: 12 }}
                />

                <TextInput
                  label="Current password"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  style={{ marginBottom: 12 }}
                />
                <TextInput
                  label="New password (optional)"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  style={{ marginBottom: 16 }}
                />

                {/* Action Buttons */}
                <View className="mt-2 flex-row gap-3">
                  <Pressable
                    onPress={closeUpdateModal}
                    disabled={saving}
                    className="flex-1 items-center justify-center rounded-2xl bg-gray-100 py-4 active:bg-gray-200">
                    <Text className="font-semibold text-gray-700">Cancel</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleUpdate}
                    disabled={saving}
                    className={`flex-1 items-center justify-center rounded-2xl py-4 shadow-sm active:opacity-90 ${
                      saving ? "bg-blue-400" : "bg-blue-600"
                    }`}>
                    {saving ? (
                      <View className="flex-row items-center gap-2">
                        <ActivityIndicator size="small" color="white" />
                        <Text className="font-semibold text-white">
                          Saving...
                        </Text>
                      </View>
                    ) : (
                      <Text className="font-semibold text-white">
                        Save Changes
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
        <View className="mt-4 border-1 border border-blue-500 bg-blue-100 rounded-full justify-center flex ">
          <Button onPress={handleLogout}>
            <Text className="text-xl font-bold text-black">Logout </Text>
          </Button>
        </View>

        <View className="mt-4 border-1 bg-red-700 rounded-full justify-center flex ">
          <Button onPress={() => setShowDeleteModal(true)}>
            <Text className="text-xl font-bold text-white">
              Delete Account{" "}
            </Text>
          </Button>
        </View>

        <Modal
          visible={showDeleteModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteModal(false)}>
          <View className="flex-1 items-center justify-center bg-black/50 px-6">
            <View className="w-full rounded-2xl bg-white p-6">
              <Text className="text-xl font-bold text-blue-600">
                Confirm deletion
              </Text>
              <Text className="mt-2 text-gray-600 text-base font-medium">
                Enter your password to permanently delete your account.
              </Text>

              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry
                autoCapitalize="none"
                className=" rounded-full border border-gray-300 px-4 py-3"
              />

              <View className="mt-5 flex-row gap-3">
                <Pressable
                  onPress={() => {
                    setShowDeleteModal(false);
                    setPassword("");
                  }}
                  disabled={deleting}
                  className="flex-1 items-center rounded-full border border-gray-300 bg-blue-400 py-3">
                  <Text className="font-semibold text-white">Cancel</Text>
                </Pressable>

                <Pressable
                  onPress={handleDelete}
                  disabled={deleting}
                  className="flex-1 items-center rounded-full bg-red-600 py-3">
                  {deleting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="font-semibold text-white">Delete</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
};

export default ProfileContent;

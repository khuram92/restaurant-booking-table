// src/app/(auth)/forgot-password.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Alert, Image, Pressable, Text, TextInput, View } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { forgotPassword, resetPassword, verifyOtp } from "../api/authApi";

type Step = "email" | "otp" | "password";

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // STEP 1: Send OTP to Email
  const handleSendOtp = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    try {
      setLoading(true);
      await forgotPassword(email.trim());
      Alert.alert(
        "Success",
        "A 6-digit verification code has been sent to your email.",
      );
      setStep("otp");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP Code
  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.length < 6) {
      Alert.alert("Error", "Please enter a valid 6-digit OTP code.");
      return;
    }

    try {
      setLoading(true);
      await verifyOtp({ email: email.trim(), otp: otp.trim() });
      Alert.alert(
        "Success",
        "Code verified successfully! Please enter your new password.",
      );
      setStep("password");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Invalid or expired OTP code.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Reset Password & Confirm Match
  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert("Error", "Please fill in all password fields.");
      return;
    }

    // Check for at least 8 characters, numbers, and special characters
    const passwordRegex =
      /^(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>])[a-zA-Z0-9!@#$%^&*(),.?":{}|<>]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      Alert.alert(
        "Weak Password",
        "Password must be at least 8 characters long and include numbers and special characters.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        "Error",
        "New passwords do not match. Please check and try again.",
      );
      return;
    }

    try {
      setLoading(true);
      await resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });

      Alert.alert(
        "Success",
        "Your password has been reset successfully! Please log in.",
        [{ text: "Log In", onPress: () => router.replace("/") }],
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#2F6FED", "#1FD1D1"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}>
      <View className="flex px-6 pt-12">
        {/* Header Logo */}
        <View className="flex-row justify-center items-center mb-10">
          <Image
            source={require("../../assets/images/logo.png")}
            className="w-8 h-8 mr-2"
          />
          <Text className="text-lg font-semibold text-white">
            Booking Tables
          </Text>
        </View>

        {/* Card Container */}
        <View className="bg-white rounded-2xl p-6 shadow-lg">
          <Link href="/" asChild>
            <Pressable className="mb-4">
              <Ionicons name="arrow-back" size={24} color="black" />
            </Pressable>
          </Link>

          <View className="py-2">
            <Text className="text-3xl font-bold mb-2 text-gray-950">
              {step === "email" && "Reset Password"}
              {step === "otp" && "Enter OTP Code"}
              {step === "password" && "New Password"}
            </Text>
            <Text className="text-gray-500 mb-6 text-sm leading-relaxed">
              {step === "email" &&
                "Enter your registered email address and we'll send you a 6-digit verification code."}
              {step === "otp" &&
                `We've sent a 6-digit code to ${email}. Enter it below to proceed.`}
              {step === "password" &&
                "Enter your new password below (min 8 chars, numbers & symbols) and confirm it."}
            </Text>

            {/* STEP 1: EMAIL INPUT */}
            {step === "email" && (
              <>
                <Text className="text-sm font-semibold mb-2 text-gray-700">
                  Email
                </Text>
                <TextInput
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  className="border border-gray-300 rounded-lg px-4 py-3 mb-6 bg-gray-50 text-gray-900"
                />

                <Pressable
                  onPress={handleSendOtp}
                  disabled={loading}
                  className="bg-blue-600 py-3.5 rounded-lg items-center justify-center flex-row">
                  {loading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text className="text-white font-semibold text-base">
                      Send OTP Code
                    </Text>
                  )}
                </Pressable>
              </>
            )}

            {/* STEP 2: OTP VERIFICATION */}
            {step === "otp" && (
              <>
                <Text className="text-sm font-semibold mb-2 text-gray-700">
                  6-Digit OTP Code
                </Text>
                <TextInput
                  placeholder="123456"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                  className="border border-gray-300 rounded-lg px-4 py-3 mb-6 bg-gray-50 text-gray-900 tracking-widest text-lg font-bold text-center"
                />

                <Pressable
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  className="bg-blue-600 py-3.5 rounded-lg items-center justify-center flex-row mb-4">
                  {loading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text className="text-white font-semibold text-base">
                      Verify Code
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => setStep("email")}
                  className="items-center">
                  <Text className="text-blue-600 font-medium text-sm">
                    Change Email Address
                  </Text>
                </Pressable>
              </>
            )}

            {/* STEP 3: NEW PASSWORD & CONFIRM PASSWORD */}
            {step === "password" && (
              <>
                <Text className="text-sm font-semibold mb-2 text-gray-700">
                  New Password
                </Text>
                <View className="flex-row items-center border border-gray-300 rounded-lg bg-gray-50 mb-4 px-4">
                  <TextInput
                    placeholder="Min 8 chars, numbers & symbols"
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    className="flex-1 py-3 text-gray-900"
                  />
                  <Pressable
                    onPress={() => setShowNewPassword(!showNewPassword)}>
                    <Ionicons
                      name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="gray"
                    />
                  </Pressable>
                </View>

                <Text className="text-sm font-semibold mb-2 text-gray-700">
                  Confirm New Password
                </Text>
                <View className="flex-row items-center border border-gray-300 rounded-lg bg-gray-50 mb-6 px-4">
                  <TextInput
                    placeholder="Re-enter new password"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    className="flex-1 py-3 text-gray-900"
                  />
                  <Pressable
                    onPress={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }>
                    <Ionicons
                      name={
                        showConfirmPassword ? "eye-off-outline" : "eye-outline"
                      }
                      size={20}
                      color="gray"
                    />
                  </Pressable>
                </View>

                <Pressable
                  onPress={handleResetPassword}
                  disabled={loading}
                  className="bg-blue-600 py-3.5 rounded-lg items-center justify-center flex-row">
                  {loading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text className="text-white font-semibold text-base">
                      Update Password
                    </Text>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

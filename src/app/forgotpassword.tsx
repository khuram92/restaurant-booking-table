// // src/app/(auth)/forgot-password.tsx
// import { Ionicons } from "@expo/vector-icons";
// import { LinearGradient } from "expo-linear-gradient";
// import { Link, router } from "expo-router";
// import { useState } from "react";
// import { Alert, Image, Pressable, Text, TextInput, View } from "react-native";
// import { ActivityIndicator } from "react-native-paper";
// import { forgotPassword, resetPassword } from "../api/authApi";

// export default function ForgotPassword() {
//   const [step, setStep] = useState<"email" | "reset">("email");
//   const [email, setEmail] = useState("");
//   const [otp, setOtp] = useState("");
//   const [newPassword, setNewPassword] = useState("");
//   const [loading, setLoading] = useState(false);

//   // Handle sending OTP
//   const handleSendOtp = async () => {
//     if (!email.trim()) {
//       Alert.alert("Error", "Please enter your email address.");
//       return;
//     }

//     try {
//       setLoading(true);
//       await forgotPassword(email.trim());
//       Alert.alert("Success", "A 6-digit verification code has been sent to your email.");
//       setStep("reset"); // Move to OTP & New Password step
//     } catch (error: any) {
//       Alert.alert("Error", error.message || "Failed to send OTP.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Handle resetting password with OTP
//   const handleResetPassword = async () => {
//     if (!otp.trim() || !newPassword.trim()) {
//       Alert.alert("Error", "Please enter both the OTP and your new password.");
//       return;
//     }

//     if (newPassword.length < 6) {
//       Alert.alert("Error", "Password must be at least 6 characters long.");
//       return;
//     }

//     try {
//       setLoading(true);
//       await resetPassword({
//         email: email.trim(),
//         otp: otp.trim(),
//         newPassword,
//       });

//       Alert.alert(
//         "Success",
//         "Your password has been reset successfully! Please log in.",
//         [{ text: "Log In", onPress: () => router.replace("/") }]
//       );
//     } catch (error: any) {
//       Alert.alert("Error", error.message || "Failed to reset password.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <LinearGradient
//       colors={["#2F6FED", "#1FD1D1"]}
//       start={{ x: 0, y: 0 }}
//       end={{ x: 0, y: 1 }}
//       style={{ flex: 1 }}>
//       <View className="flex px-6 pt-12">
//         {/* Header Logo */}
//         <View className="flex-row justify-center items-center mb-10">
//           <Image
//             source={require("../../assets/images/logo.png")}
//             className="w-8 h-8 mr-2"
//           />
//           <Text className="text-lg font-semibold text-white">
//             Booking Tables
//           </Text>
//         </View>

//         {/* Card Container */}
//         <View className="bg-white rounded-2xl p-6 shadow-lg">
//           <Link href="/" asChild>
//             <Pressable className="mb-4">
//               <Ionicons name="arrow-back" size={24} color="black" />
//             </Pressable>
//           </Link>

//           <View className="py-2">
//             <Text className="text-3xl font-bold mb-2 text-gray-900">
//               {step === "email" ? "Reset Password" : "Enter Verification Code"}
//             </Text>
//             <Text className="text-gray-500 mb-6 text-sm leading-relaxed">
//               {step === "email"
//                 ? "Enter your registered email address and we'll send you a 6-digit verification code."
//                 : `We've sent a 6-digit code to ${email}. Enter it below along with your new password.`}
//             </Text>

//             {step === "email" ? (
//               /* STEP 1: EMAIL INPUT */
//               <>
//                 <Text className="text-sm font-semibold mb-2 text-gray-700">Email</Text>
//                 <TextInput
//                   placeholder="you@example.com"
//                   keyboardType="email-address"
//                   autoCapitalize="none"
//                   value={email}
//                   onChangeText={setEmail}
//                   className="border border-gray-300 rounded-lg px-4 py-3 mb-6 bg-gray-50 text-gray-900"
//                 />

//                 <Pressable
//                   onPress={handleSendOtp}
//                   disabled={loading}
//                   className="bg-blue-600 py-3.5 rounded-lg items-center justify-center flex-row">
//                   {loading ? (
//                     <ActivityIndicator color="white" size="small" />
//                   ) : (
//                     <Text className="text-white font-semibold text-base">
//                       Send OTP Code
//                     </Text>
//                   )}
//                 </Pressable>
//               </>
//             ) : (
//               /* STEP 2: OTP & NEW PASSWORD INPUT */
//               <>
//                 <Text className="text-sm font-semibold mb-2 text-gray-700">6-Digit OTP Code</Text>
//                 <TextInput
//                   placeholder="123456"
//                   keyboardType="number-pad"
//                   maxLength={6}
//                   value={otp}
//                   onChangeText={setOtp}
//                   className="border border-gray-300 rounded-lg px-4 py-3 mb-4 bg-gray-50 text-gray-900 tracking-widest text-lg font-bold"
//                 />

//                 <Text className="text-sm font-semibold mb-2 text-gray-700">New Password</Text>
//                 <TextInput
//                   placeholder="At least 6 characters"
//                   secureTextEntry
//                   value={newPassword}
//                   onChangeText={setNewPassword}
//                   className="border border-gray-300 rounded-lg px-4 py-3 mb-6 bg-gray-50 text-gray-900"
//                 />

//                 <Pressable
//                   onPress={handleResetPassword}
//                   disabled={loading}
//                   className="bg-blue-600 py-3.5 rounded-lg items-center justify-center flex-row">
//                   {loading ? (
//                     <ActivityIndicator color="white" size="small" />
//                   ) : (
//                     <Text className="text-white font-semibold text-base">
//                       Update Password
//                     </Text>
//                   )}
//                 </Pressable>

//                 <Pressable
//                   onPress={() => setStep("email")}
//                   className="mt-4 items-center">
//                   <Text className="text-blue-600 font-medium text-sm">
//                     Resend Code / Change Email
//                   </Text>
//                 </Pressable>
//               </>
//             )}
//           </View>
//         </View>
//       </View>
//     </LinearGradient>
//   );
// }
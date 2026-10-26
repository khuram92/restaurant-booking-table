import { loginUser } from "@/api/authApi";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, router, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";

export default function App() {
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { email: signupEmail, password: signupPassword } =
    useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState(
    typeof signupEmail === "string" ? signupEmail : "",
  );

  const [password, setPassword] = useState(
    typeof signupPassword === "string" ? signupPassword : "",
  );
  useEffect(() => {
    const checkRememberedLogin = async () => {
      try {
        const token = await SecureStore.getItemAsync("authToken");
        const rememberPreference = await SecureStore.getItemAsync(
          "rememberMePreference",
        );
        const userRole = await SecureStore.getItemAsync("userRole");

        if (token && rememberPreference === "true") {
          if (userRole === "admin" || userRole === "Admin") {
            router.replace("/admin/adminDashboard");
          } else if (userRole === "restaurant" || userRole === "Restaurant") {
            const response = await fetch(
              "http://10.0.2.2:3000/api/restaurants/me/profile",
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );

            if (response.ok) {
              router.replace("/restaurant/restaurantDashboard");
            } else if (response.status === 404) {
              router.replace("/restaurant/createRestaurant");
            } else {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(
                errorData.message || "Could not check restaurant profile",
              );
            }
          } else {
            router.replace("/home");
          }
        } else {
          await SecureStore.deleteItemAsync("authToken");
          await SecureStore.deleteItemAsync("rememberMePreference");
          await SecureStore.deleteItemAsync("userRole");
        }
      } catch (err) {
        console.error("Error checking auto-login status:", err);
      }
    };

    checkRememberedLogin();
  }, []);

  const handleLogin = async () => {
    setError("");

    try {
      setLoading(true);

      const data = (await loginUser({
        email: email.trim(),
        password,
      })) as { token: string; user?: { role?: string }; role?: string };

      if (!data?.token) {
        throw new Error("Login response was invalid");
      }

      const userRole = data.role || data.user?.role || "customer";

      await SecureStore.setItemAsync("authToken", data.token);
      await SecureStore.setItemAsync("userRole", userRole);
      await SecureStore.setItemAsync(
        "rememberMePreference",
        rememberMe ? "true" : "false",
      );

      // Initial route redirect upon successful login
      if (userRole === "admin" || userRole === "Admin") {
        router.replace("/admin/adminDashboard");
      } else if (userRole === "restaurant" || userRole === "Restaurant") {
        try {
          const response = await fetch(
            "http://10.0.2.2:3000/api/restaurants/me/profile",
            {
              headers: {
                Authorization: `Bearer ${data.token}`,
              },
            },
          );

          if (response.ok) {
            router.replace("/restaurant/restaurantDashboard");
          } else if (response.status === 404) {
            router.replace("/restaurant/createRestaurant");
          } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData.message || "Could not check restaurant profile",
            );
          }
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "Could not check restaurant profile",
          );
        }
      } else {
        router.replace("/home");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
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
      <View className="flex px-8 pt-16">
        <View className="flex-row justify-center items-center mb-10">
          <Image
            source={require("../../assets/images/logo.png")}
            className="w-8 h-8 mr-2"
          />
          <Text className="text-lg font-semibold text-white">
            Booking Tables
          </Text>
        </View>

        <View className="justify-center bg-white rounded-2xl p-6">
          <View className="items-center mt-2 mb-6">
            <Text className="text-4xl font-bold mb-5 text-black">Login</Text>
            <View className="flex-row items-center justify-center">
              <Text className="text-gray-400">Don't have an account? </Text>
              <Link href="/singup" asChild>
                <Pressable>
                  <Text className="text-blue-400 font-medium">Sign Up</Text>
                </Pressable>
              </Link>
            </View>
          </View>
          <Text className="text-sm font-semibold mb-1 text-gray-400">
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            className="border border-gray-500 rounded-lg px-4 py-3 mb-4 text-black"
          />
          <Text className="text-sm font-semibold mb-1 text-gray-400">
            Password
          </Text>
          <View className="flex-row items-center border border-gray-500 rounded-lg px-4 mb-4">
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="********"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showPassword}
              className="flex-1 py-3 text-black"
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={
                showPassword ? "Hide password" : "Show password"
              }>
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color="#9ca3af"
              />
            </Pressable>
          </View>
          {error ? <Text className=" text-red-600">{error}</Text> : null}
          <View className="flex-row justify-between ">
            <Pressable
              onPress={() => setRememberMe(!rememberMe)}
              className="flex-row mt-2">
              <Ionicons
                name={rememberMe ? "checkbox" : "square-outline"}
                size={20}
                color={rememberMe ? "blue" : "gray"}
              />
              <Text className="ml-2 text-gray-400">Remember me</Text>
            </Pressable>
            <Link href="/forgotpassword" asChild>
              <Pressable className="self-end mt-2 mb-6">
                <Text className="text-blue-400 text-base">
                  Forgot Password?
                </Text>
              </Pressable>
            </Link>
          </View>

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            className="bg-blue-600 py-3 rounded-lg items-center mb-6">
            <Text className="text-white font-semibold">
              {loading ? "Logging in..." : "Log In"}
            </Text>
          </Pressable>
          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-px bg-gray-600" />
            <Text className="mx-3 text-gray-400 text-sm">Or</Text>
            <View className="flex-1 h-px bg-gray-600" />
          </View>
          <Pressable className="border border-gray-500 rounded-lg py-3 items-center mb-3 flex-row justify-center">
            <FontAwesome name="google" size={20} color="#4B4B4B" />
            <Text className="font-bold ml-4 text-black">
              Continue with Google
            </Text>
          </Pressable>
          <Pressable className="border border-gray-500 rounded-lg py-3 items-center mb-3 flex-row justify-center">
            <FontAwesome name="facebook" size={20} color="#0000FF" />
            <Text className="font-bold ml-4 text-black">
              Continue with Facebook
            </Text>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

import { createBooking } from "@/api/bookingApi";
import {
  getRestaurantById,
  resolveImageUrl,
  type Restaurant,
} from "@/api/restaurantApi";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { ActivityIndicator, Button, Checkbox } from "react-native-paper";
import NotificationBell from "./components/NotificationBell";
const BookingConfirmation = () => {
  const {
    restaurantId,
    restaurantName,
    date,
    time,
    guests,
    seatingType,
    request,
    floor,
  } = useLocalSearchParams<{
    restaurantId: string;
    restaurantName: string;
    date: string;
    time: string;
    guests: string;
    seatingType: string;
    request: string;
    floor: string;
  }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [restaurantLoading, setRestaurantLoading] = useState(true);
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadRestaurant = async () => {
      try {
        if (!restaurantId) return;
        const data = await getRestaurantById(restaurantId);
        setRestaurant(data);
      } catch (error) {
        console.error("Error loading restaurant:", error);
      } finally {
        setRestaurantLoading(false);
      }
    };

    loadRestaurant();
  }, [restaurantId]);

  const selectedDate = date ? new Date(date) : null;
  const formattedDate = selectedDate
    ? selectedDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No date selected";
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else
      router.replace({
        pathname: "/tableRequirements",
        params: { restaurantId },
      });
  };

  const handleConfirmBooking = async () => {
    if (
      !restaurantId ||
      !selectedDate ||
      !time ||
      !guests ||
      !seatingType ||
      !floor
    ) {
      Alert.alert(
        "Missing Information",
        "Please go back and complete all booking details.",
      );
      return;
    }

    try {
      setLoading(true);

      const data = await createBooking({
        restaurantId,
        date: selectedDate.toISOString(),
        time,
        guests: Number(guests),
        seatingType,
        floor,
        request: request || undefined,
      });

      Alert.alert(
        "Booking Confirmed",
        "Your table has been booked successfully!",
        [
          {
            text: "OK",
            onPress: () =>
              router.replace({
                pathname: "/bookingDetails",
                params: { id: data.booking._id },
              }),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "Booking Failed",
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  };
  if (restaurantLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#143d7b" />
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#9ca3af" />
        <Text className="mt-3 text-center text-base text-gray-700">
          Could not load this restaurant.
        </Text>
        <Pressable
          onPress={goBack}
          className="mt-4 rounded-full bg-blue-700 px-6 py-2">
          <Text className="font-semibold text-white">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const imageUrl = resolveImageUrl(restaurant.images?.[0]);

  const initial = restaurant.name?.trim().charAt(0).toUpperCase() || "?";
  const location = [restaurant.city, restaurant.province]
    .filter(Boolean)
    .join(", ");

  return (
    <View className=" flex-1 bg-white px-2 pt-16">
      <View className="flex-row justify-between  mb-4">
        <Pressable onPress={goBack} className=" w-12 h-12 ">
          <Ionicons name="arrow-back" size={24} color="#143d7b" />
        </Pressable>
        <Text className="text-[#143d7b] font-bold text-3xl">Book a Table</Text>
        <NotificationBell
          color="white"
          size={22}
          containerClassName="h-11 w-11 items-center justify-center rounded-full bg-[#143d7b]"
        />
      </View>
      <View className="flex  px-2">
        <View className="bg-gray-100 px-4 py-4  rounded-lg">
          <View className="flex-row ">
            {imageUrl ? (
              <Image
                key={imageUrl}
                source={{ uri: imageUrl }}
                resizeMode="cover"
                onError={() => setFailedUrls((prev) => [...prev, imageUrl])}
                className="h-28 w-28 rounded-lg"
              />
            ) : (
              <View className="h-28 w-28 items-center justify-center rounded-lg bg-[#143d7b]">
                <Text className="text-5xl font-bold text-black">{initial}</Text>
              </View>
            )}

            <View className="flex-1 justify-between px-2">
              <Text numberOfLines={2} className="text-2xl font-bold text-black">
                {restaurant.name || restaurantName}
              </Text>
              <View className="flex-row items-center">
                <Ionicons name="location" size={20} color="#143d7b" />
                <Text numberOfLines={1} className="flex-1">
                  {location || "Location unavailable"}
                </Text>
              </View>
            </View>
          </View>
          <View className="h-px bg-[#143d7b] mb-2 mt-4" />
          <View className="flex-row mt-4 items-center">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-300">
              <Ionicons name="calendar-outline" size={24} color="#143d7b" />
            </View>

            <View className="px-2">
              <Text className="text-lg">Date</Text>
              <Text
                className="text-lg font-bold text-[#143d7b]"
                style={{ color: "#143d7b" }}>
                {formattedDate}
              </Text>
            </View>
          </View>
          <View className="mt-4 flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-300">
              <Ionicons name="time-outline" size={24} color="#143d7b" />
            </View>

            <View className="px-2">
              <Text className="text-lg">Time</Text>
              <Text
                className="text-lg font-bold text-[#143d7b]"
                style={{ color: "#143d7b" }}>
                {time || "No time selected"}
              </Text>
            </View>
          </View>
          <View className="mt-4 flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-300">
              <Ionicons name="people" size={24} color="#143d7b" />
            </View>

            <View className="px-2">
              <Text className="text-lg">Seat</Text>
              <Text
                className="text-lg font-bold  text-[#143d7b] "
                style={{ color: "#143d7b" }}>
                {guests || "No guest"}
                &nbsp; - Person
              </Text>
            </View>
          </View>
          <View className="mt-4 flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-300">
              <MaterialCommunityIcons
                name="floor-plan"
                size={24}
                color="#143d7b"
              />
            </View>

            <View className="px-2">
              <Text className="text-lg">Floor</Text>
              <Text
                className="text-lg font-bold text-[#143d7b]"
                style={{ color: "#143d7b" }}>
                {floor || "NOT Selected"}
              </Text>
            </View>
          </View>

          <View className="mt-4 flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-300">
              <Ionicons name="restaurant" size={24} color="#143d7b" />
            </View>

            <View className="px-2">
              <Text className="text-lg">Type</Text>
              <Text
                className="text-lg font-bold text-[#143d7b]"
                style={{ color: "#143d7b" }}>
                {seatingType || "NOT Selected"}
              </Text>
            </View>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            className="mt-4  border border-[#143d7b] rounded-lg"
            style={{ height: 50 }}>
            <Text className="font-semibold px-2 text-[#143d7b]">
              {request || "No special Requirements"}
            </Text>
          </ScrollView>
        </View>
        <Pressable
          onPress={() => setAgreed((checked) => !checked)}
          className="mb-4 flex-row items-center mt-4"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}>
          <Checkbox
            status={agreed ? "checked" : "unchecked"}
            onPress={() => setAgreed((checked) => !checked)}
          />
          <Text className="flex-1 text-[#143d7b]">
            I agree to the terms and cancellation policy
          </Text>
        </Pressable>
        <Button
          buttonColor="#143d7b"
          mode="contained"
          disabled={!agreed || loading}
          loading={loading}
          onPress={handleConfirmBooking}>
          Confirm Booking
        </Button>
      </View>
    </View>
  );
};

export default BookingConfirmation;

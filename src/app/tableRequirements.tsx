import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button, RadioButton } from "react-native-paper";
import {
  getFavorites,
  toggleFavorite,
  type FavoriteRestaurant,
} from "../api/favoritesApi";
import {
  getRestaurantById,
  resolveImageUrl,
  type Restaurant,
} from "../api/restaurantApi";
import NotificationBell from "./components/NotificationBell";

const TOKEN_KEY = "authToken"; // same key used in index.tsx and bookingApi.ts

const DEFAULT_SEATING = ["Indoor", "Outdoor", "Smoking"];
const DEFAULT_FLOORS = ["First Floor", "Second Floor", "Third Floor"];

const parseTimeToMinutes = (value?: string): number | null => {
  if (!value) return null;
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
};

const formatMinutes = (total: number) => {
  const t = total % 1440;
  const hour = Math.floor(t / 60);
  const minutes = t % 60;
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${period}`;
};

// 30-minute slots between opening and closing (handles after-midnight closing)
const buildTimeSlots = (opening?: string, closing?: string): string[] => {
  const open = parseTimeToMinutes(opening);
  const close = parseTimeToMinutes(closing);

  const start = open ?? 9 * 60;
  let end = close ?? 24 * 60;
  if (end <= start) end += 1440;

  const slots: string[] = [];
  for (let t = start; t <= end - 30; t += 30) slots.push(formatMinutes(t));
  return slots;
};

const TableRequirements = () => {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [guestCount, setGuestCount] = useState(1);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedFloorState, setSelectedFloorState] = useState<string | null>(
    null,
  );
  const [specialRequest, setSpecialRequest] = useState("");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Load restaurant + whether it's already a favourite
  useEffect(() => {
    const load = async () => {
      try {
        if (!restaurantId) {
          Alert.alert("Error", "No restaurant selected");
          return;
        }

        const token = await SecureStore.getItemAsync(TOKEN_KEY);

        const [data, favs] = await Promise.all([
          getRestaurantById(restaurantId),
          token
            ? getFavorites(token).catch(() => [] as FavoriteRestaurant[])
            : Promise.resolve([] as FavoriteRestaurant[]),
        ]);

        setRestaurant(data);
        setIsFavorite(favs.some((f) => f._id === restaurantId));
      } catch (error) {
        console.error("Error loading restaurant:", error);
        Alert.alert("Error", "Failed to load restaurant details");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [restaurantId]);

  const seatingOptions = useMemo(
    () =>
      restaurant?.seatingTypes?.length
        ? restaurant.seatingTypes
        : DEFAULT_SEATING,
    [restaurant],
  );
  const floorOptions = useMemo(
    () =>
      restaurant?.floorNumbers?.length
        ? restaurant.floorNumbers
        : DEFAULT_FLOORS,
    [restaurant],
  );
  const timeSlots = useMemo(
    () => buildTimeSlots(restaurant?.openingTime, restaurant?.closingTime),
    [restaurant],
  );
  // Is this slot already in the past? Only matters when the chosen date is today.
  const isSlotPast = (time: string) => {
    if (date.toDateString() !== new Date().toDateString()) return false;

    const slot = parseTimeToMinutes(time);
    if (slot === null) return false;

    const open = parseTimeToMinutes(restaurant?.openingTime) ?? 9 * 60;
    if (slot < open) return false; // after-midnight slot, belongs to the next day

    const now = new Date();
    return slot <= now.getHours() * 60 + now.getMinutes();
  };

  // If the date changes and the chosen time is now in the past, clear it
  useEffect(() => {
    if (selectedTime && isSlotPast(selectedTime)) setSelectedTime(null);
  }, [date]);

  // Selected values default to the first real option
  const area = selectedArea ?? seatingOptions[0];
  const selectedFloor = selectedFloorState ?? floorOptions[0];

  const maxSeats =
    typeof restaurant?.availableSeats === "number" &&
    restaurant.availableSeats > 0
      ? restaurant.availableSeats
      : undefined;

  const handleToggleFavorite = async () => {
    if (!restaurantId) return;

    const previous = isFavorite;
    setIsFavorite(!previous); // optimistic

    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const res = await toggleFavorite(token ?? "", restaurantId);
      setIsFavorite(res.isFavorite);
    } catch {
      setIsFavorite(previous); // rollback
      Alert.alert("Error", "Could not update favorites.");
    }
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else
      router.replace({ pathname: "/bookAtable", params: { id: restaurantId } });
  };

  const onChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowPicker(Platform.OS === "ios");
    if (selectedDate) setDate(selectedDate);
  };

  const handleContinue = () => {
    if (!selectedTime) {
      Alert.alert("Select a time", "Please choose a time first.");
      return;
    }

    router.push({
      pathname: "/bookingConfirmation",
      params: {
        restaurantId: restaurantId,
        restaurantName: restaurant?.name ?? "",
        date: date.toISOString(),
        time: selectedTime,
        guests: String(guestCount),
        seatingType: area,
        floor: String(selectedFloor),
        request: specialRequest,
      },
    });
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const imageUrl = resolveImageUrl(restaurant?.images?.[0]);

  const showImage = !!imageUrl && !imageFailed;
  const initial = restaurant?.name?.trim().charAt(0).toUpperCase() || "?";
  const rating = restaurant?.rating || 0;
  const cuisines = String(restaurant?.cuisines ?? "")
    .split(/[,|]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" | ");
  const location = [restaurant?.city, restaurant?.province]
    .filter(Boolean)
    .join(", ");

  return (
    <View className="flex-1 bg-white px-2 pt-16">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled>
        <View className="flex-row justify-between mb-4">
          <Pressable onPress={goBack} className="w-12 h-12">
            <Ionicons name="arrow-back" size={24} color="#143d7b" />
          </Pressable>
          <Text className="text-[#143d7b] font-bold text-3xl">
            Book a Table
          </Text>
          <NotificationBell
            color="white"
            size={22}
            containerClassName="h-11 w-11 items-center justify-center rounded-full bg-[#143d7b]"
          />
        </View>

        {/* Restaurant summary */}
        <View className="flex-row items-start">
          {showImage ? (
            <Image
              source={{ uri: imageUrl }}
              resizeMode="cover"
              onError={() => setImageFailed(true)}
              className="w-40 h-40 rounded-l-lg"
            />
          ) : (
            <View className="w-40 h-40 rounded-l-lg items-center justify-center bg-blue-100">
              <Text className="text-6xl font-bold text-[#143d7b]">
                {initial}
              </Text>
            </View>
          )}

          <View className="px-3 flex-1 gap-3">
            <Text numberOfLines={2} className="font-bold text-xl text-black">
              {restaurant?.name || "Restaurant"}
            </Text>
            <Text numberOfLines={1} className="text-gray-900 font-normal">
              {cuisines || "Various Cuisines"}
            </Text>
            <View className="flex-row gap-1 items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= Math.round(rating) ? "star" : "star-outline"}
                  size={20}
                  color={star <= Math.round(rating) ? "#f59e0b" : "blue"}
                />
              ))}
              <Text className="px-2 font-semibold text-[#143d7b]">
                {rating.toFixed(1)}
              </Text>
              <Text className="text-gray-900">
                ({restaurant?.reviewCount || 0})
              </Text>
            </View>
            <Text numberOfLines={1} className="text-gray-900">
              {location || "Lahore, Punjab"}
            </Text>
          </View>

          <Pressable
            onPress={handleToggleFavorite}
            accessibilityRole="button"
            accessibilityLabel={
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }
            className="h-11 w-11 rounded-full items-center justify-center">
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={22}
              color={isFavorite ? "#dc2626" : "gray"}
            />
          </Pressable>
        </View>

        <View className="h-px bg-[#143d7b] mb-2 mt-2" />

        {/* Date Selection */}
        <View className="mt-4">
          <Text className="text-[#143d7b] font-bold text-xl">Select Date:</Text>

          <Pressable
            onPress={() => setShowPicker(true)}
            accessibilityRole="button"
            className="mb-4 mt-2 flex-row items-center justify-between rounded-lg border border-[#143d7b] px-4 py-3">
            <Text className="text-gray-900">{date.toLocaleDateString()}</Text>
            <Ionicons name="calendar-outline" size={20} color="#143d7b" />
          </Pressable>

          {showPicker && (
            <DateTimePicker
              value={date}
              mode="date"
              minimumDate={new Date()}
              onChange={onChange}
            />
          )}
        </View>

        {/* Time Selection */}
        <Text className="text-[#143d7b] font-bold text-xl">
          Select Timings:
        </Text>
        <View className="h-[250px]">
          <ScrollView nestedScrollEnabled>
            {timeSlots.length === 0 ? (
              <Text className="mt-6 text-center text-gray-700">
                No time slots available
              </Text>
            ) : (
              <View className="mt-3 flex-row flex-wrap px-2">
                {timeSlots.map((time) => {
                  const selected = selectedTime === time;
                  const disabled = isSlotPast(time);

                  return (
                    <View
                      key={time}
                      style={{ width: "33.333%" }}
                      className="p-1.5">
                      <Pressable
                        disabled={disabled}
                        onPress={() => setSelectedTime(time)}
                        className={`items-center rounded-full border px-2 py-2 ${
                          selected
                            ? "border-[#143d7b] bg-[#143d7b]"
                            : disabled
                              ? "border-gray-100 bg-gray-50"
                              : "border-gray-200 bg-gray-100"
                        }`}>
                        <Text
                          numberOfLines={1}
                          className={
                            selected
                              ? "text-sm text-white"
                              : disabled
                                ? "text-sm text-gray-300"
                                : "text-sm text-gray-900"
                          }>
                          {time}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>

        {/* Seat Counter */}
        <View className="mt-4 flex-row justify-between">
          <Text className="text-[#143d7b] font-bold text-xl">
            Number of Seats
          </Text>
          {maxSeats !== undefined && (
            <Text className="text-[#143d7b] font-bold text-sm">
              Available {maxSeats} Seats
            </Text>
          )}
        </View>
        <View className="flex-row items-center gap-16 mt-2">
          <Pressable
            onPress={() => setGuestCount((count) => Math.max(1, count - 1))}
            accessibilityRole="button"
            accessibilityLabel="Decrease guest count"
            className="h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-gray-300">
            <Ionicons name="remove" size={24} color="#333" />
          </Pressable>

          <Text className="text-3xl font-semibold">{guestCount}</Text>

          <Pressable
            onPress={() => {
              if (!selectedTime) {
                Alert.alert("Select a time", "Please choose a time first.");
                return;
              }
              if (maxSeats !== undefined && guestCount >= maxSeats) {
                Alert.alert(
                  "No more seats",
                  `Only ${maxSeats} seats are available.`,
                );
                return;
              }
              setGuestCount((count) => count + 1);
            }}
            accessibilityRole="button"
            accessibilityLabel="Increase guest count"
            className="h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-blue-500">
            <Ionicons name="add" size={24} color="#143d7b" />
          </Pressable>
        </View>

        {/* Seating Type & Floor */}
        <View className="mt-4">
          <Text className="text-[#143d7b] font-bold text-xl mb-2">
            Seating type
          </Text>
          <RadioButton.Group onValueChange={setSelectedArea} value={area}>
            <View className="gap-2">
              {seatingOptions.map((option) => {
                const selected = area === option;

                return (
                  <View
                    key={option}
                    className={`flex-row items-center rounded-lg border-2 ${
                      selected ? "border-[#143d7b]" : "border-gray-300"
                    }`}>
                    <RadioButton value={option} />
                    <Text>{option}</Text>
                  </View>
                );
              })}
            </View>
          </RadioButton.Group>

          <View className="mt-4">
            <Text className="text-[#143d7b] font-bold text-xl mb-2">
              Select Floor
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {floorOptions.map((floor) => {
                const selected = selectedFloor === floor;

                return (
                  <Pressable
                    key={floor}
                    onPress={() => setSelectedFloorState(floor)}
                    className={`items-center justify-center rounded-full border-2 px-3 py-2 ${
                      selected
                        ? "border-[#143d7b] bg-[#143d7b]"
                        : "border-gray-300"
                    }`}>
                    <Text className={selected ? "text-white" : "text-gray-900"}>
                      {floor}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="mt-4">
            <Text className="text-[#143d7b] font-bold text-xl mb-2">
              Special Request
            </Text>
            <TextInput
              value={specialRequest}
              onChangeText={setSpecialRequest}
              placeholder={`Special requests :
- Table location (window, main hall, or terrace)
- Seating preference (booth or standard)
(optional)`}
              multiline
              textAlignVertical="top"
              className="h-[120px] rounded-lg border-2 border-blue-400 px-4 py-3 mb-8"
            />
          </View>
        </View>
      </ScrollView>

      <View className="px-4 pb-6 pt-3 bg-white">
        <Button buttonColor="#143d7b" mode="contained" onPress={handleContinue}>
          Continue
        </Button>
      </View>
    </View>
  );
};

export default TableRequirements;

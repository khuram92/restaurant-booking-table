import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { cancelBooking, getMyBookings, type Booking } from "../api/bookingApi";
import { getRestaurantById, type Restaurant } from "../api/restaurantApi";
import { getBookingCode } from "../utils/booking";
import { ReviewModal } from "./components/ReviewModal";

type IconName = keyof typeof Ionicons.glyphMap;

const STATUS_CONFIG: Record<
  Booking["status"],
  {
    icon: IconName;
    title: string;
    subtitle: string;
    pillLabel: string;
    pillClass: string;
    pillTextClass: string;
    canCancel: boolean;
  }
> = {
  pending: {
    icon: "time-outline",
    title: "Awaiting Confirmation",
    subtitle:
      "The restaurant is reviewing your request.\nPlease wait for confirmation",
    pillLabel: "Pending",
    pillClass: "bg-blue-100",
    pillTextClass: "text-gray-600",
    canCancel: true,
  },
  confirmed: {
    icon: "checkmark",
    title: "Booking Confirmed",
    subtitle: "Your table is reserved.\nWe look forward to seeing you!",
    pillLabel: "Confirmed",
    pillClass: "bg-blue-100",
    pillTextClass: "text-green-700",
    canCancel: true,
  },
  cancelled: {
    icon: "close",
    title: "Booking Cancelled",
    subtitle: "This reservation has been cancelled",
    pillLabel: "Cancelled",
    pillClass: "bg-blue-100",
    pillTextClass: "text-gray-600",
    canCancel: false,
  },
  rejected: {
    icon: "close",
    title: "Request Declined",
    subtitle:
      "The restaurant couldn't accept this booking.\nYou can try another time.",
    pillLabel: "Declined",
    pillClass: "bg-blue-100",
    pillTextClass: "text-red-600",
    canCancel: false,
  },
  completed: {
    icon: "checkmark-done",
    title: "Booking Completed",
    subtitle: "Thanks for dining with us!\nWe hope to see you again soon",
    pillLabel: "Completed",
    pillClass: "bg-blue-100",
    pillTextClass: "text-blue-700",
    canCancel: false,
  },
};

const DashedDivider = () => (
  <View className="mx-6 h-px overflow-hidden">
    <View className="h-2 border border-dashed border-gray-500" />
  </View>
);

const InfoColumn = ({
  icon,
  label,
  value,
  withDivider,
}: {
  icon: IconName;
  label: string;
  value: string;
  withDivider?: boolean;
}) => (
  <View
    className={`flex-1 items-center py-1 ${
      withDivider ? "border-l border-gray-300" : ""
    }`}>
    <Ionicons name={icon} size={26} color="blue" />
    <Text className="mt-2 text-[10px] tracking-widest text-gray-500">
      {label}
    </Text>
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      className="mt-2 text-xs font-bold text-blue-500">
      {value}
    </Text>
  </View>
);

const getRestaurantRef = (booking: Booking | null) => {
  const ref = (booking as any)?.restaurant;
  if (!ref) return { id: undefined, name: undefined };
  if (typeof ref === "string") return { id: ref, name: undefined };
  return {
    id: ref._id as string | undefined,
    name: ref.name as string | undefined,
  };
};

const BookingDetails = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);

  const loadBooking = useCallback(async () => {
    try {
      if (!id) {
        throw new Error("No booking id was passed to this screen");
      }

      const bookings = await getMyBookings();
      const found = bookings.find((b) => b._id === id);

      if (!found) {
        throw new Error("Booking not found");
      }

      setBooking(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadBooking();
    }, [loadBooking]),
  );

  // While the booking is pending, check again every 10 seconds
  useEffect(() => {
    if (booking?.status !== "pending") return;

    const interval = setInterval(loadBooking, 10000);
    return () => clearInterval(interval);
  }, [booking?.status, loadBooking]);

  const { id: restaurantId, name: populatedName } = getRestaurantRef(booking);

  useEffect(() => {
    if (!restaurantId) return;

    let active = true;

    getRestaurantById(restaurantId)
      .then((data) => {
        if (active) setRestaurant(data);
      })
      .catch((e) => console.log("Could not load restaurant:", e?.message));

    return () => {
      active = false;
    };
  }, [restaurantId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBooking();
    setRefreshing(false);
  };

  const handleCancel = () => {
    if (!booking) return;

    Alert.alert("Cancel booking?", "This can't be undone.", [
      { text: "Keep Booking", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            setCancelling(true);
            const data = await cancelBooking(booking._id);
            setBooking(data.booking);
          } catch (err) {
            Alert.alert(
              "Could not cancel",
              err instanceof Error ? err.message : "Something went wrong.",
            );
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="blue" />
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-lg font-semibold text-gray-900">
          {error || "Booking not found"}
        </Text>
        <Pressable
          onPress={() => router.replace("/home")}
          className="mt-6 rounded-full bg-blue-700 px-10 py-4">
          <Text className="font-bold text-white">Go Home</Text>
        </Pressable>
      </View>
    );
  }

  const config = STATUS_CONFIG[booking.status];
  const formattedDate = new Date(booking.date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const restaurantName = restaurant?.name ?? populatedName ?? "Restaurant";
  const restaurantAddress =
    [restaurant?.address, restaurant?.city].filter(Boolean).join(", ") ||
    "Address unavailable";

  const bookingCode = getBookingCode(booking, restaurantName);

  return (
    <>
      <ScrollView
        className="flex-1 bg-white"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <View className="items-center px-6 pb-10 pt-20">
          <View className="h-20 w-20 items-center justify-center rounded-full border border-green-100 bg-green-50">
            <Ionicons name={config.icon} size={38} color="blue" />
          </View>

          <Text className="mt-6 text-center text-2xl font-bold text-blue-600">
            {config.title}
          </Text>
          <Text className="mt-2 text-center text-sm text-gray-500">
            {config.subtitle}
          </Text>

          <View
            className="mt-8 w-full rounded-3xl border border-gray-100 bg-white shadow-lg"
            style={{ elevation: 4 }}>
            <View className="flex-row items-center p-6">
              <View className="h-12 w-12 items-center justify-center rounded-xl border border-green-100 bg-green-100">
                <Text className="text-2xl font-bold text-blue-700">
                  {restaurantName.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View className="mx-3 flex-1">
                <Text
                  numberOfLines={1}
                  className="text-base font-bold text-blue-600">
                  {restaurantName}
                </Text>
                <View className="mt-1 flex-row items-center">
                  <Ionicons name="location-sharp" size={14} color="blue" />
                  <Text
                    numberOfLines={1}
                    className="ml-1 flex-1 text-xs text-blue-500">
                    {restaurantAddress}
                  </Text>
                </View>
              </View>

              <View className={`rounded-full px-3 py-1.5 ${config.pillClass}`}>
                <Text className={`text-xs font-semibold ${config.pillTextClass}`}>
                  {config.pillLabel}
                </Text>
              </View>
            </View>
            <View className="relative">
              <DashedDivider />
              <View className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-white" />
              <View className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-white" />
            </View>

            <View className="flex-row px-6 py-5">
              <InfoColumn
                icon="calendar-outline"
                label="DATE"
                value={formattedDate}
              />
              <InfoColumn
                icon="time-outline"
                label="TIME"
                value={booking.time}
                withDivider
              />
              <InfoColumn
                icon="people"
                label="GUESTS"
                value={String(booking.guests)}
                withDivider
              />
              <InfoColumn
                icon="home-outline"
                label="SEATING"
                value={booking.seatingType}
                withDivider
              />
            </View>

            <DashedDivider />

            <View className="flex-row items-center justify-between p-6">
              <View>
                <Text className="text-xs tracking-widest text-gray-400">
                  BOOKING ID
                </Text>
                <Text className="mt-1 text-lg font-bold text-blue-500">
                  {bookingCode}
                </Text>
              </View>
            </View>

            {booking.status === "cancelled" && (
              <View className="mx-6 mb-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
                <Text className="text-center text-sm text-gray-600">
                  Booking cancelled. You can make a new reservation anytime.
                </Text>
              </View>
            )}
          </View>

          <View className="mt-6 w-full">
            
            {booking.status === "completed" && (
              <Pressable
                onPress={() => setReviewModalVisible(true)}
                className="mb-3 flex-row items-center justify-center rounded-full bg-green-500 py-4 shadow-sm active:opacity-90">
                <Ionicons name="star" size={20} color="white" />
                <Text className="ml-2 text-lg font-bold text-white">
                  Leave a Review
                </Text>
              </Pressable>
            )}

            {config.canCancel && (
              <Pressable
                onPress={handleCancel}
                disabled={cancelling}
                className="mb-3 items-center rounded-full border border-gray-300 bg-red-50 py-4">
                {cancelling ? (
                  <ActivityIndicator color="#dc2626" />
                ) : (
                  <Text className="text-lg font-semibold text-red-600">
                    Cancel Booking
                  </Text>
                )}
              </Pressable>
            )}

            <View className="flex-row gap-3">
              <Pressable
                onPress={() => router.replace("/home")}
                className="flex-1 items-center rounded-full border border-gray-200 bg-white py-4">
                <Text className="text-lg font-semibold text-blue-600">
                  Go Home
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/listBookings")}
                className="flex-1 items-center rounded-full bg-blue-700 py-4">
                <Text className="text-lg font-bold text-white">My Bookings</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Review Modal Trigger */}
      {restaurantId && (
        <ReviewModal
          visible={reviewModalVisible}
          onClose={() => setReviewModalVisible(false)}
          restaurantId={restaurantId}
          restaurantName={restaurantName}
          bookingId={booking._id}
          onSuccess={() => {
            loadBooking();
          }}
        />
      )}
    </>
  );
};

export default BookingDetails;
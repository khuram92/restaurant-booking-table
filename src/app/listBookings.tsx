import { Ionicons } from "@expo/vector-icons";
import { Link, router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { getMyBookings, type Booking } from "../api/bookingApi";
import { resolveImageUrl } from "../api/restaurantApi";
import { getBookingCode } from "../utils/booking";
import NavigationBar from "./components/navigationBar";
import NotificationBell from "./components/NotificationBell";

type Filter = "all" | Booking["status"];

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "rejected", label: "Rejected" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_STYLES: Record<
  string,
  { label: string; pill: string; text: string; dot: string }
> = {
  pending: {
    label: "Pending",
    pill: "bg-yellow-100",
    text: "text-yellow-700",
    dot: "bg-yellow-500",
  },
  confirmed: {
    label: "Confirmed",
    pill: "bg-green-100",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  completed: {
    label: "Completed",
    pill: "bg-blue-100",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  rejected: {
    label: "Rejected",
    pill: "bg-red-100",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  cancelled: {
    label: "Cancelled",
    pill: "bg-gray-200",
    text: "text-gray-600",
    dot: "bg-gray-500",
  },
};
type IconName = React.ComponentProps<typeof Ionicons>["name"];
const DashedDivider = () => (
  <View className="h-px overflow-hidden">
    <View className="h-2 border border-dashed border-gray-300" />
  </View>
);

const InfoColumn = ({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) => (
  <View className="flex-1 items-center">
    <Ionicons name={icon} size={24} color="blue" />
    <Text className="mt-2 text-[10px] tracking-widest text-gray-500">
      {label}
    </Text>
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      className="mt-1 text-sm font-bold text-blue-500">
      {value}
    </Text>
  </View>
);

const BookingCard = ({ item }: { item: Booking }) => {
  // If an image fails to load, move on to the next one
  const [failedUrls, setFailedUrls] = useState<string[]>([]);

  const restaurant =
    item.restaurant && typeof item.restaurant === "object"
      ? item.restaurant
      : undefined;

  const name = restaurant?.name ?? "Restaurant";
  const imageUrl = (restaurant?.images ?? [])
    .map((u) => resolveImageUrl(u))
    .filter((u): u is string => !!u)
    .find((u) => !failedUrls.includes(u));

  const status = STATUS_STYLES[item.status] ?? STATUS_STYLES.pending;

  const date = new Date(item.date);
  const formattedDate = Number.isNaN(date.getTime())
    ? item.date
    : date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

  return (
    <View
      className="mb-4 rounded-2xl border border-gray-100 bg-white p-4"
      style={{ elevation: 3 }}>
      {/* Restaurant + status */}
      <View className="flex-row items-center">
        {imageUrl ? (
          <Image
            key={imageUrl}
            source={{ uri: imageUrl }}
            resizeMode="cover"
            onError={() => setFailedUrls((prev) => [...prev, imageUrl])}
            className="h-14 w-14 rounded-lg"
          />
        ) : (
          <View className="h-14 w-14 items-center justify-center rounded-lg bg-blue-100">
            <Text className="text-2xl font-bold text-blue-600">
              {name.trim().charAt(0).toUpperCase() || "?"}
            </Text>
          </View>
        )}

        <View className="mx-3 flex-1">
          <Text numberOfLines={1} className="text-lg font-semibold">
            {name}
          </Text>
          <Text numberOfLines={1} className="text-gray-500">
            {item.seatingType}
          </Text>
        </View>

        <View
          className={`flex-row items-center rounded-full px-3 py-1.5 ${status.pill}`}>
          <View className={`mr-1.5 h-2 w-2 rounded-full ${status.dot}`} />
          <Text className={`text-xs font-bold ${status.text}`}>
            {status.label}
          </Text>
        </View>
      </View>

      <View className="my-4 h-px bg-gray-100" />

      {/* Details */}
      <View className="flex-row">
        <InfoColumn
          icon="calendar-outline"
          label="DATE"
          value={formattedDate}
        />
        <InfoColumn icon="time-outline" label="TIME" value={item.time} />
        <InfoColumn icon="people" label="GUESTS" value={`${item.guests} pax`} />
        <InfoColumn icon="home-outline" label="TYPE" value={item.seatingType} />
      </View>

      <View className="my-4">
        <DashedDivider />
      </View>

      {/* Booking ID + action */}
      <View className="flex-row items-center justify-between">
        <Text className="text-sm tracking-wide text-gray-400">
          {getBookingCode(item)}
        </Text>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/bookingDetails",
              params: { id: item._id },
            })
          }
          accessibilityRole="button"
          className="rounded-lg bg-blue-700 px-5 py-3">
          <Text className="font-bold text-white">View Details</Text>
        </Pressable>
      </View>
    </View>
  );
};

const ListBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      setBookings(await getMyBookings());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload whenever the page is shown (e.g. after cancelling a booking)
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const visible = useMemo(
    () =>
      filter === "all" ? bookings : bookings.filter((b) => b.status === filter),
    [bookings, filter],
  );

  const activeLabel = FILTERS.find((f) => f.key === filter)?.label ?? "";

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 pt-16">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4">
          <Link href="/home" asChild>
            <Pressable className="h-10 w-10 justify-center">
              <Ionicons name="arrow-back" size={26} color="blue" />
            </Pressable>
          </Link>
          <Text className="text-2xl font-bold text-blue-700">My Bookings</Text>
          <NotificationBell
            color="white"
            size={22}
            containerClassName="h-11 w-11 items-center justify-center rounded-full bg-blue-700"
          />
        </View>

        {/* Status filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          className="m-4 ">
          {FILTERS.map(({ key, label }) => {
            const active = filter === key;
            return (
              <Pressable
                key={key}
                onPress={() => setFilter(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                className={`mr-2 flex-row rounded-full h-8 mb-2 justify-between border p-1 ${
                  active
                    ? "border-blue-700 bg-blue-700"
                    : "border-gray-300 bg-white"
                }`}>
                <Text
                  className={`px-2 ${active ? "text-white" : "text-gray-700"}`}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : error && bookings.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="cloud-offline-outline" size={48} color="#9ca3af" />
            <Text className="mt-3 text-center text-base text-gray-700">
              {error}
            </Text>
            <Pressable
              onPress={() => {
                setLoading(true);
                void load();
              }}
              className="mt-4 rounded-full bg-blue-700 px-6 py-2">
              <Text className="font-semibold text-white">Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => <BookingCard item={item} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View className="items-center pt-16">
                <Ionicons name="calendar-outline" size={56} color="#d1d5db" />
                <Text className="mt-4 text-lg font-bold text-gray-900">
                  {filter === "all"
                    ? "No bookings yet"
                    : `No ${activeLabel.toLowerCase()} bookings`}
                </Text>
                <Text className="mt-1 text-center text-sm text-gray-400">
                  {filter === "all"
                    ? "Book a table and it will show up here."
                    : "Try another filter."}
                </Text>
              </View>
            }
          />
        )}
      </View>

      <NavigationBar />
    </View>
  );
};

export default ListBookings;

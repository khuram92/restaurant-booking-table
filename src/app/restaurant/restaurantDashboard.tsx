import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { ActivityIndicator, Searchbar } from "react-native-paper";
import {
  deleteBooking,
  getRestaurantBookings,
  updateBookingStatus,
  type Booking,
} from "../../api/bookingApi";
import { getBookingCode } from "../../utils/booking";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Confirmed", className: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelled", className: "bg-gray-200 text-gray-600" },
  completed: { label: "Completed", className: "bg-blue-100 text-blue-700" },
};

const getCustomerName = (customer: Booking["customer"]): string => {
  if (customer && typeof customer === "object") {
    const name =
      `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim();
    if (name) return name;
  }
  return "Customer";
};

const formatDate = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const ActionButton = ({
  label,
  enabledClass,
  disabled,
  onPress,
}: {
  label: string;
  enabledClass: string;
  disabled: boolean;
  onPress: () => void;
}) => (
  <Pressable
    disabled={disabled}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ disabled }}
    className={`rounded px-3 py-1 ${disabled ? "bg-gray-300" : enabledClass}`}>
    <Text
      className={`text-xs font-bold ${disabled ? "text-gray-500" : "text-white"}`}>
      {label}
    </Text>
  </Pressable>
);
const timeToMinutes = (value?: string): number => {
  const match = value?.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

// Booking day + time slot -> one sortable number
const bookingTimestamp = (b: Booking): number => {
  const d = new Date(b.date);
  if (Number.isNaN(d.getTime())) return 0;

  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return day + timeToMinutes(b.time) * 60000;
};

const pad = (n: number) => String(n).padStart(2, "0");

const buildSearchText = (b: Booking): string => {
  const parts: string[] = [
    getBookingCode(b),
    getCustomerName(b.customer),
    b.time ?? "",
    b.status,
    STATUS_STYLES[b.status]?.label ?? "",
  ];

  const d = new Date(b.date);
  if (!Number.isNaN(d.getTime())) {
    const m = d.getMonth() + 1;
    parts.push(
      formatDate(b.date),
      d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }), // "Thursday, October 15, 2026"
      `${pad(m)}/${pad(d.getDate())}/${d.getFullYear()}`, // 10/15/2026
      `${m}/${d.getDate()}/${d.getFullYear()}`, // 10/5/2026 without padding
      `${d.getFullYear()}-${pad(m)}-${pad(d.getDate())}`, // 2026-10-15
    );
  }

  return parts.join(" ").toLowerCase();
};

const RestaurantDashboard = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const goBack = () => {
    if (router.canGoBack()) router.back();
  };

  const sortedBookings = useMemo(
    () =>
      [...bookings].sort((a, b) => {
        const diff = bookingTimestamp(b) - bookingTimestamp(a); // newest first
        if (diff !== 0) return diff;
        // same date and time: most recently requested first
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }),
    [bookings],
  );
  const [query, setQuery] = useState("");

  const filteredBookings = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return sortedBookings;

    return sortedBookings.filter((b) => {
      const text = buildSearchText(b);
      return terms.every((term) => text.includes(term));
    });
  }, [sortedBookings, query]);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await getRestaurantBookings();
      setBookings(data);
    } catch (error: unknown) {
      console.error("Failed to load restaurant bookings:", error);
      if (!silent) {
        Alert.alert(
          "Error",
          error instanceof Error
            ? error.message
            : "Could not load customer bookings.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Load when the screen opens, then check for new requests every 10 seconds
  useFocusEffect(
    useCallback(() => {
      load();
      const interval = setInterval(() => load(true), 10000);
      return () => clearInterval(interval);
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const handleUpdateStatus = async (
    bookingId: string,
    status: "confirmed" | "rejected" | "completed",
  ) => {
    try {
      setBusyId(bookingId);
      await updateBookingStatus(bookingId, status);
      setBookings((current) =>
        current.map((b) => (b._id === bookingId ? { ...b, status } : b)),
      );
    } catch (error: unknown) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Could not update booking status.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (booking: Booking) => {
    Alert.alert(
      "Delete booking?",
      `This permanently removes ${getCustomerName(booking.customer)}'s booking. This can't be undone.`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setBusyId(booking._id);
              await deleteBooking(booking._id);
              setBookings((current) =>
                current.filter((b) => b._id !== booking._id),
              );
            } catch (error: unknown) {
              Alert.alert(
                "Error",
                error instanceof Error
                  ? error.message
                  : "Could not delete booking.",
              );
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View className="flex-1 pt-16 bg-white p-4">
      <View className="flex-row items-center">
        <Pressable
          onPress={goBack}
          disabled={!goBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-blue-50">
          <Ionicons name="arrow-back" size={22} color="#2563EB" />
        </Pressable>
        <Text className="flex-1 text-2xl font-bold text-blue-900">
          Restaurant Dashboard
        </Text>
      </View>
      <View className="my-4">
        <Searchbar
          value={query}
          onChangeText={setQuery}
          placeholder="Search: ID, name, date, time or status"
          className="    rounded-full border border-blue-200  "
          inputStyle={{ fontSize: 14, color: "#111827" }}
          iconColor="#2563EB"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View className="w-[1010px] overflow-hidden rounded-lg border border-blue-200">
          <View className="flex-row border-b border-blue-200 bg-blue-50 py-3">
            <Text className="w-[110px] text-center font-bold text-blue-900">
              Booking ID
            </Text>
            <Text className="w-[130px] px-2 font-bold text-blue-900">Name</Text>
            <Text className="w-[100px] text-center font-bold text-blue-900">
              Date
            </Text>
            <Text className="w-[90px] text-center font-bold text-blue-900">
              Time
            </Text>
            <Text className="w-[70px] text-center font-bold text-blue-900">
              Guests
            </Text>
            <Text className="w-[100px] text-center font-bold text-blue-900">
              Seating
            </Text>
            <Text className="w-[100px] text-center font-bold text-blue-900">
              Floor
            </Text>
            <Text className="w-[110px] text-center font-bold text-blue-900">
              Status
            </Text>
            <Text className="w-[200px] text-center font-bold text-blue-900">
              Actions
            </Text>
          </View>

          <FlatList
            data={filteredBookings}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            extraData={busyId}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <Text className="py-16 text-center text-gray-400">
                No customer bookings found.
              </Text>
            }
            renderItem={({ item, index }) => {
              const style = STATUS_STYLES[item.status] ?? STATUS_STYLES.pending;
              const busy = busyId === item._id;
              const canRespond = item.status === "pending";
              const canComplete = item.status === "confirmed";
              const canDelete =
                item.status === "rejected" || item.status === "cancelled";

              return (
                <View
                  className={`flex-row items-center border-b border-gray-100 py-3 ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}>
                  <Text
                    numberOfLines={1}
                    className="w-[110px] text-center text-xs font-semibold text-blue-700">
                    {getBookingCode(item)}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="w-[130px] px-2 text-gray-800">
                    {getCustomerName(item.customer)}
                  </Text>
                  <Text className="w-[100px] text-center text-gray-600">
                    {formatDate(item.date)}
                  </Text>
                  <Text className="w-[90px] text-center text-gray-600">
                    {item.time}
                  </Text>
                  <Text className="w-[70px] text-center text-gray-600">
                    {item.guests}
                  </Text>
                  <Text className="w-[100px] text-center text-gray-600">
                    {item.seatingType}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="w-[100px] text-center text-gray-600">
                    {item.floor}
                  </Text>

                  <View className="w-[110px] items-center">
                    <Text
                      className={`rounded-full px-2 py-1 text-xs font-bold ${style.className}`}>
                      {style.label}
                    </Text>
                  </View>
                  <View className=" w-[200px] items-center">
                    {busy ? (
                      <ActivityIndicator size="small" color="#2563EB" />
                    ) : (
                      <View className="flex gap-2">
                        <ActionButton
                          label="Confirm"
                          enabledClass="bg-green-600"
                          disabled={!canRespond}
                          onPress={() =>
                            handleUpdateStatus(item._id, "confirmed")
                          }
                        />
                        <ActionButton
                          label="Complete"
                          enabledClass="bg-blue-600"
                          disabled={!canComplete}
                          onPress={() =>
                            handleUpdateStatus(item._id, "completed")
                          }
                        />
                        <ActionButton
                          label="Reject"
                          enabledClass="bg-orange-500"
                          disabled={!canRespond}
                          onPress={() =>
                            handleUpdateStatus(item._id, "rejected")
                          }
                        />
                        <ActionButton
                          label="Delete"
                          enabledClass="bg-red-600"
                          disabled={!canDelete}
                          onPress={() => handleDelete(item)}
                        />
                      </View>
                    )}
                  </View>
                </View>
              );
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default RestaurantDashboard;

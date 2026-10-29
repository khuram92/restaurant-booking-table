import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "../api/notificationApi";

const OWNER_BOOKINGS_ROUTE: Href = "/restaurant/restaurantDashboard";
const ADMIN_BOOKINGS_ROUTE: Href = "/admin/allBookings";

const timeAgo = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const NotificationCard = ({
  item,
  onOpen,
  onMarkRead,
}: {
  item: AppNotification;
  onOpen: (item: AppNotification) => void;
  onMarkRead: (id: string) => void;
}) => (
  <Pressable
    onPress={() => onOpen(item)}
    accessibilityRole="button"
    className={`mb-3 flex-row justify-between rounded-xl border p-4 ${
      item.isRead ? "border-gray-200 bg-white" : "border-blue-200 bg-blue-50"
    }`}>
    <View className="flex-1 flex-row gap-4">
      <Image
        source={require("../../assets/images/logo.png")}
        style={{ width: 46, height: 46 }}
      />

      <View className="flex-1">
        <View className="mb-2 flex-row items-center">
          <Text className="shrink text-lg font-bold">{item.title}</Text>
          {!item.isRead && (
            <View className="ml-2 h-2.5 w-2.5 rounded-full bg-[#143d7b]" />
          )}
        </View>

        <Text className="mb-2 text-base font-normal">{item.message}</Text>

        {!item.isRead && (
          <Pressable onPress={() => onMarkRead(item._id)} hitSlop={8}>
            <Text className="text-base font-normal text-[#143d7b]">
              Mark as read
            </Text>
          </Pressable>
        )}
      </View>
    </View>

    <Text className="ml-3 text-base text-gray-900">
      {timeAgo(item.createdAt)}
    </Text>
  </Pressable>
);

const Notification = () => {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const { notifications } = await getNotifications();
      setItems(notifications);
      setError("");
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Could not load notifications.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Load when the screen opens, then check for new ones every 15 seconds
  useFocusEffect(
    useCallback(() => {
      void load();
      const interval = setInterval(() => void load(), 15000);
      return () => clearInterval(interval);
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: "/bookAtable" });
  };

  const markRead = async (id: string) => {
    setItems((cur) =>
      cur.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
    );
    try {
      await markNotificationRead(id);
    } catch {
      void load(); // put the real state back if it failed
    }
  };

  const markAllRead = async () => {
    setItems((cur) => cur.map((n) => ({ ...n, isRead: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      void load();
    }
  };

  const open = async (item: AppNotification) => {
    if (!item.isRead) void markRead(item._id);
    if (!item.booking) return;

    const role = (await SecureStore.getItemAsync("userRole"))?.toLowerCase();

    if (role === "restaurant") router.push(OWNER_BOOKINGS_ROUTE);
    else if (role === "admin") router.push(ADMIN_BOOKINGS_ROUTE);
    else {
      router.push({
        pathname: "/bookingDetails",
        params: { id: item.booking },
      });
    }
  };

  const hasUnread = items.some((n) => !n.isRead);

  return (
    <View className="flex-1 bg-white px-2 pt-16">
      <View className="mb-6 flex-row justify-between">
        <Pressable onPress={goBack} className="h-12 w-12">
          <Ionicons name="arrow-back" size={24} color="#143d7b" />
        </Pressable>
        <Text className="text-3xl font-bold text-[#143d7b]">Notifications</Text>
        <View className="h-12 w-12 items-end">
          <Ionicons name="notifications" size={26} color="#143d7b" />
        </View>
      </View>

      {hasUnread && (
        <Pressable
          onPress={markAllRead}
          className="mb-3 self-end px-1"
          hitSlop={8}>
          <Text className="text-base font-semibold text-[#143d7b]">
            Mark all as read
          </Text>
        </Pressable>
      )}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#143d7b" />
        </View>
      ) : error && items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="cloud-offline-outline" size={48} color="#9ca3af" />
          <Text className="mt-3 text-center text-base text-gray-900">
            {error}
          </Text>
          <Pressable
            onPress={() => {
              setLoading(true);
              void load();
            }}
            className="mt-4 rounded-full bg-[#143d7b] px-6 py-2">
            <Text className="font-semibold text-white">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <NotificationCard item={item} onOpen={open} onMarkRead={markRead} />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View className="items-center pt-24">
              <Ionicons
                name="notifications-outline"
                size={56}
                color="#d1d5db"
              />
              <Text className="mt-4 text-lg font-bold text-gray-900">
                No notifications yet
              </Text>
              <Text className="mt-1 text-center text-sm text-gray-900">
                Updates about your bookings will show up here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default Notification;

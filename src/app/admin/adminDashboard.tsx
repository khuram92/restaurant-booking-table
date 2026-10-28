import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  getAdminBookings,
  getAdminRestaurants,
  getAdminStats,
  getAdminUsers,
  type AdminRestaurant,
  type AdminStats,
  type AdminUser,
} from "../../api/adminApi";
import type { Booking } from "../../api/bookingApi";
import { getMyRestaurant, type Restaurant } from "../../api/restaurantApi";
import { getBookingCode } from "../../utils/booking";

type IconName = ComponentProps<typeof Ionicons>["name"];
type Tab = "bookings" | "restaurants" | "users";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Confirmed", className: "bg-green-100 text-green-700" },
  completed: { label: "Completed", className: "bg-blue-100 text-blue-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelled", className: "bg-gray-200 text-gray-600" },
};

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  restaurant: "bg-blue-100 text-blue-700",
  customer: "bg-gray-200 text-gray-600",
};

const personName = (
  p?: string | { firstName?: string; lastName?: string },
): string => {
  if (p && typeof p === "object") {
    const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
    if (name) return name;
  }
  return "Unknown";
};

const restaurantNameOf = (b: Booking): string =>
  b.restaurant && typeof b.restaurant === "object"
    ? (b.restaurant.name ?? "Restaurant")
    : "Restaurant";

const formatDate = (value?: string) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};

const bookingText = (b: Booking) =>
  [
    getBookingCode(b),
    personName(b.customer),
    restaurantNameOf(b),
    b.status,
    b.time,
    formatDate(b.date),
    b.date?.slice(0, 10),
  ]
    .join(" ")
    .toLowerCase();

const restaurantText = (r: AdminRestaurant) =>
  [
    r.name,
    r.cuisines,
    r.city,
    r.province,
    personName(r.owner),
    typeof r.owner === "object" ? r.owner?.email : "",
  ]
    .join(" ")
    .toLowerCase();

const userText = (u: AdminUser) =>
  [personName(u), u.email, u.phone, u.role].join(" ").toLowerCase();

const StatCard = ({
  label,
  value,
  icon,
  tint,
  onPress,
}: {
  label: string;
  value: number | string;
  icon: IconName;
  tint: string;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    className="mb-3 w-[48%] rounded-2xl bg-white p-4"
    style={{ elevation: 2 }}>
    <View className="flex-row justify-between">
      <View
        className=" h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: `${tint}22` }}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <Text className="mt-3 text-2xl font-bold text-gray-900">{value}</Text>
    </View>
    <Text className="text-base font-semibold mt-6  text-gray-500">{label}</Text>
  </Pressable>
);

const Pill = ({ className, label }: { className: string; label: string }) => (
  <Text className={`rounded-full px-2 py-1 text-xs font-bold ${className}`}>
    {label}
  </Text>
);

const BookingCard = ({ item }: { item: Booking }) => {
  const style = STATUS_STYLES[item.status] ?? STATUS_STYLES.pending;
  return (
    <View className="mb-3 rounded-2xl bg-white p-4" style={{ elevation: 1 }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-bold text-blue-700">
          {getBookingCode(item)}
        </Text>
        <Pill className={style.className} label={style.label} />
      </View>
      <Text className="mt-2 text-gray-900">{personName(item.customer)}</Text>
      <Text className="text-sm text-gray-500">{restaurantNameOf(item)}</Text>
      <Text className="mt-1 text-sm text-gray-500">
        {formatDate(item.date)} · {item.time} · {item.guests} guests
      </Text>
    </View>
  );
};

const RestaurantCard = ({ item }: { item: AdminRestaurant }) => (
  <View className="mb-3 rounded-2xl bg-white p-4" style={{ elevation: 1 }}>
    <View className="flex-row items-center justify-between">
      <Text
        numberOfLines={1}
        className="flex-1 text-base font-bold text-gray-900">
        {item.name}
      </Text>
      <View className="ml-2 flex-row items-center">
        <Ionicons name="star" size={14} color="#f59e0b" />
        <Text className="ml-1 text-sm font-semibold text-gray-700">
          {(item.rating ?? 0).toFixed(1)} ({item.reviewCount ?? 0})
        </Text>
      </View>
    </View>
    <Text className="text-sm text-gray-500">
      {[item.cuisines, [item.city, item.province].filter(Boolean).join(", ")]
        .filter(Boolean)
        .join(" · ")}
    </Text>
    <Text className="mt-1 text-sm text-gray-500">
      Owner: {personName(item.owner)}
      {typeof item.owner === "object" && item.owner?.email
        ? ` (${item.owner.email})`
        : ""}
    </Text>
  </View>
);

const UserCard = ({ item }: { item: AdminUser }) => (
  <View className="mb-3 rounded-2xl bg-white p-4" style={{ elevation: 1 }}>
    <View className="flex-row items-center justify-between">
      <Text
        numberOfLines={1}
        className="flex-1 text-base font-bold text-gray-900">
        {personName(item)}
      </Text>
      <Pill
        className={ROLE_STYLES[item.role] ?? ROLE_STYLES.customer}
        label={item.role}
      />
    </View>
    <Text className="text-sm text-gray-500">{item.email}</Text>
    <Text className="text-sm text-gray-500">{item.phone}</Text>
  </View>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [myRestaurant, setMyRestaurant] = useState<Restaurant | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [tab, setTab] = useState<Tab>("bookings");
  const [query, setQuery] = useState("");

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");

      const [s, b, r, u, ownedRestaurant] = await Promise.all([
        getAdminStats(),
        getAdminBookings(),
        getAdminRestaurants(),
        getAdminUsers(),
        // An admin may or may not own a restaurant: never let this break the dashboard
        getMyRestaurant().catch(() => null),
      ]);

      setStats(s);
      setBookings(b);
      setRestaurants(r);
      setUsers(u);
      setMyRestaurant(ownedRestaurant);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert("Log out?", "You will need to sign in again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await SecureStore.deleteItemAsync("authToken");
          await SecureStore.deleteItemAsync("userRole");
          await SecureStore.deleteItemAsync("rememberMePreference");
          router.replace("/");
        },
      },
    ]);
  };

  const searchWords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  const matchesSearch = (text: string) => {
    const lowerText = text.toLowerCase();
    return searchWords.every((word) => lowerText.includes(word));
  };

  let rows: (Booking | AdminRestaurant | AdminUser)[] = [];

  if (tab === "bookings") {
    rows = bookings.filter((booking) => matchesSearch(bookingText(booking)));
  } else if (tab === "restaurants") {
    rows = restaurants.filter((restaurant) =>
      matchesSearch(restaurantText(restaurant)),
    );
  } else {
    rows = users.filter((user) => matchesSearch(userText(user)));
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (error && !stats) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Ionicons name="cloud-offline-outline" size={48} color="#9ca3af" />
        <Text className="mt-3 text-center text-base text-gray-700">
          {error}
        </Text>
        <Pressable
          onPress={() => load()}
          className="mt-4 rounded-full bg-blue-700 px-6 py-2">
          <Text className="font-semibold text-white">Retry</Text>
        </Pressable>
        <Pressable onPress={handleLogout} className="mt-3 px-6 py-2">
          <Text className="font-semibold text-red-600">Log out</Text>
        </Pressable>
      </View>
    );
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    // Real totals from the stats (the lists below only hold the newest 200)
    { key: "bookings", label: "Bookings", count: stats?.bookings.total ?? bookings.length },
    { key: "restaurants", label: "Restaurants", count: stats?.restaurants ?? restaurants.length },
    { key: "users", label: "Users", count: stats?.users.total ?? users.length },
  ];

  const header = (
    <View>
      <View className="flex-row flex-wrap justify-between">
        <StatCard
          label="Customers"
          value={stats?.users.customers ?? 0}
          icon="people"
          tint="#2563EB"
          onPress={() =>
            router.push({
              pathname: "/admin/allUsers",
              params: { label: "customer" },
            })
          }
        />
        <StatCard
          label="Restaurant owners"
          value={stats?.users.owners ?? 0}
          icon="storefront"
          tint="#7C3AED"
          onPress={() =>
            router.push({
              pathname: "/admin/allUsers",
              params: { label: "restaurant" },
            })
          }
        />
        <StatCard
          label="Restaurants"
          value={stats?.restaurants ?? 0}
          icon="restaurant"
          tint="#0B7A5A"
          onPress={() => router.push("/admin/restaurants")}
        />
        <StatCard
          label="Total bookings"
          value={stats?.bookings.total ?? 0}
          icon="calendar"
          tint="#0891B2"
          onPress={() => router.push("/admin/allBookings")}
        />
        <StatCard
          label="Pending"
          value={stats?.bookings.pending ?? 0}
          icon="time"
          tint="#D97706"
          onPress={() =>
            router.push({
              pathname: "/admin/allBookings",
              params: { label: "pending" },
            })
          }
        />
        <StatCard
          label="Confirmed"
          value={stats?.bookings.confirmed ?? 0}
          icon="checkmark-circle"
          tint="#16A34A"
          onPress={() =>
            router.push({
              pathname: "/admin/allBookings",
              params: { label: "confirmed" },
            })
          }
        />
        {myRestaurant ? (
          <StatCard
            label="My Restaurant"
            value={1}
            icon="restaurant"
            tint="#D97706"
            onPress={() => router.push("/restaurant/restaurantDashboard")}
          />
        ) : (
          <Pressable
            onPress={() => router.push("/restaurant/createRestaurant")}
            accessibilityRole="button"
            className="mb-3 w-[48%] items-center justify-center rounded-2xl bg-blue-700 p-4"
            style={{ elevation: 2 }}>
            <Ionicons name="add-circle-outline" size={28} color="white" />
            <Text className="mt-2 text-center font-semibold text-white">
              Create Restaurant
            </Text>
          </Pressable>
        )}
      </View>

      <View className="mb-3 flex-row rounded-xl bg-gray-200 p-1">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              className={`flex-1 items-center rounded-lg py-2 ${
                active ? "bg-white" : ""
              }`}>
              <Text
                className={`text-sm font-semibold ${
                  active ? "text-blue-700" : "text-gray-500"
                }`}>
                {t.label} ({t.count})
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Search */}
      <View className="mb-3 h-12 flex-row items-center rounded-full border border-gray-200 bg-white px-4">
        <Ionicons name="search" size={20} color="#2563EB" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={`Search ${tab}`}
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          autoCorrect={false}
          className="ml-3 flex-1 text-base text-black"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50 px-4 pt-16">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-blue-900">
          Admin Dashboard
        </Text>
        <Pressable
          onPress={handleLogout}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Log out"
          className="h-10 w-10 items-center justify-center rounded-full bg-red-50">
          <Ionicons name="log-out-outline" size={22} color="#dc2626" />
        </Pressable>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => (item as { _id: string })._id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={header}
        renderItem={({ item }) => {
          if (tab === "bookings") return <BookingCard item={item as Booking} />;
          if (tab === "restaurants")
            return <RestaurantCard item={item as AdminRestaurant} />;
          return <UserCard item={item as AdminUser} />;
        }}
        ListEmptyComponent={
          <Text className="py-12 text-center text-gray-400">
            {query.trim()
              ? `No ${tab} match "${query.trim()}".`
              : `No ${tab} yet.`}
          </Text>
        }
      />
    </View>
  );
};

export default AdminDashboard;
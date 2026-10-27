import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import {
  getAdminRestaurants,
  setRestaurantActive,
  setRestaurantFeatured, // Make sure to export this function in your adminApi
  type AdminRestaurant,
} from "../../api/adminApi";

type Filter = "all" | "active" | "disabled" | "featured";
type Sort = "newest" | "oldest";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "disabled", label: "Disabled" },
  { key: "featured", label: "Featured" },
];

const SEEN_KEY = "adminRestaurantsLastSeen";
const POLL_MS = 15000;

const isActiveOf = (r: AdminRestaurant) =>
  (r as AdminRestaurant & { isActive?: boolean }).isActive !== false;

const isFeaturedOf = (r: AdminRestaurant) =>
  !!(r as AdminRestaurant & { isFeatured?: boolean }).isFeatured;

const createdMs = (r: AdminRestaurant) =>
  r.createdAt ? new Date(r.createdAt).getTime() || 0 : 0;

const ownerName = (r: AdminRestaurant): string => {
  const o = r.owner;
  if (o && typeof o === "object") {
    const name = `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim();
    return name || o.email || "Unknown owner";
  }
  return "Unknown owner";
};

const formatDate = (value?: string) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};

const RestaurantCard = ({
  item,
  isNew,
  busyActive,
  busyFeatured,
  onToggleActive,
  onToggleFeatured,
}: {
  item: AdminRestaurant;
  isNew: boolean;
  busyActive: boolean;
  busyFeatured: boolean;
  onToggleActive: (item: AdminRestaurant, next: boolean) => void;
  onToggleFeatured: (item: AdminRestaurant) => void;
}) => {
  const active = isActiveOf(item);
  const featured = isFeaturedOf(item);
  const location = [item.city, item.province].filter(Boolean).join(", ");
  const registered = formatDate(item.createdAt);

  return (
    <View
      className={`mb-3 rounded-2xl bg-white p-4 ${active ? "" : "opacity-70"}`}
      style={{ elevation: 1 }}>
      <View className="flex-row items-center">
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
          <Text className="text-xl font-bold text-blue-700">
            {item.name?.trim().charAt(0).toUpperCase() || "?"}
          </Text>
        </View>

        <View className="mx-3 flex-1">
          <View className="flex-row items-center">
            <Text
              numberOfLines={1}
              className="shrink text-base font-bold text-gray-900">
              {item.name}
            </Text>
            {isNew && (
              <Text className="ml-2 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                NEW
              </Text>
            )}
          </View>
          <Text numberOfLines={1} className="text-sm text-gray-500">
            {[item.cuisines, location].filter(Boolean).join(" · ")}
          </Text>
        </View>

        {/* Featured Toggle Button */}
        <Pressable
          onPress={() => onToggleFeatured(item)}
          disabled={busyFeatured}
          accessibilityRole="button"
          accessibilityLabel="Toggle featured restaurant"
          className={`mr-3 items-center justify-center rounded-xl p-2 ${
            featured ? "bg-amber-100" : "bg-gray-100"
          }`}>
          {busyFeatured ? (
            <ActivityIndicator size="small" color="#D97706" />
          ) : (
            <Ionicons
              name={featured ? "star" : "star-outline"}
              size={20}
              color={featured ? "#D97706" : "#9CA3AF"}
            />
          )}
        </Pressable>

        {/* Active Toggle Switch */}
        <View className="items-center">
          {busyActive ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <Switch
              value={active}
              onValueChange={(next) => onToggleActive(item, next)}
              trackColor={{ false: "#d1d5db", true: "#86efac" }}
              thumbColor={active ? "#16a34a" : "#f3f4f6"}
            />
          )}
          <Text
            className={`text-xs font-semibold ${
              active ? "text-green-700" : "text-gray-500"
            }`}>
            {active ? "Active" : "Disabled"}
          </Text>
        </View>
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <Text numberOfLines={1} className="mr-2 flex-1 text-xs text-gray-500">
          Owner: {ownerName(item)}
        </Text>
        <View className="flex-row items-center">
          <Ionicons name="star" size={13} color="#f59e0b" />
          <Text className="ml-1 text-xs font-semibold text-gray-700">
            {(item.rating ?? 0).toFixed(1)} ({item.reviewCount ?? 0})
          </Text>
        </View>
      </View>

      {registered ? (
        <Text className="mt-1 text-xs text-gray-400">
          Registered {registered}
        </Text>
      ) : null}
    </View>
  );
};

const Restaurants = () => {
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  
  // Track specific toggling states
  const [busyActiveId, setBusyActiveId] = useState<string | null>(null);
  const [busyFeaturedId, setBusyFeaturedId] = useState<string | null>(null);

  const [baseline, setBaseline] = useState<number | null>(null);
  const togglingRef = useRef(false);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      setRestaurants(await getAdminRestaurants());
    } catch (e: unknown) {
      if (!silent) {
        setError(
          e instanceof Error ? e.message : "Could not load restaurants.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        const stored = await SecureStore.getItemAsync(SEEN_KEY).catch(
          () => null,
        );
        const seen = stored ? Number(stored) : NaN;
        if (active) setBaseline(Number.isFinite(seen) ? seen : null);
        await load();
      })();

      const interval = setInterval(() => {
        if (!togglingRef.current) void load(true);
      }, POLL_MS);

      return () => {
        active = false;
        clearInterval(interval);
        SecureStore.setItemAsync(SEEN_KEY, String(Date.now())).catch(() => {});
      };
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const markAllSeen = () => {
    const now = Date.now();
    setBaseline(now);
    SecureStore.setItemAsync(SEEN_KEY, String(now)).catch(() => {});
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/admin/adminDashboard");
  };

  const isNew = useCallback(
    (r: AdminRestaurant) => baseline !== null && createdMs(r) > baseline,
    [baseline],
  );

  // Active status toggle handler
  const applyActive = async (r: AdminRestaurant, next: boolean) => {
    const setFlag = (value: boolean) =>
      setRestaurants((cur) =>
        cur.map((x) => (x._id === r._id ? { ...x, isActive: value } : x)),
      );

    togglingRef.current = true;
    setBusyActiveId(r._id);
    setFlag(next); // Optimistic UI update

    try {
      await setRestaurantActive(r._id, next);
    } catch (e: unknown) {
      setFlag(!next); // Rollback
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "Could not update the restaurant status.",
      );
    } finally {
      togglingRef.current = false;
      setBusyActiveId(null);
    }
  };

  const handleToggleActive = (r: AdminRestaurant, next: boolean) => {
    if (next) {
      void applyActive(r, true);
      return;
    }

    Alert.alert(
      "Disable restaurant?",
      `${r.name} will be hidden from customers and won't accept new bookings. Existing bookings are not affected.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disable",
          style: "destructive",
          onPress: () => void applyActive(r, false),
        },
      ],
    );
  };

  // Featured status toggle handler
  const handleToggleFeatured = async (r: AdminRestaurant) => {
    const nextValue = !isFeaturedOf(r);

    const setFlag = (value: boolean) =>
      setRestaurants((cur) =>
        cur.map((x) => (x._id === r._id ? { ...x, isFeatured: value } : x)),
      );

    togglingRef.current = true;
    setBusyFeaturedId(r._id);
    setFlag(nextValue); // Optimistic UI update

    try {
      await setRestaurantFeatured(r._id, nextValue);
    } catch (e: unknown) {
      setFlag(!nextValue); // Rollback
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "Could not update featured status.",
      );
    } finally {
      togglingRef.current = false;
      setBusyFeaturedId(null);
    }
  };

  const newCount = useMemo(
    () => restaurants.filter(isNew).length,
    [restaurants, isNew],
  );

  const counts = useMemo(
    () => ({
      all: restaurants.length,
      active: restaurants.filter(isActiveOf).length,
      disabled: restaurants.filter((r) => !isActiveOf(r)).length,
      featured: restaurants.filter(isFeaturedOf).length,
    }),
    [restaurants],
  );

  const visible = useMemo(() => {
    const filtered = restaurants.filter((r) => {
      if (filter === "active") return isActiveOf(r);
      if (filter === "disabled") return !isActiveOf(r);
      if (filter === "featured") return isFeaturedOf(r);
      return true;
    });

    return [...filtered].sort((a, b) =>
      sort === "newest"
        ? createdMs(b) - createdMs(a)
        : createdMs(a) - createdMs(b),
    );
  }, [restaurants, filter, sort]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 pt-16">
      <View className="mb-4 flex-row items-center px-4">
        <Pressable
          onPress={goBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white">
          <Ionicons name="arrow-back" size={22} color="#2563EB" />
        </Pressable>
        <Text className="text-2xl font-bold text-blue-900 flex-1 text-center mr-10">
          Restaurants
        </Text>
        {newCount > 0 && (
          <View className="ml-2 min-w-[24px] items-center rounded-full bg-red-500 px-2 py-0.5">
            <Text className="text-xs font-bold text-white">{newCount}</Text>
          </View>
        )}
      </View>

      {newCount > 0 && (
        <View className="mx-4 mb-3 flex-row items-center rounded-xl bg-orange-50 p-3">
          <Ionicons name="notifications" size={20} color="#F97316" />
          <Text className="ml-2 flex-1 text-sm text-orange-800">
            {newCount} new restaurant{newCount === 1 ? "" : "s"} registered
            since your last visit
          </Text>
          <Pressable onPress={markAllSeen} hitSlop={8}>
            <Text className="text-sm font-bold text-orange-700">Mark seen</Text>
          </Pressable>
        </View>
      )}

      <View className="mb-3 flex-row items-center">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, flexShrink: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16 }}>
          {FILTERS.map(({ key, label }) => {
            const selected = filter === key;
            return (
              <Pressable
                key={key}
                onPress={() => setFilter(key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className={`mr-2 flex-row items-center rounded-full border px-4 py-1 ${
                  selected
                    ? "border-blue-700 bg-blue-700"
                    : "border-gray-300 bg-white"
                }`}>
                <Text
                  className={`text-base font-semibold ${
                    selected ? "text-white" : "text-gray-700"
                  }`}>
                  {label}
                </Text>
                <Text
                  className={`ml-2 text-base font-bold ${
                    selected ? "text-blue-100" : "text-gray-400"
                  }`}>
                  {counts[key]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          onPress={() => setSort((s) => (s === "newest" ? "oldest" : "newest"))}
          accessibilityRole="button"
          accessibilityLabel="Change sort order"
          className="mx-4 flex-row items-center rounded-full border border-gray-300 bg-white px-3 py-2">
          <Ionicons
            name={sort === "newest" ? "arrow-down" : "arrow-up"}
            size={14}
            color="#2563EB"
          />
          <Text className="ml-1 text-sm font-semibold text-gray-700">
            {sort === "newest" ? "Newest" : "Oldest"}
          </Text>
        </Pressable>
      </View>

      {error ? (
        <View className="mx-4 mb-3 rounded-xl bg-red-50 p-3">
          <Text className="text-sm text-red-700">{error}</Text>
          <Pressable onPress={() => load()} className="mt-1 self-start">
            <Text className="text-sm font-semibold text-red-700">Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={visible}
        keyExtractor={(item) => item._id}
        extraData={[busyActiveId, busyFeaturedId, baseline]}
        renderItem={({ item }) => (
          <RestaurantCard
            item={item}
            isNew={isNew(item)}
            busyActive={busyActiveId === item._id}
            busyFeatured={busyFeaturedId === item._id}
            onToggleActive={handleToggleActive}
            onToggleFeatured={handleToggleFeatured}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text className="py-12 text-center text-gray-400">
            {filter === "all"
              ? "No restaurants yet."
              : `No ${filter} restaurants.`}
          </Text>
        }
      />
    </View>
  );
};

export default Restaurants;
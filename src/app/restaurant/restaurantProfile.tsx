import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import {
  getMyRestaurant,
  getRestaurantImageUrls,
  updateRestaurant,
  type NewRestaurant,
  type Restaurant,
} from "../../api/restaurantApi";
import RestaurantForm, { restaurantToForm } from "../components/RestaurantForm";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

/* ------------------------------ Components ------------------------------ */

// Shows nothing broken: falls back if the link can't be loaded
const SafeImage = ({
  uri,
  className,
  fallback,
}: {
  uri?: string;
  className: string;
  fallback: React.ReactNode;
}) => {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) return <>{fallback}</>;

  return (
    <Image
      source={{ uri }}
      resizeMode="cover"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

const Card = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View
    className="mx-4 mt-4 rounded-2xl border border-gray-100 bg-white p-4"
    style={{ elevation: 1 }}>
    <Text className="mb-3 text-lg font-bold text-blue-900">{title}</Text>
    {children}
  </View>
);

const InfoRow = ({ icon, text }: { icon: IconName; text: string }) => (
  <View className="mb-2 flex-row items-start">
    <Ionicons name={icon} size={18} color="#2563EB" style={{ marginTop: 2 }} />
    <Text className="ml-3 flex-1 text-base text-gray-700">{text}</Text>
  </View>
);

const Chip = ({ label }: { label: string }) => (
  <View className="mb-2 mr-2 rounded-full bg-blue-100 px-3 py-1.5">
    <Text className="text-sm font-semibold text-blue-800">{label}</Text>
  </View>
);

const Stat = ({
  icon,
  tint,
  value,
  label,
}: {
  icon: IconName;
  tint: string;
  value: string;
  label: string;
}) => (
  <View
    className="flex-1 items-center rounded-2xl border border-gray-100 bg-white py-4"
    style={{ elevation: 1 }}>
    <Ionicons name={icon} size={22} color={tint} />
    <Text className="mt-1 text-xl font-bold text-gray-900">{value}</Text>
    <Text className="text-xs text-gray-500">{label}</Text>
  </View>
);

/* -------------------------------- Screen -------------------------------- */

export default function MyRestaurant() {
  // Restaurant = has one, null = none yet, undefined = couldn't check
  const [restaurant, setRestaurant] = useState<Restaurant | null | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setRestaurant(await getMyRestaurant());
    } catch {
      setRestaurant(undefined);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const handleSave = async (payload: NewRestaurant) => {
    if (!restaurant) return;

    try {
      setSaving(true);
      const updated = await updateRestaurant(restaurant._id, payload);
      setRestaurant(updated);
      setMode("view");
      Alert.alert("Saved", "Your restaurant details were updated.");
    } catch (error) {
      Alert.alert(
        "Could not save",
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setSaving(false);
    }
  };

  const editing = mode === "edit" && !!restaurant;

  const header = (
    <View className="flex-row items-center justify-between px-4 pb-3 pt-16">
      {editing ? (
        <Pressable
          onPress={() => setMode("view")}
          disabled={saving}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Cancel editing"
          className="h-10 w-10 items-center justify-center rounded-full bg-blue-50">
          <Ionicons name="close" size={22} color="#2563EB" />
        </Pressable>
      ) : (
        <View className="h-10 w-10" />
      )}

      <Text className="text-2xl font-bold text-blue-900">
        {editing ? "Edit Restaurant" : "My Restaurant"}
      </Text>

      {!editing && restaurant ? (
        <Pressable
          onPress={() => setMode("edit")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Edit restaurant"
          className="h-10 w-10 items-center justify-center rounded-full bg-blue-50">
          <Ionicons name="create-outline" size={22} color="#2563EB" />
        </Pressable>
      ) : (
        <View className="h-10 w-10" />
      )}
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-white">
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </View>
    );
  }

  if (restaurant === undefined) {
    return (
      <View className="flex-1 bg-white">
        {header}
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="cloud-offline-outline" size={48} color="#9ca3af" />
          <Text className="mt-3 text-center text-base text-gray-700">
            Could not load your restaurant.
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
      </View>
    );
  }

  if (restaurant === null) {
    return (
      <View className="flex-1 bg-white">
        {header}
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="restaurant-outline" size={56} color="#d1d5db" />
          <Text className="mt-3 text-lg font-bold text-gray-900">
            No restaurant yet
          </Text>
          <Text className="mt-1 text-center text-gray-500">
            Create your restaurant to start receiving bookings.
          </Text>
          <Pressable
            onPress={() => router.push("/(restaurant)/createRestaurant")}
            className="mt-4 rounded-full bg-blue-700 px-8 py-3">
            <Text className="font-semibold text-white">Create restaurant</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (editing) {
    return (
      <View className="flex-1 bg-white">
        {header}
        <RestaurantForm
          initial={restaurantToForm(restaurant)}
          submitLabel="Save changes"
          submitting={saving}
          onSubmit={handleSave}
          onCancel={() => setMode("view")}
        />
      </View>
    );
  }

  /* ----------------------------- View mode ----------------------------- */

  const images = getRestaurantImageUrls(restaurant.images);
  const initial = restaurant.name?.trim().charAt(0).toUpperCase() || "?";
  const disabled = restaurant.isActive === false;
  const location = [restaurant.address, restaurant.city, restaurant.province]
    .filter(Boolean)
    .join(", ");

  return (
    <View className="flex-1 bg-white">
      {header}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {disabled && (
          <View className="mx-4 mb-4 flex-row items-start rounded-2xl bg-orange-50 p-4">
            <Ionicons name="alert-circle" size={22} color="#EA580C" />
            <View className="ml-3 flex-1">
              <Text className="font-bold text-orange-800">
                Hidden from customers
              </Text>
              <Text className="mt-0.5 text-sm text-orange-700">
                An admin has switched your restaurant off, so customers can't
                find it or book it. Contact the admin to have it re-enabled.
              </Text>
            </View>
          </View>
        )}

        {/* Cover */}
        <View className="mx-4 h-52 overflow-hidden rounded-3xl bg-blue-600">
          <SafeImage
            uri={images[0]}
            className="h-full w-full"
            fallback={
              <View className="flex-1 items-center justify-center">
                <Text className="text-8xl font-bold text-white opacity-40">
                  {initial}
                </Text>
              </View>
            }
          />

          <View className="absolute bottom-0 left-0 right-0 bg-black/45 p-4">
            <Text numberOfLines={1} className="text-2xl font-bold text-white">
              {restaurant.name}
            </Text>
            <Text numberOfLines={1} className="text-base text-white">
              {restaurant.cuisines}
            </Text>
          </View>

          <View
            className={`absolute right-3 top-3 rounded-full px-3 py-1 ${
              disabled ? "bg-orange-500" : "bg-green-600"
            }`}>
            <Text className="text-xs font-bold text-white">
              {disabled ? "Disabled" : "Active"}
            </Text>
          </View>
        </View>

        {/* Quick numbers */}
        <View className="mx-4 mt-4 flex-row gap-3">
          <Stat
            icon="star"
            tint="#F59E0B"
            value={(restaurant.rating ?? 0).toFixed(1)}
            label={`${restaurant.reviewCount ?? 0} reviews`}
          />
          <Stat
            icon="people"
            tint="#2563EB"
            value={String(restaurant.availableSeats ?? 0)}
            label="Seats"
          />
          <Stat
            icon="images"
            tint="#7C3AED"
            value={String(images.length)}
            label="Photos"
          />
        </View>

        <Card title="About">
          {restaurant.description ? (
            <Text className="text-base leading-6 text-gray-700">
              {restaurant.description}
            </Text>
          ) : (
            <Text className="text-gray-400">
              No description yet. Tap Edit to tell customers about your
              restaurant.
            </Text>
          )}
        </Card>

        <Card title="Contact & location">
          <InfoRow icon="location-outline" text={location || "No address added"} />
          <InfoRow icon="call-outline" text={restaurant.phone || "No phone added"} />
        </Card>

        <Card title="Opening hours">
          <View className="flex-row gap-3">
            <View className="flex-1 flex-row items-center rounded-full bg-gray-100 px-4 py-2">
              <Ionicons name="time-outline" size={16} color="#2563EB" />
              <Text className="ml-2 text-sm text-gray-700">
                Opens {restaurant.openingTime || "-"}
              </Text>
            </View>
            <View className="flex-1 flex-row items-center rounded-full bg-gray-100 px-4 py-2">
              <Ionicons name="time-outline" size={16} color="#2563EB" />
              <Text className="ml-2 text-sm text-gray-700">
                Closes {restaurant.closingTime || "-"}
              </Text>
            </View>
          </View>
        </Card>

        <Card title="Seating">
          <Text className="mb-2 text-sm font-semibold text-gray-500">
            Seating types
          </Text>
          <View className="flex-row flex-wrap">
            {restaurant.seatingTypes?.length ? (
              restaurant.seatingTypes.map((t) => <Chip key={t} label={t} />)
            ) : (
              <Text className="text-gray-400">None added</Text>
            )}
          </View>

          <Text className="mb-2 mt-2 text-sm font-semibold text-gray-500">
            Floors
          </Text>
          <View className="flex-row flex-wrap">
            {restaurant.floorNumbers?.length ? (
              restaurant.floorNumbers.map((f) => <Chip key={f} label={f} />)
            ) : (
              <Text className="text-gray-400">None added</Text>
            )}
          </View>
        </Card>

        <Card title="Photos">
          {images.length === 0 ? (
            <Text className="text-gray-400">
              No photos yet. Tap Edit to add some.
            </Text>
          ) : (
            <View className="flex-row flex-wrap">
              {images.map((uri, index) => (
                <View key={uri} className="mb-3 mr-3">
                  <SafeImage
                    uri={uri}
                    className="h-24 w-24 rounded-xl"
                    fallback={<View className="h-24 w-24 rounded-xl bg-gray-200" />}
                  />
                  {index === 0 && (
                    <Text className="absolute bottom-1 left-1 rounded bg-blue-700 px-1 text-[10px] font-bold text-white">
                      Cover
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </Card>

        <Pressable
          onPress={() => setMode("edit")}
          accessibilityRole="button"
          className="mx-4 mt-6 flex-row items-center justify-center rounded-full bg-blue-700 py-4">
          <Ionicons name="create-outline" size={20} color="white" />
          <Text className="ml-2 text-lg font-bold text-white">Edit details</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
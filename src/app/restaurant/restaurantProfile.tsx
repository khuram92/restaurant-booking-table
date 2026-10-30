import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
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
import {
  getMyRestaurant,
  getRestaurantImageUrls,
  resolveImageUrl,
  updateRestaurant,
  type NewRestaurant,
  type Restaurant,
} from "../../api/restaurantApi";
// import RestaurantForm, { restaurantToForm } from "../components/RestaurantForm";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const keepStoredImages = (stored: string[] = [], edited: string[]) => {
  const originals = new Map<string, string>();
  stored.forEach((raw) => {
    const resolved = resolveImageUrl(raw);
    if (resolved) originals.set(resolved, raw);
  });
  return edited.map((url) => originals.get(url) ?? url);
};

const Row = ({
  icon,
  label,
  value,
  actionIcon,
  onPress,
}: {
  icon: IconName;
  label: string;
  value: string;
  actionIcon?: IconName;
  onPress?: () => void;
}) => (
  <Pressable
    onPress={onPress}
    disabled={!onPress}
    accessibilityRole={onPress ? "button" : undefined}
    className="flex-row items-center border-b border-gray-100 py-3">
    <Ionicons name={icon} size={20} color="#2563EB" />
    <View className="ml-3 flex-1">
      <Text className="text-xs text-gray-500">{label}</Text>
      <Text className="text-base text-gray-900">{value}</Text>
    </View>
    {onPress && actionIcon && (
      <Ionicons name={actionIcon} size={20} color="#2563EB" />
    )}
  </Pressable>
);

const RestaurantProfile = () => {
  const [restaurant, setRestaurant] = useState<Restaurant | null | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [brokenPhotos, setBrokenPhotos] = useState<string[]>([]);
  const rating = restaurant?.rating || 0;
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
      const updated = await updateRestaurant(restaurant._id, {
        ...payload,
        images: keepStoredImages(restaurant.images, payload.images),
      });
      setRestaurant(updated);
      setPhotoIndex(0);
      setEditing(false);
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

  const header = (
    <View className="flex-row items-center justify-center px-4 pb-3 pt-16">
      <Text className="text-2xl text-center font-bold text-blue-900">
        {editing ? "Edit Restaurant" : "My Restaurant"}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-white">
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#143d7b" />
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
            onPress={() => router.push("/restaurant/createRestaurant")}
            className="mt-4 rounded-full bg-blue-700 px-8 py-3">
            <Text className="font-semibold text-white">Create restaurant</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  //   if (editing) {
  //     return (
  //       <View className="flex-1 bg-white">
  //         {header}
  //         <RestaurantForm
  //           initial={restaurantToForm(restaurant)}
  //           submitLabel="Save changes"
  //           submitting={saving}
  //           onSubmit={handleSave}
  //           onCancel={() => setEditing(false)}
  //         />
  //       </View>
  //     );
  //   }

  const photos = getRestaurantImageUrls(restaurant.images);
  const cover = photos[photoIndex];
  const showCover = !!cover && !brokenPhotos.includes(cover);
  const initial = restaurant.name?.trim().charAt(0).toUpperCase() || "?";
  const disabled = restaurant.isActive === false;
  const address = [restaurant.address, restaurant.city, restaurant.province]
    .filter(Boolean)
    .join(", ");

  //   const callRestaurant = () =>
  //     Linking.openURL(`tel:${restaurant.phone.replace(/\s/g, "")}`).catch(() =>
  //       Alert.alert("Could not call", "No phone app is available."),
  //     );

  //   const openMaps = () =>
  //     Linking.openURL(
  //       `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
  //     ).catch(() => Alert.alert("Could not open maps", "No maps app is available."));

  return (
    <View className="flex-1 bg-white">
      {header}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {disabled ? (
          <View className="mx-4 mb-3 flex-row items-center rounded-xl bg-orange-50 p-3">
            <Ionicons name="alert-circle" size={20} color="#EA580C" />
            <Text className="ml-2 flex-1 text-sm text-orange-800">
              An admin has switched your restaurant off. Customers can't see or
              book it.
            </Text>
          </View>
        ) : (
          <View className="mx-4 mb-3 flex-row items-center self-start rounded-full bg-green-50 px-4 py-2">
            <View className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <Text className="ml-2 text-sm font-semibold text-green-800">
              Active · visible to customers
            </Text>
          </View>
        )}

        {/* Cover photo with name on top */}
        <View className="mx-4 h-52 overflow-hidden rounded-3xl bg-blue-600">
          {showCover ? (
            <Image
              source={{ uri: cover }}
              resizeMode="cover"
              onError={() => setBrokenPhotos((cur) => [...cur, cover])}
              className="h-full w-full"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-8xl font-bold text-white opacity-40">
                {initial}
              </Text>
            </View>
          )}

          <View className="absolute bottom-0 left-0 right-0  p-4">
            <Text
              numberOfLines={1}
              className="text-2xl font-bold bg-black/50 px-2 py-1 rounded overflow-hidden self-start text-white">
              {restaurant.name}
            </Text>
            <Text
              numberOfLines={1}
              className="text-base text-white bg-black/50 px-2 py-1 rounded overflow-hidden self-start">
              {restaurant.cuisines}
            </Text>
          </View>
        </View>

        {photos.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-3"
            contentContainerStyle={{ paddingHorizontal: 16 }}>
            {photos.map((uri, index) => (
              <Pressable
                key={uri}
                onPress={() => setPhotoIndex(index)}
                accessibilityRole="button"
                accessibilityLabel={`Show photo ${index + 1}`}
                className={`mr-2 overflow-hidden rounded-xl border-2 ${
                  index === photoIndex
                    ? "border-blue-600"
                    : "border-transparent"
                }`}>
                <Image source={{ uri }} className="h-16 w-16" />
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View className="mx-4 mt-4 flex gap-3">
          <View className="flex-1 flex-row items-center justify-center rounded-2xl bg-amber-50 py-4">
            <View className="flex-row gap-1 items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= Math.round(rating) ? "star" : "star-outline"}
                  size={20}
                  color={star <= Math.round(rating) ? "#143d7b" : "#143d7b"}
                />
              ))}
              <Text className="px-2 font-semibold text-[#143d7b]">
                {rating.toFixed(1)}
              </Text>
              <Text className="ml-1 text-sm text-gray-500">
              ({restaurant.reviewCount ?? 0})
            </Text>
            </View>
            
          </View>
          {/* <View className="flex-1 flex-row items-center justify-center rounded-2xl bg-blue-50 py-4">
            <Ionicons name="people" size={20} color="#143d7b" />
            <Text className="ml-2 text-lg font-bold text-gray-900">
              {restaurant.availableSeats ?? 0}
            </Text>
            <Text className="ml-1 text-sm text-gray-500">seats</Text>
          </View> */}
        </View>

        {/* Details */}
        <View className="mx-4 mt-4 rounded-2xl border border-gray-100 bg-white px-4">
          <Row
            icon="location-outline"
            label="Address (tap to open Maps)"
            value={address || "Not added"}
            actionIcon="navigate-outline"
            // onPress={address ? openMaps : undefined}
          />
          <Row
            icon="call-outline"
            label="Phone (tap to call)"
            value={restaurant.phone || "Not added"}
            actionIcon="call"
            // onPress={restaurant.phone ? callRestaurant : undefined}
          />
          <Row
            icon="time-outline"
            label="Opening hours"
            value={
              restaurant.openingTime && restaurant.closingTime
                ? `${restaurant.openingTime} - ${restaurant.closingTime}`
                : "Not added"
            }
          />
          <Row
            icon="home-outline"
            label="Seating types"
            value={restaurant.seatingTypes?.join(", ") || "Not added"}
          />
          <Row
            icon="layers-outline"
            label="Floors"
            value={restaurant.floorNumbers?.join(", ") || "Not added"}
          />
        </View>

        {/* About */}
        <View className="mx-4 mt-4 rounded-2xl border border-gray-100 bg-white p-4">
          <Text className="mb-2 text-lg font-bold text-blue-900">About</Text>
          <Text className="text-base leading-6 text-gray-700">
            {restaurant.description ||
              "No description yet. Tap Edit details to add one."}
          </Text>
        </View>

        <Pressable
          onPress={() => setEditing(true)}
          accessibilityRole="button"
          className="mx-4 mt-6 flex-row items-center justify-center rounded-full bg-blue-700 py-4">
          <Ionicons name="create-outline" size={20} color="white" />
          <Text className="ml-2 text-lg font-bold text-white">
            Edit details
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
};

export default RestaurantProfile;

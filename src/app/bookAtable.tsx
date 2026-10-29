import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "react-native-paper";
import {
  getFavorites,
  toggleFavorite,
  type FavoriteRestaurant,
} from "../api/favoritesApi";
import {
  getRestaurantById,
  resolveImageUrl,
  Restaurant,
} from "../api/restaurantApi";
import { getRestaurantReviews, type PublicReview } from "../api/reviewApi";

const TABS = ["Overview", "Menu", "Reviews"] as const;
type Tab = (typeof TABS)[number];

const TOKEN_KEY = "authToken";

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

export default function BookATable() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      try {
        if (!id) {
          Alert.alert("Error", "No restaurant ID provided");
          return;
        }

        const token = await SecureStore.getItemAsync(TOKEN_KEY);

        const [data, favs] = await Promise.all([
          getRestaurantById(id),
          token
            ? getFavorites(token).catch(() => [] as FavoriteRestaurant[])
            : Promise.resolve([] as FavoriteRestaurant[]),
        ]);

        setRestaurant(data);
        setIsFavorite(favs.some((f) => f._id === id));
      } catch (error) {
        console.error("Error fetching restaurant:", error);
        Alert.alert("Error", "Failed to load restaurant details");
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurantDetails();
  }, [id]);
  useEffect(() => {
    if (!restaurant?.images || restaurant.images.length === 0) return;

    const interval = setInterval(() => {
      setCurrentPhotoIndex((prev) => (prev + 1) % restaurant.images.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [restaurant]);
  useEffect(() => {
    if (restaurant) {
      getRestaurantReviews(restaurant._id)
        .then((data) => setReviews(data.reviews))
        .catch((err) => console.log("Failed to load reviews:", err))
        .finally(() => setLoadingReviews(false));
    }
  }, [restaurant]);

  const handleToggleFavorite = async () => {
    if (!id) return;

    const previous = isFavorite;
    setIsFavorite(!previous);

    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const res = await toggleFavorite(token ?? "", id);
      setIsFavorite(res.isFavorite);

      const name = restaurant?.name ?? "Restaurant";
      Alert.alert(
        res.isFavorite ? "Added to favorites" : "Removed from favorites",
        res.isFavorite
          ? `"${name}" added to your favorites.`
          : `"${name}" removed from your favorites.`,
      );
    } catch (error) {
      setIsFavorite(previous); // rollback
      Alert.alert("Error", "Could not update favorites.");
    }
  };

  const backPage = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/home");
  };

  const navigateToBooking = () => {
    router.push({
      pathname: "/tableRequirements",
      params: { restaurantId: id },
    });
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const imagesList = (restaurant?.images ?? [])
    .map((u) => resolveImageUrl(u))
    .filter((u): u is string => !!u);
  const hasImages = imagesList.length > 0;

  const coverUri = hasImages
    ? imagesList[currentPhotoIndex % imagesList.length]
    : null;
  const showCover = !!coverUri && failedCover !== coverUri;

  const initial = restaurant?.name?.trim().charAt(0).toUpperCase() || "?";

  return (
    <View className="flex-1 bg-white pt-16">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="w-full h-72 justify-between bg-[#143d7b]">
          {showCover ? (
            <Image
              source={{ uri: coverUri! }}
              resizeMode="cover"
              onError={() => setFailedCover(coverUri)}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={StyleSheet.absoluteFill}
              className="items-center justify-center">
              <Text className="text-9xl font-bold text-white opacity-40">
                {initial}
              </Text>
            </View>
          )}

          <View className="flex-row justify-between px-4 pt-4">
            <Pressable
              onPress={backPage}
              className="bg-[#143d7b] w-11 h-11 rounded-full items-center justify-center">
              <Ionicons name="arrow-back" size={22} color="white" />
            </Pressable>

            <Pressable
              onPress={handleToggleFavorite}
              accessibilityRole="button"
              className="bg-[#143d7b] w-11 h-11 rounded-full items-center justify-center">
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={22}
                color={isFavorite ? "blue" : "white"}
              />
            </Pressable>
          </View>

          <View className="mb-4 p-4">
            <Text className="text-2xl font-bold text-white">
              {restaurant?.name || "Restaurant Name"}
            </Text>
            <Text className="text-base text-white">
              {restaurant?.cuisines || "Cuisines"}
            </Text>
          </View>
        </View>

        {/* Content Details */}
        <View className="flex-1 -mt-6 bg-white rounded-t-3xl px-4 pt-6">
          <View className="flex-row justify-between">
            <View className="flex-row items-center gap-2">
              <MaterialCommunityIcons name="star" size={24} color="#facc15" />
              <Text className="font-semibold">
                {restaurant?.rating ? restaurant.rating.toFixed(1) : "0.0"}
              </Text>
              <Text className="text-black">
                ({restaurant?.reviewCount || 0} Reviews)
              </Text>
            </View>

            <View>
              <View className="flex-row items-center justify-center gap-1">
                <Ionicons name="location-outline" size={18} color="#143d7b" />
                <Text className="text-black">{restaurant?.city}</Text>
              </View>
              <Text className="mt-2 text-black">
                {restaurant?.city}, {restaurant?.province}
              </Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="flex-row justify-between mt-6">
            <Pressable className="flex-row border-2 border-[#143d7b] rounded-full items-center justify-center w-[100px] py-2 gap-2">
              <Ionicons name="call" size={18} color="#143d7b" />
              <Text className="text-[#143d7b] font-medium">Call</Text>
            </Pressable>
            <Pressable className="flex-row border-2 border-[#143d7b] rounded-full items-center justify-center w-[100px] py-2 gap-2">
              <Ionicons name="map" size={18} color="#143d7b" />
              <Text className="text-[#143d7b] font-medium">Map</Text>
            </Pressable>
            <Pressable className="flex-row border-2 border-[#143d7b] rounded-full items-center justify-center w-[100px] py-2 gap-2">
              <Ionicons name="share-social" size={18} color="#143d7b" />
              <Text className="text-[#143d7b] font-medium">Share</Text>
            </Pressable>
          </View>

          {/* Tabs */}
          <View className="flex-row gap-16 mt-6 border-b border-gray-200">
            {TABS.map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                className="pb-2">
                <Text
                  className={
                    activeTab === tab
                      ? "text-[#143d7b] font-semibold border-b-2 border-[#143d7b] pb-2"
                      : "text-black font-medium"
                  }>
                  {tab}
                </Text>
              </Pressable>
            ))}
          </View>

          {activeTab === "Overview" ? (
            <>
              {hasImages && (
                <View className="flex-row gap-3 mt-6">
                  {imagesList.slice(0, 3).map((photoUri, index) => (
                    <Image
                      key={index}
                      source={{ uri: photoUri }}
                      className="w-24 h-24 rounded-xl"
                    />
                  ))}
                </View>
              )}

              {/* About Us */}
              <Text className="text-xl font-bold text-black mt-6">
                About Us
              </Text>
              <View>
                <Text
                  className="text-gray-900 mt-2 leading-5"
                  numberOfLines={isAboutExpanded ? undefined : 3}>
                  {restaurant?.description ||
                    "No description provided for this restaurant."}
                </Text>
                <Pressable
                  onPress={() => setIsAboutExpanded((expanded) => !expanded)}
                  className="self-start mt-1">
                  <Text className="text-[#143d7b] font-medium">
                    {isAboutExpanded ? "Read less" : "Read more"}
                  </Text>
                </Pressable>
              </View>

              {/* Timings */}
              <Text className="text-xl font-bold text-black mt-6">
                Timings
              </Text>
              <View className="flex-row items-center gap-3 mt-3 mb-6">
                <View className="flex-row items-center gap-1 bg-gray-100 rounded-full px-3 py-2">
                  <Ionicons name="time-outline" size={16} color="#143d7b" />
                  <Text className="text-gray-900 text-sm">
                    Open: {restaurant?.openingTime || "9:00 AM"}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1 bg-gray-100 rounded-full px-3 py-2">
                  <Ionicons name="time-outline" size={16} color="#143d7b" />
                  <Text className="text-gray-900 text-sm">
                    Close: {restaurant?.closingTime || "11:45 PM"}
                  </Text>
                </View>
              </View>

              {/* Available Seating Types */}
              <Text className="text-xl font-bold text-black mt-6">
                Available Seating
              </Text>
              <View className="flex-row flex-wrap gap-2 mt-3 mb-6">
                {(restaurant?.seatingTypes || ["Indoor", "Outdoor"]).map(
                  (type) => (
                    <View
                      key={type}
                      className="flex-row items-center gap-1 bg-gray-100 rounded-full px-3 py-2">
                      <MaterialCommunityIcons
                        name="home-outline"
                        size={16}
                        color="#143d7b"
                      />
                      <Text className="text-gray-900 text-sm">{type}</Text>
                    </View>
                  ),
                )}
              </View>

              {/* Floor Numbers */}
              <Text className="text-xl font-bold text-black mt-6">
                Floors
              </Text>
              <View className="flex-row flex-wrap gap-2 mt-3 mb-6">
                {(restaurant?.floorNumbers || ["First Floor"]).map((floor) => (
                  <View
                    key={floor}
                    className="flex-row items-center gap-1 bg-gray-100 rounded-full px-3 py-2">
                    <MaterialCommunityIcons
                      name="floor-plan"
                      size={16}
                      color="#143d7b"
                    />
                    <Text className="text-gray-900 text-sm">{floor}</Text>
                  </View>
                ))}
              </View>

              {/* Address / Contact */}
              <Text className="text-xl font-bold text-black mt-6">
                Contact & Address:
              </Text>
              <View className="flex-row items-center gap-3 mt-3 mb-6">
                <View className="flex-row items-center gap-1 bg-gray-100 rounded-full px-3 py-2">
                  <MaterialCommunityIcons name="pin" size={16} color="#143d7b" />
                  <Text className="text-gray-900 text-sm">
                    {restaurant?.address || "Address not provided"}
                  </Text>
                </View>
              </View>
            </>
          ) : activeTab === "Menu" ? (
            <View className="flex items-center mt-6">
              <Text className="text-black font-semibold">
                No Menu Available
              </Text>
            </View>
          ) : (
            <View className="mt-6">
              {reviews.map((rev) => {
                const customerName = rev.customer?.name || "Customer";
                const avatar = rev.customer?.avatar;

                const formattedDate = rev.createdAt
                  ? new Date(rev.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : null;

                return (
                  <View
                    key={rev._id}
                    className="mb-4 rounded-2xl bg-gray-200 p-4 border border-gray-100 shadow-sm shadow-gray-200 active:scale-[0.99] transition-all">
                    {/* Top Row: Customer Info & Rating */}
                    <View className="flex-row items-center justify-between">
                      {/* Customer Avatar & Name */}
                      <View className="flex-row items-center gap-3">
                        {avatar ? (
                          <Image
                            source={{ uri: avatar }}
                            className="h-10 w-10 rounded-full border border-[#143d7b]"
                          />
                        ) : (
                          <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-100 border border-[#143d7b]">
                            <Text className="text-xs font-bold text-[#143d7b]">
                              {initialsOf(customerName)}
                            </Text>
                          </View>
                        )}
                        <View>
                          <Text className="font-bold text-gray-900 text-base">
                            {customerName}
                          </Text>
                          {formattedDate && (
                            <Text className="text-xs text-gray-400 mt-0.5">
                              {formattedDate}
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* Rating Pill Badge */}
                      <View className="flex-row items-center bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                        <Ionicons name="star" size={14} color="#D97706" />
                        <Text className="ml-1 text-xs font-bold text-amber-700">
                          {rev.rating}.0
                        </Text>
                      </View>
                    </View>

                    {/* Review Comment Text (the comment is optional) */}
                    {!!rev.comment && (
                      <Text className="mt-3 text-sm leading-relaxed text-black font-normal">
                        "{rev.comment}"
                      </Text>
                    )}

                    {/* The restaurant's reply, if it has answered */}
                    {rev.reply && (
                      <View className="mt-3 rounded-xl border border-[#143d7b] bg-white p-3">
                        <View className="flex-row items-center">
                          <Ionicons
                            name="return-down-forward"
                            size={14}
                            color="#2563EB"
                          />
                          <Text className="ml-1 text-xs font-bold text-[#143d7b]">
                            Response from the restaurant
                          </Text>
                        </View>
                        <Text className="mt-1 text-sm text-black">
                          {rev.reply.text}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer Book Button */}
      <View className="px-4 pb-6 pt-3 bg-white">
        <Button buttonColor="#143d7b" mode="contained" onPress={navigateToBooking}>
          Book a table
        </Button>
      </View>
    </View>
  );
}

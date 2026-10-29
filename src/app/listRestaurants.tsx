import { getAllRestaurants } from "@/api/restaurantApi";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Searchbar } from "react-native-paper";
import { getFavorites, toggleFavorite } from "../api/favoritesApi";
import { resolveImageUrl } from "../api/restaurantApi";
import NavigationBar from "./components/navigationBar";
import NotificationBell from "./components/NotificationBell";

type Restaurant = {
  _id: string;
  name: string;
  cuisines: string;
  city: string;
  province: string;
  images: string[];
  rating: number;
  reviewCount: number;
  distance?: string;
};

const Stars = ({ rating }: { rating: number }) => (
  <View className="flex-row items-center">
    {[1, 2, 3, 4, 5].map((star) => (
      <Ionicons
        key={star}
        name="star"
        size={14}
        color={star <= Math.round(rating) ? "blue" : "#e5e7eb"}
        style={{ marginRight: 2 }}
      />
    ))}
  </View>
);

const RestaurantCard = ({
  item,
  isFavorite,
  onToggleFavorite,
}: {
  item: Restaurant;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = resolveImageUrl(item.images?.[0]);

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/bookAtable",
          params: { id: item._id },
        })
      }
      className="mb-4 flex-row border-b border-gray-100 bg-white pb-4">
      <View className="relative h-32 w-32 items-center justify-center overflow-hidden rounded-2xl bg-emerald-100">
        {imageUrl && !imageFailed ? (
          <Image
            source={{ uri: imageUrl }}
            resizeMode="cover"
            className="h-full w-full"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Text className="text-5xl font-bold text-emerald-700">
            {item.name?.trim().charAt(0).toUpperCase() || "?"}
          </Text>
        )}

        <View className="absolute bottom-2 right-2 rounded-lg bg-blue-500 px-2 py-0.5">
          <Text className="text-xs font-bold text-white">
            {item.distance || "Unknown"}
          </Text>
        </View>
      </View>

      <View className="flex-1 justify-between px-3 py-1">
        <View className="flex-row items-start justify-between">
          <Text
            numberOfLines={1}
            className="flex-1 text-lg font-bold text-gray-900">
            {item.name}
          </Text>
          <Pressable onPress={() => onToggleFavorite(item._id)} className="p-1">
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={24}
              color={isFavorite ? "blue" : "#9ca3af"}
            />
          </Pressable>
        </View>

        <Text numberOfLines={1} className="text-sm text-black">
          {item.cuisines || "Various"}
        </Text>

        <View className="flex-row items-center gap-1">
          <Stars rating={item.rating || 0} />
          <Text className="text-sm font-semibold text-blue-800">
            {(item.rating || 0).toFixed(1)}
          </Text>
          <Text className="text-sm text-black">({item.reviewCount || 0})</Text>
        </View>

        <Text numberOfLines={1} className="text-xs text-black">
          {[item.city, item.province].filter(Boolean).join(", ") ||
            "Location unavailable"}
        </Text>
      </View>
    </Pressable>
  );
};

export default function ListRestaurants() {
  const [search, setSearch] = useState("");
  const [cuisines, setCuisines] = useState<string[]>(["All"]);
  const [selectedCuisine, setSelectedCuisine] = useState("All");
  const [activeTab, setActiveTab] = useState<"Nearby" | "All">("Nearby");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const getStoredToken = async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync("authToken");
    } catch (error) {
      console.error("Error reading auth token:", error);
      return null;
    }
  };

  const loadData = async () => {
    try {
      const token = await getStoredToken();

      const restaurantsData = await getAllRestaurants();
      setRestaurants(restaurantsData);

      const uniqueCuisines = Array.from(
        new Set(
          restaurantsData
            .map((restaurant) => restaurant.cuisines)
            .filter(Boolean),
        ),
      );
      setCuisines(["All", ...uniqueCuisines]);

      if (token) {
        const userFavorites = await getFavorites(token);
        setFavoriteIds(userFavorites.map((favorite) => favorite._id));
      } else {
        setFavoriteIds([]);
      }
    } catch (error) {
      console.error("Failed to load restaurant data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleFavorite = async (restaurantId: string) => {
    try {
      const token = await getStoredToken();

      if (!token) {
        Alert.alert(
          "Authentication required",
          "Please log in to manage favorites.",
        );
        return;
      }

      const response = await toggleFavorite(token, restaurantId);
      const restaurant = restaurants.find((r) => r._id === restaurantId);
      const restaurantName = restaurant?.name ?? "Restaurant";

      setFavoriteIds((previous) =>
        response.isFavorite
          ? previous.includes(restaurantId)
            ? previous
            : [...previous, restaurantId]
          : previous.filter((id) => id !== restaurantId),
      );

      Alert.alert(
        response.isFavorite ? "Added to favorites" : "Removed from favorites",
        response.isFavorite
          ? `"${restaurantName}" added to your favorites.`
          : `"${restaurantName}" removed from your favorites.`,
      );
    } catch (error: any) {
      console.error("Failed to update favorite status:", error);
      Alert.alert(
        "Error",
        error?.response?.data?.message ?? "Could not update favorite status.",
      );
    }
  };

  const filteredRestaurants = restaurants.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.cuisines?.toLowerCase().includes(search.toLowerCase());
    const matchesCuisine =
      selectedCuisine === "All" ||
      r.cuisines?.toLowerCase().includes(selectedCuisine.toLowerCase());
    return matchesSearch && matchesCuisine;
  });

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="blue" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1  px-2 pt-16">
        <View className="flex-row justify-between  mb-4">
          <Link href={"/home"} asChild>
            <Pressable className=" w-12 h-12 ">
              <Ionicons name="arrow-back" size={24} color="#2563EB" />
            </Pressable>
          </Link>
          <Text className="text-blue-600 font-bold text-3xl">Restaurants</Text>
          <NotificationBell
            color="white"
            size={22}
            containerClassName="h-11 w-11 items-center justify-center rounded-full bg-blue-700"
          />
        </View>

        <View className="mb-3">
          <Searchbar
            value={search}
            onChangeText={setSearch}
            placeholder="Search Restaurants..."
            style={{
              backgroundColor: "#f9fafb",
              borderRadius: 24,
              borderWidth: 1,
              borderColor: "#e5e7eb",
            }}
            elevation={0}
          />
        </View>

        {/* Dynamic Cuisine Filter Pills */}
        <View
          className="mb-2 mt-2 pb-2 rounded-2xl bg-white"
          style={{ boxShadow: "0px 6px 6px -2px rgba(0,0,0,0.25)" }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}>
            {cuisines.map((cuisine) => {
              const isSelected = selectedCuisine === cuisine;
              return (
                <Pressable
                  key={cuisine}
                  onPress={() => setSelectedCuisine(cuisine)}
                  className={`px-5 py-2 rounded-full border ${
                    isSelected
                      ? "bg-blue-100 border-blue-600"
                      : "bg-white border-blue-300"
                  }`}>
                  <Text
                    className={`font-base ${
                      isSelected ? "text-blue-800" : "text-black"
                    }`}>
                    {cuisine}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row rounded-full bg-gray-100 p-1 mt-2">
            <Pressable
              onPress={() => setActiveTab("Nearby")}
              className={`px-5 py-2 rounded-full ${
                activeTab === "Nearby" ? "bg-blue-700" : "bg-transparent"
              }`}>
              <Text
                className={`font-semibold ${
                  activeTab === "Nearby" ? "text-white" : "text-blue-600"
                }`}>
                Nearby
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab("All")}
              className={`px-5 py-2 rounded-full ${
                activeTab === "All" ? "bg-blue-700" : "bg-transparent"
              }`}>
              <Text
                className={`font-semibold ${
                  activeTab === "All" ? "text-white" : "text-black"
                }`}>
                All
              </Text>
            </Pressable>
          </View>

          <Pressable className="flex-row items-center gap-1 px-4 py-2 rounded-full border border-blue-200 bg-blue-50">
            <Ionicons name="settings-outline" size={18} color="blue" />
            <Text className="font-semibold text-blue-800">Filters</Text>
          </Pressable>
        </View>

        <FlatList
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          data={filteredRestaurants}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <RestaurantCard
              item={item}
              isFavorite={favoriteIds.includes(item._id)}
              onToggleFavorite={handleToggleFavorite}
            />
          )}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center pt-24">
              <Ionicons name="restaurant-outline" size={56} color="blue" />
              <Text className="mt-4 text-lg font-bold text-gray-900">
                No Restaurants Found
              </Text>
              <Text className="mt-1 text-center text-sm text-gray-400">
                Try searching for a different name or category.
              </Text>
            </View>
          }
        />
      </View>
      <NavigationBar />
    </View>
  );
}

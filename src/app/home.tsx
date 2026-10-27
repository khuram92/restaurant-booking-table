import { getAllRestaurants } from "@/api/restaurantApi";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Link, router, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useState, type ComponentProps } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { ActivityIndicator, Searchbar } from "react-native-paper";
import { getMe } from "../api/authApi";
import { getFavorites, toggleFavorite } from "../api/favoritesApi";
import { resolveImageUrl } from "../api/restaurantApi";
import NavigationBar from "./components/navigationBar";
import NotificationBell from "./components/NotificationBell";

type Category = {
  label: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  onPress: () => void;
};

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

type Profile = { lastName?: string; address?: string; avatar?: string };

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

        <Text numberOfLines={1} className="text-sm text-blue-600">
          {item.cuisines || "Various"}
        </Text>

        <View className="flex-row items-center gap-1">
          <Stars rating={item.rating || 0} />
          <Text className="text-sm font-semibold text-blue-800">
            {(item.rating || 0).toFixed(1)}
          </Text>
          <Text className="text-sm text-blue-500">
            ({item.reviewCount || 0})
          </Text>
        </View>

        <Text numberOfLines={1} className="text-xs text-blue-500">
          {[item.city, item.province].filter(Boolean).join(", ") ||
            "Location unavailable"}
        </Text>
      </View>
    </Pressable>
  );
};

export default function Home() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"Nearby" | "All">("Nearby");
  const categories: Category[] = [
    {
      label: "Surprise Me",
      icon: "dice-5",
      onPress: () => router.push("/listRestaurants"),
    },
    {
      label: "Featured",
      icon: "star",
      onPress: () => router.push("/components/FeaturedRestaurantList"),
    },
    {
      label: "Discounts",
      icon: "percent-outline",
      onPress: () => router.push("/listRestaurants"),
    },
    {
      label: "Popular",
      icon: "fire",
      onPress: () => router.push("/listRestaurants"),
    },
  ];
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const getStoredToken = async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync("authToken");
    } catch (error) {
      console.error("Error reading auth token:", error);
      return null;
    }
  };

  const loadProfile = useCallback(async () => {
    try {
      const token = await getStoredToken();
      if (!token) return;

      const data: any = await getMe(token);
      const u = data?.user ?? data;
      setProfile({
        lastName: u?.lastName ?? u?.firstName,
        address: u?.address,
        avatar: u?.avatar,
      });
    } catch (e) {
      console.log("Error loading profile:", e);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const token = await getStoredToken();
      const restaurantsData = await getAllRestaurants();
      setRestaurants(restaurantsData);

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
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
      void loadProfile();
    }, [loadData, loadProfile]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
      await loadProfile(); // Refresh profile data too
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

    return matchesSearch;
  });

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="blue" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white ">
      <View className="flex-1 px-2 pt-16">
        {/* Header Profile Info */}
        <View className="flex-row items-start">
          <Image
            source={
              profile?.avatar
                ? { uri: profile.avatar }
                : require("../../assets/images/user.png")
            }
            className="w-20 h-20 rounded-full border-2 border-blue-700"
          />

          <View className="flex-1 ml-2">
            <Text className="text-2xl font-bold text-blue-700">
              Hi, {profile?.lastName ?? "there"}
            </Text>

            <View className="flex-row items-center">
              <Text
                numberOfLines={3}
                className="flex-1 text-blue-700 text-base">
                {profile?.address || "Address not provided"}
              </Text>
              <Pressable onPress={loadProfile}>
                <MaterialCommunityIcons name="refresh" size={20} color="blue" />
              </Pressable>
            </View>
          </View>

          <View className="flex-row items-center ml-2">
            <Link href="/favorite" asChild>
              <Pressable className="w-11 h-11 rounded-full items-center justify-center mr-2">
                <Ionicons name="heart" size={20} color="#2563EB" />
              </Pressable>
            </Link>
            <NotificationBell
              color="#2563EB"
              size={22}
              containerClassName="h-11 w-11 items-center justify-center rounded-full "
            />
          </View>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center rounded-full mt-4">
          <Searchbar
            value={search}
            onChangeText={setSearch}
            placeholder="Search"
          />
        </View>
        <FlatList
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          data={filteredRestaurants}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Featured Section */}
              <View className="flex-row items-center justify-between mt-4">
                <Text className="font-bold text-blue-500 text-xl">
                  Featured Restaurant
                </Text>
                
                <Link href="/listRestaurants" asChild>
                  <Pressable className="flex-row items-center">
                    <Text className="mr-1 text-blue-500 text-lg">See All</Text>
                    <Ionicons name="arrow-forward" size={20} color="blue" />
                  </Pressable>
                </Link>
              </View>

              {/* Categories */}
              <View className="my-6 flex-row justify-between">
                {categories.map(({ label, icon, onPress }) => (
                  <Pressable
                    key={label}
                    onPress={onPress}
                    className="items-center justify-center rounded-2xl bg-gray-100"
                    style={{ width: "23%", height: 96 }}>
                    <MaterialCommunityIcons
                      name={icon}
                      size={28}
                      color={"#3B82F6"}
                    />
                    <Text className="mt-2 text-center text-sm font-semibold text-blue-600">
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Nearby Section Header */}
              <View className="flex my-2 mb-4">
                <Text className="font-bold text-blue-500 text-xl">
                  Nearby Restaurant
                </Text>
                <View className="flex-row justify-between my-4">
                  <View className="flex-row rounded-full bg-gray-100">
                    <Pressable
                      onPress={() => setActiveTab("Nearby")}
                      className={`px-5 py-2 rounded-full ${
                        activeTab === "Nearby"
                          ? "bg-blue-700"
                          : "bg-transparent"
                      }`}>
                      <Text
                        className={`font-semibold ${
                          activeTab === "Nearby"
                            ? "text-white"
                            : "text-blue-600"
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
                          activeTab === "All" ? "text-white" : "text-blue-600"
                        }`}>
                        All
                      </Text>
                    </Pressable>
                  </View>
                  <Link href="/listRestaurants" asChild>
                    <Pressable className="flex-row items-center">
                      <Text className="mr-1 text-blue-500 text-lg">
                        See All
                      </Text>
                      <Ionicons name="arrow-forward" size={20} color="blue" />
                    </Pressable>
                  </Link>
                </View>
              </View>
            </>
          }
          renderItem={({ item }) => (
            <RestaurantCard
              item={item}
              isFavorite={favoriteIds.includes(item._id)}
              onToggleFavorite={handleToggleFavorite}
            />
          )}
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

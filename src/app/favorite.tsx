import { Ionicons } from "@expo/vector-icons";
import { Link, router, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { getFavorites, toggleFavorite } from "../api/favoritesApi"; // Update path if needed
import { resolveImageUrl } from "../api/restaurantApi";
import NotificationBell from "./components/NotificationBell";

type FavoriteRestaurant = {
  _id: string;
  name: string;
  cuisine?: string;
  rating?: number;
  reviewCount?: number;
  location?: string;
  image?: string | null;
};

const TOKEN_KEY = "authToken"; // same key used in index.tsx and bookingApi.ts

const Stars = ({ rating }: { rating: number }) => (
  <View className="flex-row">
    {[1, 2, 3, 4, 5].map((star) => (
      <Ionicons
        key={star}
        name="star"
        size={16}
        color={star <= Math.round(rating) ? "#f59e0b" : "#e5e7eb"}
        style={{ marginRight: 2 }}
      />
    ))}
  </View>
);

const FavoriteCard = ({
  item,
  onRemove,
}: {
  item: FavoriteRestaurant;
  onRemove: (id: string) => void;
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  const imageUrl = resolveImageUrl(item.image ?? undefined);
  const showImage = !!imageUrl && !imageFailed;
  const initial = item.name?.trim().charAt(0).toUpperCase() || "?";
  const rating = item.rating || 0;

  return (
    <View className="pt-3">
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/bookAtable",
            params: { id: item._id },
          })
        }
        className="flex-row">
        {showImage ? (
          <Image
            source={{ uri: imageUrl }}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
            className="h-32 w-36 rounded-l-2xl"
          />
        ) : (
          <View className="h-32 w-36 items-center justify-center rounded-l-2xl bg-blue-100">
            <Text className="text-5xl font-bold text-black">{initial}</Text>
          </View>
        )}

        <View className="flex-1 justify-between px-3 py-1">
          <Text numberOfLines={2} className="text-lg font-bold text-black">
            {item.name}
          </Text>
          <Text numberOfLines={1} className="text-sm text-black">
            {item.cuisine || "Various Cuisines"}
          </Text>
          <View className="flex-row items-center">
            <Stars rating={rating} />
            <Text className="ml-2 text-base font-semibold text-[#143d7b]">
              {rating.toFixed(1)}
            </Text>
            <Text className="ml-1 text-base text-[#143d7b]">
              ({item.reviewCount || 0})
            </Text>
          </View>
          <Text numberOfLines={1} className="text-xs text-black">
            {item.location || "Lahore, Punjab"}
          </Text>
        </View>

        <Pressable
          onPress={() => onRemove(item._id)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${item.name} from favourites`}
          className="h-8 w-8 items-center justify-center self-start">
          <Ionicons name="heart" size={22} color="#143d7b" />
        </Pressable>
      </Pressable>

      <View className="mt-3 h-px bg-gray-300" />
    </View>
  );
};

const Favorite = () => {
  const [favorites, setFavorites] = useState<FavoriteRestaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadFavorites = async () => {
        try {
          const token = await SecureStore.getItemAsync(TOKEN_KEY);

          const data = await getFavorites(token ?? "");
          if (active) setFavorites(data);
        } catch (error: any) {
          const status = error?.response?.status;
          const serverMsg = error?.response?.data?.message;

          Alert.alert(
            "Error",
            `Could not fetch your favourite restaurants.\n\n` +
              `Status: ${status ?? "no response"}\n` +
              `Message: ${serverMsg ?? error?.message}`,
          );
        } finally {
          if (active) setLoading(false);
        }
      };

      loadFavorites();

      return () => {
        active = false;
      };
    }, []),
  );

  const removeFavorite = async (id: string) => {
    const previous = favorites;

    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);

      setFavorites((prev) => prev.filter((r) => r._id !== id));
      await toggleFavorite(token ?? "", id);
    } catch (error) {
      setFavorites(previous);
      Alert.alert("Error", "Failed to update favorite status.");
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white mt-16">
      <View className="mb-4 flex-row items-center justify-between mt-2 px-4">
        <Link href="/home" asChild>
          <Pressable className="h-10 w-10 justify-center">
            <Ionicons name="arrow-back" size={26} color="#143d7b" />
          </Pressable>
        </Link>
        <Text className="text-2xl font-bold text-[#143d7b]">Favourite</Text>
        <NotificationBell
          color="white"
          size={22}
          containerClassName="h-11 w-11 items-center justify-center rounded-full bg-[#143d7b]"
        />
      </View>

      <FlatList
        className="px-4"
        data={favorites}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <FavoriteCard item={item} onRemove={removeFavorite} />
        )}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center px-2 pt-24">
            <Ionicons name="heart-outline" size={56} color="#d1d5db" />
            <Text className="mt-4 text-lg font-bold text-gray-900">
              No favourites yet
            </Text>
            <Text className="mt-1 text-center text-sm text-gray-400">
              Tap the heart on a restaurant to save it here.
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default Favorite;

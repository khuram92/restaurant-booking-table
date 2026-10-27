import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API_URL = "http://10.0.2.2:3000/api";

const API = axios.create({
  baseURL: API_URL,
});

export type NewRestaurant = {
  name: string;
  cuisines: string;
  city: string;
  province?: string;
  address: string;
  phone: string;
  description?: string;
  images: string[];
  openingTime: string;
  closingTime: string;
  floorNumbers: string[];
  availableSeats: number;
  seatingTypes: string[];
  reviewCount?: number;
  numReviews?: number;
  isFeatured: boolean;
};

export interface Restaurant {
  _id: string;
  name: string;
  cuisines: string;
  city: string;
  province: string;
  address: string;
  phone: string;
  description: string;
  images: string[];
  openingTime: string;
  closingTime: string;
  rating: number;
  reviewCount: number;
  floorNumbers: string[];
  availableSeats: number;
  seatingTypes: string[];
  isFeatured?: boolean;
}

export type FeaturedRestaurant = Restaurant;

export const createRestaurant = async (
  data: NewRestaurant,
): Promise<Restaurant> => {
  const token = await SecureStore.getItemAsync("authToken");
  if (!token) throw new Error("You must be logged in");

  try {
    const response = await API.post("/restaurants", data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.restaurant;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Could not create restaurant",
    );
  }
};

export const getMyRestaurant = async (): Promise<Restaurant | null> => {
  const token = await SecureStore.getItemAsync("authToken");
  if (!token) throw new Error("You must be logged in");

  try {
    const response = await API.get("/restaurants/mine", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.restaurant;
  } catch (error: any) {
    const status = error?.response?.status;
    const message = error?.response?.data?.message;

    if (
      status === 404 &&
      typeof message === "string" &&
      /no restaurant/i.test(message)
    ) {
      return null;
    }

    throw new Error(message || "Could not load your restaurant");
  }
};

export const getRestaurantById = async (
  restaurantId: string,
): Promise<Restaurant> => {
  const response = await API.get(`/restaurants/${restaurantId}`);
  return response.data.restaurant;
};

export const getAllRestaurants = async (): Promise<Restaurant[]> => {
  const response = await API.get("/restaurants");
  return response.data.restaurants;
};

export const resolveImageUrl = (url?: string): string | undefined => {
  if (!url) return undefined;

  try {
    if (url.includes("google.com/imgres")) {
      const real = new URL(url).searchParams.get("imgurl");
      if (real) url = real;
    }
  } catch {
    // fall through with the original url
  }

  return url.replace(/^http:\/\//i, "https://");
};

export const fetchFeaturedRestaurants = async (): Promise<FeaturedRestaurant[]> => {
  console.log("-> Attempting to fetch featured restaurants from:", `${API_URL}/restaurants/featured`);
  try {
    const response = await API.get("/restaurants/featured");
    console.log("<- Successfully fetched:", response.data);
    return response.data.restaurants;
  } catch (error: any) {
    console.log("❌ Fetch Featured Error details:", error?.message, error?.config?.url);
    throw new Error(
      error?.response?.data?.message || "Failed to fetch featured restaurants",
    );
  }
};
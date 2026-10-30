import axios from "axios";
import * as SecureStore from "expo-secure-store";

import { API_URL, REQUEST_TIMEOUT_MS } from "./config";

const API = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
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
  isFeatured?: boolean; // ignored by the server: only admins can feature a restaurant
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
  isActive?: boolean;
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

export type RestaurantQuery = {
  city?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type RestaurantPage = {
  restaurants: Restaurant[];
  total: number;
  page: number;
  pages: number;
};

// One page of results. Use page / pages to load more (e.g. infinite scroll).
export const getRestaurantsPage = async (
  query: RestaurantQuery = {},
): Promise<RestaurantPage> => {
  const { data } = await API.get("/restaurants", { params: query });
  return {
    restaurants: data.restaurants,
    total: data.total ?? data.restaurants.length,
    page: data.page ?? 1,
    pages: data.pages ?? 1,
  };
};

// First page only (up to 50 restaurants). Use getRestaurantsPage for more.
export const getAllRestaurants = async (
  query: RestaurantQuery = {},
): Promise<Restaurant[]> => (await getRestaurantsPage(query)).restaurants;

// Every restaurant, fetched page by page (100 per request, at most maxPages requests)
export const getEveryRestaurant = async (
  query: Omit<RestaurantQuery, "page" | "limit"> = {},
  maxPages = 10,
): Promise<Restaurant[]> => {
  const all: Restaurant[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const result = await getRestaurantsPage({ ...query, page, limit: 100 });
    all.push(...result.restaurants);
    if (page >= result.pages) break;
  }
  return all;
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

export const fetchFeaturedRestaurants = async (): Promise<
  FeaturedRestaurant[]
> => {
  try {
    const response = await API.get("/restaurants/featured");

    return response.data.restaurants;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to fetch featured restaurants",
    );
  }
};

export const updateRestaurant = async (
  id: string,
  changes: Partial<NewRestaurant>,
): Promise<Restaurant> => {
  const token = await SecureStore.getItemAsync("authToken");
  if (!token) throw new Error("You must be logged in");

  try {
    const response = await API.put(`/restaurants/${id}`, changes, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.restaurant;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Could not update restaurant",
    );
  }
};

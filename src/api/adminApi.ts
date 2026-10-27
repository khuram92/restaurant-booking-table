import * as SecureStore from "expo-secure-store";
import type { Booking } from "./bookingApi";

const API_URL = "http://10.0.2.2:3000/api";

export type AdminStats = {
  users: { total: number; customers: number; owners: number };
  restaurants: number;
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    rejected: number;
    cancelled: number;
  };
};

export type AdminUser = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role: "customer" | "restaurant" | "admin";
  createdAt?: string;
};

export type AdminRestaurant = {
  _id: string;
  name: string;
  cuisines?: string;
  city?: string;
  province?: string;
  rating?: number;
  reviewCount?: number;
  owner?:
    | string
    | { _id: string; firstName?: string; lastName?: string; email?: string };
  createdAt?: string;
};

async function request<T>(
  path: string,
  options: { method?: "GET" | "PATCH"; body?: object } = {},
): Promise<T> {
  const token = await SecureStore.getItemAsync("authToken");
  if (!token) throw new Error("You must be logged in");

  const response = await fetch(`${API_URL}/admin/${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");

  return data as T;
}

export const getAdminStats = async () =>
  (await request<{ stats: AdminStats }>("stats")).stats;

export const getAdminUsers = async () =>
  (await request<{ users: AdminUser[] }>("users")).users;

export const getAdminRestaurants = async () =>
  (await request<{ restaurants: AdminRestaurant[] }>("restaurants"))
    .restaurants;

export const getAdminBookings = async () =>
  (await request<{ bookings: Booking[] }>("bookings")).bookings;

export const setRestaurantActive = async (id: string, isActive: boolean) =>
  (
    await request<{ restaurant: AdminRestaurant }>(`restaurants/${id}/active`, {
      method: "PATCH",
      body: { isActive },
    })
  ).restaurant;

export const setRestaurantFeatured = async (
  id: string,
  isFeatured: boolean,
) => {
  try {
    const res = await request<{ restaurant: AdminRestaurant }>(
      `restaurants/${id}/featured`,
      {
        method: "PATCH",
        body: { isFeatured },
      },
    );
    return res.restaurant;
  } catch (error: any) {
    console.log("FEATURED ERROR DETAILS:", {
      status: error?.status || error?.response?.status,
      data: error?.data || error?.response?.data,
      message: error?.message,
    });
    throw error;
  }
};

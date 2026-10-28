import * as SecureStore from "expo-secure-store";
import type { Booking } from "./bookingApi";
import { API_URL, fetchWithTimeout } from "./config";

export type AdminStats = {
  users: { total: number; customers: number; owners: number };
  restaurants: number;
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    rejected: number;
    cancelled: number;
    completed: number;
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
  isFeatured?: boolean;
  isActive?: boolean;
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

  const response = await fetchWithTimeout(`${API_URL}/admin/${path}`, {
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

const PAGE_SIZE = 200; // the server's maximum per request

type PagedResponse = { pages?: number } & Record<string, unknown>;

/**
 * The admin endpoints return at most 200 rows per request. This keeps asking
 * for the next page until everything is loaded (or maxPages is reached), so
 * lists are never silently cut off at 200.
 */
async function fetchAllPages<T>(
  path: "users" | "restaurants" | "bookings",
  maxPages = 10, // up to 2,000 rows; raise it if you ever need more
): Promise<T[]> {
  const all: T[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const res = await request<PagedResponse>(
      `${path}?page=${page}&limit=${PAGE_SIZE}`,
    );

    const rows = res[path];
    if (Array.isArray(rows)) all.push(...(rows as T[]));

    if (page >= (res.pages ?? 1)) break;
  }

  return all;
}

export const getAdminStats = async () =>
  (await request<{ stats: AdminStats }>("stats")).stats;

export const getAdminUsers = () => fetchAllPages<AdminUser>("users");

export const getAdminRestaurants = () =>
  fetchAllPages<AdminRestaurant>("restaurants");

export const getAdminBookings = () => fetchAllPages<Booking>("bookings");

export const setRestaurantActive = async (id: string, isActive: boolean) =>
  (
    await request<{ restaurant: AdminRestaurant }>(`restaurants/${id}/active`, {
      method: "PATCH",
      body: { isActive },
    })
  ).restaurant;

export const setRestaurantFeatured = async (id: string, isFeatured: boolean) =>
  (
    await request<{ restaurant: AdminRestaurant }>(`restaurants/${id}/featured`, {
      method: "PATCH",
      body: { isFeatured },
    })
  ).restaurant;
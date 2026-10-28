import * as SecureStore from "expo-secure-store";

import { API_URL, fetchWithTimeout } from "./config";

type PopulatedRestaurant = {
  _id: string;
  name?: string;
  city?: string;
  province?: string;
  images?: string[];
  address?: string;
  phone?: string;
};

type PopulatedCustomer = {
  _id: string;
  firstName?: string;
  lastName?: string;
};

export type Booking = {
  _id: string;
  restaurant?: string | PopulatedRestaurant;
  customer?: string | PopulatedCustomer;
  date: string;
  time: string;
  guests: number;
  floor?: string;
  seatingType: string;
  request?: string;
  status: "pending" | "confirmed" | "rejected" | "completed" | "cancelled";
  createdAt: string;
};

const getAuthHeaders = async () => {
  const token = await SecureStore.getItemAsync("authToken");

  if (!token) {
    throw new Error("You must be logged in");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const parseResponse = async (response: Response, fallbackMessage: string) => {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || fallbackMessage);
  }

  return data;
};

/* ------------------------------ Customer ------------------------------ */

// date: "YYYY-MM-DD" (the day the customer picked)
// time: "19:30" or "7:30 PM", inside the restaurant's opening hours
export const createBooking = async (bookingData: {
  restaurantId: string;
  date: string;
  time: string;
  guests: number;
  floor: string;
  seatingType: string;
  request?: string;
}) => {
  const headers = await getAuthHeaders();

  const response = await fetchWithTimeout(`${API_URL}/bookings`, {
    method: "POST",
    headers,
    body: JSON.stringify(bookingData),
  });

  return parseResponse(response, "Booking failed");
};

export const getMyBookings = async (): Promise<Booking[]> => {
  const headers = await getAuthHeaders();

  const response = await fetchWithTimeout(`${API_URL}/bookings`, { headers });

  const data = await parseResponse(response, "Could not load bookings");
  return data.bookings;
};

// One of the logged-in customer's own bookings
export const getBooking = async (bookingId: string): Promise<Booking> => {
  const headers = await getAuthHeaders();

  const response = await fetchWithTimeout(`${API_URL}/bookings/${bookingId}`, {
    headers,
  });

  const data = await parseResponse(response, "Could not load booking");
  return data.booking;
};

export const cancelBooking = async (bookingId: string) => {
  const headers = await getAuthHeaders();

  const response = await fetchWithTimeout(`${API_URL}/bookings/${bookingId}/cancel`, {
    method: "PATCH",
    headers,
  });

  return parseResponse(response, "Could not cancel booking");
};

// Bookings made at the logged-in owner's restaurants
export const getRestaurantBookings = async (
  status?: Booking["status"],
): Promise<Booking[]> => {
  const headers = await getAuthHeaders();
  const query = status ? `?status=${status}` : "";

  const response = await fetchWithTimeout(`${API_URL}/bookings/restaurant${query}`, {
    headers,
  });

  const data = await parseResponse(response, "Could not load bookings");
  return data.bookings;
};

// Owner confirms or rejects a pending booking
export const updateBookingStatus = async (
  bookingId: string,
  status: "confirmed" | "rejected" | "completed",
): Promise<Booking> => {
  const headers = await getAuthHeaders();

  const response = await fetchWithTimeout(`${API_URL}/bookings/${bookingId}/status`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status }),
  });

  const data = await parseResponse(response, "Could not update booking");
  return data.booking;
};

export const deleteBooking = async (bookingId: string) => {
  const headers = await getAuthHeaders();

  const response = await fetchWithTimeout(`${API_URL}/bookings/${bookingId}`, {
    method: "DELETE",
    headers,
  });

  return parseResponse(response, "Could not delete booking");
};
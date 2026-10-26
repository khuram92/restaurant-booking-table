import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API_URL = "http://10.0.2.2:3000/api";


export interface ReviewUser {
  _id: string;
  firstName?: string;
  lastName?: string;
}

export interface Review {
  _id: string;
  restaurant: string;
  customer: ReviewUser | string;
  booking?: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewPayload {
  restaurantId: string;
  rating: number;
  comment: string;
  bookingId?: string;
}

// Helper to get auth headers
const getAuthHeaders = async () => {
  const token = await SecureStore.getItemAsync("authToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/**
 * Fetch all reviews for a specific restaurant
 */
export const getRestaurantReviews = async (restaurantId: string): Promise<Review[]> => {
  const response = await fetch(`${API_URL}/reviews/restaurant/${restaurantId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch reviews");
  }

  return data;
};

/**
 * Submit or update a review for a restaurant
 */
export const createOrUpdateReview = async (payload: CreateReviewPayload): Promise<{ message: string; review: Review }> => {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_URL}/reviews`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to submit review");
  }

  return data;
};
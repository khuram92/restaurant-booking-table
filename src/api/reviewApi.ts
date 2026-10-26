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

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});


api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


export const getRestaurantReviews = async (restaurantId: string): Promise<Review[]> => {
  try {
    const response = await api.get<Review[]>(`/reviews/restaurant/${restaurantId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch reviews");
  }
};


// export const createOrUpdateReview = async (
//   payload: CreateReviewPayload
// ): Promise<{ message: string; review: Review }> => {
//   try {
//     const response = await api.post<{ message: string; review: Review }>("/reviews", payload);
//     return response.data;
//   } catch (error: any) {
//     throw new Error(error.response?.data?.message || "Failed to submit review");
//   }
// };
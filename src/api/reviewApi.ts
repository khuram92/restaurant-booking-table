import * as SecureStore from "expo-secure-store";

const API_URL = "http://10.0.2.2:3000/api";

// Same limit the backend enforces
export const MAX_REVIEW_LENGTH = 1000;

/* -------------------------------- Types -------------------------------- */

// What anyone sees on a restaurant's page (names are shortened, e.g. "Ali K.")
export type PublicReview = {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  reply: { text: string; repliedAt?: string } | null;
  customer: { name: string; avatar: string | null };
};

export type ReviewSummary = {
  average: number; // e.g. 4.3
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>; // how many reviews per star
};

export type RestaurantReviews = {
  summary: ReviewSummary;
  reviews: PublicReview[];
  page: number;
  pages: number;
};

// A review as returned for its author (create, update, "my reviews")
export type Review = {
  _id: string;
  booking: string;
  customer?: string;
  // a plain id, or the populated restaurant (from getMyReviews)
  restaurant: string | { _id: string; name?: string; city?: string; images?: string[] };
  rating: number;
  comment?: string;
  reply?: { text?: string; repliedAt?: string };
  createdAt: string;
  updatedAt: string;
};

/* ------------------------------- Helpers ------------------------------- */

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

const parseResponse = async <T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> => {
  // A non-JSON error page shouldn't crash with a parse error
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || fallbackMessage);
  }

  return data as T;
};

/* ------------------------------- Public ------------------------------- */

// A restaurant's reviews with its average and star breakdown. No login needed.
export const getRestaurantReviews = async (
  restaurantId: string,
  page = 1,
  limit = 10,
): Promise<RestaurantReviews> => {
  const response = await fetch(
    `${API_URL}/reviews/restaurant/${restaurantId}?page=${page}&limit=${limit}`,
  );

  return parseResponse<RestaurantReviews>(response, "Could not load reviews");
};

// /* ------------------------------ Customer ------------------------------ */

// // Review a completed booking
// export const createReview = async (input: {
//   bookingId: string;
//   rating: number;
//   comment?: string;
// }): Promise<Review> => {
//   const headers = await getAuthHeaders();

//   const response = await fetch(`${API_URL}/reviews`, {
//     method: "POST",
//     headers,
//     body: JSON.stringify(input),
//   });

//   const data = await parseResponse<{ review: Review }>(
//     response,
//     "Could not submit your review",
//   );
//   return data.review;
// };

// // All reviews the logged-in customer has written
// export const getMyReviews = async (): Promise<Review[]> => {
//   const headers = await getAuthHeaders();

//   const response = await fetch(`${API_URL}/reviews/mine`, { headers });

//   const data = await parseResponse<{ reviews: Review[] }>(
//     response,
//     "Could not load your reviews",
//   );
//   return data.reviews;
// };

// // The same list keyed by booking id, to show "Rate" or "Rated" on each booking
// export const getMyReviewsByBooking = async (): Promise<Map<string, Review>> => {
//   const reviews = await getMyReviews();
//   return new Map(reviews.map((r) => [r.booking, r]));
// };

// // Change the stars and/or the comment (an empty comment clears it)
// export const updateReview = async (
//   reviewId: string,
//   changes: Partial<{ rating: number; comment: string }>,
// ): Promise<Review> => {
//   const headers = await getAuthHeaders();

//   const response = await fetch(`${API_URL}/reviews/${reviewId}`, {
//     method: "PATCH",
//     headers,
//     body: JSON.stringify(changes),
//   });

//   const data = await parseResponse<{ review: Review }>(
//     response,
//     "Could not update your review",
//   );
//   return data.review;
// };

// // The author, or an admin, deletes a review
// export const deleteReview = async (reviewId: string): Promise<void> => {
//   const headers = await getAuthHeaders();

//   const response = await fetch(`${API_URL}/reviews/${reviewId}`, {
//     method: "DELETE",
//     headers,
//   });

//   await parseResponse(response, "Could not delete the review");
// };

// /* ------------------------------- Owner ------------------------------- */

// // The restaurant's owner replies to a review. Empty text removes the reply.
// export const replyToReview = async (
//   reviewId: string,
//   text: string,
// ): Promise<Review> => {
//   const headers = await getAuthHeaders();

//   const response = await fetch(`${API_URL}/reviews/${reviewId}/reply`, {
//     method: "PUT",
//     headers,
//     body: JSON.stringify({ text }),
//   });

//   const data = await parseResponse<{ review: Review }>(
//     response,
//     "Could not save your reply",
//   );
//   return data.review;
// };
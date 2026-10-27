import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  MAX_REVIEW_LENGTH,
  createReview,
  deleteReview,
  updateReview,
  type Review,
} from "../../api/reviewApi";

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Average",
  4: "Good",
  5: "Amazing!",
};

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  restaurantName: string;
  bookingId: string; // the completed booking being reviewed
  // pass an existing review to edit it instead of creating a new one
  existingReview?: Pick<Review, "_id" | "rating" | "comment"> | null;
  onSuccess?: (review: Review) => void;
  onDeleted?: () => void;
}

export const ReviewModal = ({
  visible,
  onClose,
  restaurantName,
  bookingId,
  existingReview,
  onSuccess,
  onDeleted,
}: ReviewModalProps) => {
  const isEditing = !!existingReview;

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // The modal stays mounted, so reset its fields every time it opens
  useEffect(() => {
    if (!visible) return;
    setRating(existingReview?.rating ?? 5);
    setComment(existingReview?.comment ?? "");
  }, [visible, existingReview?._id]);

  const handleSubmit = async () => {
    const text = comment.trim();

    try {
      setSubmitting(true);
      let review: Review;

      if (existingReview) {
        // Send only what changed
        const changes: Partial<{ rating: number; comment: string }> = {};
        if (rating !== existingReview.rating) changes.rating = rating;
        if (text !== (existingReview.comment ?? "").trim()) changes.comment = text;

        if (Object.keys(changes).length === 0) {
          onClose(); // nothing changed
          return;
        }
        review = await updateReview(existingReview._id, changes);
      } else {
        review = await createReview({
          bookingId,
          rating,
          comment: text || undefined,
        });
      }

      Alert.alert(
        "Thank you!",
        isEditing ? "Your review was updated." : "Your review was submitted.",
      );
      onSuccess?.(review);
      onClose();
    } catch (error) {
      Alert.alert(
        "Could not save review",
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!existingReview) return;

    Alert.alert(
      "Delete review?",
      "Your rating will be removed from the restaurant.",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setSubmitting(true);
              await deleteReview(existingReview._id);
              onDeleted?.();
              onClose();
            } catch (error) {
              Alert.alert(
                "Could not delete review",
                error instanceof Error ? error.message : "Something went wrong.",
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!submitting) onClose();
      }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-black/60 justify-center">
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 20,
          }}
          keyboardShouldPersistTaps="handled">
          <View className="rounded-3xl bg-white p-6 shadow-2xl">
            {/* Modal Header */}
            <View className="mb-4 flex-row items-center justify-between border-b border-gray-100 pb-3">
              <View>
                <Text className="text-xl font-bold text-gray-900">
                  {isEditing ? "Edit Your Review" : "Rate Your Experience"}
                </Text>
                <Text className="text-xs text-gray-400 mt-0.5">
                  {restaurantName}
                </Text>
              </View>
            </View>

            <View className="my-4 items-center">
              <Text className="mb-2 text-sm font-semibold text-gray-700">
                Select Rating
              </Text>
              <View className="flex-row gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable
                    key={star}
                    onPress={() => setRating(star)}
                    disabled={submitting}
                    accessibilityRole="button"
                    accessibilityLabel={`${star} star${star > 1 ? "s" : ""}`}
                    className="p-1">
                    <Ionicons
                      name={star <= rating ? "star" : "star-outline"}
                      size={32}
                      color="#3B82F6"
                    />
                  </Pressable>
                ))}
              </View>
              <Text className="mt-1 text-xs font-medium text-blue-700">
                {RATING_LABELS[rating]}
              </Text>
            </View>

            <View className="mb-4">
              <Text className="mb-1 text-sm font-semibold text-gray-700">
                Review / Comments (optional)
              </Text>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="How was the food, service, and atmosphere?"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                maxLength={MAX_REVIEW_LENGTH}
                textAlignVertical="top"
                className="rounded-xl border border-gray-300 p-3 text-base text-gray-900 bg-gray-50 min-h-[100px]"
              />
              <Text className="mt-1 self-end text-xs text-gray-400">
                {comment.length}/{MAX_REVIEW_LENGTH}
              </Text>
            </View>

            <View className="flex-row gap-3">
              <Pressable
                onPress={onClose}
                disabled={submitting}
                className="flex-1 items-center justify-center rounded-xl bg-gray-100 py-3.5 active:bg-gray-200">
                <Text className="font-semibold text-gray-700">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={submitting}
                className={`flex-1 items-center justify-center rounded-xl py-3.5 shadow-sm active:opacity-90 ${
                  submitting ? "bg-blue-400" : "bg-blue-600"
                }`}>
                {submitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="font-semibold text-white">
                    {isEditing ? "Save Changes" : "Submit Review"}
                  </Text>
                )}
              </Pressable>
            </View>

            {isEditing && (
              <Pressable
                onPress={handleDelete}
                disabled={submitting}
                className="mt-4 items-center">
                <Text className="text-sm font-semibold text-red-600">
                  Delete my review
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};
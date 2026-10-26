import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
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
import { createOrUpdateReview } from "../../api/reviewApi";

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
  bookingId?: string;
  onSuccess?: () => void;
}

export const ReviewModal = ({
  visible,
  onClose,
  restaurantId,
  restaurantName,
  bookingId,
  onSuccess,
}: ReviewModalProps) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      Alert.alert(
        "Error",
        "Please write a short comment about your experience.",
      );
      return;
    }

    try {
      setSubmitting(true);
      // Axios interceptor automatically handles the auth token securely from SecureStore
      await createOrUpdateReview({
        restaurantId,
        rating,
        comment: comment.trim(),
        bookingId,
      });
      Alert.alert("Success", "Review submitted successfully!");
      setComment("");
      setRating(5);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
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
                  Rate Your Experience
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
                {rating === 5
                  ? "Amazing!"
                  : rating === 4
                    ? "Good"
                    : rating === 3
                      ? "Average"
                      : rating === 2
                        ? "Average"
                        : "Poor"}
              </Text>
            </View>

            <View className="mb-4">
              <Text className="mb-1 text-sm font-semibold text-gray-700">
                Review / Comments
              </Text>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="How was the food, service, and atmosphere?"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="rounded-xl border border-gray-300 p-3 text-base text-gray-900 bg-gray-50 min-h-[100px]"
              />
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
                    Submit Review
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};
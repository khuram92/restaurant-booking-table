import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import {
  getRestaurantImageUrls,
  resolveImageUrl,
  type NewRestaurant,
  type Restaurant,
} from "../../api/restaurantApi";
import { parseTimeToMinutes } from "../../utils/validation";
import ImageUploader from "./ImageUploader";

export const SEATING_OPTIONS = ["Indoor", "Outdoor", "Smoking"];
export const FLOOR_SUGGESTIONS = [
  "Ground Floor",
  "First Floor",
  "Second Floor",
  "Rooftop",
];

/* ----------------------------- Form values ----------------------------- */

export type RestaurantFormValues = {
  name: string;
  cuisines: string;
  description: string;
  city: string;
  province: string;
  address: string;
  phone: string;
  openingTime: string;
  closingTime: string;
  availableSeats: string;
  seatingTypes: string[];
  floorNumbers: string[];
  images: string[];
};

export const emptyRestaurantForm: RestaurantFormValues = {
  name: "",
  cuisines: "",
  description: "",
  city: "",
  province: "",
  address: "",
  phone: "",
  openingTime: "",
  closingTime: "",
  availableSeats: "",
  seatingTypes: [],
  floorNumbers: [],
  images: [],
};

// A saved restaurant -> the values the form starts with
export const restaurantToForm = (r: Restaurant): RestaurantFormValues => ({
  name: r.name ?? "",
  cuisines: String(r.cuisines ?? ""),
  description: r.description ?? "",
  city: r.city ?? "",
  province: r.province ?? "",
  address: r.address ?? "",
  phone: r.phone ?? "",
  openingTime: r.openingTime ?? "",
  closingTime: r.closingTime ?? "",
  availableSeats: r.availableSeats ? String(r.availableSeats) : "",
  seatingTypes: r.seatingTypes ?? [],
  floorNumbers: r.floorNumbers ?? [],
  images: getRestaurantImageUrls(r.images), // old pasted links become real image URLs
});

// The form values -> what the API expects
const formToPayload = (v: RestaurantFormValues): NewRestaurant => ({
  name: v.name.trim(),
  cuisines: v.cuisines
    .split(/[,|]/)
    .map((c) => c.trim())
    .filter(Boolean)
    .join(", "),
  city: v.city.trim(),
  province: v.province.trim(),
  address: v.address.trim(),
  phone: v.phone.trim(),
  description: v.description.trim(),
  images: v.images
    .map((u) => resolveImageUrl(u))
    .filter((u): u is string => !!u),
  openingTime: v.openingTime,
  closingTime: v.closingTime,
  floorNumbers: v.floorNumbers,
  availableSeats: Number(v.availableSeats),
  seatingTypes: v.seatingTypes,
});

const validate = (v: RestaurantFormValues): string | null => {
  if (!v.name.trim()) return "Enter the restaurant name.";
  if (!v.cuisines.trim()) return "Enter at least one cuisine.";
  if (!v.city.trim()) return "Enter the city.";
  if (!v.address.trim()) return "Enter the address.";
  if (v.phone.trim().length < 7) return "Enter a valid phone number.";
  if (!v.openingTime || !v.closingTime)
    return "Select the opening and closing times.";

  const seats = Number(v.availableSeats);
  if (!Number.isInteger(seats) || seats < 1)
    return "Available seats must be a whole number of at least 1.";

  if (v.seatingTypes.length === 0) return "Add at least one seating type.";
  if (v.floorNumbers.length === 0) return "Add at least one floor.";
  return null;
};

export const Section = ({ title }: { title: string }) => (
  <Text className="mb-3 mt-6 text-xl font-bold text-blue-700">{title}</Text>
);

export const Field = ({
  label,
  required,
  ...props
}: TextInputProps & { label: string; required?: boolean }) => (
  <View className="mb-4">
    <Text className="mb-1 text-sm font-semibold text-gray-700">
      {label}
      {required ? <Text className="text-red-500"> *</Text> : null}
    </Text>
    <TextInput
      placeholderTextColor="#9ca3af"
      className="rounded-lg border border-blue-300 px-3 py-3 text-base text-gray-900"
      {...props}
    />
  </View>
);

const formatTime = (d: Date) => {
  const h = d.getHours();
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${period}`;
};

export const TimeField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => {
  const [show, setShow] = useState(false);

  // Open the picker on the saved time, not on "now"
  const pickerValue = new Date();
  const minutes = parseTimeToMinutes(value);
  if (minutes !== null) {
    pickerValue.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  }

  return (
    <View className="flex-1">
      <Text className="mb-1 text-sm font-semibold text-gray-700">
        {label}
        <Text className="text-red-500"> *</Text>
      </Text>
      <Pressable
        onPress={() => setShow(true)}
        className="flex-row items-center justify-between rounded-lg border border-blue-300 px-3 py-3">
        <Text className={value ? "text-gray-900" : "text-gray-400"}>
          {value || "Select time"}
        </Text>
        <Ionicons name="time-outline" size={18} color="#2563EB" />
      </Pressable>

      {show && (
        <DateTimePicker
          value={pickerValue}
          mode="time"
          is24Hour={false}
          onChange={(event, date) => {
            if (Platform.OS !== "ios") setShow(false);
            if (event.type !== "dismissed" && date) onChange(formatTime(date));
          }}
        />
      )}
      {show && Platform.OS === "ios" && (
        <Pressable onPress={() => setShow(false)} className="mt-1 self-end">
          <Text className="font-semibold text-blue-700">Done</Text>
        </Pressable>
      )}
    </View>
  );
};

// Add and remove a list of short texts (seating types, floors)
export const StringListInput = ({
  label,
  required,
  placeholder,
  items,
  onChange,
  suggestions = [],
}: {
  label: string;
  required?: boolean;
  placeholder: string;
  items: string[];
  onChange: (items: string[]) => void;
  suggestions?: string[];
}) => {
  const [text, setText] = useState("");

  const add = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    if (items.some((i) => i.toLowerCase() === value.toLowerCase())) {
      setText("");
      return;
    }
    onChange([...items, value]);
    setText("");
  };

  return (
    <View className="mb-4">
      <Text className="mb-1 text-sm font-semibold text-gray-700">
        {label}
        {required ? <Text className="text-red-500"> *</Text> : null}
      </Text>

      <View className="flex-row items-center">
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => add(text)}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          returnKeyType="done"
          className="flex-1 rounded-lg border border-blue-300 px-3 py-3 text-base text-gray-900"
        />
        <Pressable
          onPress={() => add(text)}
          accessibilityRole="button"
          accessibilityLabel={`Add ${label}`}
          className="ml-2 h-12 w-12 items-center justify-center rounded-lg bg-blue-700">
          <Ionicons name="add" size={24} color="white" />
        </Pressable>
      </View>

      {suggestions.length > 0 && (
        <View className="mt-2 flex-row flex-wrap">
          {suggestions
            .filter((s) => !items.some((i) => i.toLowerCase() === s.toLowerCase()))
            .map((s) => (
              <Pressable
                key={s}
                onPress={() => add(s)}
                className="mb-2 mr-2 rounded-full border border-gray-300 bg-gray-50 px-3 py-1">
                <Text className="text-sm text-gray-600">+ {s}</Text>
              </Pressable>
            ))}
        </View>
      )}

      {items.length > 0 && (
        <View className="mt-2 flex-row flex-wrap">
          {items.map((item) => (
            <View
              key={item}
              className="mb-2 mr-2 flex-row items-center rounded-full bg-blue-100 px-3 py-1">
              <Text numberOfLines={1} className="max-w-[220px] text-sm text-blue-800">
                {item}
              </Text>
              <Pressable
                onPress={() => onChange(items.filter((i) => i !== item))}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item}`}
                className="ml-2">
                <Ionicons name="close-circle" size={16} color="#1d4ed8" />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

/* -------------------------------- Form -------------------------------- */

type Props = {
  initial?: RestaurantFormValues;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (payload: NewRestaurant) => void;
  onCancel?: () => void;
};

const RestaurantForm = ({
  initial = emptyRestaurantForm,
  submitLabel,
  submitting,
  onSubmit,
  onCancel,
}: Props) => {
  const [values, setValues] = useState<RestaurantFormValues>(initial);

  const set =
    <K extends keyof RestaurantFormValues>(key: K) =>
    (value: RestaurantFormValues[K]) =>
      setValues((v) => ({ ...v, [key]: value }));

  const handleSubmit = () => {
    const problem = validate(values);
    if (problem) {
      Alert.alert("Missing information", problem);
      return;
    }
    onSubmit(formToPayload(values));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}>
        <Section title="Basic information" />
        <Field
          label="Restaurant name"
          required
          value={values.name}
          onChangeText={set("name")}
          placeholder="e.g. Korean Ramen"
        />
        <Field
          label="Cuisines"
          required
          value={values.cuisines}
          onChangeText={set("cuisines")}
          placeholder="e.g. Korean, Japanese"
        />
        <Field
          label="Description"
          value={values.description}
          onChangeText={set("description")}
          placeholder="Tell customers what makes your restaurant special"
          multiline
          maxLength={2000}
          textAlignVertical="top"
          style={{ minHeight: 100 }}
        />

        <Section title="Location & contact" />
        <Field
          label="City"
          required
          value={values.city}
          onChangeText={set("city")}
          placeholder="e.g. Lahore"
        />
        <Field
          label="Province"
          value={values.province}
          onChangeText={set("province")}
          placeholder="e.g. Punjab"
        />
        <Field
          label="Address"
          required
          value={values.address}
          onChangeText={set("address")}
          placeholder="Street, area"
        />
        <Field
          label="Phone"
          required
          value={values.phone}
          onChangeText={set("phone")}
          placeholder="+92 300 1234567"
          keyboardType="phone-pad"
        />

        <Section title="Opening hours" />
        <View className="mb-4 flex-row gap-3">
          <TimeField
            label="Opens"
            value={values.openingTime}
            onChange={set("openingTime")}
          />
          <TimeField
            label="Closes"
            value={values.closingTime}
            onChange={set("closingTime")}
          />
        </View>

        <Section title="Seating" />
        <Field
          label="Total available seats"
          required
          value={values.availableSeats}
          onChangeText={set("availableSeats")}
          placeholder="e.g. 40"
          keyboardType="number-pad"
        />
        <StringListInput
          label="Seating types"
          required
          placeholder="Add a seating type, e.g. Terrace"
          items={values.seatingTypes}
          onChange={set("seatingTypes")}
          suggestions={SEATING_OPTIONS}
        />
        <StringListInput
          label="Floors"
          required
          placeholder="Add a floor, e.g. Rooftop"
          items={values.floorNumbers}
          onChange={set("floorNumbers")}
          suggestions={FLOOR_SUGGESTIONS}
        />

        <Section title="Photos" />
        <ImageUploader images={values.images} onChange={set("images")} />

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityRole="button"
          className={`mt-6 items-center rounded-full py-4 ${
            submitting ? "bg-blue-400" : "bg-blue-700"
          }`}>
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-lg font-bold text-white">{submitLabel}</Text>
          )}
        </Pressable>

        {onCancel && (
          <Pressable
            onPress={onCancel}
            disabled={submitting}
            accessibilityRole="button"
            className="mt-3 items-center rounded-full border border-gray-300 py-4">
            <Text className="text-lg font-semibold text-gray-700">Cancel</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default RestaurantForm;
// import { Ionicons } from "@expo/vector-icons";
// import { router, useFocusEffect, type Href } from "expo-router";
// import React, { useCallback, useEffect, useRef, useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   FlatList,
//   Image,
//   Linking,
//   Modal,
//   Pressable,
//   RefreshControl,
//   ScrollView,
//   Text,
//   View,
//   useWindowDimensions,
// } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import {
//   getMyRestaurant,
//   getRestaurantImageUrls,
//   resolveImageUrl,
//   updateRestaurant,
//   type NewRestaurant,
//   type Restaurant,
// } from "../../api/restaurantApi";
// import { parseTimeToMinutes } from "../../utils/time";
// import LocationMap from "../components/LocationMap";
// import RestaurantForm, { restaurantToForm } from "../components/RestaurantForm";

// type IconName = React.ComponentProps<typeof Ionicons>["name"];

// const BRAND = "#143d7b";
// const COVER_HEIGHT = 224;
// // Match this to the name of your owner reviews screen
// const REVIEWS_ROUTE: Href = "/restaurant/restaurantReviews";

// /* -------------------------------- Helpers -------------------------------- */

// // Photos the owner didn't touch go back exactly as they are stored
// const keepStoredImages = (stored: string[] = [], edited: string[]) => {
//   const originals = new Map<string, string>();
//   stored.forEach((raw) => {
//     const resolved = resolveImageUrl(raw);
//     if (resolved) originals.set(resolved, raw);
//   });
//   return edited.map((url) => originals.get(url) ?? url);
// };

// // Cloudinary can send a smaller picture, so screens load faster
// const sized = (url: string, width: number) =>
//   url.includes("res.cloudinary.com") &&
//   url.includes("/upload/") &&
//   !/\/upload\/(?:[^/]*,)?w_\d+/.test(url)
//     ? url.replace("/upload/", `/upload/w_${width},c_limit/`)
//     : url;

// // true = open, false = closed, null = can't tell (hours missing)
// const isOpenNow = (opening?: string, closing?: string): boolean | null => {
//   const open = parseTimeToMinutes(opening);
//   const close = parseTimeToMinutes(closing);
//   if (open === null || close === null) return null;

//   const now = new Date();
//   const current = now.getHours() * 60 + now.getMinutes();

//   if (open === close) return true; // open 24 hours
//   if (open < close) return current >= open && current < close;
//   return current >= open || current < close; // closes after midnight
// };

// /* ------------------------------ Components ------------------------------ */

// type Tone = "blue" | "indigo" | "slate";

// const TONES: Record<Tone, { box: string; text: string }> = {
//   blue: { box: "border-blue-200 bg-blue-100", text: "text-blue-900" },
//   indigo: { box: "border-indigo-200 bg-indigo-100", text: "text-indigo-900" },
//   slate: { box: "border-gray-200 bg-gray-100", text: "text-gray-800" },
// };

// const Pill = ({ text, tone = "blue" }: { text: string; tone?: Tone }) => (
//   <View
//     className={`mb-1 mr-2 rounded-2xl border px-3 py-1.5 ${TONES[tone].box}`}>
//     <Text className={`text-sm ${TONES[tone].text}`}>{text}</Text>
//   </View>
// );

// const Row = ({
//   icon,
//   label,
//   value,
//   tone = "blue",
//   actionIcon,
//   onPress,
// }: {
//   icon: IconName;
//   label: string;
//   value: string | string[];
//   tone?: Tone;
//   actionIcon?: IconName;
//   onPress?: () => void;
// }) => {
//   const items = (Array.isArray(value) ? value : [value]).filter(
//     (v) => v && v.trim(),
//   );

//   return (
//     <Pressable
//       onPress={onPress}
//       disabled={!onPress}
//       accessibilityRole={onPress ? "button" : undefined}
//       className="mb-3 flex-row items-center active:opacity-70">
//       <Ionicons name={icon} size={20} color={BRAND} />

//       <View className="ml-3 flex-1">
//         <Text className="mb-1 text-xs text-gray-600">{label}</Text>
//         <View className="flex-row flex-wrap">
//           {items.length ? (
//             items.map((t, i) => <Pill key={`${t}-${i}`} text={t} tone={tone} />)
//           ) : (
//             <Pill text="Not added" tone="slate" />
//           )}
//         </View>
//       </View>

//       {onPress && actionIcon && (
//         <View className="ml-2 h-10 w-10 items-center justify-center">
//           <Ionicons name={actionIcon} size={20} color={BRAND} />
//         </View>
//       )}
//     </Pressable>
//   );
// };

// const Card = ({
//   title,
//   children,
// }: {
//   title: string;
//   children: React.ReactNode;
// }) => (
//   <View className="mx-4 mt-4 rounded-2xl border border-gray-100 bg-white p-4 pb-1">
//     <Text className="mb-3 text-lg font-bold text-[#143d7b]">{title}</Text>
//     {children}
//   </View>
// );

// // Grey placeholder block for the loading screen
// const Bone = ({ className }: { className: string }) => (
//   <View className={`animate-pulse rounded-2xl bg-gray-200 ${className}`} />
// );

// // One cover photo, with the first letter if it can't be loaded
// const Slide = ({ uri, initial }: { uri: string; initial: string }) => {
//   const [failed, setFailed] = useState(false);

//   if (failed) {
//     return (
//       <View className="flex-1 items-center justify-center">
//         <Text className="text-8xl font-bold text-white opacity-40">
//           {initial}
//         </Text>
//       </View>
//     );
//   }

//   return (
//     <Image
//       source={{ uri }}
//       resizeMode="cover"
//       onError={() => setFailed(true)}
//       className="h-full w-full"
//     />
//   );
// };

// // Full-screen gallery that opens on the tapped photo
// const PhotoViewer = ({
//   images,
//   startIndex,
//   onClose,
// }: {
//   images: string[];
//   startIndex: number;
//   onClose: () => void;
// }) => {
//   const { width, height } = useWindowDimensions();
//   const [index, setIndex] = useState(startIndex);

//   return (
//     <Modal visible animationType="fade" statusBarTranslucent onRequestClose={onClose}>
//       <View className="flex-1 bg-black">
//         <FlatList
//           horizontal
//           pagingEnabled
//           data={images}
//           keyExtractor={(uri) => uri}
//           initialScrollIndex={startIndex}
//           getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
//           showsHorizontalScrollIndicator={false}
//           onMomentumScrollEnd={(e) =>
//             setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
//           }
//           renderItem={({ item }) => (
//             <View style={{ width, height }} className="items-center justify-center">
//               <Image
//                 source={{ uri: sized(item, 1400) }}
//                 style={{ width, height: height * 0.8 }}
//                 resizeMode="contain"
//               />
//             </View>
//           )}
//         />

//         <Pressable
//           onPress={onClose}
//           hitSlop={10}
//           accessibilityRole="button"
//           accessibilityLabel="Close photos"
//           className="absolute right-4 top-12 h-10 w-10 items-center justify-center rounded-full bg-white/20">
//           <Ionicons name="close" size={22} color="white" />
//         </Pressable>

//         <Text className="absolute bottom-12 self-center rounded-full bg-black/60 px-4 py-1 text-sm font-semibold text-white">
//           {index + 1} / {images.length}
//         </Text>
//       </View>
//     </Modal>
//   );
// };

// /* -------------------------------- Screen -------------------------------- */

// const RestaurantProfile = () => {
//   const insets = useSafeAreaInsets();
//   const { width } = useWindowDimensions();
//   const heroWidth = width - 32; // the cover has 16px margins

//   // Restaurant = has one, null = none yet, undefined = couldn't load
//   const [restaurant, setRestaurant] = useState<Restaurant | null | undefined>(
//     undefined,
//   );
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [editing, setEditing] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const [heroIndex, setHeroIndex] = useState(0);
//   const [viewerIndex, setViewerIndex] = useState<number | null>(null);
//   const [toast, setToast] = useState("");
//   const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

//   const showToast = (message: string) => {
//     setToast(message);
//     if (toastTimer.current) clearTimeout(toastTimer.current);
//     toastTimer.current = setTimeout(() => setToast(""), 2200);
//   };

//   useEffect(
//     () => () => {
//       if (toastTimer.current) clearTimeout(toastTimer.current);
//     },
//     [],
//   );

//   const load = useCallback(async () => {
//     try {
//       setRestaurant(await getMyRestaurant());
//     } catch {
//       setRestaurant(undefined);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useFocusEffect(
//     useCallback(() => {
//       void load();
//     }, [load]),
//   );

//   const onRefresh = async () => {
//     setRefreshing(true);
//     await load();
//     setRefreshing(false);
//   };

//   const handleSave = async (payload: NewRestaurant) => {
//     if (!restaurant) return;

//     try {
//       setSaving(true);
//       const updated = await updateRestaurant(restaurant._id, {
//         ...payload,
//         images: keepStoredImages(restaurant.images, payload.images),
//       });
//       setRestaurant(updated);
//       setHeroIndex(0);
//       setEditing(false);
//       showToast("Saved");
//     } catch (error) {
//       Alert.alert(
//         "Could not save",
//         error instanceof Error ? error.message : "Something went wrong.",
//       );
//     } finally {
//       setSaving(false);
//     }
//   };

//   const header = (
//     <View className="items-center px-4 pb-3" style={{ paddingTop: insets.top + 12 }}>
//       <Text className="text-2xl font-bold text-[#143d7b]">
//         {editing ? "Edit Restaurant" : "My Restaurant"}
//       </Text>
//     </View>
//   );

//   if (loading) {
//     return (
//       <View className="flex-1 bg-white">
//         {header}
//         <View className="px-4">
//           <Bone className="h-56 w-full rounded-3xl" />
//           <View className="mt-4 flex-row gap-3">
//             <Bone className="h-16 flex-1" />
//             <Bone className="h-16 flex-1" />
//           </View>
//           <Bone className="mt-4 h-40 w-full" />
//           <Bone className="mt-4 h-32 w-full" />
//         </View>
//       </View>
//     );
//   }

//   if (restaurant === undefined) {
//     return (
//       <View className="flex-1 bg-white">
//         {header}
//         <View className="flex-1 items-center justify-center px-6">
//           <Ionicons name="cloud-offline-outline" size={48} color="#9ca3af" />
//           <Text className="mt-3 text-center text-base text-gray-700">
//             Could not load your restaurant.
//           </Text>
//           <Pressable
//             onPress={() => {
//               setLoading(true);
//               void load();
//             }}
//             className="mt-4 rounded-full bg-[#143d7b] px-6 py-2">
//             <Text className="font-semibold text-white">Retry</Text>
//           </Pressable>
//         </View>
//       </View>
//     );
//   }

//   if (restaurant === null) {
//     return (
//       <View className="flex-1 bg-white">
//         {header}
//         <View className="flex-1 items-center justify-center px-6">
//           <Ionicons name="restaurant-outline" size={56} color="#d1d5db" />
//           <Text className="mt-3 text-lg font-bold text-gray-900">
//             No restaurant yet
//           </Text>
//           <Text className="mt-1 text-center text-gray-500">
//             Create your restaurant to start receiving bookings.
//           </Text>
//           <Pressable
//             onPress={() => router.push("/restaurant/createRestaurant")}
//             className="mt-4 rounded-full bg-[#143d7b] px-8 py-3">
//             <Text className="font-semibold text-white">Create restaurant</Text>
//           </Pressable>
//         </View>
//       </View>
//     );
//   }

//   if (editing) {
//     return (
//       <View className="flex-1 bg-white">
//         {header}
//         <RestaurantForm
//           initial={restaurantToForm(restaurant)}
//           submitLabel="Save changes"
//           submitting={saving}
//           onSubmit={handleSave}
//           onCancel={() => setEditing(false)}
//         />
//       </View>
//     );
//   }

//   /* ----------------------------- Details ----------------------------- */

//   const photos = getRestaurantImageUrls(restaurant.images);
//   const initial = restaurant.name?.trim().charAt(0).toUpperCase() || "?";
//   const disabled = restaurant.isActive === false;
//   const rating = restaurant.rating || 0;
//   const open = isOpenNow(restaurant.openingTime, restaurant.closingTime);
//   const cuisines = String(restaurant.cuisines ?? "")
//     .split(/[,|]/)
//     .map((c) => c.trim())
//     .filter(Boolean)
//     .slice(0, 4);
//   const address = [restaurant.address, restaurant.city, restaurant.province]
//     .filter(Boolean)
//     .join(", ");

//   const callRestaurant = () =>
//     Linking.openURL(`tel:${restaurant.phone.replace(/\s/g, "")}`).catch(() =>
//       Alert.alert("Could not call", "No phone app is available."),
//     );

//   const openMaps = () =>
//     Linking.openURL(
//       `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
//     ).catch(() => Alert.alert("Could not open maps", "No maps app is available."));

//   // Profile completeness
//   const checklist = [
//     { label: "a description", done: !!restaurant.description?.trim() },
//     { label: "3+ photos", done: photos.length >= 3 },
//     { label: "a phone number", done: !!restaurant.phone?.trim() },
//     { label: "an address", done: !!restaurant.address?.trim() },
//     {
//       label: "opening hours",
//       done: !!restaurant.openingTime && !!restaurant.closingTime,
//     },
//     { label: "seating types", done: !!restaurant.seatingTypes?.length },
//     { label: "floors", done: !!restaurant.floorNumbers?.length },
//   ];
//   const missing = checklist.filter((c) => !c.done);
//   const percent = Math.round(
//     ((checklist.length - missing.length) / checklist.length) * 100,
//   );

//   return (
//     <View className="flex-1 bg-white">
//       {header}

//       <ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={{ paddingBottom: 24 }}
//         refreshControl={
//           <RefreshControl
//             refreshing={refreshing}
//             onRefresh={onRefresh}
//             colors={[BRAND]}
//             tintColor={BRAND}
//           />
//         }>
//         {/* Status */}
//         {disabled ? (
//           <View className="mx-4 mb-3 flex-row items-center rounded-xl bg-orange-50 p-3">
//             <Ionicons name="alert-circle" size={20} color="#EA580C" />
//             <Text className="ml-2 flex-1 text-sm text-orange-800">
//               An admin has switched your restaurant off. Customers can't see or
//               book it.
//             </Text>
//           </View>
//         ) : (
//           <View className="mx-4 mb-3 flex-row items-center">
//             <View className="flex-row items-center rounded-full bg-green-50 px-4 py-2">
//               <View className="h-2.5 w-2.5 rounded-full bg-green-500" />
//               <Text className="ml-2 text-sm font-semibold text-green-800">
//                 Active
//               </Text>
//             </View>

//             {open !== null && (
//               <View
//                 className={`ml-2 flex-row items-center rounded-full px-4 py-2 ${
//                   open ? "bg-emerald-100" : "bg-gray-200"
//                 }`}>
//                 <Ionicons
//                   name="time-outline"
//                   size={14}
//                   color={open ? "#065F46" : "#374151"}
//                 />
//                 <Text
//                   className={`ml-1 text-sm font-semibold ${
//                     open ? "text-emerald-800" : "text-gray-700"
//                   }`}>
//                   {open ? "Open now" : "Closed now"}
//                 </Text>
//               </View>
//             )}
//           </View>
//         )}

//         {/* Cover: swipe through photos, tap for full screen */}
//         <View
//           className="mx-4 overflow-hidden rounded-3xl bg-[#143d7b]"
//           style={{ height: COVER_HEIGHT }}>
//           {photos.length > 0 ? (
//             <FlatList
//               horizontal
//               pagingEnabled
//               showsHorizontalScrollIndicator={false}
//               data={photos}
//               keyExtractor={(uri) => uri}
//               onMomentumScrollEnd={(e) =>
//                 setHeroIndex(Math.round(e.nativeEvent.contentOffset.x / heroWidth))
//               }
//               renderItem={({ item, index }) => (
//                 <Pressable
//                   onPress={() => setViewerIndex(index)}
//                   accessibilityRole="button"
//                   accessibilityLabel="Open photo"
//                   style={{ width: heroWidth, height: COVER_HEIGHT }}>
//                   <Slide uri={sized(item, 900)} initial={initial} />
//                 </Pressable>
//               )}
//             />
//           ) : (
//             <Pressable
//               onPress={() => setEditing(true)}
//               accessibilityRole="button"
//               className="flex-1 items-center justify-center">
//               <Ionicons name="camera-outline" size={40} color="white" />
//               <Text className="mt-2 font-semibold text-white">Add photos</Text>
//             </Pressable>
//           )}

//           {/* Soft fade, name and cuisines */}
//           <View pointerEvents="none" className="absolute bottom-0 left-0 right-0">
//             <View className="h-5 bg-black/10" />
//             <View className="h-5 bg-black/25" />
//             <View className="bg-black/50 px-4 pb-4 pt-1">
//               <Text numberOfLines={1} className="text-2xl font-bold text-white">
//                 {restaurant.name}
//               </Text>
//               {cuisines.length > 0 && (
//                 <View className="mt-1 flex-row flex-wrap">
//                   {cuisines.map((c) => (
//                     <View key={c} className="mb-1 mr-2 rounded-full bg-white/25 px-3 py-1">
//                       <Text className="text-xs font-semibold text-white">{c}</Text>
//                     </View>
//                   ))}
//                 </View>
//               )}
//             </View>
//           </View>

//           {photos.length > 1 && (
//             <View
//               pointerEvents="none"
//               className="absolute right-3 top-3 rounded-full bg-black/55 px-3 py-1">
//               <Text className="text-xs font-bold text-white">
//                 {heroIndex + 1} / {photos.length}
//               </Text>
//             </View>
//           )}
//         </View>

//         {/* Rating (opens reviews) and seats */}
//         <View className="mx-4 mt-4 flex-row gap-3">
//           <Pressable
//             onPress={() => router.push(REVIEWS_ROUTE)}
//             accessibilityRole="button"
//             accessibilityLabel="Open reviews"
//             className="flex-1 flex-row items-center justify-center rounded-2xl bg-amber-50 py-4 active:opacity-70">
//             <Ionicons name="star" size={20} color="#F59E0B" />
//             <Text className="ml-2 text-lg font-bold text-gray-900">
//               {rating.toFixed(1)}
//             </Text>
//             <Text className="ml-1 text-sm text-gray-500">
//               ({restaurant.reviewCount ?? 0})
//             </Text>
//           </Pressable>

//           <View className="flex-1 flex-row items-center justify-center rounded-2xl bg-blue-50 py-4">
//             <Ionicons name="people" size={20} color={BRAND} />
//             <Text className="ml-2 text-lg font-bold text-gray-900">
//               {restaurant.availableSeats ?? 0}
//             </Text>
//             <Text className="ml-1 text-sm text-gray-500">seats</Text>
//           </View>
//         </View>

//         {/* Profile completeness */}
//         {missing.length > 0 && (
//           <Pressable
//             onPress={() => setEditing(true)}
//             accessibilityRole="button"
//             className="mx-4 mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 active:opacity-70">
//             <View className="flex-row items-center justify-between">
//               <Text className="font-bold text-[#143d7b]">Profile {percent}% complete</Text>
//               <Ionicons name="chevron-forward" size={18} color={BRAND} />
//             </View>
//             <View className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100">
//               <View
//                 className="h-2 rounded-full bg-[#143d7b]"
//                 style={{ width: `${percent}%` }}
//               />
//             </View>
//             <Text className="mt-2 text-sm text-gray-600">
//               Add {missing.map((m) => m.label).join(", ")}.
//             </Text>
//           </Pressable>
//         )}

//         {/* Contact and location */}
//         <Card title="Contact & location">
//           <Row
//             icon="location-outline"
//             label="Address"
//             value={address}
//             actionIcon="navigate-outline"
//             onPress={address ? openMaps : undefined}
//           />
//           <Row
//             icon="call-outline"
//             label="Phone"
//             value={restaurant.phone || ""}
//             actionIcon="call"
//             onPress={restaurant.phone ? callRestaurant : undefined}
//           />
//           {!!address && (
//             <View className="mb-3">
//               <LocationMap address={address} title={restaurant.name} />
//             </View>
//           )}
//         </Card>

//         {/* Hours */}
//         <Card title="Opening hours">
//           <Row
//             icon="time-outline"
//             label="Hours"
//             tone="slate"
//             value={
//               restaurant.openingTime && restaurant.closingTime
//                 ? [
//                     `Opens ${restaurant.openingTime}`,
//                     `Closes ${restaurant.closingTime}`,
//                   ]
//                 : []
//             }
//           />
//         </Card>

//         {/* Seating */}
//         <Card title="Seating">
//           <Row
//             icon="home-outline"
//             label="Seating types"
//             tone="blue"
//             value={restaurant.seatingTypes ?? []}
//           />
//           <Row
//             icon="layers-outline"
//             label="Floors"
//             tone="indigo"
//             value={restaurant.floorNumbers ?? []}
//           />
//         </Card>

//         {/* About */}
//         <View className="mx-4 mt-4 rounded-2xl border border-gray-100 bg-white p-4">
//           <Text className="mb-2 text-lg font-bold text-[#143d7b]">About</Text>
//           {restaurant.description ? (
//             <Text className="text-base leading-6 text-gray-700">
//               {restaurant.description}
//             </Text>
//           ) : (
//             <Pressable
//               onPress={() => setEditing(true)}
//               accessibilityRole="button"
//               className="flex-row items-center">
//               <Ionicons name="add-circle-outline" size={20} color={BRAND} />
//               <Text className="ml-2 text-base font-semibold text-[#143d7b]">
//                 Add a description
//               </Text>
//             </Pressable>
//           )}
//         </View>
//       </ScrollView>

//       {/* Always-visible edit button */}
//       <View
//         className="border-t border-gray-100 bg-white px-4 pt-3"
//         style={{ paddingBottom: insets.bottom + 12 }}>
//         <Pressable
//           onPress={() => setEditing(true)}
//           accessibilityRole="button"
//           className="flex-row items-center justify-center rounded-full bg-[#143d7b] py-4 active:opacity-90">
//           <Ionicons name="create-outline" size={18} color="white" />
//           <Text className="ml-2 text-lg font-bold text-white">Edit details</Text>
//         </Pressable>
//       </View>

//       {viewerIndex !== null && (
//         <PhotoViewer
//           images={photos}
//           startIndex={viewerIndex}
//           onClose={() => setViewerIndex(null)}
//         />
//       )}

//       {!!toast && (
//         <View
//           pointerEvents="none"
//           className="absolute left-0 right-0 items-center"
//           style={{ bottom: insets.bottom + 92 }}>
//           <View className="rounded-full bg-gray-900 px-5 py-3">
//             <Text className="font-semibold text-white">{toast}</Text>
//           </View>
//         </View>
//       )}
//     </View>
//   );
// };

// export default RestaurantProfile;
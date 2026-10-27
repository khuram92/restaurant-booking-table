// import { Ionicons } from "@expo/vector-icons";
// import { router } from "expo-router";
// import { useEffect, useState } from "react";
// import {
//   ActivityIndicator,
//   FlatList,
//   Image,
//   Pressable,
//   RefreshControl,
//   Text,
//   View,
// } from "react-native";
// import { fetchFeaturedRestaurants } from "../api/restaurantApi"; // Adjust relative path if needed

// export default function FeaturedScreen() {
//   const [restaurants, setRestaurants] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [error, setError] = useState("");

//   const loadFeatured = async () => {
//     try {
//       setError("");
//       const data = await fetchFeaturedRestaurants();
//       setRestaurants(data || []);
//     } catch (err: any) {
//       setError(err.message || "Failed to load featured restaurants");
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   useEffect(() => {
//     loadFeatured();
//   }, []);

//   if (loading) {
//     return (
//       <View className="flex-1 items-center justify-center bg-gray-50">
//         <ActivityIndicator size="large" color="#3B82F6" />
//       </View>
//     );
//   }

//   if (error) {
//     return (
//       <View className="flex-1 items-center justify-center bg-gray-50 px-4">
//         <Text className="text-center text-red-600 mb-2">{error}</Text>
//         <Text onPress={loadFeatured} className="text-blue-600 font-bold">
//           Tap to Retry
//         </Text>
//       </View>
//     );
//   }

//   return (
//     <View className="flex-1 bg-gray-50 pt-12">
//       {/* --- Header with Back Button --- */}
//       <View className="flex-row items-center gap-12 px-4 pb-3 pt-2">
//         <Pressable
//           onPress={() => router.back()}
//           className="mr-3 rounded-full bg-gray-200/80 p-2 active:bg-gray-300">
//           <Ionicons name="arrow-back" size={20} color="blue" />
//         </Pressable>
//         <Text className="text-2xl font-bold text-blue-500">
//           Featured Restaurants
//         </Text>
//       </View>

//       <FlatList
//         data={restaurants}
//         keyExtractor={(item) => item._id}
//         contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
//         refreshControl={
//           <RefreshControl
//             refreshing={refreshing}
//             onRefresh={() => {
//               setRefreshing(true);
//               loadFeatured();
//             }}
//           />
//         }
//         renderItem={({ item }) => {
//           const imageUrl = item.images?.[0] || item.image;
//           const location = [item.city, item.province]
//             .filter(Boolean)
//             .join(", ");

//           return (
//             <Pressable
//               onPress={() =>
//                 router.push({
//                   pathname: "/bookAtable",
//                   params: { id: item._id }, 
//                 })
//               }
//               className="relative mb-4 overflow-hidden rounded-2xl bg-white shadow-sm active:opacity-95"
//               style={{ elevation: 3 }}>
//               {/* --- Angled Red Featured Ribbon --- */}
//               <View className="absolute top-0 right-0 z-10 h-24 w-24 overflow-hidden">
//                 <View className="absolute top-5 -right-9 w-36 rotate-45 bg-red-600 py-1 items-center justify-center shadow-md">
//                   <Text className="text-[10px] font-black uppercase tracking-wider text-white">
//                     ★ FEATURED
//                   </Text>
//                 </View>
//               </View>

//               {/* Image */}
//               <View className="h-44 w-full bg-gray-200">
//                 {imageUrl ? (
//                   <Image
//                     source={{ uri: imageUrl }}
//                     className="h-full w-full"
//                     resizeMode="cover"
//                   />
//                 ) : (
//                   <View className="h-full w-full items-center justify-center bg-blue-50">
//                     <Ionicons
//                       name="restaurant-outline"
//                       size={48}
//                       color="#3B82F6"
//                     />
//                   </View>
//                 )}
//               </View>

//               {/* Details */}
//               <View className="p-4">
//                 <View className="flex-row items-center justify-between">
//                   <Text
//                     numberOfLines={1}
//                     className="flex-1 text-lg font-bold text-gray-900 pr-2">
//                     {item.name}
//                   </Text>
//                   <View className="flex-row items-center rounded-lg bg-amber-50 px-2 py-1">
//                     <Ionicons name="star" size={14} color="#F59E0B" />
//                     <Text className="ml-1 text-xs font-bold text-amber-700">
//                       {(item.rating ?? 0).toFixed(1)}
//                     </Text>
//                   </View>
//                 </View>

//                 <Text numberOfLines={1} className="mt-1 text-xs text-gray-500">
//                   {[item.cuisines, location].filter(Boolean).join(" • ")}
//                 </Text>
//               </View>
//             </Pressable>
//           );
//         }}
//         ListEmptyComponent={
//           <View className="items-center justify-center py-20">
//             <Ionicons name="star-outline" size={48} color="#9CA3AF" />
//             <Text className="mt-2 text-sm text-gray-400">
//               No featured restaurants available.
//             </Text>
//           </View>
//         }
//       />
//     </View>
//   );
// }

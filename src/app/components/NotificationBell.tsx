import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { getUnreadCount } from "../../api/notificationApi"
export default function NotificationBell({
  color = "#2563EB",
  size = 26,
  containerClassName = "h-10 w-10 items-end justify-center",
}: {
  color?: string;
  size?: number;
  containerClassName?: string;
}) {
  const [count, setCount] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;

      const refresh = async () => {
        try {
          const n = await getUnreadCount();
          if (active) setCount(n);
        } catch {}
      };
      void refresh();
      const interval = setInterval(refresh, 30000);
      return () => {
        active = false;
        clearInterval(interval);
      };
    }, []),
  );

  return (
    <Pressable
      onPress={() => router.push("/notification")}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={
        count > 0 ? `Notifications, ${count} unread` : "Notifications"
      }
      className={containerClassName}>
      <Ionicons name="notifications" size={size} color={color} />
      {count > 0 && (
        <View className="absolute right-1 top-1 items-center rounded-full bg-red-500 px-1">
          <Text className="text-[10px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

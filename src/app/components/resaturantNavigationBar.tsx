import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, usePathname, type Href } from "expo-router";
import { useEffect, useState, type ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

type Tab = { name: string; icon: IconName; route: Href };

const DEFAULT_TABS: Tab[] = [
  {
    name: "My Bookings",
    icon: "calendar-month",
    route: "/restaurant/restaurantDashboard",
  },
  {
    name: "My Restaurant",
    icon: "silverware-fork-knife",
    route: "/restaurant/restaurantProfile",
  },
  {
    name: "Profile",
    icon: "account-circle",
    route: "/restaurant/restaurantOwner",
  },
];

// usePathname() has no "(group)" segments, so strip them before comparing
const stripGroups = (path: string) => path.replace(/\/\([^)]+\)/g, "");

export default function RestaurantNavigationBar({
  tabs = DEFAULT_TABS,
}: {
  tabs?: Tab[];
}) {
  const pathname = usePathname();

  const routeIndex = tabs.findIndex((t) => {
    if (typeof t.route !== "string") return false;
    const target = stripGroups(t.route);
    return pathname === target || pathname.startsWith(`${target}/`);
  });

  const [value, setValue] = useState(routeIndex !== -1 ? routeIndex : 0);

  useEffect(() => {
    if (routeIndex !== -1) setValue(routeIndex);
  }, [routeIndex]);

  return (
    <View className="flex-row bg-blue-400 shadow-md">
      {tabs.map((item, index) => {
        const isActive = index === value;
        const color = isActive ? "blue" : "#FFFFFF";

        return (
          <Pressable
            key={item.name}
            onPress={() => {
              if (index === value) return;
              setValue(index);
              router.replace(item.route);
            }}
            accessibilityRole="button"
            accessibilityLabel={item.name}
            accessibilityState={{ selected: isActive }}
            className="flex-1 items-center justify-center pt-2 pb-10">
            {isActive && (
              <View className="absolute top-0 h-1 w-3/5 rounded-b bg-blue-800" />
            )}
            <MaterialCommunityIcons name={item.icon} size={30} color={color} />
            <Text
              numberOfLines={1}
              className="mt-1 text-sm font-bold"
              style={{ color }}>
              {item.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

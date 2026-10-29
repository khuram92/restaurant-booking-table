import { useEffect, useState, type ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, usePathname, type Href } from "expo-router";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

type Tab = { name: string; icon: IconName; route: Href };

type Props = {
  tabs?: Tab[];
  initialIndex?: number;
  onChange?: (index: number, tab: Tab) => void;
};

const DEFAULT_TABS: Tab[] = [
  { name: "Home", icon: "home", route: "/home" },
  { name: "Restaurants", icon: "silverware-fork-knife", route: "/listRestaurants" },
  { name: "Locator", icon: "map-marker-outline", route: "/locationPage" },
  { name: "Booking", icon: "calendar-month", route: "/listBookings" },
  { name: "Profile", icon: "account-circle", route: "/profile" },
];

const stripGroups = (path: string) => path.replace(/\/\([^)]+\)/g, "");

export default function NavigationBar({
  tabs = DEFAULT_TABS,
  initialIndex = 0,
  onChange,
}: Props) {
  const pathname = usePathname();

  const routeIndex = tabs.findIndex((t) => {
    if (typeof t.route !== "string") return false;
    const target = stripGroups(t.route);
    return pathname === target || pathname.startsWith(`${target}/`);
  });

  const [value, setValue] = useState(routeIndex !== -1 ? routeIndex : initialIndex);

  useEffect(() => {
    if (routeIndex !== -1) setValue(routeIndex);
  }, [routeIndex]);

  return (
    <View className="flex-row bg-blue-400 shadow-md">
      {tabs.map((item, index) => {
        const isActive = index === value;
        const color = isActive ? "#143d7b" : "#FFFFFF";

        return (
          <Pressable
            key={item.name}
            onPress={() => {
              if (index === value) return;
              setValue(index);
              onChange?.(index, item);
              router.replace(item.route);
            }}
            accessibilityRole="button"
            accessibilityLabel={item.name}
            accessibilityState={{ selected: isActive }}
            className="flex-1 items-center justify-center pt-2 pb-10">
            {isActive && (
              <View className="absolute top-0 h-1 w-3/5 rounded-b bg-[#143d7b]" />
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
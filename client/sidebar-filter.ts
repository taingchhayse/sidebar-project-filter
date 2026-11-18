import { Platform } from "react-native";
import { startWebSidebarProjectFilter } from "./web";

export function startSidebarProjectFilter(): () => void {
  if (Platform.OS !== "web") return () => {};
  return startWebSidebarProjectFilter();
}

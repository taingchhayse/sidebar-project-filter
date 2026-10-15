import type { PluginClientContext } from "@getpaseo/plugin/client";
import { startSidebarProjectFilter } from "./client/sidebar-filter";

export default function contribute(_client: PluginClientContext) {
  return startSidebarProjectFilter();
}

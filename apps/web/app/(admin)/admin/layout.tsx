import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  isSuperAdmin,
  isSubscriberOnly,
  canAccessTool,
  getToolPermissionOverrides,
} from "@/modules/auth";
import { ADMIN_TOOL_GROUPS, toolForPath } from "@/modules/auth/tools";
import { adminLogout } from "./login/actions";
import AdminSidebar from "./AdminSidebar";
import BusyIndicator from "@/components/admin/BusyIndicator";
import { CustomFontProvider } from "@/components/admin/CustomFontProvider";
import { loadCustomFontsSafe } from "@/lib/custom-fonts.server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Session, fonts and the current path are independent — load them together
  // to halve the layout's waterfalls on every admin navigation.
  const [user, customFonts, requestHeaders] = await Promise.all([
    getCurrentUser(),
    loadCustomFontsSafe(),
    headers(),
  ]);

  const overrides = user === null ? {} : await getToolPermissionOverrides();

  // Route-level enforcement: hiding a link also blocks direct URL access.
  const pathname = requestHeaders.get("x-pathname") ?? "";
  const matchedTool = pathname ? toolForPath(pathname) : null;
  if (user !== null && matchedTool !== null && !canAccessTool(user.roles, matchedTool, overrides)) {
    redirect("/admin?forbidden=1");
  }

  const visibleGroups =
    user === null
      ? []
      : ADMIN_TOOL_GROUPS.map((group) => ({
          ...group,
          items: group.items.filter((item) =>
            canAccessTool(user.roles, item, overrides),
          ),
        })).filter((group) => group.items.length > 0);

  const name = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
    : user?.email;

  const subscriberOnly = user !== null && isSubscriberOnly(user);

  return (
    <CustomFontProvider fonts={customFonts}>
      <BusyIndicator />
      <div className="flex min-h-screen bg-zinc-50 text-zinc-900">
        <AdminSidebar
          groups={subscriberOnly ? [] : visibleGroups}
          userName={name ?? ""}
          isSuperAdmin={user !== null && isSuperAdmin(user)}
          subscriberOnly={subscriberOnly}
          logoutAction={adminLogout}
        />
        <main className="ml-60 min-w-0 flex-1 px-6 py-8">{children}</main>
      </div>
    </CustomFontProvider>
  );
}

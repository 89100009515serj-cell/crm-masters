export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/dashboard/:path*", "/requests/:path*", "/my-requests/:path*"],
};

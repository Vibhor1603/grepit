import { notFound } from "next/navigation";
import AdminGate from "../../components/internal/AdminGate";
import { isInternalAdminEnabled } from "../../lib/internal-admin-gate";

export const metadata = {
  title: "Internal admin",
  robots: { index: false, follow: false },
};

export default function InternalAdminLayout({ children }) {
  if (!isInternalAdminEnabled()) {
    notFound();
  }
  return <AdminGate>{children}</AdminGate>;
}

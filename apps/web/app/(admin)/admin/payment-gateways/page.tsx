/**
 * Legacy route — the payment gateway list now lives under Products.
 */
import { redirect } from "next/navigation";

export default function PaymentGatewaysAdminPage() {
  redirect("/admin/products/payment-gateway");
}

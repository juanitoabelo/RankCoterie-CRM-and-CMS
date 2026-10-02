export type GatewayField = {
  name: string;
  label: string;
  type: string;
  placeholder?: string;
  checkbox?: boolean;
};

export const GATEWAY_FIELDS: Record<string, GatewayField[]> = {
  STRIPE: [
    { name: "publishableKey", label: "Publishable Key", type: "text", placeholder: "pk_test_…" },
    { name: "secretKey", label: "Secret Key", type: "password", placeholder: "sk_test_…" },
    { name: "webhookSecret", label: "Webhook Secret", type: "password", placeholder: "whsec_…" },
  ],
  PAYPAL: [
    { name: "clientId", label: "Client ID", type: "text", placeholder: "AXxxx…" },
    { name: "clientSecret", label: "Client Secret", type: "password", placeholder: "EKxxx…" },
    { name: "sandbox", label: "Sandbox mode", type: "checkbox", checkbox: true },
  ],
  SQUARE: [
    { name: "applicationId", label: "Application ID", type: "text", placeholder: "sq0idp-…" },
    { name: "accessToken", label: "Access Token", type: "password", placeholder: "sq0atp-…" },
    { name: "locationId", label: "Location ID", type: "text", placeholder: "Lxxx…" },
  ],
  MANUAL: [],
};

export type CheckoutAddress = {
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone: string;
};

export type CheckoutAddresses = {
  shipping: CheckoutAddress;
  billing: CheckoutAddress;
  billingSameAsShipping: boolean;
};

const LIMITS: Record<keyof CheckoutAddress, number> = {
  firstName: 200,
  lastName: 200,
  company: 120,
  address1: 200,
  address2: 200,
  city: 200,
  state: 64,
  postcode: 32,
  country: 2,
  phone: 40,
};

function read(formData: FormData, prefix = ""): CheckoutAddress {
  const value = (key: keyof CheckoutAddress) => {
    const name = `${prefix}${key.charAt(0).toUpperCase()}${key.slice(1)}`;
    return String(formData.get(name) ?? formData.get(`${prefix}${key}`) ?? "")
      .trim()
      .slice(0, LIMITS[key]);
  };
  const address: CheckoutAddress = {
    firstName: value("firstName"),
    lastName: value("lastName"),
    company: value("company"),
    address1: value("address1"),
    address2: value("address2"),
    city: value("city"),
    state: value("state"),
    postcode: value("postcode"),
    country: value("country").toUpperCase(),
    phone: value("phone"),
  };
  return address;
}

export function readCheckoutAddresses(formData: FormData): CheckoutAddresses {
  const shipping = read(formData);
  const rawSame = formData.get("billingSameAsShipping");
  const billingSameAsShipping =
    rawSame === null || rawSame === "on" || rawSame === "true" || rawSame === "1";
  return {
    shipping,
    billing: billingSameAsShipping ? { ...shipping } : read(formData, "billing"),
    billingSameAsShipping,
  };
}

export function taxAddress(addresses: CheckoutAddresses): CheckoutAddress {
  return addresses.billing;
}

export function addressMeta(addresses: CheckoutAddresses): Record<string, unknown> {
  return {
    billingAddress: addresses.billing,
    shippingAddress: addresses.shipping,
    taxAddressSource: "billing",
  };
}

export function validateCheckoutAddresses(
  addresses: CheckoutAddresses,
  requiresShipping: boolean,
): string | null {
  const required = (address: CheckoutAddress, label: string): string | null => {
    if (!address.country) return `Enter a ${label} country.`;
    if (!requiresShipping) return null;
    if (!address.firstName || !address.lastName) return `Enter a ${label} name.`;
    if (!address.address1) return `Enter a ${label} street address.`;
    if (!address.city || !address.postcode) return `Enter a ${label} city and postal code.`;
    return null;
  };
  return required(addresses.billing, "billing") ?? (requiresShipping ? required(addresses.shipping, "shipping") : null);
}

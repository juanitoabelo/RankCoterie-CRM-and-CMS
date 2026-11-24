import { describe, expect, it } from "vitest";
import { readCheckoutAddresses, taxAddress } from "./addresses";

function formData(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

describe("checkout addresses", () => {
  it("reads shipping fields and falls back to shipping for billing", () => {
    const addresses = readCheckoutAddresses(
      formData({
        firstName: "Ada",
        lastName: "Lovelace",
        address1: "1 Main St",
        city: "London",
        postcode: "SW1A",
        country: "gb",
        state: "London",
        billingSameAsShipping: "on",
      }),
    );
    expect(addresses.shipping.country).toBe("GB");
    expect(addresses.billing).toEqual(addresses.shipping);
    expect(taxAddress(addresses)).toEqual(addresses.billing);
  });

  it("reads a separate billing address when the box is unchecked", () => {
    const addresses = readCheckoutAddresses(
      formData({
        firstName: "Ada",
        lastName: "Lovelace",
        address1: "1 Main St",
        city: "London",
        postcode: "SW1A",
        country: "GB",
        billingSameAsShipping: "false",
        billingFirstName: "Grace",
        billingLastName: "Hopper",
        billingAddress1: "2 Navy Way",
        billingCity: "Arlington",
        billingPostcode: "22201",
        billingCountry: "us",
        billingState: "VA",
      }),
    );
    expect(addresses.shipping.country).toBe("GB");
    expect(addresses.billing).toMatchObject({
      firstName: "Grace",
      country: "US",
      state: "VA",
    });
    expect(taxAddress(addresses).country).toBe("US");
  });
});

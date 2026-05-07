import "server-only";
import { squareClient, squareLocationId } from "./client";
import type { LocationProfile } from "./types";

// Joins the parts Square gives us into one display line. Skips empty parts so
// "—, , CA " can't slip through if the seller hasn't filled every field.
export function formatAddressLine(
  address:
    | {
        addressLine1?: string | null;
        addressLine2?: string | null;
        locality?: string | null;
        administrativeDistrictLevel1?: string | null;
        postalCode?: string | null;
      }
    | undefined
    | null
): string {
  if (!address) return "";
  const street = [address.addressLine1, address.addressLine2]
    .filter((s): s is string => !!s && s.trim().length > 0)
    .join(", ");
  const cityRegion = [address.locality, address.administrativeDistrictLevel1]
    .filter((s): s is string => !!s && s.trim().length > 0)
    .join(", ");
  const tail = [cityRegion, address.postalCode]
    .filter((s): s is string => !!s && s.trim().length > 0)
    .join(" ");
  return [street, tail].filter((s) => s.length > 0).join(", ");
}

export function buildMapsQuery(
  address: string,
  coordinates: { latitude?: number | null; longitude?: number | null } | undefined | null
): string {
  // Coordinates are the most reliable — they survive minor address variants
  // and don't require Maps geocoding. Fall back to the formatted address.
  const lat = coordinates?.latitude;
  const lng = coordinates?.longitude;
  if (typeof lat === "number" && typeof lng === "number") {
    return `${lat},${lng}`;
  }
  return encodeURIComponent(address);
}

export async function getLocationProfile(): Promise<LocationProfile> {
  const client = squareClient();
  const locationId = squareLocationId();
  const { location } = await client.locations.get({ locationId });
  const address = formatAddressLine(location?.address);
  const mapsQuery = buildMapsQuery(address, location?.coordinates);
  return { address, mapsQuery };
}

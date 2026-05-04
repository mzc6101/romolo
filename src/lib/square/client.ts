import "server-only";
import { SquareClient, SquareEnvironment } from "square";

let cached: SquareClient | null = null;

export function squareClient(): SquareClient {
  if (cached) return cached;
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "SQUARE_ACCESS_TOKEN is not set. Configure it in Railway env vars (or in your shell for local dev)."
    );
  }
  const envName = process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT;
  const environment =
    envName === "production"
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox;
  cached = new SquareClient({ token, environment });
  return cached;
}

export function squareLocationId(): string {
  const id = process.env.SQUARE_LOCATION_ID;
  if (!id) {
    throw new Error("SQUARE_LOCATION_ID is not set.");
  }
  return id;
}

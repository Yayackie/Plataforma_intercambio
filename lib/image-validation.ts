import { AccessError } from "./session";
export function validateImage(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 400000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value))
    throw new AccessError("La imagen debe ser JPG, PNG o WebP y ocupar menos de 300 KB.",400);
  return value;
}


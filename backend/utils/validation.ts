export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PAKISTANI_PHONE_REGEX = /^03\d{9}$/;

// 8 to 72 characters (bcrypt ignores anything past 72), with a letter, a number
// and a special character. Any non-space symbol counts as special.
export const PASSWORD_REGEX =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d\s]).{8,72}$/;
export const PASSWORD_MESSAGE =
  "Password must be 8 to 72 characters and contain a letter, a number, and a special character";

// 9:00 AM, 09:00 AM, 9:00AM, 21:30
const TIME_REGEX =
  /^(?:(?:0?[1-9]|1[0-2]):[0-5]\d\s?(?:AM|PM)|(?:[01]?\d|2[0-3]):[0-5]\d)$/i;

/** Express 5 types allow params to be string | string[]. Always get a string. */
export const getParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

/** Escape user input before putting it in a RegExp / $regex. */
export const escapeRegex = (s: string) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Turns the usual ways of typing a Pakistani mobile number into 03XXXXXXXXX:
 * 0300 1234567, 0300-1234567, +92 300 1234567, 0092 300 1234567, 923001234567, 3001234567
 */
export const normalizePhone = (value: unknown) => {
  let phone = String(value ?? "").replace(/[\s\-()]/g, "");

  if (phone.startsWith("+92")) phone = `0${phone.slice(3)}`;
  else if (phone.startsWith("0092")) phone = `0${phone.slice(4)}`;
  else if (/^92\d{10}$/.test(phone)) phone = `0${phone.slice(2)}`;
  else if (/^3\d{9}$/.test(phone)) phone = `0${phone}`;

  return phone;
};

/** Accepts YYYY-MM-DD, DD-MM-YYYY, or an ISO string starting with YYYY-MM-DD. Rejects impossible, future and pre-1900 dates. */
export const parseDob = (value: unknown): Date | null => {
  if (typeof value !== "string") return null;

  let input = value.trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(input)) input = input.slice(0, 10);

  let year: number;
  let month: number;
  let day: number;

  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    [year, month, day] = input.split("-").map(Number);
  } else if (/^\d{2}-\d{2}-\d{4}$/.test(input)) {
    [day, month, year] = input.split("-").map(Number);
  } else {
    return null;
  }

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  if (date > new Date() || year < 1900) return null;
  return date;
};

export const parsePaging = (
  query: Record<string, unknown>,
  defaultLimit: number,
  maxLimit: number,
) => {
  const page = Math.max(1, parseInt(String(query.page ?? "1"), 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(
      1,
      parseInt(String(query.limit ?? defaultLimit), 10) || defaultLimit,
    ),
  );
  return { page, limit, skip: (page - 1) * limit };
};

/**
 * True only if `value` is an https Cloudinary URL for OUR cloud, inside `folder`.
 * If `fileName` is given, the file must be exactly that public id (e.g. a user's id).
 */
export const isCloudinaryAsset = (
  value: unknown,
  folder: string,
  fileName?: string,
): boolean => {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloud || typeof value !== "string") return false;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com")
    return false;

  const base = `/${cloud}/image/upload/`;
  if (!url.pathname.startsWith(base)) return false;

  const rest = url.pathname.slice(base.length); // e.g. v123/tablebooking/profiles/abc.jpg
  const marker = `${folder}/`;
  const idx = rest.indexOf(marker);
  if (idx === -1 || (idx > 0 && rest[idx - 1] !== "/")) return false;

  const name = rest.slice(idx + marker.length);
  if (!name || name.includes("/")) return false;
  if (fileName === undefined) return true;
  return name === fileName || name.startsWith(`${fileName}.`);
};

export const RESTAURANT_IMAGE_FOLDER = "tablebooking/restaurants";
export const PROFILE_IMAGE_FOLDER = "tablebooking/profiles";

const TEXT_LIMITS: Record<string, number> = {
  city: 100,
  province: 100,
  address: 300,
  phone: 30,
  description: 2000,
  openingTime: 20,
  closingTime: 20,
};

const isTextList = (v: unknown, maxItems: number, maxLen: number) =>
  Array.isArray(v) &&
  v.length <= maxItems &&
  v.every(
    (x) => typeof x === "string" && x.trim().length > 0 && x.length <= maxLen,
  );

export type RestaurantInputResult =
  { error: string } | { data: Record<string, unknown> };

/**
 * Validates and cleans restaurant fields from a request body.
 * Only known fields are returned. isFeatured / isActive / owner are never handled here.
 */
export const sanitizeRestaurantInput = (
  body: Record<string, any>,
  requireName: boolean,
  existingImages: string[] = [], // images already saved on the restaurant stay valid
): RestaurantInputResult => {
  const data: Record<string, unknown> = {};

  if (requireName || body.name !== undefined) {
    if (
      typeof body.name !== "string" ||
      !body.name.trim() ||
      body.name.trim().length > 100
    ) {
      return { error: "Restaurant name is required (up to 100 characters)" };
    }
    data.name = body.name.trim();
  }

  for (const [key, max] of Object.entries(TEXT_LIMITS)) {
    if (body[key] === undefined) continue;
    if (typeof body[key] !== "string" || body[key].trim().length > max) {
      return { error: `${key} must be text of up to ${max} characters` };
    }
    data[key] = body[key].trim();
  }

  // Opening and closing times must look like a time (the app builds booking slots from them)
  for (const key of ["openingTime", "closingTime"] as const) {
    const value = data[key];
    if (typeof value === "string" && value !== "" && !TIME_REGEX.test(value)) {
      return { error: `${key} must look like 9:00 AM or 21:30` };
    }
  }

  // The model stores cuisines as ONE string (e.g. "Italian, BBQ"); arrays are joined.
  if (body.cuisines !== undefined) {
    const c = body.cuisines;
    const text = Array.isArray(c)
      ? isTextList(c, 20, 50)
        ? c.map((x: string) => x.trim()).join(", ")
        : null
      : typeof c === "string"
        ? c.trim()
        : null;
    if (text === null || text.length > 200) {
      return { error: "Cuisines must be text of up to 200 characters" };
    }
    data.cuisines = text;
  }

  if (body.seatingTypes !== undefined) {
    if (!isTextList(body.seatingTypes, 20, 50)) {
      return { error: "Seating types must be a list of up to 20 text values" };
    }
    data.seatingTypes = body.seatingTypes.map((x: string) => x.trim());
  }

  if (body.floorNumbers !== undefined) {
    const f = body.floorNumbers;
    const ok =
      Array.isArray(f) &&
      f.length <= 50 &&
      f.every(
        (x) =>
          (typeof x === "number" && Number.isFinite(x)) ||
          (typeof x === "string" && x.trim().length > 0 && x.length <= 20),
      );
    if (!ok)
      return { error: "Floor numbers must be a list of up to 50 values" };
    data.floorNumbers = f.map((x) => String(x).trim()); // model stores strings
  }

  if (body.availableSeats !== undefined) {
    const n = Number(body.availableSeats);
    if (
      body.availableSeats === "" ||
      !Number.isInteger(n) ||
      n < 0 ||
      n > 10000
    ) {
      return {
        error: "Available seats must be a whole number from 0 to 10000",
      };
    }
    data.availableSeats = n;
  }

  if (body.images !== undefined) {
    const imgs = body.images;
    if (
      !Array.isArray(imgs) ||
      imgs.length > 10 ||
      !imgs.every(
        (u) =>
          isCloudinaryAsset(u, RESTAURANT_IMAGE_FOLDER) ||
          (typeof u === "string" && existingImages.includes(u)),
      )
    ) {
      return {
        error:
          "Images must be up to 10 images, and new ones must be uploaded through the app",
      };
    }
    data.images = imgs;
  }

  return { data };
};
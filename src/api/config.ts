
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:3000/api";

if (!__DEV__ && API_URL.startsWith("http://")) {
  console.warn("API_URL is not https: logins and tokens are sent unencrypted.");
}

export const REQUEST_TIMEOUT_MS = 15_000;

/** fetch with a timeout and readable errors instead of "Network request failed". */
export const fetchWithTimeout = async (
  input: string,
  init: RequestInit = {},
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("The server took too long to respond. Please try again.");
    }
    throw new Error("Can't reach the server. Check your internet connection.");
  } finally {
    clearTimeout(timer);
  }
};

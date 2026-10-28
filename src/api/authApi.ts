const API_URL = "http://10.0.2.2:3000/api";

async function request<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: object;
    token?: string;
  } = {},
): Promise<T> {
  const { method = "GET", body, token } = options;

  const response = await fetch(`${API_URL}/auth/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `${path} failed`);
  }

  return data as T;
}

export const signupUser = (userData: {
  firstName: string;
  lastName: string;
  email: string;
  dob: string;
  phone: string;
  role: string;
  password: string;
}) => request("signup", { method: "POST", body: userData });

export const loginUser = (credentials: { email: string; password: string }) =>
  request("login", { method: "POST", body: credentials });

export const getMe = (token: string) =>
  request<any>("me", { token });

export const updateMe = async (token: string, data: Record<string, unknown>) => {
  const res = await request<{ user: any }>("me", {
    method: "PATCH",
    body: data,
    token,
  });
  return res.user;
};

export const deleteMe = (token: string, password: string) =>
  request<{ message: string }>("me", {
    method: "DELETE",
    body: { password },
    token,
  });

// --- NEW PASSWORD RESET FUNCTIONS ---

export const forgotPassword = (email: string) =>
  request<{ message: string }>("forgot-password", {
    method: "POST",
    body: { email },
  });

export const verifyOtp = (data: { email: string; otp: string }) =>
  request<{ message: string }>("verify-otp", {
    method: "POST",
    body: data,
  });

export const resetPassword = (data: { email: string; otp: string; newPassword: string }) =>
  request<{ message: string }>("reset-password", {
    method: "POST",
    body: data,
  });
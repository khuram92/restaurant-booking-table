import { File } from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import { fetch } from "expo/fetch";

const API_URL = "http://10.0.2.2:3000/api";

export type UploadType = "restaurants" | "profiles";

type Signature = {
  cloudName: string;
  apiKey: string;
  signature: string;
  params: Record<string, string | number | boolean>;
};

const getSignature = async (type: UploadType): Promise<Signature> => {
  const token = await SecureStore.getItemAsync("authToken");
  if (!token) throw new Error("You must be logged in");

  const response = await fetch(`${API_URL}/uploads/sign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ type }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Could not start the upload");
  }

  return data as Signature;
};

export const uploadImage = async (
  uri: string,
  type: UploadType,
): Promise<string> => {
  const sig = await getSignature(type);

  const form = new FormData();
  form.append("file", new File(uri));
  form.append("api_key", sig.apiKey);
  form.append("signature", sig.signature);

  Object.entries(sig.params).forEach(([key, value]) => {
    form.append(key, String(value));
  });

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
    {
      method: "POST",
      body: form,
    },
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error?.message || "Upload failed");
  }

  if (!data.secure_url) {
    throw new Error("Cloudinary did not return an image URL");
  }

  return data.secure_url as string;
};
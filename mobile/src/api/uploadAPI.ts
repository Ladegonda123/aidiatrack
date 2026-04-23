import axiosInstance from "./axiosInstance";
import { User } from "../types";

type UploadResponse = {
  user: User;
};

export const uploadProfilePhoto = async (imageUri: string): Promise<User> => {
  const formData = new FormData();
  const filename = imageUri.split("/").pop() ?? "photo.jpg";
  const extension = filename.split(".").pop() ?? "jpg";
  const mimeType = `image/${extension}`;

  formData.append("photo", {
    uri: imageUri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);

  const response = await axiosInstance.post<{
    data: UploadResponse;
  }>("/upload/profile-photo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 30000,
  });

  return response.data.data.user;
};

import axios, { AxiosError } from "axios";

export function isAxiosError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}

export function isAxiosUnprocessableEntity<FormError>(
  error: unknown
): error is AxiosError<FormError> {
  return (
    isAxiosError(error) &&
    (error.response?.status === 400 || error.response?.status === 404)
  );
}

export function formatDate(dateTime: string | Date): string {
  if (typeof dateTime === "string") {
    dateTime = new Date(dateTime);
  }
  return (
    dateTime.getDate() +
    "/" +
    (dateTime.getMonth() + 1) +
    "/" +
    dateTime.getFullYear()
  );
}

export function formatTime(dateTime: string | Date): string {
  if (typeof dateTime === "string") {
    dateTime = new Date(dateTime);
  }
  return (
    dateTime.getHours().toString().padStart(2, "0") +
    ":" +
    dateTime.getMinutes().toString().padStart(2, "0")
  );
}

export function formatDateTime(dateTime: string | Date): string {
  return formatDate(dateTime) + " " + formatTime(dateTime);
}

export function getTimeDifference (dateTime1:Date, dateTime2:Date) : string {
  const date1 = new Date(dateTime1);
  const date2 = new Date(dateTime2);

  // Tính toán sự chênh lệch (milliseconds)
  const diffMs = Math.abs(date2.getTime() - date1.getTime());

  // Chuyển đổi sang hours và minutes
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${diffHours} hours ${diffMinutes} minutes`;
};

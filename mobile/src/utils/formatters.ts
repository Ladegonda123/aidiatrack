import { format } from "date-fns";

const RW_MONTHS: Record<string, string> = {
  Jan: "Mut",
  Feb: "Gas",
  Mar: "Wer",
  Apr: "Mat",
  May: "Gic",
  Jun: "Kam",
  Jul: "Nya",
  Aug: "Kan",
  Sep: "Nze",
  Oct: "Ukw",
  Nov: "Ugu",
  Dec: "Uku",
};

const RW_TIME_AGO = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return "ubu nyine";
  if (minutes < 60) return `${minutes} min.`;
  if (hours < 24) return `amasaha ${hours} ashize`;
  if (days < 7) return `iminsi ${days} ishize`;
  if (weeks < 5) return `ibyumweru ${weeks} bishize`;
  return `amezi ${months} ashize`;
};

const EN_TIME_AGO = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days < 7) return `${days} days ago`;
  if (weeks < 5) return `${weeks} weeks ago`;
  return `${months} months ago`;
};

export const formatDate = (
  date: string | Date,
  language = "rw",
): string => {
  const value = new Date(date);
  const base = format(value, "MMM dd, yyyy");

  if (language === "en") return base;

  const [month, ...rest] = base.split(" ");
  const rwMonth = RW_MONTHS[month] ?? month;
  return `${rwMonth} ${rest.join(" ")}`;
};

export const formatTime = (date: string | Date): string =>
  format(new Date(date), "HH:mm");

export const formatDateTime = (
  date: string | Date,
  language = "rw",
): string => {
  const value = new Date(date);
  const datePart = formatDate(value, language);
  const timePart = format(value, "HH:mm");
  return `${datePart} ${timePart}`;
};

export const timeAgo = (
  date: string | Date,
  language = "rw",
): string => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  return language === "rw" ? RW_TIME_AGO(seconds) : EN_TIME_AGO(seconds);
};

export const formatBg = (value: number): string => `${value.toFixed(1)} mg/dL`;

export const formatBmi = (value: number): string => value.toFixed(1);

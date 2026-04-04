import { format, formatDistanceToNow } from "date-fns";

export const formatDate = (date: string | Date): string =>
  format(new Date(date), "MMM dd, yyyy");

export const formatTime = (date: string | Date): string =>
  format(new Date(date), "HH:mm");

export const formatDateTime = (date: string | Date): string =>
  format(new Date(date), "MMM dd, yyyy HH:mm");

export const timeAgo = (date: string | Date): string =>
  formatDistanceToNow(new Date(date), { addSuffix: true });

export const formatBg = (value: number): string => `${value.toFixed(1)} mg/dL`;

export const formatBmi = (value: number): string => value.toFixed(1);

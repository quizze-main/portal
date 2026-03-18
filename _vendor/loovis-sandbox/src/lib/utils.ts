import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { managersData } from '@/data/mockData';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getManagerAvatar = (managerId: string): string | undefined => {
  return managersData[managerId]?.avatar;
};

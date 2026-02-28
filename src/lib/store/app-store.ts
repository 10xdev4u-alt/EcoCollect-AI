import { create } from 'zustand';
import type { Profile, Notification } from '@/lib/types/database';

interface AppState {
  // User
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  updateCredits: (amount: number) => void;

  // Notifications
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;

  // UI State
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // User
  profile: null,
  setProfile: (profile) => set({ profile }),
  updateCredits: (amount) =>
    set((state) => ({
      profile: state.profile
        ? {
            ...state.profile,
            greenCredits: state.profile.greenCredits + amount,
          }
        : null,
    })),

  // Notifications
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  // UI State
  isOnline: true,
  setIsOnline: (online) => set({ isOnline: online }),
}));

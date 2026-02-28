export type UserRole = "donor" | "collector" | "admin";

export type PickupStatus =
  | "pending"
  | "matched"
  | "collector_enroute"
  | "arrived"
  | "inspecting"
  | "collected"
  | "completed"
  | "cancelled";

export type BadgeLevel =
  | "seedling"
  | "sprout"
  | "tree"
  | "forest"
  | "earth_guardian";

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  phone: string | null;
  role: UserRole;
  greenCredits: number;
  totalItemsRecycled: number;
  totalWeightKg: number;
  co2SavedKg: number;
  streakDays: number;
  badgeLevel: BadgeLevel;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EwasteCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  avgWeightKg: number;
  greenCreditsPerKg: number;
  co2SavedPerKg: number;
  hazardLevel: "low" | "medium" | "high" | "critical";
  estimatedValuePerKg: number;
}

export interface PickupRequest {
  id: string;
  donorId: string;
  collectorId: string | null;
  pickupAddress: string;
  pickupCity: string;
  pickupState: string;
  pickupZip: string;
  pickupLatitude: number;
  pickupLongitude: number;
  pickupInstructions: string | null;
  preferredDate: string;
  preferredTimeSlot: "morning" | "afternoon" | "evening";
  status: PickupStatus;
  totalItems: number;
  estimatedWeightKg: number;
  actualWeightKg: number | null;
  estimatedCredits: number;
  actualCreditsAwarded: number | null;
  aiScanResults: any;
  itemPhotos: string[];
  donorRating: number | null;
  collectorRating: number | null;
  createdAt: string;
  updatedAt: string;
  matchedAt: string | null;
  collectedAt: string | null;
  completedAt: string | null;
  // Joined data (not in DB)
  donor?: Profile;
  collector?: Profile;
  items?: PickupItem[];
}

export interface PickupItem {
  id: string;
  pickupId: string;
  categoryId: string;
  description: string | null;
  quantity: number;
  condition: "working" | "partially_working" | "non_working" | "damaged";
  estimatedWeightKg: number;
  actualWeightKg: number | null;
  photoUrl: string | null;
  aiDetectedLabel: string | null;
  aiConfidence: number | null;
  creditsEarned: number;
  category?: EwasteCategory;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: string;
  description: string;
  balanceAfter: number;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  data: any;
  isRead: boolean;
  createdAt: string;
}

export interface Achievement {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconName: string;
  requirementType: string;
  requirementValue: number;
  creditReward: number;
}

export interface UserAchievement extends Achievement {
  unlockedAt: string | null;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  creditsRequired: number;
  category: "voucher" | "donation" | "merchandise" | "service";
  partnerName: string;
}

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db } from './config';
import type { Profile, PickupRequest, PickupItem, CreditTransaction, Notification, Achievement } from '@/lib/types/database';

// Collection references
export const collections = {
  profiles: collection(db, 'profiles'),
  pickups: collection(db, 'pickups'),
  pickupItems: collection(db, 'pickupItems'),
  creditTransactions: collection(db, 'creditTransactions'),
  notifications: collection(db, 'notifications'),
  achievements: collection(db, 'achievements'),
  ewasteCategories: collection(db, 'ewasteCategories'),
};

// ==================== PROFILE SERVICES ====================

export async function createProfile(userId: string, data: Partial<Profile>) {
  const profileRef = doc(collections.profiles, userId);
  const profileData: Partial<Profile> = {
    id: userId,
    role: 'donor',
    greenCredits: 0,
    totalItemsRecycled: 0,
    totalWeightKg: 0,
    co2SavedKg: 0,
    streakDays: 0,
    badgeLevel: 'seedling',
    isVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...data,
  };
  await setDoc(profileRef, profileData);
  return profileData as Profile;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const profileRef = doc(collections.profiles, userId);
  const snapshot = await getDoc(profileRef);
  return snapshot.exists() ? (snapshot.data() as Profile) : null;
}

export async function updateProfile(userId: string, data: Partial<Profile>) {
  const profileRef = doc(collections.profiles, userId);
  await updateDoc(profileRef, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export function subscribeToProfile(userId: string, callback: (profile: Profile | null) => void) {
  const profileRef = doc(collections.profiles, userId);
  return onSnapshot(profileRef, (snapshot) => {
    callback(snapshot.exists() ? (snapshot.data() as Profile) : null);
  });
}

// ==================== PICKUP SERVICES ====================

export async function createPickup(data: Omit<PickupRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const pickupRef = await addDoc(collections.pickups, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return pickupRef.id;
}

export async function getPickup(pickupId: string): Promise<PickupRequest | null> {
  const pickupRef = doc(collections.pickups, pickupId);
  const snapshot = await getDoc(pickupRef);
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as PickupRequest) : null;
}

export async function updatePickupStatus(pickupId: string, status: string, additionalData?: any) {
  const pickupRef = doc(collections.pickups, pickupId);
  const updateData: any = {
    status,
    updatedAt: serverTimestamp(),
  };
  
  if (status === 'matched') updateData.matchedAt = serverTimestamp();
  if (status === 'collected') updateData.collectedAt = serverTimestamp();
  if (status === 'completed') updateData.completedAt = serverTimestamp();
  if (status === 'cancelled') updateData.cancelledAt = serverTimestamp();
  
  await updateDoc(pickupRef, { ...updateData, ...additionalData });
}

export async function getUserPickups(userId: string): Promise<PickupRequest[]> {
  const q = query(
    collections.pickups,
    where('donorId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PickupRequest));
}

export async function getPendingPickups(): Promise<PickupRequest[]> {
  const q = query(
    collections.pickups,
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PickupRequest));
}

export async function getCollectorPickups(collectorId: string): Promise<PickupRequest[]> {
  const q = query(
    collections.pickups,
    where('collectorId', '==', collectorId),
    where('status', 'in', ['matched', 'collector_enroute', 'arrived', 'inspecting', 'collected']),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PickupRequest));
}

export function subscribeToPendingPickups(callback: (pickups: PickupRequest[]) => void) {
  const q = query(
    collections.pickups,
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PickupRequest)));
  });
}

export function subscribeToCollectorPickups(collectorId: string, callback: (pickups: PickupRequest[]) => void) {
  const q = query(
    collections.pickups,
    where('collectorId', '==', collectorId),
    where('status', 'in', ['matched', 'collector_enroute', 'arrived', 'inspecting', 'collected']),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PickupRequest)));
  });
}

export function subscribeToPickup(pickupId: string, callback: (pickup: PickupRequest | null) => void) {
  const pickupRef = doc(collections.pickups, pickupId);
  return onSnapshot(pickupRef, (snapshot) => {
    callback(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as PickupRequest) : null);
  });
}

export function subscribeToUserPickups(userId: string, callback: (pickups: PickupRequest[]) => void) {
  const q = query(
    collections.pickups,
    where('donorId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PickupRequest)));
  });
}

// ==================== PICKUP ITEMS SERVICES ====================

export async function addPickupItems(pickupId: string, items: Omit<PickupItem, 'id' | 'pickupId'>[]) {
  const batch = writeBatch(db);
  
  items.forEach((item) => {
    const itemRef = doc(collections.pickupItems);
    batch.set(itemRef, {
      ...item,
      pickupId,
      createdAt: serverTimestamp(),
    });
  });
  
  await batch.commit();
}

export async function getPickupItems(pickupId: string): Promise<PickupItem[]> {
  const q = query(collections.pickupItems, where('pickupId', '==', pickupId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PickupItem));
}

// ==================== CREDIT TRANSACTIONS ====================

export async function addCreditTransaction(data: Omit<CreditTransaction, 'id' | 'createdAt'>): Promise<string> {
  const txRef = await addDoc(collections.creditTransactions, {
    ...data,
    createdAt: serverTimestamp(),
  });
  return txRef.id;
}

export async function getUserTransactions(userId: string, limitCount: number = 20): Promise<CreditTransaction[]> {
  const q = query(
    collections.creditTransactions,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreditTransaction));
}

export function subscribeToUserTransactions(userId: string, callback: (transactions: CreditTransaction[]) => void) {
  const q = query(
    collections.creditTransactions,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreditTransaction)));
  });
}

// ==================== NOTIFICATIONS ====================

export async function createNotification(data: Omit<Notification, 'id' | 'createdAt'>): Promise<string> {
  const notifRef = await addDoc(collections.notifications, {
    ...data,
    isRead: false,
    createdAt: serverTimestamp(),
  });
  return notifRef.id;
}

export async function markNotificationAsRead(notificationId: string) {
  const notifRef = doc(collections.notifications, notificationId);
  await updateDoc(notifRef, { isRead: true });
}

export async function getUserNotifications(userId: string): Promise<Notification[]> {
  const q = query(
    collections.notifications,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
}

export function subscribeToUserNotifications(userId: string, callback: (notifications: Notification[]) => void) {
  const q = query(
    collections.notifications,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
  });
}

// ==================== ACHIEVEMENTS ====================

export async function seedAchievements() {
  const achievements = [
    { slug: 'first_drop', name: 'First Drop', description: 'Complete your first pickup', iconName: 'Leaf', requirementType: 'pickups', requirementValue: 1, creditReward: 50 },
    { slug: 'eco_starter', name: 'Eco Starter', description: 'Recycle 5 items', iconName: 'Sprout', requirementType: 'items_recycled', requirementValue: 5, creditReward: 100 },
    { slug: 'green_warrior', name: 'Green Warrior', description: 'Recycle 25 items', iconName: 'TreePine', requirementType: 'items_recycled', requirementValue: 25, creditReward: 250 },
    { slug: 'weight_lifter', name: 'Weight Lifter', description: 'Recycle 10kg of e-waste', iconName: 'Dumbbell', requirementType: 'weight_kg', requirementValue: 10, creditReward: 200 },
    { slug: 'streak_3', name: 'On a Roll', description: '3-day activity streak', iconName: 'Flame', requirementType: 'streak', requirementValue: 3, creditReward: 75 },
    { slug: 'streak_7', name: 'Week Warrior', description: '7-day activity streak', iconName: 'Zap', requirementType: 'streak', requirementValue: 7, creditReward: 150 },
    { slug: 'century', name: 'Century Club', description: 'Recycle 100 items', iconName: 'Trophy', requirementType: 'items_recycled', requirementValue: 100, creditReward: 500 },
    { slug: 'half_ton', name: 'Half Ton Hero', description: 'Recycle 500kg of e-waste', iconName: 'Medal', requirementType: 'weight_kg', requirementValue: 500, creditReward: 1000 },
  ];

  const batch = writeBatch(db);
  
  for (const achievement of achievements) {
    const achievementRef = doc(collections.achievements);
    batch.set(achievementRef, achievement);
  }
  
  await batch.commit();
}

export async function getAchievements(): Promise<Achievement[]> {
  const snapshot = await getDocs(collections.achievements);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Achievement));
}

// ==================== E-WASTE CATEGORIES ====================

export async function seedEwasteCategories() {
  const categories = [
    { name: 'Smartphones & Tablets', slug: 'smartphones', description: 'Mobile phones, tablets, e-readers', iconName: 'Smartphone', avgWeightKg: 0.2, greenCreditsPerKg: 25, co2SavedPerKg: 2.5, hazardLevel: 'medium', estimatedValuePerKg: 15 },
    { name: 'Laptops & Computers', slug: 'laptops', description: 'Laptops, desktops, monitors', iconName: 'Laptop', avgWeightKg: 3.0, greenCreditsPerKg: 30, co2SavedPerKg: 3.0, hazardLevel: 'medium', estimatedValuePerKg: 12 },
    { name: 'Batteries', slug: 'batteries', description: 'Li-ion, NiMH, Lead-acid batteries', iconName: 'Battery', avgWeightKg: 0.5, greenCreditsPerKg: 40, co2SavedPerKg: 4.0, hazardLevel: 'critical', estimatedValuePerKg: 8 },
    { name: 'Cables & Chargers', slug: 'cables', description: 'USB cables, power adapters, chargers', iconName: 'Cable', avgWeightKg: 0.3, greenCreditsPerKg: 10, co2SavedPerKg: 1.0, hazardLevel: 'low', estimatedValuePerKg: 5 },
    { name: 'TVs & Displays', slug: 'displays', description: 'LED/LCD TVs, monitors, projectors', iconName: 'Monitor', avgWeightKg: 8.0, greenCreditsPerKg: 20, co2SavedPerKg: 2.0, hazardLevel: 'high', estimatedValuePerKg: 6 },
    { name: 'Printers & Scanners', slug: 'printers', description: 'Inkjet, laser printers, scanners', iconName: 'Printer', avgWeightKg: 5.0, greenCreditsPerKg: 15, co2SavedPerKg: 1.5, hazardLevel: 'medium', estimatedValuePerKg: 4 },
    { name: 'Kitchen Appliances', slug: 'kitchen', description: 'Microwaves, toasters, blenders', iconName: 'UtensilsCrossed', avgWeightKg: 4.0, greenCreditsPerKg: 12, co2SavedPerKg: 1.2, hazardLevel: 'low', estimatedValuePerKg: 3 },
    { name: 'Audio & Wearables', slug: 'audio', description: 'Headphones, speakers, smartwatches', iconName: 'Headphones', avgWeightKg: 0.3, greenCreditsPerKg: 20, co2SavedPerKg: 2.0, hazardLevel: 'low', estimatedValuePerKg: 10 },
    { name: 'Gaming Consoles', slug: 'gaming', description: 'Consoles, controllers, VR headsets', iconName: 'Gamepad2', avgWeightKg: 2.5, greenCreditsPerKg: 25, co2SavedPerKg: 2.5, hazardLevel: 'low', estimatedValuePerKg: 8 },
    { name: 'Networking Equipment', slug: 'networking', description: 'Routers, modems, switches', iconName: 'Wifi', avgWeightKg: 1.0, greenCreditsPerKg: 15, co2SavedPerKg: 1.5, hazardLevel: 'low', estimatedValuePerKg: 6 },
  ];

  const batch = writeBatch(db);
  
  for (const category of categories) {
    const categoryRef = doc(collections.ewasteCategories, category.slug);
    batch.set(categoryRef, category);
  }
  
  await batch.commit();
}

export async function getEwasteCategories(): Promise<any[]> {
  const snapshot = await getDocs(collections.ewasteCategories);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ==================== BUSINESS LOGIC ====================

export async function completePickupAndAwardCredits(
  pickupId: string,
  actualWeightKg: number,
  actualCredits: number
) {
  const batch = writeBatch(db);
  
  // Get pickup data
  const pickupRef = doc(collections.pickups, pickupId);
  const pickupSnap = await getDoc(pickupRef);
  if (!pickupSnap.exists()) throw new Error('Pickup not found');
  
  const pickup = pickupSnap.data() as PickupRequest;
  const donorId = pickup.donorId;
  
  // Update pickup
  batch.update(pickupRef, {
    status: 'completed',
    actualWeightKg,
    actualCreditsAwarded: actualCredits,
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  // Update donor profile
  const profileRef = doc(collections.profiles, donorId);
  batch.update(profileRef, {
    greenCredits: increment(actualCredits),
    totalItemsRecycled: increment(pickup.totalItems),
    totalWeightKg: increment(actualWeightKg),
    co2SavedKg: increment(actualWeightKg * 1.5),
    lastActivityAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
  
  // Add credit transaction
  const txRef = doc(collections.creditTransactions);
  batch.set(txRef, {
    userId: donorId,
    amount: actualCredits,
    type: 'pickup_completed',
    description: `Pickup #${pickupId.slice(0, 8)} completed — ${actualWeightKg}kg recycled`,
    referenceId: pickupId,
    createdAt: serverTimestamp(),
  });
  
  // Create notification
  const notifRef = doc(collections.notifications);
  batch.set(notifRef, {
    userId: donorId,
    title: '🌿 Credits Earned!',
    body: `You earned ${actualCredits} Green Credits for recycling ${actualWeightKg}kg of e-waste!`,
    type: 'credit_earned',
    data: { amount: actualCredits, pickupId },
    createdAt: serverTimestamp(),
  });
  
  await batch.commit();
}

export async function acceptPickup(pickupId: string, collectorId: string) {
  const pickupRef = doc(collections.pickups, pickupId);
  await updateDoc(pickupRef, {
    collectorId,
    status: 'matched',
    matchedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

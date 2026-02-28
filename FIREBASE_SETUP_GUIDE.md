# 🔥 EcoCollect Firebase Setup Guide

## Your App is Live! 🎉
**URL:** https://ots7ww3jwipv6.ok.kimi.link

---

## ✅ What You Need To Do In Firebase Console

### 1. **Enable Authentication** (Required)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `ecocollect-35d13`
3. Click **Authentication** in the left sidebar
4. Click **Get Started**
5. Enable these sign-in methods:
   - ✅ **Email/Password** (Enable)
   - ✅ **Google** (Enable → Add support email → Save)
   - ✅ **GitHub** (Optional - requires GitHub OAuth app)

---

### 2. **Create Firestore Database** (Required)

1. Click **Firestore Database** in the left sidebar
2. Click **Create Database**
3. Choose **Start in test mode** (for development)
4. Select a region closest to your users (e.g., `us-central`)
5. Click **Enable**

---

### 3. **Set Up Security Rules** (Critical!)

1. In Firestore Database, go to **Rules** tab
2. Replace the default rules with this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Profiles collection
    match /profiles/{userId} {
      allow read: if isAuthenticated();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId);
    }
    
    // Pickups collection
    match /pickups/{pickupId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.resource.data.donorId == request.auth.uid;
      allow update: if isAuthenticated();
    }
    
    // Pickup items collection
    match /pickupItems/{itemId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
    }
    
    // Credit transactions collection
    match /creditTransactions/{transactionId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated();
    }
    
    // Notifications collection
    match /notifications/{notificationId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
    }
    
    // Achievements collection
    match /achievements/{achievementId} {
      allow read: if isAuthenticated();
      allow write: if false; // Only admin via console
    }
    
    // E-waste categories
    match /ewasteCategories/{categoryId} {
      allow read: if isAuthenticated();
      allow write: if false; // Only admin via console
    }
  }
}
```

3. Click **Publish**

---

### 4. **Seed Initial Data** (One-time setup)

You need to manually add the e-waste categories and achievements to Firestore:

#### Add E-Waste Categories:

Create a collection called `ewasteCategories` with these documents:

| Document ID | Fields |
|-------------|--------|
| `smartphones` | `name: "Smartphones & Tablets"`, `slug: "smartphones"`, `description: "Mobile phones, tablets, e-readers"`, `iconName: "Smartphone"`, `avgWeightKg: 0.2`, `greenCreditsPerKg: 25`, `co2SavedPerKg: 2.5`, `hazardLevel: "medium"`, `estimatedValuePerKg: 15` |
| `laptops` | `name: "Laptops & Computers"`, `slug: "laptops"`, `description: "Laptops, desktops, monitors"`, `iconName: "Laptop"`, `avgWeightKg: 3.0`, `greenCreditsPerKg: 30`, `co2SavedPerKg: 3.0`, `hazardLevel: "medium"`, `estimatedValuePerKg: 12` |
| `batteries` | `name: "Batteries"`, `slug: "batteries"`, `description: "Li-ion, NiMH, Lead-acid batteries"`, `iconName: "Battery"`, `avgWeightKg: 0.5`, `greenCreditsPerKg: 40`, `co2SavedPerKg: 4.0`, `hazardLevel: "critical"`, `estimatedValuePerKg: 8` |
| `cables` | `name: "Cables & Chargers"`, `slug: "cables"`, `description: "USB cables, power adapters, chargers"`, `iconName: "Cable"`, `avgWeightKg: 0.3`, `greenCreditsPerKg: 10`, `co2SavedPerKg: 1.0`, `hazardLevel: "low"`, `estimatedValuePerKg: 5` |
| `displays` | `name: "TVs & Displays"`, `slug: "displays"`, `description: "LED/LCD TVs, monitors, projectors"`, `iconName: "Monitor"`, `avgWeightKg: 8.0`, `greenCreditsPerKg: 20`, `co2SavedPerKg: 2.0`, `hazardLevel: "high"`, `estimatedValuePerKg: 6` |
| `printers` | `name: "Printers & Scanners"`, `slug: "printers"`, `description: "Inkjet, laser printers, scanners"`, `iconName: "Printer"`, `avgWeightKg: 5.0`, `greenCreditsPerKg: 15`, `co2SavedPerKg: 1.5`, `hazardLevel: "medium"`, `estimatedValuePerKg: 4` |
| `kitchen` | `name: "Kitchen Appliances"`, `slug: "kitchen"`, `description: "Microwaves, toasters, blenders"`, `iconName: "UtensilsCrossed"`, `avgWeightKg: 4.0`, `greenCreditsPerKg: 12`, `co2SavedPerKg: 1.2`, `hazardLevel: "low"`, `estimatedValuePerKg: 3` |
| `audio` | `name: "Audio & Wearables"`, `slug: "audio"`, `description: "Headphones, speakers, smartwatches"`, `iconName: "Headphones"`, `avgWeightKg: 0.3`, `greenCreditsPerKg: 20`, `co2SavedPerKg: 2.0`, `hazardLevel: "low"`, `estimatedValuePerKg: 10` |
| `gaming` | `name: "Gaming Consoles"`, `slug: "gaming"`, `description: "Consoles, controllers, VR headsets"`, `iconName: "Gamepad2"`, `avgWeightKg: 2.5`, `greenCreditsPerKg: 25`, `co2SavedPerKg: 2.5`, `hazardLevel: "low"`, `estimatedValuePerKg: 8` |
| `networking` | `name: "Networking Equipment"`, `slug: "networking"`, `description: "Routers, modems, switches"`, `iconName: "Wifi"`, `avgWeightKg: 1.0`, `greenCreditsPerKg: 15`, `co2SavedPerKg: 1.5`, `hazardLevel: "low"`, `estimatedValuePerKg: 6` |

#### Add Achievements:

Create a collection called `achievements` with these documents:

| Document ID | Fields |
|-------------|--------|
| `first_drop` | `slug: "first_drop"`, `name: "First Drop"`, `description: "Complete your first pickup"`, `iconName: "Leaf"`, `requirementType: "pickups"`, `requirementValue: 1`, `creditReward: 50` |
| `eco_starter` | `slug: "eco_starter"`, `name: "Eco Starter"`, `description: "Recycle 5 items"`, `iconName: "Sprout"`, `requirementType: "items_recycled"`, `requirementValue: 5`, `creditReward: 100` |
| `green_warrior` | `slug: "green_warrior"`, `name: "Green Warrior"`, `description: "Recycle 25 items"`, `iconName: "TreePine"`, `requirementType: "items_recycled"`, `requirementValue: 25`, `creditReward: 250` |
| `weight_lifter` | `slug: "weight_lifter"`, `name: "Weight Lifter"`, `description: "Recycle 10kg of e-waste"`, `iconName: "Dumbbell"`, `requirementType: "weight_kg"`, `requirementValue: 10`, `creditReward: 200` |
| `streak_3` | `slug: "streak_3"`, `name: "On a Roll"`, `description: "3-day activity streak"`, `iconName: "Flame"`, `requirementType: "streak"`, `requirementValue: 3`, `creditReward: 75` |
| `streak_7` | `slug: "streak_7"`, `name: "Week Warrior"`, `description: "7-day activity streak"`, `iconName: "Zap"`, `requirementType: "streak"`, `requirementValue: 7`, `creditReward: 150` |
| `century` | `slug: "century"`, `name: "Century Club"`, `description: "Recycle 100 items"`, `iconName: "Trophy"`, `requirementType: "items_recycled"`, `requirementValue: 100`, `creditReward: 500` |
| `half_ton` | `slug: "half_ton"`, `name: "Half Ton Hero"`, `description: "Recycle 500kg of e-waste"`, `iconName: "Medal"`, `requirementType: "weight_kg"`, `requirementValue: 500`, `creditReward: 1000` |

---

### 5. **Enable Firebase Storage** (Optional - for AI scan photos)

1. Click **Storage** in the left sidebar
2. Click **Get Started**
3. Choose **Start in test mode**
4. Select the same region as Firestore
5. Click **Done**

---

## 📱 Features Now Working

✅ **Email/Password Authentication**  
✅ **Google OAuth Sign-in**  
✅ **Real-time Profile Sync**  
✅ **Create Pickup Requests** (saved to Firestore)  
✅ **View Your Pickups** (real-time updates)  
✅ **AI Scanner** (TensorFlow.js)  
✅ **Green Credits Tracking**  
✅ **Transaction History**  
✅ **Achievement System**  
✅ **Rewards Catalog**  
✅ **PWA Install**  

---

## 🔮 What You Can Add Next

### 1. **Cloud Functions** (For server-side logic)

Deploy these functions to automate credit awards:

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Auto-award credits when pickup is completed
exports.onPickupCompleted = functions.firestore
  .document('pickups/{pickupId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    
    if (oldData.status !== 'completed' && newData.status === 'completed') {
      const batch = admin.firestore().batch();
      
      // Update user profile
      const profileRef = admin.firestore().doc(`profiles/${newData.donorId}`);
      batch.update(profileRef, {
        greenCredits: admin.firestore.FieldValue.increment(newData.actualCreditsAwarded || 0),
        totalItemsRecycled: admin.firestore.FieldValue.increment(newData.totalItems),
        totalWeightKg: admin.firestore.FieldValue.increment(newData.actualWeightKg || 0),
        co2SavedKg: admin.firestore.FieldValue.increment((newData.actualWeightKg || 0) * 1.5),
      });
      
      // Add transaction
      const txRef = admin.firestore().collection('creditTransactions').doc();
      batch.set(txRef, {
        userId: newData.donorId,
        amount: newData.actualCreditsAwarded || 0,
        type: 'pickup_completed',
        description: `Pickup completed — ${newData.actualWeightKg || 0}kg recycled`,
        referenceId: context.params.pickupId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      await batch.commit();
    }
  });
```

### 2. **Push Notifications**

1. Enable **Cloud Messaging** in Firebase Console
2. Add VAPID keys for web push
3. Request notification permission in the app

### 3. **Collector Dashboard**

Create a separate view for collectors to:
- See pending pickups on a map
- Accept pickup requests
- Update pickup status in real-time
- Navigate to pickup locations

### 4. **Admin Panel**

Add an admin role to:
- Manage users
- View all pickups
- Manage rewards catalog
- Export reports

---

## 💰 Firebase Free Tier Limits

| Service | Free Tier |
|---------|-----------|
| **Authentication** | 10,000 users/month |
| **Firestore** | 50,000 reads/day, 20,000 writes/day, 1GB storage |
| **Storage** | 5GB storage, 1GB download/day |
| **Cloud Functions** | 2 million invocations/month |
| **Hosting** | 10GB storage, 10GB transfer/month |

**Your app can handle ~1,000 active users on the free tier!** 🚀

---

## 🆘 Troubleshooting

### "Permission Denied" Error?
- Check your Firestore security rules
- Make sure user is authenticated

### Data Not Syncing?
- Check browser console for errors
- Verify Firestore collections exist

### Auth Not Working?
- Verify authentication providers are enabled
- Check Firebase config in `src/lib/firebase/config.ts`

---

## 🎉 You're All Set!

Your EcoCollect app is now fully integrated with Firebase! Users can:
1. Sign up/login with email or Google
2. Create pickup requests
3. Track their pickups in real-time
4. Earn Green Credits
5. View their impact stats

**Ready to change the world, one device at a time! 🌍♻️**

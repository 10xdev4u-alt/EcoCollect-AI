import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Webcam from 'react-webcam';
import { 
  MapContainer, TileLayer, Marker, useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Home, ScanLine, PackagePlus, Trophy, User, Recycle, Leaf, 
  Weight, TreePine, Zap, ChevronRight, Clock, Sparkles, 
  ArrowLeft, ArrowRight, Check, Plus, Minus, MapPin, Navigation,
  Loader2, RotateCcw, Camera, X, AlertTriangle,
  Smartphone, Laptop, Battery, Cable, Monitor, Printer, 
  Headphones, Gamepad2, Wifi, UtensilsCrossed, Coffee, Heart,
  Star, Flame, Lock, CheckCircle2,
  Calendar, Gift, Bell, Mail, Lock as LockIcon, Eye, EyeOff,
  Chrome, Github
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider, githubProvider } from '@/lib/firebase/config';
import { 
  createProfile, 
  getProfile, 
  subscribeToProfile,
  createPickup,
  getUserPickups,
  subscribeToUserPickups,
  addPickupItems,
  getUserTransactions,
  subscribeToUserTransactions
} from '@/lib/firebase/services';

import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useEwasteScanner } from '@/hooks/use-ewaste-scanner';
import { ewasteCategories, achievements, rewardsCatalog, badgeLevelConfig } from '@/lib/data/categories';
import { PWAInstallPrompt } from '@/components/pwa/install-prompt';
import type { Profile, PickupRequest, CreditTransaction, UserAchievement } from '@/lib/types/database';

// Icon mapping
const iconMap: Record<string, React.ElementType> = {
  Smartphone, Laptop, Battery, Cable, Monitor, Printer, Headphones, Gamepad2, Wifi, UtensilsCrossed,
  Leaf, TreePine, Dumbbell: Weight, Flame, Zap, Trophy, Medal: Star, Coffee, Heart
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  matched: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  collector_enroute: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  collected: 'bg-eco-500/10 text-eco-400 border-eco-500/20',
  completed: 'bg-eco-500/10 text-eco-400 border-eco-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  arrived: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  inspecting: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const timeSlotLabels: Record<string, string> = {
  morning: '🌅 Morning (8 AM – 12 PM)',
  afternoon: '☀️ Afternoon (12 PM – 5 PM)',
  evening: '🌆 Evening (5 PM – 8 PM)',
};

// Glass Card Component
function GlassCard({ 
  variant = 'default', 
  className = '', 
  children 
}: { 
  variant?: 'default' | 'elevated' | 'interactive' | 'glow';
  className?: string;
  children: React.ReactNode;
}) {
  const variants = {
    default: 'bg-white/[0.03] border-white/[0.06]',
    elevated: 'bg-white/[0.05] border-white/[0.08] shadow-glass-lg',
    interactive: 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] cursor-pointer',
    glow: 'bg-white/[0.04] border-eco-500/20 shadow-glow',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`backdrop-blur-xl border rounded-3xl p-5 transition-all duration-300 ${variants[variant]} ${className}`}
    >
      {children}
    </motion.div>
  );
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  unit,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className="glass-card p-4 flex flex-col gap-3"
    >
      <div className="w-10 h-10 rounded-xl bg-eco-500/10 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5 font-mono">
          {value}
          {unit && <span className="text-sm font-normal text-zinc-500 ml-1">{unit}</span>}
        </p>
      </div>
    </motion.div>
  );
}

// ==================== AUTH PAGES ====================

function AuthPage({ onAuth }: { onAuth: (user: any) => void }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isSignUp) {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(user, { displayName: fullName });
        await createProfile(user.uid, { email, fullName });
        toast.success('Account created successfully!');
        onAuth(user);
      } else {
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        toast.success('Welcome back!');
        onAuth(user);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setIsLoading(true);
    try {
      const prov = provider === 'google' ? googleProvider : githubProvider;
      const { user } = await signInWithPopup(auth, prov);
      const existingProfile = await getProfile(user.uid);
      if (!existingProfile) {
        await createProfile(user.uid, { 
          email: user.email!, 
          fullName: user.displayName || 'Eco Warrior',
          avatarUrl: user.photoURL
        });
      }
      toast.success(`Welcome ${user.displayName || 'Eco Warrior'}!`);
      onAuth(user);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-eco-500/15 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-cyan-500/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '3s' }} />
      </div>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-eco-gradient flex items-center justify-center shadow-glow">
          <Recycle className="w-7 h-7 text-black" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">EcoCollect</h1>
          <p className="text-xs text-zinc-500">Recycle. Earn. Save the Planet.</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="w-full max-w-sm">
        <GlassCard variant="elevated" className="p-6 space-y-5">
          <div className="text-center">
            <h2 className="text-xl font-bold text-white">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
            <p className="text-sm text-zinc-500 mt-1">{isSignUp ? 'Join the green revolution' : 'Sign in to continue recycling'}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => handleOAuth('google')} disabled={isLoading} className="glass-button flex items-center justify-center gap-2 py-2.5">
              <Chrome className="w-4 h-4" /><span className="text-sm">Google</span>
            </button>
            <button onClick={() => handleOAuth('github')} disabled={isLoading} className="glass-button flex items-center justify-center gap-2 py-2.5">
              <Github className="w-4 h-4" /><span className="text-sm">GitHub</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-zinc-600">or continue with email</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3">
            {isSignUp && (
              <div className="relative">
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" required={isSignUp} className="glass-input w-full pl-11" />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2"><User className="w-4 h-4 text-zinc-500" /></div>
              </div>
            )}
            <div className="relative">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required className="glass-input w-full pl-11" />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2"><Mail className="w-4 h-4 text-zinc-500" /></div>
            </div>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required minLength={6} className="glass-input w-full pl-11 pr-11" />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2"><LockIcon className="w-4 h-4 text-zinc-500" /></div>
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2">
                {showPassword ? <EyeOff className="w-4 h-4 text-zinc-500" /> : <Eye className="w-4 h-4 text-zinc-500" />}
              </button>
            </div>
            <button type="submit" disabled={isLoading} className="eco-button w-full flex items-center justify-center gap-2 disabled:opacity-50">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{isSignUp ? 'Create Account' : 'Sign In'}<ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-sm text-zinc-500">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-eco-400 font-medium hover:underline">{isSignUp ? 'Sign In' : 'Sign Up'}</button>
          </p>
        </GlassCard>
      </motion.div>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-xs text-zinc-600 mt-8 text-center">
        By continuing, you agree to our Terms of Service & Privacy Policy
      </motion.p>
    </div>
  );
}

// ==================== DASHBOARD ====================

function Dashboard({ 
  profile, 
  pickups, 
  onNavigate 
}: { 
  profile: Profile; 
  pickups: PickupRequest[];
  onNavigate: (page: string) => void;
}) {
  const badge = badgeLevelConfig[profile.badgeLevel as keyof typeof badgeLevelConfig];
  const levelProgress = ((profile.greenCredits - badge.minCredits) / (badge.maxCredits - badge.minCredits)) * 100;

  return (
    <div className="px-4 pt-6 pb-32 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <p className="text-zinc-500 text-sm">Welcome back</p>
          <h1 className="text-2xl font-bold text-white">{profile.fullName.split(' ')[0]} 👋</h1>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-eco-gradient flex items-center justify-center text-lg">
          {badge.icon}
        </div>
      </motion.div>

      <GlassCard variant="glow" className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-eco-500/10 rounded-full blur-[60px]" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-[50px]" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-eco-400" />
            <span className="text-eco-400 text-xs font-semibold uppercase tracking-wider">Green Credits</span>
          </div>
          <div className="flex items-end gap-2 mb-4">
            <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="text-5xl font-bold text-white font-mono">
              {profile.greenCredits.toLocaleString()}
            </motion.span>
            <span className="text-zinc-500 text-sm mb-1.5">credits</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">{badge.icon} {badge.label}</span>
              {badge.next && <span className="text-xs text-zinc-500">{badge.maxCredits - profile.greenCredits} to {badge.next}</span>}
            </div>
            <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(levelProgress, 100)}%` }} transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }} className="h-full bg-eco-gradient rounded-full" />
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Recycle className="w-5 h-5 text-eco-400" />} label="Items Recycled" value={profile.totalItemsRecycled} delay={0.1} />
        <StatCard icon={<Weight className="w-5 h-5 text-cyan-400" />} label="Weight Saved" value={profile.totalWeightKg.toFixed(1)} unit="kg" delay={0.2} />
        <StatCard icon={<TreePine className="w-5 h-5 text-emerald-400" />} label="CO₂ Prevented" value={profile.co2SavedKg.toFixed(1)} unit="kg" delay={0.3} />
        <StatCard icon={<Zap className="w-5 h-5 text-yellow-400" />} label="Day Streak" value={profile.streakDays} unit="days" delay={0.4} />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => onNavigate('pickup')}>
            <GlassCard variant="interactive" className="p-4 flex flex-col gap-2">
              <div className="w-10 h-10 rounded-xl bg-eco-gradient flex items-center justify-center"><Recycle className="w-5 h-5 text-black" /></div>
              <span className="text-sm font-medium text-white">Schedule Pickup</span>
              <span className="text-xs text-zinc-500">Get your e-waste collected</span>
            </GlassCard>
          </button>
          <button onClick={() => onNavigate('scan')}>
            <GlassCard variant="interactive" className="p-4 flex flex-col gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"><Sparkles className="w-5 h-5 text-white" /></div>
              <span className="text-sm font-medium text-white">AI Scanner</span>
              <span className="text-xs text-zinc-500">Identify & estimate value</span>
            </GlassCard>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Recent Pickups</h2>
          <button className="text-xs text-eco-400 flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></button>
        </div>
        {pickups.length === 0 ? (
          <GlassCard className="flex flex-col items-center py-8 gap-3">
            <div className="w-16 h-16 rounded-full bg-eco-500/10 flex items-center justify-center"><Recycle className="w-8 h-8 text-eco-500/50" /></div>
            <p className="text-zinc-500 text-sm">No pickups yet</p>
            <button onClick={() => onNavigate('pickup')} className="eco-button text-sm px-5 py-2.5">Schedule Your First Pickup</button>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {pickups.slice(0, 5).map((pickup, i) => (
              <motion.div key={pickup.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                <GlassCard variant="interactive" className="flex items-center gap-4 p-4">
                  <div className="w-12 h-12 rounded-xl bg-eco-500/10 flex items-center justify-center shrink-0"><Recycle className="w-6 h-6 text-eco-400" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{pickup.totalItems} item{pickup.totalItems !== 1 ? 's' : ''}</p>
                      <Badge className={`text-[10px] border ${statusColors[pickup.status]}`}>{pickup.status.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {pickup.createdAt ? new Date(pickup.createdAt).toLocaleDateString() : 'Just now'} · {pickup.estimatedWeightKg}kg est.
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-eco-400 font-mono">+{pickup.actualCreditsAwarded || pickup.estimatedCredits}</p>
                    <p className="text-[10px] text-zinc-500">credits</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== AI SCANNER ====================

function ScannerPage() {
  const webcamRef = useRef<Webcam>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const { isModelLoading, isScanning, result, error, loadModel, scanImage, resetScan } = useEwasteScanner();

  useEffect(() => { loadModel(); }, [loadModel]);

  const capture = useCallback(async () => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;
    setCapturedImage(imageSrc);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = async () => { await scanImage(img); };
  }, [scanImage]);

  const retake = () => { setCapturedImage(null); resetScan(); };
  const toggleCamera = () => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');

  return (
    <div className="px-4 pt-6 pb-32">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h1 className="text-xl font-bold text-white">AI Scanner</h1>
        </div>
        <p className="text-sm text-zinc-500">Point your camera at any electronic item to identify it</p>
      </div>

      {isModelLoading && (
        <GlassCard className="p-4 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center"><Loader2 className="w-5 h-5 text-purple-400 animate-spin" /></div>
          <div>
            <p className="text-sm font-medium text-white">Loading AI Model...</p>
            <p className="text-xs text-zinc-500">First time may take a few seconds</p>
          </div>
        </GlassCard>
      )}

      <div className="relative rounded-3xl overflow-hidden border border-white/[0.06] mb-4">
        {!capturedImage ? (
          <>
            <Webcam ref={webcamRef} audio={false} screenshotFormat="image/jpeg" videoConstraints={{ facingMode, width: { ideal: 640 }, height: { ideal: 480 } }} onUserMedia={() => setIsCameraReady(true)} className="w-full aspect-[4/3] object-cover" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-eco-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-eco-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-eco-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-eco-400 rounded-br-lg" />
                <motion.div className="absolute left-0 right-0 h-0.5 bg-eco-gradient" animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
              </div>
            </div>
            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-6">
              <button onClick={toggleCamera} className="w-12 h-12 rounded-full glass flex items-center justify-center"><RotateCcw className="w-5 h-5 text-white" /></button>
              <motion.button whileTap={{ scale: 0.85 }} onClick={capture} disabled={!isCameraReady || isModelLoading} className="w-18 h-18 rounded-full bg-white flex items-center justify-center shadow-lg disabled:opacity-50">
                <div className="w-16 h-16 rounded-full border-4 border-surface flex items-center justify-center"><Camera className="w-7 h-7 text-surface" /></div>
              </motion.button>
              <div className="w-12 h-12" />
            </div>
          </>
        ) : (
          <>
            <img src={capturedImage} alt="Captured" className="w-full aspect-[4/3] object-cover" />
            {isScanning && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}><ScanLine className="w-12 h-12 text-eco-400" /></motion.div>
                  <p className="text-white text-sm font-medium">Analyzing with AI...</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-3">
            {result.isEwaste ? (
              <>
                <GlassCard variant="glow" className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-eco-500/20 flex items-center justify-center shrink-0"><Check className="w-6 h-6 text-eco-400" /></div>
                    <div className="flex-1">
                      <p className="text-xs text-eco-400 uppercase tracking-wider font-semibold">E-Waste Identified ✓</p>
                      <p className="text-lg font-bold text-white mt-1">{result.category}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="h-1.5 flex-1 bg-white/[0.06] rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.round(result.confidence * 100)}%` }} className="h-full bg-eco-gradient rounded-full" />
                        </div>
                        <span className="text-xs font-mono text-eco-400">{Math.round(result.confidence * 100)}%</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">Detected as: {result.label}</p>
                    </div>
                  </div>
                </GlassCard>
                <GlassCard className="p-4 flex items-center gap-3">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">AI Scan Bonus</p>
                    <p className="text-xs text-zinc-500">+5 bonus credits for using the scanner!</p>
                  </div>
                  <span className="text-eco-400 font-mono font-bold">+5</span>
                </GlassCard>
                <div className="flex gap-3">
                  <button onClick={retake} className="flex-1 glass-button"><RotateCcw className="w-4 h-4 mr-2 inline" /> Scan Again</button>
                  <button className="flex-1 eco-button flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Add to Pickup</button>
                </div>
              </>
            ) : (
              <GlassCard className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0"><AlertTriangle className="w-6 h-6 text-yellow-400" /></div>
                  <div>
                    <p className="text-sm font-bold text-white">Not Identified as E-Waste</p>
                    <p className="text-xs text-zinc-400 mt-1">Detected: {result.label} ({Math.round(result.confidence * 100)}%)</p>
                    <p className="text-xs text-zinc-500 mt-2">Try scanning from a different angle, or select the category manually.</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={retake} className="flex-1 glass-button">Try Again</button>
                  <button className="flex-1 eco-button">Select Manually</button>
                </div>
              </GlassCard>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <GlassCard className="p-4 border-red-500/20">
          <div className="flex items-center gap-3"><X className="w-5 h-5 text-red-400" /><p className="text-sm text-red-400">{error}</p></div>
        </GlassCard>
      )}
    </div>
  );
}

// ==================== PICKUP FORM ====================

function PickupForm({ userId, onBack }: { userId: string; onBack: () => void }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pickupId, setPickupId] = useState<string>('');
  const [formData, setFormData] = useState({
    items: [] as { categoryId: string; categoryName: string; quantity: number; condition: string; estimatedWeight: number }[],
    location: { address: '', city: '', state: '', zip: '', lat: 0, lng: 0, instructions: '' },
    schedule: { date: '', timeSlot: 'morning' as 'morning' | 'afternoon' | 'evening' },
  });

  const steps = [
    { id: 1, title: 'Items', subtitle: 'What are you recycling?' },
    { id: 2, title: 'Location', subtitle: 'Where should we pick up?' },
    { id: 3, title: 'Schedule', subtitle: 'When works for you?' },
    { id: 4, title: 'Review', subtitle: 'Confirm your pickup' },
  ];

  const updateFormData = (section: keyof typeof formData, data: any) => {
    setFormData(prev => ({ ...prev, [section]: data }));
  };

  const nextStep = () => setCurrentStep(s => Math.min(s + 1, 4));
  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const totalWeight = formData.items.reduce((s, i) => s + i.estimatedWeight * i.quantity, 0);
      const totalItems = formData.items.reduce((s, i) => s + i.quantity, 0);
      const estimatedCredits = Math.round(totalWeight * 20);

      const newPickupId = await createPickup({
        donorId: userId,
        collectorId: null,
        pickupAddress: formData.location.address,
        pickupCity: formData.location.city,
        pickupState: formData.location.state,
        pickupZip: formData.location.zip,
        pickupLatitude: formData.location.lat,
        pickupLongitude: formData.location.lng,
        pickupInstructions: formData.location.instructions,
        preferredDate: formData.schedule.date,
        preferredTimeSlot: formData.schedule.timeSlot,
        status: 'pending',
        totalItems,
        estimatedWeightKg: totalWeight,
        actualWeightKg: null,
        estimatedCredits,
        actualCreditsAwarded: null,
        aiScanResults: null,
        itemPhotos: [],
        donorRating: null,
        collectorRating: null,
        matchedAt: null,
        collectedAt: null,
        completedAt: null,
      } as any);

      // Add pickup items
      await addPickupItems(newPickupId, formData.items.map(item => ({
        categoryId: item.categoryId,
        description: null,
        quantity: item.quantity,
        condition: item.condition as any,
        estimatedWeightKg: item.estimatedWeight * item.quantity,
        actualWeightKg: null,
        photoUrl: null,
        aiDetectedLabel: null,
        aiConfidence: null,
        creditsEarned: 0,
      })));

      setPickupId(newPickupId);
      toast.success('Pickup request created! 🎉');
      setIsSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create pickup');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }} className="w-24 h-24 rounded-full bg-eco-gradient flex items-center justify-center shadow-glow-xl mb-6">
          <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.5, type: 'spring' }}>
            <Check className="w-12 h-12 text-black" strokeWidth={3} />
          </motion.div>
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-2xl font-bold text-white mb-2">Pickup Scheduled! 🎉</motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-zinc-400 text-sm max-w-xs mb-6">
          We're matching you with a collector nearby. You'll get a notification when someone accepts your request.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <GlassCard className="p-4 mb-6">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Tracking ID</p>
            <div className="flex items-center gap-3">
              <code className="text-xl font-bold font-mono text-eco-400 tracking-widest">{pickupId.slice(0, 8).toUpperCase()}</code>
            </div>
          </GlassCard>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="flex gap-3">
          <button onClick={onBack} className="eco-button flex items-center justify-center gap-2"><Home className="w-4 h-4" /> Dashboard</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-32">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={currentStep > 1 ? prevStep : onBack} className="w-10 h-10 rounded-xl glass flex items-center justify-center"><ArrowLeft className="w-5 h-5 text-white" /></button>
        <div>
          <h1 className="text-xl font-bold text-white">New Pickup</h1>
          <p className="text-sm text-zinc-500">{steps[currentStep - 1].subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-8">
        {steps.map((step) => (
          <div key={step.id} className="flex-1 flex items-center gap-2">
            <div className="flex-1 relative">
              <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div className="h-full bg-eco-gradient rounded-full" initial={{ width: '0%' }} animate={{ width: step.id <= currentStep ? '100%' : '0%' }} transition={{ duration: 0.4, ease: 'easeOut' }} />
              </div>
            </div>
            <motion.div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300 ${step.id < currentStep ? 'bg-eco-500 text-black' : step.id === currentStep ? 'bg-eco-500/20 text-eco-400 border border-eco-500/40' : 'bg-white/[0.04] text-zinc-600 border border-white/[0.06]'}`} animate={step.id === currentStep ? { scale: [1, 1.1, 1] } : {}} transition={{ duration: 0.3 }}>
              {step.id < currentStep ? <Check className="w-3.5 h-3.5" /> : step.id}
            </motion.div>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={currentStep} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
          {currentStep === 1 && <StepSelectItems items={formData.items} onUpdate={(items) => updateFormData('items', items)} onNext={nextStep} />}
          {currentStep === 2 && <StepLocation location={formData.location} onUpdate={(loc) => updateFormData('location', loc)} onNext={nextStep} />}
          {currentStep === 3 && <StepSchedule schedule={formData.schedule} onUpdate={(sched) => updateFormData('schedule', sched)} onNext={nextStep} />}
          {currentStep === 4 && <StepReview formData={formData} onSubmit={handleSubmit} isSubmitting={isSubmitting} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Step Components
function StepSelectItems({ items, onUpdate, onNext }: { items: any[]; onUpdate: (items: any[]) => void; onNext: () => void }) {
  const toggleCategory = (cat: typeof ewasteCategories[0]) => {
    const exists = items.find(i => i.categoryId === cat.id);
    if (exists) {
      onUpdate(items.filter(i => i.categoryId !== cat.id));
    } else {
      onUpdate([...items, { categoryId: cat.id, categoryName: cat.name, quantity: 1, condition: 'non_working', estimatedWeight: cat.avgWeightKg }]);
    }
  };

  const updateItem = (categoryId: string, field: string, value: any) => {
    onUpdate(items.map(i => i.categoryId === categoryId ? { ...i, [field]: value } : i));
  };

  const totalWeight = items.reduce((sum, i) => sum + i.estimatedWeight * i.quantity, 0);
  const totalCredits = items.reduce((sum, i) => {
    const cat = ewasteCategories.find(c => c.id === i.categoryId);
    return sum + (cat?.greenCreditsPerKg || 10) * i.estimatedWeight * i.quantity;
  }, 0);

  return (
    <div className="space-y-4 pb-32">
      <p className="text-zinc-400 text-sm">Select the electronics you want to recycle. Tap to add, tap again to remove.</p>
      <div className="grid grid-cols-2 gap-3">
        {ewasteCategories.map((cat, i) => {
          const isSelected = items.some(item => item.categoryId === cat.id);
          const Icon = iconMap[cat.iconName] || Smartphone;
          return (
            <motion.button key={cat.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} onClick={() => toggleCategory(cat)}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 ${isSelected ? 'bg-eco-500/10 border-eco-500/30 shadow-glow' : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${isSelected ? 'bg-eco-500/20' : 'bg-white/[0.06]'}`}>
                <Icon className={`w-5 h-5 ${isSelected ? 'text-eco-400' : 'text-zinc-400'}`} />
              </div>
              <p className={`text-sm font-medium ${isSelected ? 'text-eco-300' : 'text-white'}`}>{cat.name}</p>
              <p className="text-xs text-zinc-500 mt-0.5">~{cat.greenCreditsPerKg} credits/kg</p>
            </motion.button>
          );
        })}
      </div>

      {items.length > 0 && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
          <h3 className="text-sm font-semibold text-white">Selected Items</h3>
          {items.map(item => (
            <GlassCard key={item.categoryId} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">{item.categoryName}</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateItem(item.categoryId, 'quantity', Math.max(1, item.quantity - 1))} className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center"><Minus className="w-4 h-4 text-zinc-400" /></button>
                  <span className="text-white font-mono font-bold w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateItem(item.categoryId, 'quantity', item.quantity + 1)} className="w-8 h-8 rounded-lg bg-eco-500/20 flex items-center justify-center"><Plus className="w-4 h-4 text-eco-400" /></button>
                </div>
              </div>
              <div className="flex gap-2">
                {['working', 'partially_working', 'non_working', 'damaged'].map(cond => (
                  <button key={cond} onClick={() => updateItem(item.categoryId, 'condition', cond)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${item.condition === cond ? 'bg-white/[0.08] text-eco-400 border border-white/[0.1]' : 'bg-white/[0.02] text-zinc-500 border border-transparent'}`}>
                    {cond.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </GlassCard>
          ))}
        </motion.div>
      )}

      {items.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-28 left-4 right-4 z-40">
          <div className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500">{items.reduce((s, i) => s + i.quantity, 0)} items · {totalWeight.toFixed(1)}kg est.</p>
              <p className="text-lg font-bold text-eco-400 font-mono">~{Math.round(totalCredits)} credits</p>
            </div>
            <button onClick={onNext} className="eco-button flex items-center gap-2">Next <ArrowRight className="w-4 h-4" /></button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StepLocation({ location, onUpdate, onNext }: { location: any; onUpdate: (loc: any) => void; onNext: () => void }) {
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = useCallback(() => {
    setIsLocating(true);
    setError(null);
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          onUpdate({
            address: data.display_name?.split(',').slice(0, 3).join(',') || '',
            city: data.address?.city || data.address?.town || '',
            state: data.address?.state || '',
            zip: data.address?.postcode || '',
            lat: latitude,
            lng: longitude,
            instructions: location.instructions,
          });
        } catch {
          onUpdate({ ...location, lat: latitude, lng: longitude, address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` });
        }
        setIsLocating(false);
      },
      () => { setError('Unable to get your location. Please enter manually.'); setIsLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [location, onUpdate]);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      onUpdate({
        address: data.display_name?.split(',').slice(0, 3).join(',') || '',
        city: data.address?.city || data.address?.town || '',
        state: data.address?.state || '',
        zip: data.address?.postcode || '',
        lat, lng,
        instructions: location.instructions,
      });
    } catch {
      onUpdate({ ...location, lat, lng });
    }
  }, [location, onUpdate]);

  const isValid = location.lat !== 0 && location.address.length > 0;

  return (
    <div className="space-y-4 pb-32">
      <p className="text-zinc-400 text-sm">Set your pickup location. We'll send a collector to this address.</p>
      <button onClick={getCurrentLocation} disabled={isLocating} className="w-full glass-button flex items-center justify-center gap-2">
        {isLocating ? <Loader2 className="w-5 h-5 animate-spin text-eco-400" /> : <Navigation className="w-5 h-5 text-eco-400" />}
        <span>{isLocating ? 'Getting location...' : 'Use Current Location'}</span>
      </button>
      {error && <p className="text-red-400 text-sm bg-red-500/10 rounded-xl p-3">{error}</p>}

      <div className="rounded-2xl overflow-hidden border border-white/[0.06]">
        <MapContainer center={location.lat ? [location.lat, location.lng] : [28.6139, 77.209]} zoom={location.lat ? 16 : 12} scrollWheelZoom={true}
          style={{ height: '260px', width: '100%', borderRadius: '1rem' }} zoomControl={false} attributionControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://carto.com/">CARTO</a>' />
          <MapClickHandler onMapClick={handleMapClick} />
          {location.lat && <Marker position={[location.lat, location.lng]} icon={pickupIcon} />}
        </MapContainer>
      </div>

      {location.address && (
        <GlassCard className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-eco-500/10 flex items-center justify-center shrink-0 mt-0.5"><MapPin className="w-5 h-5 text-eco-400" /></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{location.address}</p>
              {location.city && <p className="text-xs text-zinc-500 mt-0.5">{location.city}{location.state ? `, ${location.state}` : ''}{location.zip ? ` ${location.zip}` : ''}</p>}
            </div>
          </div>
        </GlassCard>
      )}

      <div>
        <label className="text-sm text-zinc-400 mb-2 block">Pickup Instructions (optional)</label>
        <textarea value={location.instructions} onChange={e => onUpdate({ ...location, instructions: e.target.value })} placeholder="e.g., Ring doorbell, items are in the garage..." className="glass-input w-full h-24 resize-none" />
      </div>

      {isValid && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-28 left-4 right-4 z-40">
          <button onClick={onNext} className="eco-button w-full flex items-center justify-center gap-2">Continue to Schedule <ArrowRight className="w-4 h-4" /></button>
        </motion.div>
      )}
    </div>
  );
}

function StepSchedule({ schedule, onUpdate, onNext }: { schedule: any; onUpdate: (sched: any) => void; onNext: () => void }) {
  const today = new Date().toISOString().split('T')[0];
  return (
    <div className="space-y-4 pb-32">
      <p className="text-zinc-400 text-sm">Choose a date and time that works for you.</p>
      <div>
        <label className="text-sm text-zinc-400 mb-2 block">Preferred Date</label>
        <input type="date" min={today} value={schedule.date} onChange={e => onUpdate({ ...schedule, date: e.target.value })} className="glass-input w-full" />
      </div>
      <div>
        <label className="text-sm text-zinc-400 mb-2 block">Time Slot</label>
        <div className="space-y-2">
          {(['morning', 'afternoon', 'evening'] as const).map(slot => (
            <button key={slot} onClick={() => onUpdate({ ...schedule, timeSlot: slot })}
              className={`w-full p-4 rounded-2xl border text-left transition-all ${schedule.timeSlot === slot ? 'bg-eco-500/10 border-eco-500/30' : 'bg-white/[0.03] border-white/[0.06]'}`}>
              <p className={`text-sm font-medium ${schedule.timeSlot === slot ? 'text-eco-300' : 'text-white'}`}>{timeSlotLabels[slot]}</p>
            </button>
          ))}
        </div>
      </div>
      {schedule.date && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-28 left-4 right-4 z-40">
          <button onClick={onNext} className="eco-button w-full flex items-center justify-center gap-2">Review Pickup <ArrowRight className="w-4 h-4" /></button>
        </motion.div>
      )}
    </div>
  );
}

function StepReview({ formData, onSubmit, isSubmitting }: { formData: any; onSubmit: () => void; isSubmitting: boolean }) {
  const totalWeight = formData.items.reduce((s: number, i: any) => s + i.estimatedWeight * i.quantity, 0);
  const totalItems = formData.items.reduce((s: number, i: any) => s + i.quantity, 0);
  const estimatedCredits = Math.round(totalWeight * 20);

  return (
    <div className="space-y-4 pb-32">
      <p className="text-zinc-400 text-sm">Review your pickup details before submitting.</p>
      <GlassCard className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-white">
          <PackagePlus className="w-4 h-4 text-eco-400" />
          <span className="text-sm font-semibold">Items ({totalItems})</span>
        </div>
        {formData.items.map((item: any) => (
          <div key={item.categoryId} className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-0">
            <div>
              <p className="text-sm text-white">{item.categoryName}</p>
              <p className="text-xs text-zinc-500 capitalize">{item.condition.replace('_', ' ')} · {item.estimatedWeight}kg each</p>
            </div>
            <span className="text-sm font-mono text-zinc-300">×{item.quantity}</span>
          </div>
        ))}
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 text-eco-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">Pickup Location</p>
            <p className="text-xs text-zinc-400 mt-0.5">{formData.location.address}</p>
            {formData.location.instructions && <p className="text-xs text-zinc-500 mt-1 italic">"{formData.location.instructions}"</p>}
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-eco-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">{new Date(formData.schedule.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{timeSlotLabels[formData.schedule.timeSlot]}</p>
          </div>
        </div>
      </GlassCard>

      <GlassCard variant="glow" className="p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-eco-500/10 rounded-full blur-[40px]" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Estimated Reward</p>
            <p className="text-3xl font-bold text-white font-mono mt-1">+{estimatedCredits}</p>
            <p className="text-xs text-eco-400 mt-0.5">Green Credits</p>
          </div>
          <div className="text-right space-y-1">
            <div className="flex items-center gap-1 text-xs text-zinc-400"><Leaf className="w-3 h-3 text-eco-500" />~{(totalWeight * 1.5).toFixed(1)}kg CO₂ saved</div>
            <div className="flex items-center gap-1 text-xs text-zinc-400"><CheckCircle2 className="w-3 h-3 text-cyan-400" />Certified recycling</div>
          </div>
        </div>
      </GlassCard>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-28 left-4 right-4 z-40">
        <button onClick={onSubmit} disabled={isSubmitting} className="eco-button w-full flex items-center justify-center gap-2 py-4 disabled:opacity-50">
          {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating Pickup...</> : <><CheckCircle2 className="w-5 h-5" /> Confirm & Request Pickup</>}
        </button>
      </motion.div>
    </div>
  );
}

// ==================== REWARDS PAGE ====================

function RewardsPage({ profile }: { profile: Profile }) {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const txs = await getUserTransactions(profile.id);
      setTransactions(txs);
      setLoading(false);
    };
    loadData();

    // Subscribe to real-time updates
    const unsubTx = subscribeToUserTransactions(profile.id, setTransactions);
    
    return () => {
      unsubTx();
    };
  }, [profile.id]);

  const userAchievements: UserAchievement[] = [
    { ...achievements[0], unlockedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() },
    { ...achievements[1], unlockedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
    { ...achievements[3], unlockedAt: null },
    { ...achievements[4], unlockedAt: null },
  ];

  return (
    <div className="px-4 pt-6 pb-32 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Rewards</h1>
        <p className="text-sm text-zinc-500">Earn, unlock, and redeem your Green Credits</p>
      </div>

      <GlassCard variant="glow" className="p-5 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-eco-500/10 rounded-full blur-[60px]" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-xs text-eco-400 uppercase tracking-wider font-semibold">Available Balance</p>
            <p className="text-4xl font-bold text-white font-mono mt-1">{profile.greenCredits.toLocaleString()}</p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-eco-gradient flex items-center justify-center shadow-glow">
            <Sparkles className="w-8 h-8 text-black" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-zinc-400">
          <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" />{profile.streakDays}-day streak</span>
          <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />Level: {profile.badgeLevel}</span>
        </div>
      </GlassCard>

      <Tabs defaultValue="rewards" className="space-y-4">
        <TabsList className="grid grid-cols-3 bg-white/[0.03] rounded-2xl p-1">
          <TabsTrigger value="rewards" className="rounded-xl data-[state=active]:bg-eco-500/20 data-[state=active]:text-eco-400"><Gift className="w-4 h-4 mr-1.5" />Redeem</TabsTrigger>
          <TabsTrigger value="achievements" className="rounded-xl data-[state=active]:bg-eco-500/20 data-[state=active]:text-eco-400"><Trophy className="w-4 h-4 mr-1.5" />Badges</TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl data-[state=active]:bg-eco-500/20 data-[state=active]:text-eco-400"><Star className="w-4 h-4 mr-1.5" />History</TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="space-y-3">
          {rewardsCatalog.map((reward, i) => (
            <motion.div key={reward.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <GlassCard variant="interactive" className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                  {reward.icon === 'TreePine' && <TreePine className={`w-6 h-6 ${reward.color}`} />}
                  {reward.icon === 'Coffee' && <Coffee className={`w-6 h-6 ${reward.color}`} />}
                  {reward.icon === 'Heart' && <Heart className={`w-6 h-6 ${reward.color}`} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{reward.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{reward.description}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">Partner: {reward.partner}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-eco-400 font-mono">{reward.credits}</p>
                  <button disabled={profile.greenCredits < reward.credits} className={`mt-1 text-xs px-3 py-1 rounded-lg font-medium transition-all ${profile.greenCredits >= reward.credits ? 'bg-eco-500/20 text-eco-400 hover:bg-eco-500/30' : 'bg-white/[0.04] text-zinc-600'}`}>
                    {profile.greenCredits >= reward.credits ? 'Redeem' : 'Locked'}
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </TabsContent>

        <TabsContent value="achievements" className="space-y-3">
          {userAchievements.map((ach, i) => {
            const isUnlocked = ach.unlockedAt !== null;
            return (
              <motion.div key={ach.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <GlassCard className={`p-4 flex items-center gap-4 ${isUnlocked ? '' : 'opacity-50'}`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isUnlocked ? 'bg-eco-gradient shadow-glow' : 'bg-white/[0.04]'}`}>
                    {isUnlocked ? <Trophy className="w-6 h-6 text-black" /> : <Lock className="w-5 h-5 text-zinc-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{ach.name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{ach.description}</p>
                    {isUnlocked && <p className="text-[10px] text-eco-400 mt-1 flex items-center gap-1"><Check className="w-3 h-3" />Unlocked {new Date(ach.unlockedAt!).toLocaleDateString()}</p>}
                  </div>
                  <div className="text-right shrink-0"><span className="text-xs font-mono text-eco-400">+{ach.creditReward}</span></div>
                </GlassCard>
              </motion.div>
            );
          })}
        </TabsContent>

        <TabsContent value="history" className="space-y-2">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="glass-card h-16 shimmer" />)}
            </div>
          ) : (
            transactions.map((tx, i) => (
              <motion.div key={tx.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 py-3 border-b border-white/[0.04] last:border-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.amount > 0 ? 'bg-eco-500/10 text-eco-400' : 'bg-red-500/10 text-red-400'}`}>{tx.amount > 0 ? '+' : '−'}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{tx.description}</p>
                  <p className="text-xs text-zinc-500">{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : 'Just now'}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-mono font-bold ${tx.amount > 0 ? 'text-eco-400' : 'text-red-400'}`}>{tx.amount > 0 ? '+' : ''}{tx.amount}</p>
                </div>
              </motion.div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== PROFILE PAGE ====================

function ProfilePage({ profile, onSignOut }: { profile: Profile; onSignOut: () => void }) {
  const badge = badgeLevelConfig[profile.badgeLevel as keyof typeof badgeLevelConfig];

  return (
    <div className="px-4 pt-6 pb-32 space-y-6">
      <div className="text-center">
        <div className="w-24 h-24 rounded-full bg-eco-gradient mx-auto flex items-center justify-center text-4xl shadow-glow mb-4">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt={profile.fullName} className="w-full h-full rounded-full object-cover" /> : profile.fullName[0]}
        </div>
        <h1 className="text-xl font-bold text-white">{profile.fullName}</h1>
        <p className="text-sm text-zinc-500">{profile.email}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Badge className="eco-badge">{badge.icon} {badge.label}</Badge>
          <Badge className="bg-white/[0.06] text-zinc-400 border-white/[0.08]">{profile.role}</Badge>
        </div>
      </div>

      <GlassCard className="p-4">
        <h3 className="text-sm font-semibold text-white mb-4">Your Impact</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-eco-400 font-mono">{profile.totalItemsRecycled}</p>
            <p className="text-xs text-zinc-500">Items</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-cyan-400 font-mono">{profile.totalWeightKg}</p>
            <p className="text-xs text-zinc-500">kg</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-400 font-mono">{profile.co2SavedKg}</p>
            <p className="text-xs text-zinc-500">CO₂ kg</p>
          </div>
        </div>
      </GlassCard>

      <div className="space-y-2">
        <button className="w-full glass-button flex items-center justify-between">
          <span className="flex items-center gap-2"><User className="w-4 h-4 text-eco-400" />Edit Profile</span>
          <ChevronRight className="w-4 h-4 text-zinc-600" />
        </button>
        <button className="w-full glass-button flex items-center justify-between">
          <span className="flex items-center gap-2"><Bell className="w-4 h-4 text-eco-400" />Notifications</span>
          <ChevronRight className="w-4 h-4 text-zinc-600" />
        </button>
        <button className="w-full glass-button flex items-center justify-between">
          <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-eco-400" />Saved Addresses</span>
          <ChevronRight className="w-4 h-4 text-zinc-600" />
        </button>
      </div>

      <button onClick={onSignOut} className="w-full py-3 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 font-medium hover:bg-red-500/20 transition-colors">
        Sign Out
      </button>
    </div>
  );
}

// ==================== BOTTOM NAV ====================

function BottomNav({ currentPage, onNavigate }: { currentPage: string; onNavigate: (page: string) => void }) {
  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Home' },
    { id: 'scan', icon: ScanLine, label: 'Scan' },
    { id: 'pickup', icon: PackagePlus, label: 'Pickup', isPrimary: true },
    { id: 'rewards', icon: Trophy, label: 'Rewards' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="mx-3 mb-3">
        <div className="flex items-center justify-around bg-surface-card/80 backdrop-blur-2xl border border-white/[0.06] rounded-3xl px-2 py-2 shadow-glass-lg">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            const Icon = item.icon;
            if (item.isPrimary) {
              return (
                <button key={item.id} onClick={() => onNavigate('pickup')} className="relative -mt-6">
                  <motion.div whileTap={{ scale: 0.9 }} className="w-14 h-14 rounded-2xl bg-eco-gradient flex items-center justify-center shadow-glow active:shadow-glow-lg transition-shadow">
                    <Icon className="w-6 h-6 text-black" strokeWidth={2.5} />
                  </motion.div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-2 bg-eco-500/40 rounded-full blur-md" />
                </button>
              );
            }
            return (
              <button key={item.id} onClick={() => onNavigate(item.id)} className="flex flex-col items-center gap-0.5 py-1 px-3">
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-colors duration-200 ${isActive ? 'text-eco-400' : 'text-zinc-500'}`} strokeWidth={isActive ? 2.5 : 1.5} />
                  {isActive && <motion.div layoutId="nav-indicator" className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-eco-400" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
                </div>
                <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-eco-400' : 'text-zinc-600'}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

// ==================== MAIN APP ====================

// Leaflet icon fix
const pickupIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64," + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="32" height="48"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#22C55E"/><stop offset="100%" style="stop-color:#06B6D4"/></linearGradient></defs><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="url(#g)"/><circle cx="12" cy="12" r="5" fill="white"/></svg>`),
  iconSize: [32, 48],
  iconAnchor: [16, 48],
});

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pickups, setPickups] = useState<PickupRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Get or create profile
        let userProfile = await getProfile(firebaseUser.uid);
        if (!userProfile) {
          userProfile = await createProfile(firebaseUser.uid, {
            email: firebaseUser.email!,
            fullName: firebaseUser.displayName || 'Eco Warrior',
            avatarUrl: firebaseUser.photoURL,
          });
        }
        setProfile(userProfile);
        
        // Get user's pickups
        const userPickups = await getUserPickups(firebaseUser.uid);
        setPickups(userPickups);
        
        // Subscribe to real-time updates
        subscribeToProfile(firebaseUser.uid, setProfile);
        subscribeToUserPickups(firebaseUser.uid, setPickups);
      } else {
        setUser(null);
        setProfile(null);
        setPickups([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    toast.success('Signed out successfully');
  };

  const renderPage = () => {
    if (!user) return <AuthPage onAuth={setUser} />;
    if (!profile) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-eco-400" /></div>;

    switch (currentPage) {
      case 'dashboard': return <Dashboard profile={profile} pickups={pickups} onNavigate={setCurrentPage} />;
      case 'scan': return <ScannerPage />;
      case 'pickup': return <PickupForm userId={user.uid} onBack={() => setCurrentPage('dashboard')} />;
      case 'rewards': return <RewardsPage profile={profile} />;
      case 'profile': return <ProfilePage profile={profile} onSignOut={handleSignOut} />;
      default: return <Dashboard profile={profile} pickups={pickups} onNavigate={setCurrentPage} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-eco-gradient flex items-center justify-center shadow-glow">
            <Recycle className="w-8 h-8 text-black animate-pulse" />
          </div>
          <p className="text-zinc-500 text-sm">Loading EcoCollect...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-foreground">
      <Toaster position="top-center" toastOptions={{
        style: {
          background: 'rgba(20,20,22,0.9)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#f4f4f5',
        },
      }} />
      
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-eco-500/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px]" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={currentPage} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
          {renderPage()}
        </motion.div>
      </AnimatePresence>

      {user && currentPage !== 'pickup' && <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />}
      {user && <PWAInstallPrompt />}
    </div>
  );
}

export default App;

import { useState, useRef, useCallback, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';

// Map MobileNet labels to our e-waste categories
const EWASTE_LABEL_MAP: Record<string, { category: string; slug: string }> = {
  // Smartphones & Tablets
  cellular_telephone: { category: 'Smartphones & Tablets', slug: 'smartphones' },
  cell_phone: { category: 'Smartphones & Tablets', slug: 'smartphones' },
  smartphone: { category: 'Smartphones & Tablets', slug: 'smartphones' },
  iPod: { category: 'Smartphones & Tablets', slug: 'smartphones' },
  tablet: { category: 'Smartphones & Tablets', slug: 'smartphones' },

  // Laptops & Computers
  laptop: { category: 'Laptops & Computers', slug: 'laptops' },
  notebook: { category: 'Laptops & Computers', slug: 'laptops' },
  desktop_computer: { category: 'Laptops & Computers', slug: 'laptops' },
  monitor: { category: 'Laptops & Computers', slug: 'laptops' },
  screen: { category: 'Laptops & Computers', slug: 'laptops' },
  keyboard: { category: 'Laptops & Computers', slug: 'laptops' },
  mouse: { category: 'Laptops & Computers', slug: 'laptops' },
  computer_keyboard: { category: 'Laptops & Computers', slug: 'laptops' },

  // Displays
  television: { category: 'TVs & Displays', slug: 'displays' },
  TV: { category: 'TVs & Displays', slug: 'displays' },
  digital_clock: { category: 'TVs & Displays', slug: 'displays' },

  // Audio & Wearables
  headphone: { category: 'Audio & Wearables', slug: 'audio' },
  earphone: { category: 'Audio & Wearables', slug: 'audio' },
  speaker: { category: 'Audio & Wearables', slug: 'audio' },
  loudspeaker: { category: 'Audio & Wearables', slug: 'audio' },
  digital_watch: { category: 'Audio & Wearables', slug: 'audio' },

  // Gaming
  joystick: { category: 'Gaming Consoles', slug: 'gaming' },
  remote_control: { category: 'Gaming Consoles', slug: 'gaming' },

  // Printers
  printer: { category: 'Printers & Scanners', slug: 'printers' },

  // Networking
  modem: { category: 'Networking Equipment', slug: 'networking' },
  router: { category: 'Networking Equipment', slug: 'networking' },

  // Kitchen
  microwave: { category: 'Kitchen Appliances', slug: 'kitchen' },
  toaster: { category: 'Kitchen Appliances', slug: 'kitchen' },
  coffee_maker: { category: 'Kitchen Appliances', slug: 'kitchen' },
  electric_fan: { category: 'Kitchen Appliances', slug: 'kitchen' },
  iron: { category: 'Kitchen Appliances', slug: 'kitchen' },
  vacuum: { category: 'Kitchen Appliances', slug: 'kitchen' },
  washer: { category: 'Kitchen Appliances', slug: 'kitchen' },
  refrigerator: { category: 'Kitchen Appliances', slug: 'kitchen' },

  // Cables
  power_cord: { category: 'Cables & Chargers', slug: 'cables' },
  plug: { category: 'Cables & Chargers', slug: 'cables' },
  adapter: { category: 'Cables & Chargers', slug: 'cables' },

  // Batteries
  battery: { category: 'Batteries', slug: 'batteries' },
};

export interface ScanResult {
  label: string;
  confidence: number;
  isEwaste: boolean;
  category: string | null;
  categorySlug: string | null;
  allPredictions: Array<{
    className: string;
    probability: number;
  }>;
}

export function useEwasteScanner() {
  const [model, setModel] = useState<mobilenet.MobileNet | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const modelRef = useRef<mobilenet.MobileNet | null>(null);

  // Load MobileNet model
  const loadModel = useCallback(async () => {
    if (modelRef.current) return modelRef.current;

    setIsModelLoading(true);
    setError(null);

    try {
      await tf.ready();
      // Use version 2, alpha 1.0 for best accuracy
      const loadedModel = await mobilenet.load({
        version: 2,
        alpha: 1.0,
      });
      modelRef.current = loadedModel;
      setModel(loadedModel);
      return loadedModel;
    } catch (err) {
      setError('Failed to load AI model. Please check your connection.');
      console.error('Model loading error:', err);
      return null;
    } finally {
      setIsModelLoading(false);
    }
  }, []);

  // Classify an image element
  const scanImage = useCallback(
    async (imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) => {
      setIsScanning(true);
      setError(null);

      try {
        let activeModel = modelRef.current;
        if (!activeModel) {
          activeModel = await loadModel();
          if (!activeModel) throw new Error('Model not available');
        }

        const predictions = await activeModel.classify(imageElement, 5);

        // Find best e-waste match
        let bestMatch: ScanResult = {
          label: predictions[0]?.className || 'Unknown',
          confidence: predictions[0]?.probability || 0,
          isEwaste: false,
          category: null,
          categorySlug: null,
          allPredictions: predictions,
        };

        for (const pred of predictions) {
          // Check each word in the prediction against our map
          const words = pred.className.toLowerCase().replace(/[,_]/g, ' ').split(' ');

          for (const word of words) {
            for (const [key, value] of Object.entries(EWASTE_LABEL_MAP)) {
              if (
                word.includes(key.toLowerCase()) ||
                key.toLowerCase().includes(word)
              ) {
                if (pred.probability > 0.1) {
                  // 10% threshold
                  bestMatch = {
                    label: pred.className,
                    confidence: pred.probability,
                    isEwaste: true,
                    category: value.category,
                    categorySlug: value.slug,
                    allPredictions: predictions,
                  };
                  setResult(bestMatch);
                  setIsScanning(false);
                  return bestMatch;
                }
              }
            }
          }
        }

        // No e-waste match found
        setResult(bestMatch);
        return bestMatch;
      } catch (err) {
        setError('Scanning failed. Please try again.');
        console.error('Scan error:', err);
        return null;
      } finally {
        setIsScanning(false);
      }
    },
    [loadModel]
  );

  // Reset scanner state
  const resetScan = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      // Dispose model on unmount to free memory
      if (modelRef.current) {
        // MobileNet doesn't have a dispose method, but TF tensors will be cleaned up
        tf.disposeVariables();
      }
    };
  }, []);

  return {
    model,
    isModelLoading,
    isScanning,
    result,
    error,
    loadModel,
    scanImage,
    resetScan,
  };
}

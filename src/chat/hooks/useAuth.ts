import { useEffect, useState, useCallback } from "react";
import { signInAnonymously, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../../firebase.config";

const DISPLAY_NAME_KEY = "@fluffy/displayName";
const PHOTO_URL_KEY = "@fluffy/photoURL";
const UID_KEY = "@fluffy/uid";

export interface AuthState {
  uid: string | null;
  displayName: string | null;
  photoURL: string | null;
  loading: boolean;
  setDisplayName: (name: string) => Promise<void>;
  setPhotoURL: (url: string) => Promise<void>;
  updateProfile: (name: string, photoURL?: string) => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayNameState] = useState<string | null>(null);
  const [photoURL, setPhotoURLState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      // 1. Check for cached display name & photo URL
      const cachedName = await AsyncStorage.getItem(DISPLAY_NAME_KEY);
      const cachedPhoto = await AsyncStorage.getItem(PHOTO_URL_KEY);
      if (mounted && cachedName) setDisplayNameState(cachedName);
      if (mounted && cachedPhoto) setPhotoURLState(cachedPhoto);

      // 2. Sign in anonymously
      try {
        const cred = await signInAnonymously(auth);
        if (!mounted) return;
        setUser(cred.user);

        await AsyncStorage.setItem(UID_KEY, cred.user.uid);

        // Fetch display name & photo URL from Firestore if not cached
        if (!cachedName || !cachedPhoto) {
          try {
            const snap = await getDoc(doc(db, "users", cred.user.uid));
            if (snap.exists() && mounted) {
              const data = snap.data();
              if (data.displayName && !cachedName) {
                setDisplayNameState(data.displayName);
                await AsyncStorage.setItem(DISPLAY_NAME_KEY, data.displayName);
              }
              if (data.photoURL && !cachedPhoto) {
                setPhotoURLState(data.photoURL);
                await AsyncStorage.setItem(PHOTO_URL_KEY, data.photoURL);
              }
            }
          } catch (_) {}
        }
      } catch (e) {
        console.error("Anonymous sign-in failed:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initialize();
    return () => { mounted = false; };
  }, []);

  const setDisplayName = useCallback(
    async (name: string) => {
      const trimmed = name.trim().slice(0, 24);
      if (!trimmed || !user) return;
      setDisplayNameState(trimmed);
      await AsyncStorage.setItem(DISPLAY_NAME_KEY, trimmed);
      try {
        await setDoc(doc(db, "users", user.uid), { displayName: trimmed }, { merge: true });
      } catch (_) {}
    },
    [user],
  );

  const setPhotoURL = useCallback(
    async (url: string) => {
      if (!user) return;
      setPhotoURLState(url);
      await AsyncStorage.setItem(PHOTO_URL_KEY, url);
      try {
        await setDoc(doc(db, "users", user.uid), { photoURL: url }, { merge: true });
      } catch (_) {}
    },
    [user]
  );

  const updateProfile = useCallback(
    async (name: string, newPhotoURL?: string) => {
      const trimmed = name.trim().slice(0, 24);
      if (!trimmed || !user) return;
      setDisplayNameState(trimmed);
      await AsyncStorage.setItem(DISPLAY_NAME_KEY, trimmed);
      if (newPhotoURL !== undefined) {
        setPhotoURLState(newPhotoURL);
        await AsyncStorage.setItem(PHOTO_URL_KEY, newPhotoURL);
      }
      try {
        await setDoc(
          doc(db, "users", user.uid),
          {
            displayName: trimmed,
            ...(newPhotoURL !== undefined ? { photoURL: newPhotoURL } : {}),
          },
          { merge: true }
        );
      } catch (_) {}
    },
    [user]
  );

  return {
    uid: user?.uid ?? null,
    displayName,
    photoURL,
    loading,
    setDisplayName,
    setPhotoURL,
    updateProfile,
  };
}

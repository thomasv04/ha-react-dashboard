import { useState, useCallback } from 'react';

interface Profile {
  id: string;
  label: string;
  created_at: string;
  updated_at: string;
}

interface ProfileWithData extends Profile {
  data: unknown;
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadProfiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/profiles');
      const data = await res.json();
      setProfiles(data);
    } catch (err) {
      console.error('Error loading profiles:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveProfile = useCallback(async (label: string, data: unknown): Promise<{ id: string; label: string }> => {
    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, data }),
    });
    return res.json();
  }, []);

  const loadProfile = useCallback(async (id: string): Promise<ProfileWithData> => {
    const res = await fetch(`/api/profiles/${id}`);
    return res.json();
  }, []);

  const updateProfile = useCallback(async (id: string, label?: string, data?: unknown): Promise<void> => {
    await fetch(`/api/profiles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, data }),
    });
  }, []);

  const deleteProfile = useCallback(async (id: string) => {
    await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
    setProfiles(prev => prev.filter(p => p.id !== id));
  }, []);

  return { profiles, isLoading, loadProfiles, saveProfile, loadProfile, updateProfile, deleteProfile };
}

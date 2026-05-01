const PROFILE_COMPLETED_KEY = 'profile_completed';

export function setProfileCompleted(userId: string): void {
  try {
    localStorage.setItem(`${PROFILE_COMPLETED_KEY}_${userId}`, 'true');
  } catch {}
}

export function hasProfileCompleted(userId: string): boolean {
  try {
    return !!localStorage.getItem(`${PROFILE_COMPLETED_KEY}_${userId}`);
  } catch {
    return false;
  }
}

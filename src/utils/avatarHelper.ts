export const normalizeAvatarUrl = (avatarUrl: string | null | undefined): string | null => {
    if (!avatarUrl || avatarUrl.trim() === '') {
        return null;
    }
    return avatarUrl;
};

export const getAvatarDisplay = (avatarUrl: string | null | undefined): string => {
    const normalized = normalizeAvatarUrl(avatarUrl);
    return normalized || '/img/default-profile.jpeg';
};

export const addCacheBuster = (avatarUrl: string | null | undefined, timestamp?: number): string | null => {
    const normalized = normalizeAvatarUrl(avatarUrl);
    if (!normalized) return null;
    
    const ts = timestamp || Date.now();
    if (normalized.includes('?')) {
        return `${normalized}&v=${ts}`;
    }
    return `${normalized}?v=${ts}`;
};

export const DEFAULT_AVATAR = '/img/default-profile.jpeg';
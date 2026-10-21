import { useEffect, useState } from 'react';
import { Camera, HardDrive, Loader2 } from 'lucide-react';
import { googleDriveService } from '@/services/googleDrive.service';
import { cn } from '@/lib/utils';

/** Cache de blob URLs por arquivo do Drive (evita baixar a mesma foto várias vezes na sessão). */
const driveBlobCache = new Map<string, Promise<string>>();

export function resolveAssetPhotoUrl(churchId: string | null | undefined, photoUrl: string): Promise<string> {
    if (!googleDriveService.isDriveReceipt(photoUrl)) return Promise.resolve(photoUrl);
    if (!churchId) return Promise.reject(new Error('Igreja não identificada.'));
    const key = `${churchId}:${photoUrl}`;
    let pending = driveBlobCache.get(key);
    if (!pending) {
        pending = googleDriveService.createPreviewUrl(churchId, photoUrl).then((p) => p.url);
        pending.catch(() => driveBlobCache.delete(key));
        driveBlobCache.set(key, pending);
    }
    return pending;
}

interface AssetPhotoProps {
    churchId: string | null | undefined;
    photoUrl?: string | null;
    alt: string;
    className?: string;
    iconClassName?: string;
    emptyLabel?: string;
}

export function AssetPhoto({ churchId, photoUrl, alt, className, iconClassName, emptyLabel }: AssetPhotoProps) {
    const [src, setSrc] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let active = true;
        setSrc(null);
        setFailed(false);
        if (!photoUrl) return;
        setLoading(true);
        resolveAssetPhotoUrl(churchId, photoUrl)
            .then((url) => active && setSrc(url))
            .catch(() => active && setFailed(true))
            .finally(() => active && setLoading(false));
        return () => {
            active = false;
        };
    }, [churchId, photoUrl]);

    if (!photoUrl) {
        return (
            <div className={cn('flex flex-col items-center justify-center gap-1 text-muted-foreground/60', className)}>
                <Camera className={cn('w-5 h-5', iconClassName)} />
                {emptyLabel && <span className="text-xs font-medium">{emptyLabel}</span>}
            </div>
        );
    }
    if (loading) {
        return (
            <div className={cn('flex items-center justify-center', className)}>
                <Loader2 className={cn('w-5 h-5 animate-spin text-primary', iconClassName)} />
            </div>
        );
    }
    if (failed || !src) {
        return (
            <div
                className={cn('flex flex-col items-center justify-center gap-1 text-cyan-600', className)}
                title="Não foi possível carregar a foto do Google Drive"
            >
                <HardDrive className={cn('w-5 h-5', iconClassName)} />
            </div>
        );
    }
    return <img src={src} alt={alt} loading="lazy" className={cn('object-cover', className)} />;
}

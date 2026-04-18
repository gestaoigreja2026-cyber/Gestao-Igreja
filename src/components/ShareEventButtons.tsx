import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
    } catch (e) {
        return dateStr || '';
    }
};

interface ShareEventButtonsProps {
    title: string;
    date: string;
    time: string;
    location?: string;
    description?: string;
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    iconOnly?: boolean;
    className?: string;
}

export function ShareEventButtons({ title, date, time, location = '', description = '', variant = 'outline', size = 'sm', iconOnly = false, className = '' }: ShareEventButtonsProps) {
    const text = `${title} — ${formatDate(date)} às ${time}${location ? ` | ${location}` : ''}`;
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const shareTextEncoded = encodeURIComponent(text);
    const shareUrlEncoded = encodeURIComponent(shareUrl);

    const shareWhatsApp = () => {
        window.open(`https://wa.me/?text=${shareTextEncoded}`, '_blank', 'noopener,noreferrer');
    };

    const shareFacebook = () => {
        window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${shareUrlEncoded}&quote=${shareTextEncoded}`,
            '_blank',
            'noopener,noreferrer,width=600,height=400'
        );
    };

    const shareX = () => {
        const maxLength = 280;
        const tweet = text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text;
        window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`,
            '_blank',
            'noopener,noreferrer,width=600,height=400'
        );
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={variant} size={iconOnly ? 'icon' : size} className={className} title="Compartilhar nas redes sociais">
                    <Share2 className={`h-4 w-4 ${iconOnly ? '' : 'mr-1.5'}`} />
                    {!iconOnly && 'Compartilhar'}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={shareWhatsApp} className="cursor-pointer">
                    <span className="text-green-600 font-medium">WhatsApp</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={shareFacebook} className="cursor-pointer">
                    <span className="text-blue-600 font-medium">Facebook</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={shareX} className="cursor-pointer">
                    <span className="text-sky-500 font-medium">X (Twitter)</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

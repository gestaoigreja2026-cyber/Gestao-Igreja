import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Calendar, MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { membersService } from '@/services/members.service';
import { eventsService } from '@/services/events.service';
import { cellsService } from '@/services/cells.service';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  id: string;
  type: 'member' | 'event' | 'cell';
  title: string;
  subtitle?: string;
  route: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { churchId, user } = useAuth();
  const effectiveChurchId = churchId ?? user?.churchId;
  const debouncedQuery = useDebounce(query, 300);

  const doSearch = useCallback(async () => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q || q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const [membersRes, eventsRes, cellsRes] = await Promise.all([
        effectiveChurchId ? membersService.getAll(effectiveChurchId) : Promise.resolve([]),
        eventsService.getAll().catch(() => []),
        effectiveChurchId ? cellsService.getActive(effectiveChurchId) : Promise.resolve([]),
      ]);

      const members = (membersRes || []).filter(
        (m: any) =>
          (m.name || '').toLowerCase().includes(q) ||
          (m.email || '').toLowerCase().includes(q)
      );
      const events = (eventsRes || []).filter(
        (e: any) =>
          (e.title || '').toLowerCase().includes(q) ||
          (e.description || '').toLowerCase().includes(q)
      );
      const cells = (cellsRes || []).filter(
        (c: any) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.address || '').toLowerCase().includes(q)
      );

      const items: SearchResult[] = [
        ...members.slice(0, 5).map((m: any) => ({
          id: m.id,
          type: 'member' as const,
          title: m.name,
          subtitle: m.email,
          route: '/membros',
        })),
        ...events.slice(0, 5).map((e: any) => ({
          id: e.id,
          type: 'event' as const,
          title: e.title,
          subtitle: e.date,
          route: '/eventos',
        })),
        ...cells.slice(0, 3).map((c: any) => ({
          id: c.id,
          type: 'cell' as const,
          title: c.name,
          subtitle: c.meeting_day,
          route: '/celulas',
        })),
      ];
      setResults(items);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, effectiveChurchId]);

  useEffect(() => {
    doSearch();
  }, [doSearch]);

  const handleSelect = (item: SearchResult) => {
    navigate(item.route);
    setOpen(false);
    setSheetOpen(false);
    setQuery('');
  };

  const SearchContent = () => (
    <Command className="rounded-lg border shadow-md" shouldFilter={false}>
      <div className="flex items-center border-b px-3">
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <Input
          placeholder="Buscar membros, eventos, células..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-11"
          autoFocus
        />
      </div>
      <CommandList>
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && query.trim().length >= 2 && (
          <>
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
            {results.length > 0 && (
              <CommandGroup heading="Resultados">
                {results.map((item) => (
                  <CommandItem
                    key={`${item.type}-${item.id}`}
                    value={`${item.type}-${item.id}`}
                    onSelect={() => handleSelect(item)}
                    className="cursor-pointer"
                  >
                    {item.type === 'member' && <Users className="mr-2 h-4 w-4" />}
                    {item.type === 'event' && <Calendar className="mr-2 h-4 w-4" />}
                    {item.type === 'cell' && <MapPin className="mr-2 h-4 w-4" />}
                    <div>
                      <div className="font-medium">{item.title}</div>
                      {item.subtitle && (
                        <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </Command>
  );

  return (
    <>
      {/* Desktop: popover no header */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="hidden md:flex items-center gap-2 text-muted-foreground hover:text-foreground w-56 justify-start"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="text-sm">Buscar...</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <SearchContent />
        </PopoverContent>
      </Popover>

      {/* Mobile/Tablet: ícone que abre sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Busca global"
          >
            <Search className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="top" className="h-auto">
          <SheetHeader>
            <SheetTitle>Buscar</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <SearchContent />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

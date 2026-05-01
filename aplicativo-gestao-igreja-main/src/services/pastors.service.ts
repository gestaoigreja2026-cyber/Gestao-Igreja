import { supabase } from '@/lib/supabaseClient';

export interface ChurchPastor {
  id: string;
  church_id: string;
  name: string;
  position: string | null;
  photo_url: string | null;
  bio: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ChurchPastorInsert {
  church_id: string;
  name: string;
  position?: string | null;
  photo_url?: string | null;
  bio?: string | null;
  display_order?: number;
}

export interface ChurchPastorUpdate {
  name?: string;
  position?: string | null;
  photo_url?: string | null;
  bio?: string | null;
  display_order?: number;
}

export const pastorsService = {
  async listByChurch(churchId: string): Promise<ChurchPastor[]> {
    const { data, error } = await supabase
      .from('church_pastors')
      .select('*')
      .eq('church_id', churchId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return (data || []) as ChurchPastor[];
  },

  async create(pastor: ChurchPastorInsert): Promise<ChurchPastor> {
    const { data, error } = await supabase
      .from('church_pastors')
      .insert({
        church_id: pastor.church_id,
        name: pastor.name,
        position: pastor.position ?? null,
        photo_url: pastor.photo_url ?? null,
        bio: pastor.bio ?? null,
        display_order: pastor.display_order ?? 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ChurchPastor;
  },

  async update(id: string, updates: ChurchPastorUpdate): Promise<ChurchPastor> {
    const { data, error } = await supabase
      .from('church_pastors')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ChurchPastor;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('church_pastors')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../lib/supabase.js';
import { DbDrip } from '../types/index.js';

export const dripRepository = {
    async findAll(includeInactive = false): Promise<DbDrip[]> {
        let q = supabaseAdmin.from('drips').select('*').order('name');
        // if (!includeInactive) q = q.eq('is_active', true); // Removed
        const { data, error } = await q;
        if (error) throw error;
        return (data ?? []) as DbDrip[];
    },

    async findById(id: string): Promise<DbDrip | undefined> {
        const { data, error } = await supabaseAdmin
            .from('drips')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error) throw error;
        return (data ?? undefined) as DbDrip | undefined;
    },

    async create(data: Omit<DbDrip, 'id' | 'created_at' | 'updated_at' | 'is_active'>): Promise<DbDrip> {
        const id = uuidv4();
        const now = new Date().toISOString();

        const { error } = await supabaseAdmin.from('drips').insert({
            id,
            name: data.name,
            description: data.description ?? null,
            price: data.price,
            stock_quantity: data.stock_quantity,
            // is_active: true, // Removed
            created_at: now,
            updated_at: now,
        });
        if (error) throw error;

        return (await this.findById(id))!;
    },

    async update(
        id: string,
        data: Partial<Omit<DbDrip, 'id' | 'created_at' | 'updated_at'>>
    ): Promise<DbDrip | undefined> {
        const existing = await this.findById(id);
        if (!existing) return undefined;

        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

        if (data.name !== undefined) updates.name = data.name;
        if (data.description !== undefined) updates.description = data.description ?? null;
        if (data.price !== undefined) updates.price = data.price;
        if (data.stock_quantity !== undefined) updates.stock_quantity = data.stock_quantity;
        // if (data.is_active !== undefined) updates.is_active = data.is_active; // Removed

        const { error } = await supabaseAdmin.from('drips').update(updates).eq('id', id);
        if (error) throw error;

        return this.findById(id);
    },

    async updateStock(id: string, quantityChange: number): Promise<boolean> {
        // Use a raw RPC to do an atomic increment/decrement
        const { error } = await supabaseAdmin.rpc('increment_drip_stock', {
            p_drip_id: id,
            p_change: quantityChange,
        });
        if (error) throw error;
        return true;
    },

    async delete(id: string): Promise<boolean> {
        const { error, count } = await supabaseAdmin
            .from('drips')
            .delete({ count: 'exact' })
            .eq('id', id);
        if (error) throw error;
        return (count ?? 0) > 0;
    },
};

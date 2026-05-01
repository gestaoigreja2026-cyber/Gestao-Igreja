import { supabase } from '@/lib/supabaseClient';
import { Asset, AssetMaintenance } from '@/types';

export const assetsService = {
    async getAssets(churchId?: string | null) {
        let query = supabase
            .from('assets')
            .select('*')
            .order('created_at', { ascending: false });

        if (churchId) {
            query = query.eq('church_id', churchId);
        }

        const { data, error } = await query;

        if (error) throw error;
        // Map camelCase
        return data?.map(mapAssetToCamelCase) || [];
    },

    async getAssetById(id: string) {
        const { data, error } = await supabase
            .from('assets')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return mapAssetToCamelCase(data);
    },

    async createAsset(asset: Partial<Asset>) {
        const { data, error } = await supabase
            .from('assets')
            .insert([mapAssetToSnakeCase(asset)])
            .select()
            .single();

        if (error) throw error;
        return mapAssetToCamelCase(data);
    },

    async updateAsset(id: string, asset: Partial<Asset>) {
        const { data, error } = await supabase
            .from('assets')
            .update(mapAssetToSnakeCase(asset))
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return mapAssetToCamelCase(data);
    },

    async deleteAsset(id: string) {
        const { error } = await supabase
            .from('assets')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Maintenance
    async getMaintenanceHistory(assetId: string) {
        const { data, error } = await supabase
            .from('asset_maintenance')
            .select('*')
            .eq('asset_id', assetId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data?.map(mapMaintenanceToCamelCase) || [];
    },

    async createMaintenance(maintenance: Partial<AssetMaintenance>) {
        const { data, error } = await supabase
            .from('asset_maintenance')
            .insert([mapMaintenanceToSnakeCase(maintenance)])
            .select()
            .single();

        if (error) throw error;
        return mapMaintenanceToCamelCase(data);
    }
};

// Helpers
function mapAssetToCamelCase(item: any): Asset {
    return {
        ...item,
        serialNumber: item.serial_number,
        acquisitionDate: item.acquisition_date,
        photoUrl: item.photo_url,
        qrCode: item.qr_code,
        donorName: item.donor_name,
        donationDate: item.donation_date,
        documentRef: item.document_ref,
        depreciationEnabled: item.depreciation_enabled,
        depreciationMethod: item.depreciation_method,
        depreciationStartDate: item.depreciation_start_date,
        usefulLifeYears: item.useful_life_years,
        depreciationRate: item.depreciation_rate,
        residualValue: item.residual_value,
        maintenanceIntervalMonths: item.maintenance_interval_months,
        nextMaintenanceDate: item.next_maintenance_date,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
    };
}

function mapAssetToSnakeCase(item: Partial<Asset>): any {
    const result: any = { ...item };
    if (item.serialNumber !== undefined) { result.serial_number = item.serialNumber; delete result.serialNumber; }
    if (item.acquisitionDate !== undefined) { result.acquisition_date = item.acquisitionDate; delete result.acquisitionDate; }
    if (item.photoUrl !== undefined) { result.photo_url = item.photoUrl; delete result.photoUrl; }
    if (item.qrCode !== undefined) { result.qr_code = item.qrCode; delete result.qrCode; }
    if (item.donorName !== undefined) { result.donor_name = item.donorName; delete result.donorName; }
    if (item.donationDate !== undefined) { result.donation_date = item.donationDate; delete result.donationDate; }
    if (item.documentRef !== undefined) { result.document_ref = item.documentRef; delete result.documentRef; }
    if (item.depreciationEnabled !== undefined) { result.depreciation_enabled = item.depreciationEnabled; delete result.depreciationEnabled; }
    if (item.depreciationMethod !== undefined) { result.depreciation_method = item.depreciationMethod; delete result.depreciationMethod; }
    if (item.depreciationStartDate !== undefined) { result.depreciation_start_date = item.depreciationStartDate; delete result.depreciationStartDate; }
    if (item.usefulLifeYears !== undefined) { result.useful_life_years = item.usefulLifeYears; delete result.usefulLifeYears; }
    if (item.depreciationRate !== undefined) { result.depreciation_rate = item.depreciationRate; delete result.depreciationRate; }
    if (item.residualValue !== undefined) { result.residual_value = item.residualValue; delete result.residualValue; }
    if (item.maintenanceIntervalMonths !== undefined) { result.maintenance_interval_months = item.maintenanceIntervalMonths; delete result.maintenanceIntervalMonths; }
    if (item.nextMaintenanceDate !== undefined) { result.next_maintenance_date = item.nextMaintenanceDate; delete result.nextMaintenanceDate; }

    // Remove chaves com undefined (PostgREST entende como coluna inválida)
    for (const key of Object.keys(result)) {
        if (result[key] === undefined) delete result[key];
    }
    return result;
}

function mapMaintenanceToCamelCase(item: any): AssetMaintenance {
    return {
        ...item,
        assetId: item.asset_id,
        scheduledDate: item.scheduled_date,
        completionDate: item.completion_date,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
    };
}

function mapMaintenanceToSnakeCase(item: Partial<AssetMaintenance>): any {
    const result: any = { ...item };
    if (item.assetId !== undefined) { result.asset_id = item.assetId; delete result.assetId; }
    if (item.scheduledDate !== undefined) { result.scheduled_date = item.scheduledDate; delete result.scheduledDate; }
    if (item.completionDate !== undefined) { result.completion_date = item.completionDate; delete result.completionDate; }

    for (const key of Object.keys(result)) {
        if (result[key] === undefined) delete result[key];
    }
    return result;
}

import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { SessionService } from './session.service';

export type StorageBucket = 'avatars' | 'accounts' | 'catalog';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  private supabase = inject(SupabaseService);
  private session  = inject(SessionService);

  async uploadImage(
    bucket: StorageBucket,
    file: File,
    fileName?: string
  ): Promise<UploadResult> {
    const userId = this.session.user()?.id;
    if (!userId) return { success: false, error: 'No autenticado' };

    const ext      = file.name.split('.').pop();
    const name     = fileName ?? `${Date.now()}.${ext}`;
    const path     = `${userId}/${name}`;
    const mimeType = file.type || 'image/jpeg';

    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType: mimeType,
        upsert: true,   // sobreescribe si ya existe
      });

    if (error) return { success: false, error: error.message };

    // Agregar cache-buster a la URL pública para que todos los componentes
    // que lean esta URL desde Supabase obtengan siempre la imagen más reciente
    const baseUrl = this.getPublicUrl(bucket, path);
    const url = `${baseUrl}?t=${Date.now()}`;
    return { success: true, url };
  }

  getPublicUrl(bucket: StorageBucket, path: string): string {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    return data.publicUrl;
  }

  async deleteImage(bucket: StorageBucket, path: string): Promise<void> {
    await this.supabase.storage.from(bucket).remove([path]);
  }

  // Extrae el path relativo desde una URL pública de Supabase
  extractPath(url: string, bucket: StorageBucket): string {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx    = url.indexOf(marker);
    return idx !== -1 ? url.substring(idx + marker.length) : url;
  }
}
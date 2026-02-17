import React from 'react';

export type PhotoItem = {
  id: string;
  file?: File;
  dataUrl?: string; // compressed thumbnail data URL (JPEG)
  category?: string;
};

// Resize + compress images on the client to keep localStorage small and avoid iOS/Safari crashes.
export default function PhotoUploader({
  photos,
  setPhotos,
  max = 10,
}: {
  photos: PhotoItem[];
  setPhotos: (p: PhotoItem[]) => void;
  max?: number;
}) {
  async function resizeImageFileToDataUrl(file: File, maxLongSide = 1600, quality = 0.75) {
    return await new Promise<string>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const { naturalWidth: w, naturalHeight: h } = img;
          const long = Math.max(w, h);
          const scale = long > maxLongSide ? maxLongSide / long : 1;
          const cw = Math.max(1, Math.round(w * scale));
          const ch = Math.max(1, Math.round(h * scale));
          const canvas = document.createElement('canvas');
          canvas.width = cw;
          canvas.height = ch;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas context unavailable');
          ctx.drawImage(img, 0, 0, cw, ch);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          URL.revokeObjectURL(url);
          resolve(dataUrl);
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };
      img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
      img.src = url;
    });
  }

  const onFile = async (flist: FileList | null) => {
    if (!flist) return;
    const next = [...photos];
    for (let i = 0; i < flist.length && next.length < max; i++) {
      const file = flist[i];
      try {
        const dataUrl = await resizeImageFileToDataUrl(file, 1600, 0.75);
        next.push({ id: Date.now().toString() + i, file, dataUrl, category: '' });
      } catch {
        // fallback: store original as dataUrl (may be large)
        const fr = new FileReader();
        const idx = i;
        fr.onload = () => {
          next.push({ id: Date.now().toString() + idx, file, dataUrl: String(fr.result), category: '' });
          setPhotos(next);
        };
        fr.onerror = () => { /* ignore this file */ };
        fr.readAsDataURL(file);
      }
    }
    setPhotos(next);
  };

  const remove = (id: string) => setPhotos(photos.filter((p) => p.id !== id));
  const setCategory = (id: string, category: string) => setPhotos(photos.map((p) => (p.id === id ? { ...p, category } : p)));

  const calcKb = (dataUrl?: string) => {
    if (!dataUrl) return '-';
    const idx = dataUrl.indexOf(',');
    const len = dataUrl.length - (idx + 1);
    const kb = Math.round((len * 3) / 4 / 1024);
    return `${kb}KB`;
  };

  return (
    <div className="w-full">
      <div className="flex gap-2 mb-2">
        <label className="btn bg-sky-600 text-white px-3 py-2 rounded cursor-pointer">
          Take / Add Photo
          <input accept="image/*" capture="environment" multiple className="hidden" type="file" onChange={(e) => onFile(e.target.files)} />
        </label>
        <div className="text-sm text-gray-500 self-center">{photos.length} / {max}</div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {photos.map((p) => (
          <div key={p.id} className="border rounded overflow-hidden p-1 bg-white">
            <img src={p.dataUrl} alt={`photo-${p.id}`} className="w-full h-28 object-cover" />
            <div className="text-xs text-gray-400 mt-1">{calcKb(p.dataUrl)}</div>
            <select className="w-full mt-1 text-sm" value={p.category || ''} onChange={(e) => setCategory(p.id, e.target.value)}>
              <option value="">Category</option>
              <option value="panel">Panel</option>
              <option value="meter">Meter</option>
              <option value="location">Location</option>
              <option value="attic">Attic Path</option>
              <option value="trench">Trench Route</option>
              <option value="ats">ATS Spot</option>
              <option value="other">Other</option>
            </select>
            <div className="flex gap-2 mt-1">
              <button onClick={() => remove(p.id)} className="text-xs text-red-600">Remove</button>
            </div>
          </div>
        ))}
        {photos.length === 0 && <div className="col-span-3 text-sm text-gray-500">No photos yet — use camera button to add up to 10 photos.</div>}
      </div>
    </div>
  );
}


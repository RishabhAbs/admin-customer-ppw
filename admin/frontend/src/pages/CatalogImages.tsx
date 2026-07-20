import { useState, useEffect, useRef } from 'react';
import { Search, X, Upload, Trash2, Image as ImageIcon, Loader2, ChevronLeft } from 'lucide-react';
import {
  listGroupThumbnails,
  setGroupThumbnailFromItem,
  uploadGroupThumbnail,
  deleteGroupThumbnail,
  getStockItems,
  getItemDetails,
  type GroupThumbnail,
} from '../api';
import { ConfirmModal } from '../components/ConfirmModal';

const copper = '#b8804a';
const copperDark = '#9a6a3c';
const cream = '#f7f0e8';
const parchment = '#fdf8f3';

type GroupType = 'brand' | 'category';

export default function CatalogImages() {
  const [type, setType] = useState<GroupType>('brand');
  const [items, setItems] = useState<GroupThumbnail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<GroupThumbnail | null>(null);
  const [deleting, setDeleting] = useState<GroupThumbnail | null>(null);

  const load = async (t: GroupType) => {
    setLoading(true);
    try {
      const data = await listGroupThumbnails(t);
      setItems(data);
    } catch (e) {
      console.error('Failed to load group thumbnails', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(type); }, [type]);

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async () => {
    if (!deleting) return;
    await deleteGroupThumbnail(type, deleting.name);
    setDeleting(null);
    load(type);
  };

  return (
    <div className="flex flex-col h-full min-h-screen pb-10" style={{ background: cream }}>
      {/* Header */}
      <div
        className="px-4 py-4 sticky top-0 z-40 space-y-3"
        style={{
          background: 'rgba(253,248,243,0.97)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(184,128,74,0.15)',
          boxShadow: '0 2px 12px rgba(184,128,74,0.06)',
        }}
      >
        <div>
          <h1 className="text-lg font-extrabold" style={{ color: '#2c1e0f' }}>Brand & Category Images</h1>
          <p className="text-xs font-medium" style={{ color: '#8c7a68' }}>
            Controls the tile shown on the customer app's home page
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex p-1 rounded-xl gap-1 w-fit" style={{ background: 'rgba(184,128,74,0.08)' }}>
          {(['brand', 'category'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className="px-4 py-2 rounded-lg text-xs font-bold transition-all"
              style={type === t
                ? { background: copper, color: 'white' }
                : { background: 'transparent', color: '#8c7a68' }}
            >
              By {t === 'brand' ? 'Brand' : 'Category'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#a8a29e' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${type === 'brand' ? 'brands' : 'categories'}...`}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: parchment, border: '1px solid rgba(184,128,74,0.15)', color: '#2c1e0f' }}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin" style={{ color: copper }} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm py-20" style={{ color: '#8c7a68' }}>No matches.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((item) => (
              <div
                key={item.name}
                className="rounded-2xl overflow-hidden relative"
                style={{ background: 'white', border: '1px solid rgba(184,128,74,0.15)' }}
              >
                {item.is_override && (
                  <span
                    className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold z-10"
                    style={{ background: '#22c55e' }}
                    title="Admin-set image"
                  >
                    ✓
                  </span>
                )}
                <div
                  className="w-full flex items-center justify-center overflow-hidden"
                  style={{ height: 120, background: parchment }}
                >
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-contain p-2" />
                  ) : (
                    <ImageIcon size={28} style={{ color: '#d6c4b0' }} />
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-bold truncate mb-2" style={{ color: '#2c1e0f' }}>{item.name}</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setEditing(item)}
                      className="flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95"
                      style={{ background: 'rgba(184,128,74,0.08)', color: copper }}
                    >
                      Edit
                    </button>
                    {item.is_override && (
                      <button
                        onClick={() => setDeleting(item)}
                        className="w-8 py-1.5 rounded-lg flex items-center justify-center transition-all active:scale-95"
                        style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <EditThumbnailModal
          type={type}
          name={editing.name}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(type); }}
        />
      )}

      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Remove image?"
        message={`"${deleting?.name}" will go back to showing the default icon until you set an image.`}
        confirmText="Remove"
        isDangerous
      />
    </div>
  );
}

function EditThumbnailModal({
  type, name, onClose, onSaved,
}: {
  type: GroupType;
  name: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<'pick' | 'upload'>('pick');
  const [itemSearch, setItemSearch] = useState('');
  const [itemResults, setItemResults] = useState<any[]>([]);
  const [searchingItems, setSearchingItems] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [itemImages, setItemImages] = useState<any[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!itemSearch.trim()) { setItemResults([]); return; }
      setSearchingItems(true);
      try {
        const category = type === 'category' ? name : '';
        const parent = type === 'brand' ? name : '';
        const resp = await getStockItems(1, 20, itemSearch, category, parent);
        setItemResults(resp.data || []);
      } catch (e) {
        console.error('Item search failed', e);
      } finally {
        setSearchingItems(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [itemSearch, type, name]);

  const pickItem = async (item: any) => {
    setSelectedItem(item);
    setLoadingImages(true);
    try {
      const details = await getItemDetails(item.masterid);
      setItemImages(details?.images || []);
    } catch (e) {
      console.error('Failed to load item images', e);
      setItemImages([]);
    } finally {
      setLoadingImages(false);
    }
  };

  const chooseSlot = async (img: any) => {
    setSaving(true);
    try {
      await setGroupThumbnailFromItem(type, name, selectedItem.masterid, img.slot);
      onSaved();
    } catch (e) {
      console.error('Failed to set thumbnail', e);
      setSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      await uploadGroupThumbnail(type, name, file);
      onSaved();
    } catch (err) {
      console.error('Upload failed', err);
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center animate-fade-in"
      style={{ background: 'rgba(44,30,15,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl max-h-[85vh] flex flex-col"
        style={{ background: parchment }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(184,128,74,0.12)' }}>
          <div className="flex items-center gap-2">
            {selectedItem && (
              <button onClick={() => setSelectedItem(null)} className="p-1 -ml-1" style={{ color: '#8c7a68' }}>
                <ChevronLeft size={18} />
              </button>
            )}
            <h3 className="text-sm font-extrabold truncate" style={{ color: '#2c1e0f' }}>{name}</h3>
          </div>
          <button onClick={onClose} style={{ color: '#a8a29e' }}><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {saving ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={26} className="animate-spin" style={{ color: copper }} />
              <p className="text-xs font-medium" style={{ color: '#8c7a68' }}>Saving...</p>
            </div>
          ) : selectedItem ? (
            // Slot picker for the chosen item
            <div>
              <p className="text-xs font-bold mb-3" style={{ color: '#8c7a68' }}>{selectedItem.name}</p>
              {loadingImages ? (
                <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin" style={{ color: copper }} /></div>
              ) : itemImages.length === 0 ? (
                <p className="text-xs text-center py-10" style={{ color: '#a8a29e' }}>This item has no uploaded photos.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {itemImages.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => chooseSlot(img)}
                      className="rounded-xl overflow-hidden aspect-square transition-all active:scale-95"
                      style={{ background: 'white', border: '1px solid rgba(184,128,74,0.15)' }}
                    >
                      <img src={img.image_url} alt="" className="w-full h-full object-contain p-1" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Mode switcher */}
              <div className="flex p-1 rounded-xl gap-1 mb-4" style={{ background: 'rgba(184,128,74,0.08)' }}>
                <button
                  onClick={() => setMode('pick')}
                  className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                  style={mode === 'pick' ? { background: copper, color: 'white' } : { color: '#8c7a68' }}
                >
                  Choose from item
                </button>
                <button
                  onClick={() => setMode('upload')}
                  className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                  style={mode === 'upload' ? { background: copper, color: 'white' } : { color: '#8c7a68' }}
                >
                  Upload new
                </button>
              </div>

              {mode === 'pick' ? (
                <div>
                  <div className="relative mb-3">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#a8a29e' }} />
                    <input
                      autoFocus
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder="Search an item to pick its photo..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: 'white', border: '1px solid rgba(184,128,74,0.15)', color: '#2c1e0f' }}
                    />
                  </div>
                  {searchingItems ? (
                    <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: copper }} /></div>
                  ) : (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {itemResults.map((it) => (
                        <button
                          key={it.id}
                          onClick={() => pickItem(it)}
                          className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.99]"
                          style={{ background: 'white', border: '1px solid rgba(184,128,74,0.1)', color: '#2c1e0f' }}
                        >
                          {it.name}
                        </button>
                      ))}
                      {!searchingItems && itemSearch && itemResults.length === 0 && (
                        <p className="text-xs text-center py-6" style={{ color: '#a8a29e' }}>No items found.</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-2 py-10 rounded-2xl transition-all active:scale-95"
                    style={{ background: 'white', border: '2px dashed rgba(184,128,74,0.3)' }}
                  >
                    <Upload size={24} style={{ color: copper }} />
                    <span className="text-xs font-bold" style={{ color: '#8c7a68' }}>Tap to choose an image file</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

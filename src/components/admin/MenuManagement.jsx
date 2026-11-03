import React, { useState } from 'react';
import { useDhaba } from '../../context/DhabaContext';
import { formatINR } from '../../lib/supabase';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Edit3, 
  Check, 
  X, 
  AlertCircle, 
  Utensils, 
  ToggleLeft, 
  ToggleRight,
  ShieldAlert
} from 'lucide-react';

export const MenuManagement = () => {
  const { categories, menuItems, addMenuItem, updateMenuItem, addCategory } = useDhaba();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Item State
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState(categories[0]?.id || '');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDescription, setItemDescription] = useState('');

  // Add Category State
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Edit Item State
  const [editingItemId, setEditingItemId] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCreateItem = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!itemName.trim() || !itemPrice) {
      setError('Name and price are required');
      return;
    }

    try {
      await addMenuItem({
        name: itemName.trim(),
        category_id: itemCategory || categories[0]?.id,
        price: Number(itemPrice),
        description: itemDescription.trim(),
        is_available: true
      });
      setSuccess(`Added "${itemName.trim()}" to food menu!`);
      setItemName('');
      setItemPrice('');
      setItemDescription('');
      setIsAddingItem(false);
    } catch (err) {
      setError(err.message || 'Failed to add food item');
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newCatName.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      await addCategory(newCatName.trim(), categories.length + 1);
      setSuccess(`Category "${newCatName.trim()}" created!`);
      setNewCatName('');
      setIsAddingCategory(false);
    } catch (err) {
      setError(err.message || 'Failed to add category');
    }
  };

  const startEdit = (item) => {
    setEditingItemId(item.id);
    setEditName(item.name);
    setEditPrice(item.price.toString());
    setEditDescription(item.description || '');
  };

  const handleSaveEdit = async (id) => {
    setError('');
    setSuccess('');
    try {
      await updateMenuItem(id, {
        name: editName.trim(),
        price: Number(editPrice),
        description: editDescription.trim()
      });
      setSuccess('Menu item updated. Note: Running orders and finalized bills keep their snapshot prices.');
      setEditingItemId(null);
    } catch (err) {
      setError(err.message || 'Failed to update item');
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      await updateMenuItem(item.id, {
        is_available: !item.is_available
      });
    } catch (err) {
      setError(err.message || 'Failed to toggle availability');
    }
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E8E4DE] rounded-xl p-5 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-xl font-bold text-[#2B2623] flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#C2570C]" />
            <span>Food Menu & Pricing</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#6B635C] mt-1">
            Manage traditional dhaba categories, dishes, prices, and kitchen availability.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddingCategory(!isAddingCategory)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E8E4DE] hover:border-[#C2570C] text-[#2B2623] rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#C2570C]" />
            <span>{isAddingCategory ? 'Cancel' : 'New Category'}</span>
          </button>
          <button
            onClick={() => setIsAddingItem(!isAddingItem)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#C2570C] hover:bg-[#A8480A] text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAddingItem ? 'Cancel' : 'Add Food Item'}</span>
          </button>
        </div>
      </div>

      {/* Snapshot Pricing Info Notice */}
      <div className="bg-[#FAF9F7] border border-[#C2570C]/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-[#2B2623]">
        <ShieldAlert className="w-4 h-4 text-[#C2570C] shrink-0 mt-0.5" />
        <p>
          <strong>Price Protection:</strong> Updating a menu price here will immediately affect newly added items, but will <em>never</em> alter items already added to existing running orders or finalized bills.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Add Category Form */}
      {isAddingCategory && (
        <form onSubmit={handleCreateCategory} className="bg-white border-2 border-[#C2570C]/40 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="New Category Name (e.g. Desserts, Chaat)"
            className="flex-1 px-3.5 py-2 bg-[#FAF9F7] border border-[#E8E4DE] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C2570C]"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[#C2570C] hover:bg-[#A8480A] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95"
          >
            Create Category
          </button>
        </form>
      )}

      {/* Add Food Item Form */}
      {isAddingItem && (
        <form onSubmit={handleCreateItem} className="bg-[#FAF9F7] border-2 border-[#C2570C]/40 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-[#2B2623]">Add New Menu Item</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#6B635C] uppercase mb-1">
                Item Name *
              </label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Kadhai Paneer Special"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E8E4DE] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C2570C]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6B635C] uppercase mb-1">
                Category *
              </label>
              <select
                value={itemCategory}
                onChange={(e) => setItemCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E8E4DE] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C2570C]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6B635C] uppercase mb-1">
                Price in ₹ (INR) *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                placeholder="150"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E8E4DE] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C2570C]"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#6B635C] uppercase mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              placeholder="e.g. Cooked with freshly roasted spices and desi ghee"
              className="w-full px-3.5 py-2 bg-white border border-[#E8E4DE] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C2570C]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddingItem(false)}
              className="px-4 py-2 bg-white text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#C2570C] hover:bg-[#A8480A] text-white rounded-xl text-xs font-bold shadow-sm active:scale-95"
            >
              Add Item
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6B635C] absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search food item by name or ingredients..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E8E4DE] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C2570C]"
          />
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-[#C2570C] text-white shadow-xs'
                : 'bg-white text-[#2B2623] border border-[#E8E4DE] hover:bg-[#FAF9F7]'
            }`}
          >
            All Items ({menuItems.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-[#C2570C] text-white shadow-xs'
                  : 'bg-white text-[#2B2623] border border-[#E8E4DE] hover:bg-[#FAF9F7]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Food Items List / Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`bg-white border rounded-xl p-4 transition-all flex flex-col justify-between ${
              item.is_available 
                ? 'border-[#E8E4DE] shadow-xs hover:border-[#D6CFC6]' 
                : 'border-slate-200 bg-slate-50/70 opacity-60'
            }`}
          >
            {editingItemId === item.id ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-[#6B635C]">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-[#E8E4DE] rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#6B635C]">Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-[#E8E4DE] rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#6B635C]">Description</label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-[#E8E4DE] rounded-lg"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    onClick={() => setEditingItemId(null)}
                    className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveEdit(item.id)}
                    className="px-3 py-1 bg-[#C2570C] text-white rounded-lg text-xs font-bold"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm sm:text-base text-[#2B2623]">
                        {item.name}
                      </h4>
                      <span className="inline-block mt-0.5 text-[10px] font-semibold text-[#C2570C] bg-[#FAF9F7] px-2 py-0.5 rounded-md">
                        {item.menu_categories?.name || 'Dish'}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-bold text-[#14532D]">
                        {formatINR(item.price)}
                      </div>
                    </div>
                  </div>

                  {item.description && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => handleToggleAvailability(item)}
                    className={`flex items-center gap-1.5 font-bold transition-colors ${
                      item.is_available ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    {item.is_available ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                    <span>{item.is_available ? 'In Stock' : 'Out of Stock'}</span>
                  </button>

                  <button
                    onClick={() => startEdit(item)}
                    className="p-1.5 text-slate-500 hover:text-[#2B2623] hover:bg-[#FAF9F7] rounded-lg transition-colors flex items-center gap-1"
                    title="Edit Item Details"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

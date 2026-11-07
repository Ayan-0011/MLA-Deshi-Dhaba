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
  ShieldAlert
} from 'lucide-react';
import { ToggleSwitch } from '../common/ToggleSwitch';
import { notify } from '../../lib/notifications';

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
  const [updatingAvailabilityId, setUpdatingAvailabilityId] = useState(null);

  const handleCreateItem = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!itemName.trim() || !itemPrice) {
      setError('Name and price are required');
      notify.warning('Enter a dish name and price.', 'menu-item-validation');
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
      notify.success('Menu item added.', 'menu-item-added');
      setItemName('');
      setItemPrice('');
      setItemDescription('');
      setIsAddingItem(false);
    } catch (err) {
      console.error('Menu item creation failed:', err);
      setError('Could not add this menu item. Please check the details and try again.');
      notify.error('Could not add this menu item.', 'menu-item-create-error');
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newCatName.trim()) {
      setError('Category name is required');
      notify.warning('Enter a category name.', 'menu-category-validation');
      return;
    }

    try {
      await addCategory(newCatName.trim(), categories.length + 1);
      setSuccess(`Category "${newCatName.trim()}" created!`);
      notify.success('Menu category created.', 'menu-category-created');
      setNewCatName('');
      setIsAddingCategory(false);
    } catch (err) {
      console.error('Category creation failed:', err);
      setError('Could not create this category. Please try again.');
      notify.error('Could not create this category.', 'menu-category-create-error');
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
      notify.success('Menu item updated.', 'menu-item-updated');
      setEditingItemId(null);
    } catch (err) {
      console.error('Menu item update failed:', err);
      setError('Could not update this menu item. Please try again.');
      notify.error('Could not update this menu item.', `menu-item-update-error-${id}`);
    }
  };

  const handleToggleAvailability = async (item) => {
    setUpdatingAvailabilityId(item.id);
    try {
      await updateMenuItem(item.id, {
        is_available: !item.is_available
      });
      notify.success(`${item.name} is now ${item.is_available ? 'unavailable' : 'available'}.`, `menu-item-toggle-${item.id}`);
    } catch (err) {
      console.error('Menu availability update failed:', err);
      setError('Could not update availability. Please try again.');
      notify.error('Could not update menu availability.', `menu-item-toggle-error-${item.id}`);
    } finally {
      setUpdatingAvailabilityId(null);
    }
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-3 py-4 text-foreground sm:px-6 sm:py-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:p-5">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <BookOpen className="h-6 w-6 text-primary" />
            <span>Food Menu & Pricing</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage traditional dhaba categories, dishes, prices, and kitchen availability.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddingCategory(!isAddingCategory)}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-semibold text-foreground hover:bg-surface-muted"
          >
            <Plus className="h-4 w-4 text-primary" />
            <span>{isAddingCategory ? 'Cancel' : 'New Category'}</span>
          </button>
          <button
            onClick={() => setIsAddingItem(!isAddingItem)}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAddingItem ? 'Cancel' : 'Add Food Item'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger-foreground">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div role="status" className="flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft p-3 text-sm text-success-foreground">
          <Check className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Add Category Form */}
      {isAddingCategory && (
        <form onSubmit={handleCreateCategory} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm sm:flex-row">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="New Category Name (e.g. Desserts, Chaat)"
            className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-surface-muted px-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
            required
          />
          <button
            type="submit"
            className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            Create Category
          </button>
        </form>
      )}

      {/* Add Food Item Form */}
      {isAddingItem && (
        <form onSubmit={handleCreateItem} className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <h3 className="text-sm font-bold text-foreground">Add New Menu Item</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                Item Name *
              </label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Kadhai Paneer Special"
                className="min-h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                Category *
              </label>
              <select
                value={itemCategory}
                onChange={(e) => setItemCategory(e.target.value)}
                className="min-h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                Price in ₹ (INR) *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                placeholder="150"
                className="min-h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
                required
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
              Description (Optional)
            </label>
            <input
              type="text"
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              placeholder="e.g. Cooked with freshly roasted spices and desi ghee"
              className="min-h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddingItem(false)}
              className="min-h-10 rounded-md border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-10 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover"
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
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search food item by name or ingredients..."
            className="min-h-11 w-full rounded-md border border-border bg-surface py-2.5 pl-10 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
          />
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'border border-border bg-surface text-foreground hover:bg-surface-muted'
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
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'border border-border bg-surface text-foreground hover:bg-surface-muted'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Food Items List / Grid */}
      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <Utensils className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
          <h3 className="font-bold text-foreground">No menu items found</h3>
          <p className="mt-1 text-sm text-muted-foreground">Try another search or add a new dish.</p>
        </div>
      ) : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${
              item.is_available 
                ? 'border-border bg-surface shadow-sm hover:border-primary/40' 
                : 'border-border bg-surface-muted opacity-70'
            }`}
          >
            {editingItemId === item.id ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="min-h-10 w-full rounded-md border border-border bg-surface px-3 text-base text-foreground sm:text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="min-h-10 w-full rounded-md border border-border bg-surface px-3 text-base text-foreground sm:text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Description</label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="min-h-10 w-full rounded-md border border-border bg-surface px-3 text-base text-foreground sm:text-sm"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    onClick={() => setEditingItemId(null)}
                    className="min-h-10 rounded-md bg-surface-muted px-3 text-sm font-semibold text-foreground hover:bg-border"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveEdit(item.id)}
                    className="min-h-10 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
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
                      <h4 className="font-bold text-base text-foreground">
                        {item.name}
                      </h4>
                      <span className="mt-1 inline-block rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
                        {item.menu_categories?.name || 'Dish'}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-bold text-success-foreground">
                        {formatINR(item.price)}
                      </div>
                    </div>
                  </div>

                  {item.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
                  <div className={`flex items-center gap-2 font-semibold transition-colors ${item.is_available ? 'text-success-foreground' : 'text-muted-foreground'}`}>
                    <ToggleSwitch checked={item.is_available} loading={updatingAvailabilityId === item.id} onChange={() => handleToggleAvailability(item)} label={`${item.name} availability`} />
                    <span>{item.is_available ? 'Available' : 'Unavailable'}</span>
                  </div>

                  <button
                    onClick={() => startEdit(item)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-sm font-semibold text-muted-foreground hover:bg-surface-muted hover:text-foreground"
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
      </div>}
    </div>
  );
};

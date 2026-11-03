-- ==============================================================================
-- MLA DESI DHABA - Seed Data
-- ==============================================================================

-- 1. SEED RESTAURANT TABLES (T-1 to T-12)
INSERT INTO public.restaurant_tables (table_number, capacity, status, is_active)
VALUES
    ('T-1', 2, 'available', true),
    ('T-2', 2, 'available', true),
    ('T-3', 4, 'available', true),
    ('T-4', 4, 'available', true),
    ('T-5', 4, 'available', true),
    ('T-6', 4, 'available', true),
    ('T-7', 6, 'available', true),
    ('T-8', 6, 'available', true),
    ('T-9', 6, 'available', true),
    ('T-10', 8, 'available', true),
    ('T-11', 8, 'available', true),
    ('T-12', 10, 'available', true)
ON CONFLICT (table_number) DO NOTHING;

-- 2. SEED MENU CATEGORIES
INSERT INTO public.menu_categories (name, display_order, is_active)
VALUES
    ('Roti', 1, true),
    ('Sabzi', 2, true),
    ('Dal', 3, true),
    ('Rice', 4, true),
    ('Snacks', 5, true),
    ('Beverages', 6, true),
    ('Specials', 7, true)
ON CONFLICT (name) DO NOTHING;

-- 3. SEED MENU ITEMS
DO $$
DECLARE
    cat_roti UUID;
    cat_sabzi UUID;
    cat_dal UUID;
    cat_rice UUID;
    cat_snacks UUID;
    cat_bev UUID;
    cat_specials UUID;
BEGIN
    SELECT id INTO cat_roti FROM public.menu_categories WHERE name = 'Roti' LIMIT 1;
    SELECT id INTO cat_sabzi FROM public.menu_categories WHERE name = 'Sabzi' LIMIT 1;
    SELECT id INTO cat_dal FROM public.menu_categories WHERE name = 'Dal' LIMIT 1;
    SELECT id INTO cat_rice FROM public.menu_categories WHERE name = 'Rice' LIMIT 1;
    SELECT id INTO cat_snacks FROM public.menu_categories WHERE name = 'Snacks' LIMIT 1;
    SELECT id INTO cat_bev FROM public.menu_categories WHERE name = 'Beverages' LIMIT 1;
    SELECT id INTO cat_specials FROM public.menu_categories WHERE name = 'Specials' LIMIT 1;

    -- Roti
    INSERT INTO public.menu_items (category_id, name, description, price, is_available) VALUES
    (cat_roti, 'Tandoori Roti', 'Crisp whole wheat bread baked in traditional clay tandoor', 12.00, true),
    (cat_roti, 'Butter Tandoori Roti', 'Tandoori roti glazed with fresh desi butter', 15.00, true),
    (cat_roti, 'Plain Naan', 'Soft leavened tandoor bread', 35.00, true),
    (cat_roti, 'Butter Naan', 'Soft leavened tandoor bread topped with rich melted butter', 45.00, true),
    (cat_roti, 'Garlic Naan', 'Tandoor bread infused with chopped roasted garlic and coriander', 60.00, true),
    (cat_roti, 'Lachha Paratha', 'Multi-layered crispy shallow fried whole wheat flatbread', 40.00, true),
    (cat_roti, 'Missi Roti', 'Spiced gram flour flatbread with carom seeds and fenugreek', 30.00, true);

    -- Sabzi
    INSERT INTO public.menu_items (category_id, name, description, price, is_available) VALUES
    (cat_sabzi, 'Paneer Butter Masala', 'Fresh cottage cheese cubes cooked in rich silky tomato cashew gravy', 190.00, true),
    (cat_sabzi, 'Kadhai Paneer', 'Cottage cheese with capsicum, onion, and hand-crushed roasted kadhai spices', 210.00, true),
    (cat_sabzi, 'Sev Tamatar', 'Spicy tangy Kathiyawadi/Dhaba style tomato curry topped with crisp sev', 120.00, true),
    (cat_sabzi, 'Aloo Gobhi Masala', 'Homestyle dry preparation of potatoes and cauliflower with cumin & ginger', 110.00, true),
    (cat_sabzi, 'Mix Veg Curry', 'Seasonal garden vegetables cooked in spicy dhaba gravy', 140.00, true),
    (cat_sabzi, 'Matar Mushroom', 'Button mushrooms and green peas in a flavorful onion-tomato masala', 180.00, true),
    (cat_sabzi, 'Bhindi Do Pyaza', 'Crisp okra sauteed with lots of caramelized onions and ground spices', 130.00, true),
    (cat_sabzi, 'Shahi Paneer', 'Mild, creamy, aromatic cottage cheese in royal cashew-nut gravy', 220.00, true);

    -- Dal
    INSERT INTO public.menu_items (category_id, name, description, price, is_available) VALUES
    (cat_dal, 'Dal Fry', 'Yellow lentils tempered with ghee, cumin seeds, garlic, and green chilies', 120.00, true),
    (cat_dal, 'Dal Tadka', 'Smoked yellow lentils with double desi ghee tadka of whole red chilies and hing', 135.00, true),
    (cat_dal, 'Dal Makhani', 'Slow-cooked black lentils and kidney beans simmered overnight with butter and cream', 170.00, true);

    -- Rice
    INSERT INTO public.menu_items (category_id, name, description, price, is_available) VALUES
    (cat_rice, 'Plain Steamed Rice', 'Fragrant long-grain basmati rice', 90.00, true),
    (cat_rice, 'Jeera Rice', 'Basmati rice tempered with roasted cumin seeds and desi ghee', 110.00, true),
    (cat_rice, 'Veg Pulao', 'Aromatic basmati rice cooked with fresh seasonal vegetables and whole spices', 140.00, true),
    (cat_rice, 'Veg Dum Biryani', 'Layered spiced basmati rice and vegetables cooked on slow dum', 180.00, true);

    -- Snacks
    INSERT INTO public.menu_items (category_id, name, description, price, is_available) VALUES
    (cat_snacks, 'Masala Roasted Papad', 'Crispy urad dal papad topped with spicy onion-tomato-chili salsa', 35.00, true),
    (cat_snacks, 'Paneer Pakoda', 'Deep-fried battered cottage cheese slices served with mint chutney', 130.00, true),
    (cat_snacks, 'Veg Crispy Cutlet', 'Golden crispy patties filled with spiced mashed veggies (2 pcs)', 80.00, true),
    (cat_snacks, 'French Fries', 'Hot salted potato batons', 90.00, true),
    (cat_snacks, 'Green Salad', 'Fresh slices of cucumber, tomato, carrot, onion, and lemon wedge', 50.00, true);

    -- Beverages
    INSERT INTO public.menu_items (category_id, name, description, price, is_available) VALUES
    (cat_bev, 'Dhaba Special Masala Chai', 'Strong milk tea brewed with crushed ginger, cardamom, and cloves', 20.00, true),
    (cat_bev, 'Sweet Punjabi Lassi', 'Chilled thick yogurt shake topped with a dollop of fresh malai', 50.00, true),
    (cat_bev, 'Spiced Dhaba Chaas (Buttermilk)', 'Refreshing churned curd flavored with roasted cumin, rock salt, and mint', 30.00, true),
    (cat_bev, 'Fresh Nimbu Paani', 'Classic sweet and salted freshly squeezed lemonade', 35.00, true),
    (cat_bev, 'Mineral Water Bottle (1L)', 'Packaged chilled drinking water', 20.00, true);

    -- Specials
    INSERT INTO public.menu_items (category_id, name, description, price, is_available) VALUES
    (cat_specials, 'MLA Desi Maharaja Thali', '2 Butter Roti, Dal Makhani, Paneer Butter Masala, Jeera Rice, Sweet, Papad & Chaas', 260.00, true),
    (cat_specials, 'Dhaba Regular Thali', '4 Tandoori Roti, Dal Fry, Sabzi of the Day, Rice, Salad & Pickle', 160.00, true),
    (cat_specials, 'Paneer Tikka Angara', 'Smoky clay-oven grilled paneer cubes marinated in fiery tandoori spices', 210.00, true),
    (cat_specials, 'Gulab Jamun (2 Pcs)', 'Hot melt-in-mouth cottage cheese dumplings soaked in rose sugar syrup', 60.00, true);
END $$;

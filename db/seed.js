import db from './connection.js';
import { initDatabase } from './schema.js';

const menuItems = [
  { title: "Classic Party Jollof", description: "Rich, smoky Jollof rice served with fried plantains and spicy grilled chicken.", price: 5500, image_url: "/images/jollof_rice.png", category: "Rice" },
  { title: "Pounded Yam & Egusi", description: "Smooth pounded yam paired with rich melon soup and assorted meat.", price: 6000, image_url: "/images/pounded_yam_egusi.png", category: "Swallow" },
  { title: "Spicy Beef Suya", description: "Premium beef cuts marinated in traditional yaji spice and fire-grilled.", price: 3500, image_url: "/images/beef_suya.png", category: "Grill" },
  { title: "Efo Riro & Fufu", description: "Rich spinach stew cooked with locust beans, dried fish, and assorted meats.", price: 5000, image_url: "", category: "Swallow" },
  { title: "Moi Moi", description: "Steamed savory bean pudding with egg and fish.", price: 1500, image_url: "", category: "Sides" },
  { title: "Asun (Spicy Goat Meat)", description: "Peppered roasted goat meat with onions and bell peppers.", price: 4500, image_url: "", category: "Grill" },
  { title: "Fried Rice & Chicken", description: "Colorful vegetable fried rice with seasoned fried chicken.", price: 5000, image_url: "", category: "Rice" },
  { title: "Pepper Soup (Catfish)", description: "Hot and spicy catfish pepper soup with utazi leaves.", price: 4000, image_url: "", category: "Soups" },
  { title: "Ofada Rice & Sauce", description: "Local unpolished rice served with spicy green pepper sauce.", price: 4500, image_url: "", category: "Rice" },
  { title: "Nkwobi", description: "Spicy cow foot delicacy cooked with palm oil and utazi.", price: 5500, image_url: "", category: "Grill" },
  { title: "Banga Soup & Starch", description: "Rich palm fruit soup served with soft starch.", price: 6500, image_url: "", category: "Swallow" },
  { title: "Akara & Pap", description: "Crispy deep-fried bean cakes served with warm corn pap.", price: 1200, image_url: "", category: "Sides" },
];

async function seed() {
  try {
    // Ensure tables exist
    await initDatabase();

    // Check if menu items already exist
    const existing = await db.execute('SELECT COUNT(*) as count FROM menu_items');
    if (existing.rows[0].count > 0) {
      console.log('ℹ️  Menu items already seeded, skipping...');
      return;
    }

    // Insert menu items
    for (const item of menuItems) {
      await db.execute({
        sql: 'INSERT INTO menu_items (title, description, price, image_url, category) VALUES (?, ?, ?, ?, ?)',
        args: [item.title, item.description, item.price, item.image_url, item.category],
      });
    }

    console.log(`✅ Seeded ${menuItems.length} menu items`);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
}

seed();

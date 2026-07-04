// Seed script — signs in and adds all menu items to Firestore
// Run with: node scripts/seed-menu.mjs <email> <password>

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCgVzmWx7j3h-c1Grh837h2yD8cU3hQPDc",
  authDomain: "fortify-kitchen-503e5.firebaseapp.com",
  projectId: "fortify-kitchen-503e5",
  storageBucket: "fortify-kitchen-503e5.firebasestorage.app",
  messagingSenderId: "999261293405",
  appId: "1:999261293405:web:850c2b6d2aa5ca3d4ff6b4",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const MENU_ITEMS = [
  // Chicken — 7 flavors × 2 sizes
  ...['xá xíu', 'teriyaki', 'cay Hàn Quốc', 'muối ớt', 'phô mai', 'tiêu đen', 'sốt thái'].flatMap(flavor => [
    { protein: 'chicken', flavor, sizeGrams: 150, price: 25000, active: true },
    { protein: 'chicken', flavor, sizeGrams: 250, price: 42000, active: true },
  ]),
  // Beef — 1 flavor, 1 size
  { protein: 'beef', flavor: 'herb', sizeGrams: 150, price: 50000, active: true },
  // Shrimp — 3 flavors, 1 size each
  { protein: 'shrimp', flavor: 'herb', sizeGrams: 150, price: 50000, active: true },
  { protein: 'shrimp', flavor: 'muối ớt', sizeGrams: 150, price: 50000, active: true },
  { protein: 'shrimp', flavor: 'sốt thái', sizeGrams: 150, price: 50000, active: true },
];

async function seed() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.log('Usage: node scripts/seed-menu.mjs <email> <password>');
    console.log('');
    console.log('First create a user in Firebase Console → Authentication → Users → Add user');
    console.log('Then run this script with that email and password.');
    process.exit(1);
  }

  // Sign in
  console.log(`🔐 Signing in as ${email}...`);
  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log('  ✅ Signed in successfully');
  } catch (err) {
    console.error(`  ❌ Login failed: ${err.message}`);
    console.log('  Make sure you created this user in Firebase Console → Authentication → Users');
    process.exit(1);
  }

  // Check if items already exist
  const existing = await getDocs(collection(db, 'menuItems'));
  if (existing.size > 0) {
    console.log(`⚠️  menuItems collection already has ${existing.size} documents. Skipping seed.`);
    console.log('   Delete the collection in Firebase Console first if you want to re-seed.');
    process.exit(0);
  }

  console.log(`🌱 Seeding ${MENU_ITEMS.length} menu items...`);
  for (const item of MENU_ITEMS) {
    const ref = await addDoc(collection(db, 'menuItems'), item);
    console.log(`  ✅ ${item.protein} ${item.flavor} ${item.sizeGrams}g → ${ref.id}`);
  }
  console.log(`\n🎉 Done! ${MENU_ITEMS.length} items added to Firestore.`);
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

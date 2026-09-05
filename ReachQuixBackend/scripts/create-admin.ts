import prisma from '../src/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Read arguments or use defaults
const args = process.argv.slice(2);
const adminEmail = args[0] || 'admin@reachquix.com';
const adminPassword = args[1] || 'Admin@ReachQuix2026!';
const adminName = args[2] || 'System Administrator';

const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyAEgNSanHl6xQI86NR6OZ4sbSEG90xnFGI';

async function createAdminUser() {
  console.log('====================================================');
  console.log(' 👑 CREATING REACHQUIX ADMIN USER IN FIREBASE');
  console.log('====================================================');
  console.log(`📧 Email:    ${adminEmail}`);
  console.log(`🔑 Password: ${adminPassword}`);
  console.log(`👤 Name:     ${adminName}`);
  console.log('====================================================\n');

  try {
    // 1. Create User in Firebase Auth via REST API
    console.log('1️⃣ Registering user in Firebase Authentication...');
    const signUpRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
          returnSecureToken: true,
        }),
      }
    );

    const signUpData = await signUpRes.json();

    let idToken = '';
    let uid = '';

    if (!signUpRes.ok) {
      if (signUpData.error?.message === 'EMAIL_EXISTS') {
        console.log('⚠️ User already exists in Firebase. Signing in to verify credentials...');
        const signInRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: adminEmail,
              password: adminPassword,
              returnSecureToken: true,
            }),
          }
        );
        const signInData = await signInRes.json();
        if (!signInRes.ok) {
          throw new Error(signInData.error?.message || 'Failed to authenticate existing user');
        }
        idToken = signInData.idToken;
        uid = signInData.localId;
      } else {
        throw new Error(signUpData.error?.message || 'Firebase sign-up failed');
      }
    } else {
      idToken = signUpData.idToken;
      uid = signUpData.localId;
      console.log('✅ Created user in Firebase Auth with UID:', uid);
    }

    // 2. Mark Email as Verified & set Display Name in Firebase
    if (idToken) {
      console.log('2️⃣ Marking email as verified in Firebase...');
      await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken,
            emailVerified: true,
            displayName: adminName,
            returnSecureToken: true,
          }),
        }
      );
    }

    // 3. Upsert Profile into MySQL Database
    console.log('3️⃣ Creating admin profile in MySQL database...');
    const profile = await prisma.profile.upsert({
      where: { user_id: uid },
      update: {
        full_name: adminName,
      },
      create: {
        id: uid,
        user_id: uid,
        full_name: adminName,
      },
    });

    console.log('\n====================================================');
    console.log(' 🎉 ADMIN CREDENTIALS SUCCESSFULLY CREATED & VERIFIED!');
    console.log('====================================================');
    console.log(`🌐 Admin Portal URL: http://localhost:8081/login`);
    console.log(`📧 Email:            ${adminEmail}`);
    console.log(`🔑 Password:         ${adminPassword}`);
    console.log('====================================================\n');
  } catch (error: any) {
    console.error('❌ Error creating admin user:', error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();

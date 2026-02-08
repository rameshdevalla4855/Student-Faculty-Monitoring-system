
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// --- 1. Load Environment Variables (Simulated) ---
const serviceAccountPath = path.resolve(__dirname, '../fir-f-m-system.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error("Service Account not found at:", serviceAccountPath);
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Initialize Firebase Admin (or Client with clean auth for this script)
// Since we are running in node, we'll use the client SDK with the service account creds if possible, 
// OR just assume we can read if rules allow (which they might not for unauth).
// Actually, standard firebase-admin is better for node scripts.
// Let's use firebase-admin.

const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkCoordinators() {
    console.log("Fetching Coordinators...");
    const snap = await db.collection('coordinators').get();

    if (snap.empty) {
        console.log("No coordinators found.");
        return;
    }

    snap.forEach(doc => {
        console.log(`ID: ${doc.id}, Data:`, doc.data());
    });
}

checkCoordinators();

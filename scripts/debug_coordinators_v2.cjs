
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.resolve(__dirname, '../fir-f-m-system.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkCoordinators() {
    console.log("Fetching Coordinators...");
    const snap = await db.collection('coordinators').limit(5).get();

    if (snap.empty) {
        console.log("No coordinators found.");
        return;
    }

    snap.forEach(doc => {
        console.log(`ID: ${doc.id}`);
        console.log(JSON.stringify(doc.data(), null, 2));
        console.log('-------------------');
    });
}

checkCoordinators();

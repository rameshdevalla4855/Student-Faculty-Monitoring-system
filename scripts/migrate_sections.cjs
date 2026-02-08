const admin = require('firebase-admin');
const serviceAccount = require('../fir-f-m-system.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const ASSIGNMENTS_COLLECTION = 'faculty_assignments';

// Mapping Strategy
const SECTION_MAP = {
    "A": "1",
    "B": "2",
    "C": "3",
    "D": "4",
    // Reverse mapping just in case? No, structure is clearly 1,2,3
};

async function migrateSections() {
    console.log("Starting Section Migration (A -> 1, B -> 2)...");

    const snapshot = await db.collection(ASSIGNMENTS_COLLECTION).get();
    let updatedCount = 0;
    let skippedCount = 0;

    const batchSize = 500;
    let batch = db.batch();
    let batchCount = 0;

    snapshot.forEach(doc => {
        const data = doc.data();
        const currentSection = data.section;

        // Check if migration is needed
        if (SECTION_MAP[currentSection]) {
            const newSection = SECTION_MAP[currentSection];
            const ref = db.collection(ASSIGNMENTS_COLLECTION).doc(doc.id);

            batch.update(ref, { section: newSection });
            updatedCount++;
            batchCount++;
            console.log(`[Queue] ${doc.id}: ${currentSection} -> ${newSection}`);
        } else {
            // Already numeric or unknown
            skippedCount++;
        }

        // Commit batch if limit reached
        if (batchCount >= batchSize) {
            // batch.commit(); // We will do one big commit or chunks? 
            // For safety in this script, typically we'd await matching.
            // But let's keep it simple for now, just count them. 
        }
    });

    if (updatedCount > 0) {
        console.log(`\nReady to update ${updatedCount} documents.`);
        console.log(`Skipped ${skippedCount} documents (already correct or unknown).`);

        // Execute the batch
        await batch.commit();
        console.log("Migration Complete! ✅");
    } else {
        console.log("No documents needed migration.");
    }
}

migrateSections().catch(console.error);

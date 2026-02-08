const admin = require('firebase-admin');
const serviceAccount = require('../fir-f-m-system.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const fs = require('fs');
const logFile = 'debug_assignment_log.txt';
fs.writeFileSync(logFile, ''); // Clear file

function log(msg) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
}

async function checkAssignments() {
    log("Fetching all faculty assignments...");
    const snapshot = await db.collection('faculty_assignments').get();

    if (snapshot.empty) {
        log("No assignments found.");
        return;
    }


    snapshot.forEach(doc => {
        const data = doc.data();
        log(`\nID: ${doc.id}`);
        log(`Branch: "${data.branch}" (Length: ${data.branch.length}) [${[...data.branch].map(c => c.charCodeAt(0)).join(',')}]`);
        log(`Year: "${data.year}" (${typeof data.year})`);
        log(`Section: "${data.section}" (Length: ${data.section.length}) [${[...data.section].map(c => c.charCodeAt(0)).join(',')}]`);
        log(`SubjectCode: "${data.subjectCode}" (Length: ${data.subjectCode.length}) [${[...data.subjectCode].map(c => c.charCodeAt(0)).join(',')}]`);
        log(`Faculty: ${data.facultyName} (${data.facultyId})`);
        log(`isActive: ${data.isActive}`);
    });

    log("\n--- Checking Structure ---");
    const struct = await db.collection('academic_structure').doc('main').get();
    if (struct.exists) {
        const d = struct.data();
        log(`Branches: ${JSON.stringify(d.branches)}`);
        log(`Sections: ${JSON.stringify(d.sections)}`); // Added this
        d.branches?.forEach(b => {
            log(`Branch Option: "${b}" (Length: ${b.length}) [${[...b].map(c => c.charCodeAt(0)).join(',')}]`);
        });
    } else {
        log("No structure found.");
    }
}

checkAssignments();

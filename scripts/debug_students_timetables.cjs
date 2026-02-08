const admin = require('firebase-admin');
const serviceAccount = require('../fir-f-m-system.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const fs = require('fs');
const logFile = 'debug_students_log.txt';
fs.writeFileSync(logFile, '');

function log(msg) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
}

async function checkData() {
    log("--- Checking Timetables ---");
    const timetables = await db.collection('timetables').get();
    if (timetables.empty) log("No timetables found.");
    timetables.forEach(doc => {
        log(`ID: ${doc.id}`);
    });

    log("\n--- Checking Students Collection (Full Object) ---");
    const students = await db.collection('students').limit(1).get();
    if (students.empty) log("No students found.");
    students.forEach(doc => {
        const d = doc.data();
        log(`Student Raw Data: ${JSON.stringify(d, null, 2)}`);
    });
}

checkData();

import { useState } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function ImportData() {
    const [jsonInput, setJsonInput] = useState('');
    const [status, setStatus] = useState('Idle');
    const [importType, setImportType] = useState('students'); // 'students' or 'faculty'
    const navigate = useNavigate();

    const handleImport = async () => {
        setStatus('Parsing...');
        try {
            const data = JSON.parse(jsonInput);
            if (!Array.isArray(data)) {
                throw new Error("Input must be an array of objects.");
            }

            setStatus(`Importing ${data.length} records into '${importType}'...`);
            const batch = writeBatch(db);

            data.forEach((row, index) => {

                if (importType === 'students') {
                    // --- STUDENT LOGIC ---
                    const student = {
                        rollNumber: row["RollNO"] || row["rollNumber"] || row["Roll Number"],
                        name: row["Name"] || row["name"],
                        email: row["Email"] || row["email"],
                        dept: row["Branch"] || row["dept"] || row["Department"],
                        departmentGroup: row["Department"] || "N/A",
                        year: row["year"] || row["Year"],
                        mobile: row["Mobile No"] || row["mobile"],
                        barcodeId: row["Bio Metric Code"] || row["barcodeId"],
                        parentMobile: row["Parent No"] || row["parentMobile"],
                        mentorId: row["Mentor No"] || row["mentorId"],
                        uid: null,
                        isClaimed: false
                    };

                    const docId = student.rollNumber;
                    if (!docId) {
                        console.warn(`Skipping row ${index}: Missing Roll Number`);
                        return;
                    }
                    const docRef = doc(db, "students", docId);
                    batch.set(docRef, { ...student, barcodeId: student.barcodeId || student.rollNumber });

                } else {
                    // --- FACULTY LOGIC ---
                    const faculty = {
                        facultyId: row["Faculty Id"] || row["facultyId"] || row["ID"],
                        name: row["Name"] || row["name"],
                        email: row["Email"] || row["email"],
                        dept: row["Department"] || row["dept"],
                        designation: row["Designation"] || "Staff",
                        mobile: row["Mobile No"] || row["mobile"],
                        barcodeId: row["Bio Metric Code"] || row["barcodeId"],
                        uid: null,
                        isClaimed: false
                    };

                    const docId = faculty.facultyId;
                    if (!docId) {
                        console.warn(`Skipping row ${index}: Missing Faculty ID`);
                        return;
                    }
                    const docRef = doc(db, "faculty", docId);
                    batch.set(docRef, { ...faculty, barcodeId: faculty.barcodeId || faculty.facultyId });
                }
            });

            await batch.commit();
            setStatus('Success! Data Imported.');
            setTimeout(() => navigate('/hod'), 2000);

        } catch (err) {
            console.error(err);
            setStatus('Error: ' + err.message);
        }
    };

    const sampleData = importType === 'students'
        ? `[ { "RollNO": "23AG1A0501", "Name": "Student Name", "Email": "student@test.com" } ]`
        : `[ { "Faculty Id": "FAC001", "Name": "Prof. Name", "Email": "prof@test.com", "Department": "CSE" } ]`;

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-blue-900">Import Data</h1>

                    {/* Toggle Switch */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setImportType('students')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${importType === 'students' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Students
                        </button>
                        <button
                            onClick={() => setImportType('faculty')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${importType === 'faculty' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Faculty
                        </button>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Paste {importType === 'students' ? 'Student' : 'Faculty'} JSON Data
                    </label>
                    <textarea
                        className="w-full h-64 p-4 border rounded font-mono text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder={sampleData}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <button
                        onClick={handleImport}
                        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold transition-colors"
                    >
                        Start Import
                    </button>
                    <span className={`font-semibold ${status.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
                        {status}
                    </span>
                </div>

                <div className="mt-8 p-4 bg-yellow-50 rounded border border-yellow-100 text-sm text-yellow-800">
                    <p className="font-bold">Instructions:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Ensure you selected the correct type (Student/Faculty) above.</li>
                        <li>Data must be a valid JSON array.</li>
                        <li>Required ID field: <code>{importType === 'students' ? 'RollNO / rollNumber' : 'Faculty Id / facultyId'}</code></li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

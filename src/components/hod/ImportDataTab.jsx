import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { academicService } from '../../services/academicService';
import { Upload, FileJson, CheckCircle, AlertCircle, ArrowRight, XCircle, Play, RotateCcw } from 'lucide-react';

export default function ImportDataTab() {
    const [step, setStep] = useState('input'); // input | preview | importing | result
    const [importType, setImportType] = useState('students'); // 'students' | 'faculty'
    const [jsonInput, setJsonInput] = useState('');
    const [parsedData, setParsedData] = useState([]); // { raw: {}, normalized: {}, errors: [], status: 'valid'|'invalid' }
    const [importStats, setImportStats] = useState({ total: 0, success: 0, fail: 0 });
    const [progress, setProgress] = useState(0);
    const [structure, setStructure] = useState(null);

    useEffect(() => {
        academicService.getStructure().then(setStructure);
    }, []);

    // 1. Parsing & Validation Logic
    const validateRow = (row, type) => {
        const errors = [];
        let normalized = {};

        if (type === 'students') {
            const rollNo = row["RollNO"] || row["rollNumber"] || row["Roll Number"] || row["id"];
            if (!rollNo) errors.push("Missing Roll Number");

            const dept = row["Branch"] || row["dept"] || row["Department"] || "N/A";
            const year = row["year"] || row["Year"] || "N/A";
            const section = row["Section"] || row["section"] || row["Sec"] || "A"; // Default to A if missing

            // Structure Validation
            if (structure) {
                if (dept !== "N/A" && !structure.branches.includes(dept)) {
                    errors.push(`Invalid Branch '${dept}'`);
                }
                // Loose check for year (allow strings like "1", "1st")
                const yearNum = parseInt(year);
                if (!isNaN(yearNum) && !structure.years.includes(yearNum)) {
                    errors.push(`Invalid Year '${year}'`);
                }
                // Validate Section
                if (structure.sections && !structure.sections.includes(section)) {
                    errors.push(`Invalid Section '${section}'`);
                }
            }

            normalized = {
                rollNumber: rollNo,
                name: row["Name"] || row["name"] || "Unknown",
                email: row["Email"] || row["email"] || null,
                dept,
                departmentGroup: row["Department"] || "N/A",
                year,
                section, // Add Section
                mobile: row["Mobile No"] || row["mobile"] || "N/A",
                barcodeId: row["Bio Metric Code"] || row["barcodeId"] || rollNo, // Fallback to RollNo
                parentMobile: row["Parent No"] || row["parentMobile"] || "N/A",
                mentorId: row["Mentor No"] || row["mentorId"] || "N/A",
                uid: null,
                isClaimed: false
            };
        } else {
            const fid = row["Faculty Id"] || row["facultyId"] || row["ID"];
            if (!fid) errors.push("Missing Faculty ID");

            const dept = row["Department"] || row["dept"] || "N/A";
            // Structure Validation
            if (structure && dept !== "N/A" && !structure.branches.includes(dept)) {
                errors.push(`Invalid Dept '${dept}'`);
            }

            normalized = {
                facultyId: fid,
                name: row["Name"] || row["name"] || "Unknown",
                email: row["Email"] || row["email"] || null,
                dept,
                designation: row["Designation"] || "Staff",
                mobile: row["Mobile No"] || row["mobile"] || "N/A",
                barcodeId: row["Bio Metric Code"] || row["barcodeId"] || fid,
                uid: null,
                isClaimed: false
            };
        }

        return {
            raw: row,
            normalized,
            errors,
            status: errors.length > 0 ? 'invalid' : 'valid'
        };
    };

    const handleParse = () => {
        try {
            const rawArray = JSON.parse(jsonInput);
            if (!Array.isArray(rawArray)) throw new Error("Input must be a JSON Array.");

            const processed = rawArray.map(row => validateRow(row, importType));
            setParsedData(processed);
            setStep('preview');
        } catch (e) {
            alert("JSON Error: " + e.message);
        }
    };

    // 2. Execution Logic
    const executeImport = async () => {
        setStep('importing');
        setProgress(0);

        const validRows = parsedData.filter(r => r.status === 'valid');
        const total = validRows.length;
        const chunkSize = 400; // Firestore batch limit is 500
        let processed = 0;
        let successCount = 0;

        for (let i = 0; i < total; i += chunkSize) {
            const chunk = validRows.slice(i, i + chunkSize);
            const batch = writeBatch(db);

            chunk.forEach(item => {
                const data = item.normalized;
                const collectionName = importType === 'students' ? 'students' : 'faculty';
                const docId = importType === 'students' ? data.rollNumber : data.facultyId;

                const docRef = doc(db, collectionName, String(docId));
                batch.set(docRef, data); // Overwrite using set
            });

            try {
                await batch.commit();
                processed += chunk.length;
                successCount += chunk.length;
                setProgress(Math.round((processed / total) * 100));
            } catch (err) {
                console.error("Batch failed:", err);
                // In a real app, we'd mark these specific rows as failed.
            }
        }

        setImportStats({
            total: parsedData.length,
            success: successCount,
            fail: parsedData.length - successCount // Includes originally invalid + batch failures
        });
        setStep('result');
    };

    const reset = () => {
        setJsonInput('');
        setParsedData([]);
        setStep('input');
        setProgress(0);
    };

    // 3. UI Helper Components
    const ProgressBar = () => (
        <div className="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-hidden">
            <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
            ></div>
        </div>
    );

    const validCount = parsedData.filter(x => x.status === 'valid').length;

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Stepper */}
            <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Upload className="text-indigo-600" size={24} />
                        Bulk Data Import
                    </h2>
                    <p className="text-sm text-gray-500">
                        {step === 'input' && 'Paste your JSON data to begin.'}
                        {step === 'preview' && 'Review data quality before importing.'}
                        {step === 'importing' && 'Writing records to database...'}
                        {step === 'result' && 'Import completed.'}
                    </p>
                </div>
                {step === 'input' && (
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setImportType('students')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${importType === 'students' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>Students</button>
                        <button onClick={() => setImportType('faculty')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${importType === 'faculty' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>Faculty</button>
                    </div>
                )}
            </div>

            {/* STEP 1: INPUT */}
            {step === 'input' && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <FileJson size={16} />
                        Paste {importType === 'students' ? 'Student' : 'Faculty'} JSON Array
                    </label>
                    <textarea
                        className="w-full h-80 p-4 border rounded-lg font-mono text-xs bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder={`[ \n  { "RollNO": "...", "Name": "..." }, \n  ...\n]`}
                    />
                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={handleParse}
                            disabled={!jsonInput.trim()}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
                        >
                            Preview Data <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 2: PREVIEW */}
            {step === 'preview' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <div className="flex gap-4 text-sm">
                            <span className="font-medium text-gray-700">Total: {parsedData.length}</span>
                            <span className="font-medium text-green-600">Valid: {validCount}</span>
                            <span className="font-medium text-red-600">Invalid: {parsedData.length - validCount}</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setStep('input')} className="text-gray-500 hover:text-gray-700 px-3 py-1 text-xs font-medium">Back</button>
                            <button
                                onClick={executeImport}
                                disabled={validCount === 0}
                                className="flex items-center gap-2 px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-bold uppercase tracking-wider"
                            >
                                <Play size={14} fill="currentColor" /> Import {validCount} Records
                            </button>
                        </div>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto">
                        <table className="min-w-full text-xs text-left">
                            <thead className="bg-gray-100 text-gray-500 font-semibold sticky top-0 z-10">
                                <tr>
                                    <th className="py-2 px-4">Status</th>
                                    <th className="py-2 px-4">{importType === 'students' ? 'Roll No' : 'Faculty ID'}</th>
                                    <th className="py-2 px-4">Name</th>
                                    <th className="py-2 px-4">Details</th>
                                    <th className="py-2 px-4">Issues</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {parsedData.map((row, idx) => (
                                    <tr key={idx} className={row.status === 'invalid' ? 'bg-red-50' : 'hover:bg-gray-50'}>
                                        <td className="py-2 px-4">
                                            {row.status === 'valid'
                                                ? <CheckCircle size={16} className="text-green-500" />
                                                : <XCircle size={16} className="text-red-500" />
                                            }
                                        </td>
                                        <td className="py-2 px-4 font-mono">{row.normalized.rollNumber || row.normalized.facultyId || '-'}</td>
                                        <td className="py-2 px-4 font-medium">{row.normalized.name || '-'}</td>
                                        <td className="py-2 px-4 text-gray-500">
                                            {row.normalized.dept} • {row.normalized.year || row.normalized.designation}
                                        </td>
                                        <td className="py-2 px-4 text-red-600">
                                            {row.errors.join(", ")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* STEP 3: IMPORTING */}
            {step === 'importing' && (
                <div className="bg-white p-12 rounded-xl border border-gray-200 shadow-sm text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Importing Data...</h3>
                    <ProgressBar />
                    <p className="text-gray-500 text-sm">Please wait while we update the database.</p>
                </div>
            )}

            {/* STEP 4: RESULT */}
            {step === 'result' && (
                <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Import Complete</h3>
                    <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto my-6 text-center">
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase">Total</p>
                            <p className="text-xl font-bold text-gray-900">{importStats.total}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                            <p className="text-xs text-green-600 uppercase">Success</p>
                            <p className="text-xl font-bold text-green-700">{importStats.success}</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-lg">
                            <p className="text-xs text-red-600 uppercase">Failed</p>
                            <p className="text-xl font-bold text-red-700">{importStats.fail}</p>
                        </div>
                    </div>
                    <button
                        onClick={reset}
                        className="flex items-center gap-2 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-black mx-auto transition-colors"
                    >
                        <RotateCcw size={16} /> Import More
                    </button>
                </div>
            )}
        </div>
    );
}

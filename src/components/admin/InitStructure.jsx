import { useEffect } from 'react';
import { academicService } from '../../services/academicService';

export default function InitStructure() {
    useEffect(() => {
        const init = async () => {
            try {
                // Initialize Default Academic Structure (Branches, Years, etc.)
                await academicService.initializeStructure();
                console.log("System Structure Verified.");
            } catch (err) {
                console.error("Structure Init Error:", err);
            }
        };
        init();
    }, []);

    return null; // Render nothing
}

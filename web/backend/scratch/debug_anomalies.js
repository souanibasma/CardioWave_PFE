const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const ECGAnalysisSchema = new mongoose.Schema({}, { strict: false });
const ECGAnalysis = mongoose.model('ECGAnalysis', ECGAnalysisSchema);

async function debugData() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27014/ecg_db');
        const analyses = await ECGAnalysis.find({ status: 'analyzed' });
        
        const allAnomalies = [];
        analyses.forEach(a => {
            const anoms = a.aiResult?.ai_classification?.anomalies;
            if (Array.isArray(anoms)) {
                allAnomalies.push(...anoms);
            }
        });
        
        console.log('--- ANOMALIES DEBUG ---');
        console.log(`Total analyzed: ${analyses.length}`);
        console.log('Detected anomalies (raw):', [...new Set(allAnomalies)]);
        
        const counts = {};
        allAnomalies.forEach(a => {
            counts[a] = (counts[a] || 0) + 1;
        });
        console.log('Anomaly counts:', counts);
        
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

debugData();

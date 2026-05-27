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
        
        const statuses = analyses.map(a => a.aiResult?.ai_classification?.status);
        const unique = [...new Set(statuses)];
        
        console.log('--- DEBUG INFO ---');
        console.log(`Total analyzed: ${analyses.length}`);
        console.log('Unique AI statuses:', unique);
        
        if (analyses.length > 0) {
            console.log('Sample aiResult:', JSON.stringify(analyses[0].aiResult?.ai_classification, null, 2));
        }
        
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

debugData();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const ECGAnalysisSchema = new mongoose.Schema({
    aiResult: Object,
    status: String
}, { strict: false });

const ECGAnalysis = mongoose.model('ECGAnalysis', ECGAnalysisSchema);

async function debugData() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27014/ecg_db');
        console.log('Connected to DB');

        const analyses = await ECGAnalysis.find({ status: 'analyzed' });
        console.log(`Found ${analyses.length} analyzed records`);

        const statuses = analyses.map(a => a.aiResult?.ai_classification?.status);
        console.log('Unique statuses in DB:', [...new Set(statuses)]);

        const counts: Record<string, number> = {};
        statuses.forEach(s => {
            counts[s] = (counts[s] || 0) + 1;
        });
        console.log('Status counts:', counts);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

debugData();

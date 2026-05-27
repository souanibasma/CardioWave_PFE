import { Router } from 'express';
import { 
    getDoctorDashboardOverview, 
    getDoctorRecentECGs, 
    getDoctorDistributionChart 
} from '../controllers/doctorDashboardController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);
router.use(authorize('doctor'));

router.get('/overview', getDoctorDashboardOverview);
router.get('/recent-ecgs', getDoctorRecentECGs);
router.get('/charts/distribution', getDoctorDistributionChart);

// Dummy endpoints for other charts that frontend might still call
router.get('/alerts', (req, res) => res.json([]));
router.get('/charts/weekly', (req, res) => res.json({ labels: [], normal: [], abnormal: [] }));
router.get('/charts/monthly-trend', (req, res) => res.json({ labels: [], received: [], abnormal: [] }));

export default router;
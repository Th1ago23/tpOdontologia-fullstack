import express from 'express';
import patientRoutes from './patientRoutes';
import authRoutes from './authRoutes';
import authPatientRoutes from './authPatientRoutes';
import adminRoutes from './adminRoutes';
import { authenticateToken } from '../middleware/authMiddleware';
import AuthController from '../controllers/AuthController';
import AppointmentRequestController from '../controllers/AppointmentRequestController';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/auth-patient', authPatientRoutes);
router.use('/patients', patientRoutes);
router.use('/admin', adminRoutes);

// Info do usuário autenticado
router.get('/me', authenticateToken, AuthController.me);

// Criar uma nova solicitação de consulta
router.post('/appointment-requests', authenticateToken, AppointmentRequestController.create.bind(AppointmentRequestController));

router.get('/test-api', (req, res) => {
    res.status(200).json({ message: 'API está funcionando!' });
  });
  
  // Listar todas as solicitações de consulta
  router.get('/appointment-requests', authenticateToken, AppointmentRequestController.listPatientAppointments);
  
export default router;
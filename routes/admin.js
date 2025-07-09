import express from 'express'
import { allUsers, getDashboardStats,adminLogin,adminLogOut,getAdminData } from '../controllers/admin.js';
import { adminLoginValidator, validateHandler } from '../lib/validators.js';
import { adminOnly } from '../middlewares/auth.js';

const app = express.Router();

app.post('/verify',adminLoginValidator(),validateHandler,adminLogin);

app.use(adminOnly)

app.get('/',getAdminData);

app.get('/logout',adminLogOut);

app.get('/users',allUsers);

app.get("/stats",getDashboardStats)

export default app;
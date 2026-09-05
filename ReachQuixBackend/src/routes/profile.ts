import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import prisma from '../db';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { user_id: req.user!.uid }
    });
    res.json(profile || null);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

const handleUpsertProfile = async (req: AuthRequest, res: any) => {
  try {
    const { full_name, avatar_url } = req.body;
    const profile = await prisma.profile.upsert({
      where: { user_id: req.user!.uid },
      update: { 
        full_name: full_name !== undefined ? full_name : undefined,
        avatar_url: avatar_url !== undefined ? avatar_url : undefined,
      },
      create: { 
        id: req.user!.uid,
        user_id: req.user!.uid, 
        full_name: full_name || null,
        avatar_url: avatar_url || null,
      }
    });
    res.json(profile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

router.post('/', handleUpsertProfile);
router.put('/', handleUpsertProfile);

router.delete('/account', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.uid;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;

import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import prisma from '../db';

const router = Router();

// Require auth for all contact routes
router.use(requireAuth);

// GET /api/contacts
router.get('/', async (req: AuthRequest, res) => {
  try {
    const contacts = await prisma.contact.findMany({
      where: { user_id: req.user!.uid },
      include: {
        folder_members: { include: { folder: true } },
        tags: { include: { tag: true } }
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(contacts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// POST /api/contacts
router.post('/', async (req: AuthRequest, res) => {
  const { email, name, first_name, last_name, company_name, phone, status, folderIds, tags, campaign_id } = req.body;
  try {
    const contact = await prisma.contact.create({
      data: {
        email,
        name,
        company_name,
        first_name,
        last_name,
        phone,
        status: status || 'active',
        campaign_id,
        user_id: req.user!.uid,
      },
    });

    // Handle folder assignments
    if (folderIds && Array.isArray(folderIds)) {
      for (const folderId of folderIds) {
        await prisma.contactFolderMember.create({
          data: {
            contact_id: contact.id,
            folder_id: folderId,
          }
        });
      }
    }

    // Handle tag assignments
    if (tags && Array.isArray(tags)) {
      for (const tagName of tags) {
        // Find or create tag
        let tag = await prisma.tag.findFirst({
          where: { name: tagName, user_id: req.user!.uid }
        });
        if (!tag) {
          tag = await prisma.tag.create({
            data: { name: tagName, user_id: req.user!.uid }
          });
        }
        await prisma.contactTag.create({
          data: {
            contact_id: contact.id,
            tag_id: tag.id
          }
        });
      }
    }

    res.json(contact);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// POST /api/contacts/bulk
router.post('/bulk', async (req: AuthRequest, res) => {
  try {
    const { contacts } = req.body;
    if (!contacts || !Array.isArray(contacts)) return res.status(400).json({ error: 'Invalid input' });

    const createdContacts = await prisma.$transaction(
      contacts.map((c: any) => prisma.contact.create({
        data: {
          user_id: req.user!.uid,
          email: c.email,
          name: c.name || null,
          first_name: c.first_name || null,
          last_name: c.last_name || null,
          company_name: c.company_name || null,
          phone: c.phone || null,
          status: c.status || 'active',
          campaign_id: c.campaign_id || null,
        }
      }))
    );

    res.json(createdContacts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create contacts in bulk' });
  }
});

// PUT /api/contacts/bulk-update
router.put('/bulk-update', async (req: AuthRequest, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'Invalid input' });

    await prisma.contact.updateMany({
      where: {
        id: { in: ids },
        user_id: req.user!.uid
      },
      data: updates
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to bulk update contacts' });
  }
});

// POST /api/contacts/bulk-delete
router.post('/bulk-delete', async (req: AuthRequest, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'Invalid input' });

    await prisma.contactFolderMember.deleteMany({
      where: { contact_id: { in: ids } }
    });
    await prisma.contactTag.deleteMany({
      where: { contact_id: { in: ids } }
    });

    await prisma.contact.deleteMany({
      where: {
        id: { in: ids },
        user_id: req.user!.uid
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to bulk delete contacts' });
  }
});

// GET /api/contacts/folders
router.get('/folders', async (req: AuthRequest, res) => {
  try {
    const folders = await prisma.contactFolder.findMany({
      where: { user_id: req.user!.uid },
      orderBy: { name: 'asc' },
    });
    res.json(folders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// POST /api/contacts/folders
router.post('/folders', async (req: AuthRequest, res) => {
  try {
    const folder = await prisma.contactFolder.create({
      data: {
        name: req.body.name,
        user_id: req.user!.uid,
      },
    });
    res.json(folder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// DELETE /api/contacts/:id
router.delete('/:id', async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  try {
    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing || existing.user_id !== req.user!.uid) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // Delete relations first (if cascade is not setup)
    await prisma.contactFolderMember.deleteMany({ where: { contact_id: id }});
    await prisma.contactTag.deleteMany({ where: { contact_id: id }});
    
    await prisma.contact.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// GET /api/contacts/folder-members
router.get('/folder-members', async (req: AuthRequest, res) => {
  try {
    const members = await prisma.contactFolderMember.findMany({
      where: { folder: { user_id: req.user!.uid } },
    });
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch folder members' });
  }
});

// GET /api/contacts/tags
router.get('/tags', async (req: AuthRequest, res) => {
  try {
    const tags = await prisma.tag.findMany({
      where: { user_id: req.user!.uid },
      orderBy: { name: 'asc' },
    });
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// GET /api/contacts/contact-tags
router.get('/contact-tags', async (req: AuthRequest, res) => {
  try {
    const contactTags = await prisma.contactTag.findMany({
      where: { tag: { user_id: req.user!.uid } },
    });
    res.json(contactTags);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contact tags' });
  }
});

// DELETE /api/contacts/contact-tags/:contactId/:tagId
router.delete('/contact-tags/:contactId/:tagId', async (req: AuthRequest, res) => {
  const contactId = String(req.params.contactId);
  const tagId = String(req.params.tagId);
  try {
    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact || contact.user_id !== req.user!.uid) return res.status(403).json({ error: 'Unauthorized' });
    
    await prisma.contactTag.delete({
      where: {
        contact_id_tag_id: {
          contact_id: contactId,
          tag_id: tagId
        }
      }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete contact tag' });
  }
});

// POST /api/contacts/contact-tags
router.post('/contact-tags/assign', async (req: AuthRequest, res) => {
  const { contactIds, tagIds } = req.body;
  try {
    const rows = contactIds.flatMap((contact_id: string) => tagIds.map((tag_id: string) => ({ contact_id, tag_id })));
    await prisma.contactTag.createMany({
      data: rows,
      skipDuplicates: true
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign tags' });
  }
});

// POST /api/contacts/tags
router.post('/tags', async (req: AuthRequest, res) => {
  try {
    const tag = await prisma.tag.create({
      data: {
        name: req.body.name,
        user_id: req.user!.uid
      }
    });
    res.json(tag);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// DELETE /api/contacts/tags/:id
router.delete('/tags/:id', async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  try {
    const existing = await prisma.tag.findUnique({ where: { id } });
    if (!existing || existing.user_id !== req.user!.uid) return res.status(403).json({ error: 'Unauthorized' });
    
    await prisma.contactTag.deleteMany({ where: { tag_id: id } });
    await prisma.tag.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

// POST /api/contacts/folder-members/assign
router.post('/folder-members/assign', async (req: AuthRequest, res) => {
  const { folderId, contactIds } = req.body;
  try {
    const rows = contactIds.map((contact_id: string) => ({ folder_id: folderId, contact_id }));
    await prisma.contactFolderMember.createMany({
      data: rows,
      skipDuplicates: true
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add to folder' });
  }
});

// POST /api/contacts/folder-members/remove
router.post('/folder-members/remove', async (req: AuthRequest, res) => {
  const { folderId, contactIds } = req.body;
  try {
    await prisma.contactFolderMember.deleteMany({
      where: {
        folder_id: folderId,
        contact_id: { in: contactIds }
      }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove from folder' });
  }
});

// PUT /api/contacts/folders/:id
router.put('/folders/:id', async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  try {
    const existing = await prisma.contactFolder.findUnique({ where: { id } });
    if (!existing || existing.user_id !== req.user!.uid) return res.status(403).json({ error: 'Unauthorized' });
    
    const updated = await prisma.contactFolder.update({
      where: { id },
      data: { name: req.body.name }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to rename folder' });
  }
});

// DELETE /api/contacts/folders/:id
router.delete('/folders/:id', async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  try {
    const existing = await prisma.contactFolder.findUnique({ where: { id } });
    if (!existing || existing.user_id !== req.user!.uid) return res.status(403).json({ error: 'Unauthorized' });
    
    await prisma.contactFolderMember.deleteMany({ where: { folder_id: id } });
    await prisma.contactFolder.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// PUT /api/contacts/:id
router.put('/:id', async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  try {
    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing || existing.user_id !== req.user!.uid) return res.status(403).json({ error: 'Unauthorized' });
    
    const updated = await prisma.contact.update({
      where: { id },
      data: req.body
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

export default router;
